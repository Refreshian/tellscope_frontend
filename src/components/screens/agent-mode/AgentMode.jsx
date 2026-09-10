import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Cookies from 'js-cookie';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '@/services/other.service';

import { API_URL, TOKEN } from '@/app.constants';
import { $axios } from '@/api';
import styles from './AgentMode.module.scss';

const STATUS_LABELS = {
  queued: 'В очереди',
  running: 'Работает',
  completed: 'Завершён',
  failed: 'Ошибка',
};

const apiPath = url => (url || '').replace(/^\/api/, '');

const AgentMode = () => {
  useCheckAuth();

  const { pathname } = useLocation();
  const { addData, addMinDate, addMaxDate, addIndex } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(store => store.dataUsersSlice);

  const { data: data_getUserId } = useGetUserIdQuery();
  const { data, isError, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);

  const progressLogRef = useRef(null);
  const wsRef = useRef(null);

  const [catalog, setCatalog] = useState(null);
  const [selectedTools, setSelectedTools] = useState([]);
  const [model, setModel] = useState('gpt');
  const [budget, setBudget] = useState(120000);
  const [spend, setSpend] = useState(null);
  const [folder, setFolder] = useState('Агент');
  const [task, setTask] = useState(
    'Собери аналитику по датасету: динамика сообщений, тональность, ключевые инфоповоды и площадки. Приведи примеры сообщений со ссылками и сделай отчёт.'
  );

  const [runId, setRunId] = useState(null);
  const [runState, setRunState] = useState(null);
  const [events, setEvents] = useState([]);
  const [answer, setAnswer] = useState('');
  const [artifacts, setArtifacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const [history, setHistory] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [previews, setPreviews] = useState({});
  const [connectorForm, setConnectorForm] = useState({ name: '', type: 'http', url: '', description: '', token: '' });

  const scrollToBottom = useCallback(() => {
    if (!progressLogRef.current) return;
    requestAnimationFrame(() => {
      progressLogRef.current.scrollTop = progressLogRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [events, scrollToBottom]);

  useAddBaseAndDate(
    dataUser,
    data,
    isSuccess,
    dataForRequest.index,
    addData,
    addMinDate,
    addMaxDate,
    addIndex
  );

  const loadCatalog = useCallback(async () => {
    try {
      const { data: payload } = await $axios.get('/agent/tools');
      setCatalog(payload);
      setSelectedTools(payload.default_enabled || []);
      setModel(payload.default_model || 'gpt');
      setBudget(payload.default_token_budget || 120000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить список инструментов');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data: payload } = await $axios.get('/agent/runs');
      setHistory(payload.runs || []);
      setSpend({
        tokens_today: payload.tokens_today || 0,
        limit: payload.tokens_per_day_limit || 0,
        runs_today: payload.runs_today || 0,
        runs_limit: payload.limit_per_day || 0,
      });
    } catch (err) {
      /* история не критична */
    }
  }, []);

  const loadConnectors = useCallback(async () => {
    try {
      const { data: payload } = await $axios.get('/agent/connectors');
      setConnectors(payload.connectors || []);
    } catch (err) {
      /* коннекторы не критичны */
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadHistory();
    loadConnectors();
  }, [loadCatalog, loadHistory, loadConnectors]);

  // Превью графиков: артефакты отдаются с проверкой прав, поэтому тянем blob
  useEffect(() => {
    if (!artifacts.length) {
      setPreviews({});
      return undefined;
    }
    let cancelled = false;
    const created = [];
    const load = async () => {
      const next = {};
      for (const art of artifacts) {
        if (art.kind !== 'chart') continue;
        try {
          const res = await $axios.get(apiPath(art.url), { responseType: 'blob' });
          const objectUrl = URL.createObjectURL(res.data);
          created.push(objectUrl);
          next[art.name] = objectUrl;
        } catch (err) {
          /* пропускаем недоступный артефакт */
        }
      }
      if (!cancelled) setPreviews(next);
    };
    load();
    return () => {
      cancelled = true;
      created.forEach(URL.revokeObjectURL);
    };
  }, [artifacts]);

  // WebSocket-стрим шагов агента
  const connectStream = useCallback(id => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = Cookies.get(TOKEN);
    const wsUrl = `${protocol}//${window.location.host}/api/ws/agent-run/${id}${token ? `?token=${token}` : ''}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'keepalive') return;
        if (payload.type === 'answer') {
          setAnswer(payload.text || '');
          return;
        }
        if (payload.type === 'final') {
          setAnswer(payload.answer || '');
          setArtifacts(payload.artifacts || []);
          setStats(payload.stats || null);
          return;
        }
        if (payload.type === 'done') {
          setIsRunning(false);
          setRunState(prev => ({ ...(prev || {}), status: payload.status, error: payload.error }));
          loadHistory();
          return;
        }
        if (payload.type === 'error') {
          setError(payload.message || 'Ошибка выполнения');
        }
        setEvents(prev => [...prev, payload]);
      } catch (err) {
        console.error('agent stream parse error', err);
      }
    };
    ws.onerror = () => {
      setError('Ошибка соединения с потоком агента');
      setIsRunning(false);
    };
    ws.onclose = () => {
      setIsRunning(false);
    };
  }, [loadHistory]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (!task.trim()) {
      setError('Опишите задачу для агента');
      return;
    }
    setError(null);
    setEvents([]);
    setAnswer('');
    setArtifacts([]);
    setStats(null);
    setRunState(null);
    setIsRunning(true);
    try {
      const { data: payload } = await $axios.post('/agent/run', {
        user_query: task,
        index: dataForRequest.index,
        min_date: dataForRequest.min_date,
        max_date: dataForRequest.max_date,
        tools: selectedTools,
        model,
        folder,
        max_tokens: Number(budget) || undefined,
      });
      setRunId(payload.run_id);
      setRunState(payload);
      connectStream(payload.run_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось запустить агента');
      setIsRunning(false);
    }
  }, [task, dataForRequest, selectedTools, model, folder, budget, connectStream]);

  const openRun = useCallback(async id => {
    try {
      const { data: payload } = await $axios.get(`/agent/run/${id}`);
      setRunId(id);
      setRunState(payload);
      setEvents(payload.events || []);
      setAnswer(payload.answer || '');
      setArtifacts(payload.artifacts || []);
      setStats(payload.stats || null);
      setIsRunning(payload.status === 'running' || payload.status === 'queued');
      if (payload.status === 'running' || payload.status === 'queued') connectStream(id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить запуск');
    }
  }, [connectStream]);

  const downloadArtifact = useCallback(async art => {
    try {
      const res = await $axios.get(apiPath(art.url), { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = art.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Не удалось скачать файл');
    }
  }, []);

  const toggleTool = useCallback(name => {
    setSelectedTools(prev => (prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]));
  }, []);

  const toggleGroup = useCallback((group, enable) => {
    const names = (group.tools || []).map(tool => tool.name);
    setSelectedTools(prev => {
      const rest = prev.filter(item => !names.includes(item));
      return enable ? [...rest, ...names] : rest;
    });
  }, []);

  const saveConnector = useCallback(async () => {
    if (!connectorForm.name.trim() || !connectorForm.url.trim()) {
      setError('Для коннектора нужны имя и адрес');
      return;
    }
    try {
      const body = {
        name: connectorForm.name,
        type: connectorForm.type,
        description: connectorForm.description,
      };
      if (connectorForm.type === 'mcp') body.url = connectorForm.url;
      else body.base_url = connectorForm.url;
      if (connectorForm.token) body.token = connectorForm.token;
      await $axios.post('/agent/connectors', body);
      setConnectorForm({ name: '', type: 'http', url: '', description: '', token: '' });
      loadConnectors();
      loadCatalog();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось сохранить коннектор');
    }
  }, [connectorForm, loadConnectors, loadCatalog]);

  const removeConnector = useCallback(async name => {
    try {
      await $axios.delete(`/agent/connectors/${encodeURIComponent(name)}`);
      loadConnectors();
      loadCatalog();
    } catch (err) {
      setError('Не удалось удалить коннектор');
    }
  }, [loadConnectors, loadCatalog]);

  const renderEvent = (ev, index) => {
    const time = new Date(ev.ts || Date.now()).toLocaleTimeString();
    if (ev.type === 'tool_start') {
      return (
        <div key={index} className={`${styles.event} ${styles.event_tool}`}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>
            <b>→ {ev.title || ev.name}</b>
            <code className={styles.eventArgs}>{JSON.stringify(ev.args || {})}</code>
          </span>
        </div>
      );
    }
    if (ev.type === 'tool_end') {
      return (
        <div
          key={index}
          className={`${styles.event} ${ev.ok ? styles.event_ok : styles.event_error}`}
        >
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>
            <b>{ev.ok ? '✓' : '✗'} {ev.title || ev.name}</b> — {ev.summary}
            {ev.ms ? <span className={styles.eventMs}> {ev.ms} мс</span> : null}
            {ev.error ? <div className={styles.eventError}>{ev.error}</div> : null}
          </span>
        </div>
      );
    }
    if (ev.type === 'llm') {
      return (
        <div key={index} className={`${styles.event} ${styles.event_llm}`}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>
            шаг {ev.step}: {ev.final ? 'формирует ответ' : `выбирает инструменты: ${(ev.planned || []).join(', ')}`}
          </span>
        </div>
      );
    }
    if (ev.type === 'log') {
      return (
        <div key={index} className={`${styles.event} ${ev.level === 'error' ? styles.event_error : styles.event_log}`}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>{ev.message}</span>
        </div>
      );
    }
    if (ev.type === 'start') {
      return (
        <div key={index} className={`${styles.event} ${styles.event_log}`}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>
            запуск: модель {ev.model}, инструментов доступно {ev.tools?.length || 0}
          </span>
        </div>
      );
    }
    if (ev.type === 'error') {
      return (
        <div key={index} className={`${styles.event} ${styles.event_error}`}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>Ошибка: {ev.message}</span>
        </div>
      );
    }
    return null;
  };

  const toolCount = useMemo(() => (catalog?.total ? `${catalog.total}` : '—'), [catalog]);

  return (
    <Layout>
      {isLoading && (
        <>
          <BackgroundLoader />
          <Loader />
        </>
      )}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
      <Content>
        <div className={styles.block__pageName}>
          <BeforeSearch
            title='Агентный режим'
            link='https://tsdoc.headsmade.com/en/smart-agent'
          />
        </div>

        <div className={styles.hint}>
          Агент сам выбирает инструменты Tellscope ({toolCount} доступно), выполняет запросы к данным и моделям
          и собирает аналитику, а по запросу — готовый отчёт с графиками и ссылками на источники.
        </div>

        {isSuccess && Object.keys(dataUser || {}).length > 0 && <DataForSearch />}

        <div className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Инструменты агента</h3>
              <div className={styles.panelActions}>
                <button type='button' className={styles.linkBtn} onClick={() => setSelectedTools((catalog?.default_enabled) || [])}>
                  только рекомендованные
                </button>
                <button
                  type='button'
                  className={styles.linkBtn}
                  onClick={() => setSelectedTools((catalog?.groups || []).flatMap(g => (g.tools || []).map(t => t.name)))}
                >
                  все
                </button>
              </div>
            </div>
            {(catalog?.groups || []).map(group => {
              const names = (group.tools || []).map(tool => tool.name);
              const enabled = names.length > 0 && names.every(name => selectedTools.includes(name));
              return (
                <div key={group.id} className={styles.toolGroup}>
                  <label className={styles.toolGroupHeader}>
                    <input type='checkbox' checked={enabled} onChange={e => toggleGroup(group, e.target.checked)} />
                    <span>{group.title}</span>
                    <span className={styles.toolGroupHint}>{group.hint}</span>
                  </label>
                  <div className={styles.toolList}>
                    {(group.tools || []).map(tool => (
                      <label key={tool.name} className={styles.toolItem} title={tool.description}>
                        <input
                          type='checkbox'
                          checked={selectedTools.includes(tool.name)}
                          onChange={() => toggleTool(tool.name)}
                        />
                        <span className={styles.toolName}>{tool.name}</span>
                        <span className={styles.toolTitle}>{tool.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Задача</h3>
            </div>
            <textarea
              className={styles.textarea}
              rows={5}
              value={task}
              onChange={e => setTask(e.target.value)}
              disabled={isRunning}
              placeholder='Что нужно выяснить по данным? Например: сравни 2025 и 2026 годы по тональности, площадкам и инфоповодам, покажи динамику и сделай отчёт.'
            />
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Модель</span>
                <select value={model} onChange={e => setModel(e.target.value)} disabled={isRunning}>
                  {(catalog?.models || [{ id: 'gpt', label: 'GPT-4.1 mini — дёшево' }]).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {item.price_in || item.price_out
                        ? ` · $${item.price_in}/$${item.price_out} за 1M токенов`
                        : ' · без оплаты'}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Бюджет прогона, токенов</span>
                <input
                  type="number"
                  min="20000"
                  max="2000000"
                  step="10000"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  disabled={isRunning}
                />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Папка отчётов</span>
                <input value={folder} onChange={e => setFolder(e.target.value)} disabled={isRunning} />
              </label>
              {spend && (
                <div className={styles.spendBox}>
                  <span>Расход токенов за сегодня</span>
                  <b>
                    {spend.tokens_today.toLocaleString('ru-RU')}
                    {spend.limit ? ` / ${spend.limit.toLocaleString('ru-RU')}` : ''}
                  </b>
                  <span>
                    запусков: {spend.runs_today}
                    {spend.runs_limit ? ` / ${spend.runs_limit}` : ''}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.runRow}>
              <Button
                style={{ width: 'calc(240/1440*100vw)', height: 'calc(52/1440*100vw)' }}
                onClick={handleRun}
                disabled={isRunning || !task.trim()}
              >
                {isRunning ? 'Агент работает…' : 'Запустить агента'}
              </Button>
              <span className={styles.selectedInfo}>
                инструментов выбрано: {selectedTools.length}
                {dataForRequest.index !== null ? `, датасет: ${dataForRequest.index}` : ', датасет не выбран'}
              </span>
            </div>
            {runState?.status && (
              <div className={styles.statusLine}>
                Статус: {STATUS_LABELS[runState.status] || runState.status}
                {runId ? <span className={styles.runId}> · {runId.slice(0, 8)}</span> : null}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className={styles.errorBlock}>
            <h4>Ошибка</h4>
            <p>{error}</p>
          </div>
        )}

        {events.length > 0 && (
          <div className={styles.progressContainer}>
            <div className={styles.progressHeader}>
              <h3>Журнал работы агента</h3>
              {isRunning && <div className={styles.spinner} />}
            </div>
            <div ref={progressLogRef} className={styles.progressLog}>
              {events.map(renderEvent)}
            </div>
          </div>
        )}

        {answer && (
          <div className={styles.answerBlock}>
            <h3>Ответ агента</h3>
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{answer}</ReactMarkdown>
          </div>
        )}

        {artifacts.length > 0 && (
          <div className={styles.artifactsBlock}>
            <h3>Артефакты запуска</h3>
            <div className={styles.artifactsList}>
              {artifacts.map(art => (
                <div key={`${art.kind}-${art.name}`} className={styles.artifactCard}>
                  <div className={styles.artifactHead}>
                    <span className={styles.artifactKind}>{art.kind === 'chart' ? 'график' : 'файл'}</span>
                    <span className={styles.artifactName}>{art.name}</span>
                  </div>
                  {art.kind === 'chart' && previews[art.name] ? (
                    <img className={styles.artifactImage} src={previews[art.name]} alt={art.title} />
                  ) : null}
                  <Button
                    style={{ width: 'calc(200/1440*100vw)', height: 'calc(44/1440*100vw)' }}
                    onClick={() => downloadArtifact(art)}
                  >
                    Скачать
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && (
          <div className={styles.statsBlock}>
            <h3>Показатели запуска</h3>
            <div className={styles.statsGrid}>
              <div><span>обращений к модели</span><b>{stats.llm_calls}</b></div>
              <div><span>вызовов инструментов</span><b>{stats.tool_calls}</b></div>
              <div>
                <span>токенов</span>
                <b>
                  {stats.tokens}
                  {stats.token_budget ? ` / ${stats.token_budget}` : ''}
                </b>
              </div>
              <div>
                <span>стоимость прогона</span>
                <b>{stats.cost_usd ? `$${stats.cost_usd}` : 'бесплатно'}</b>
              </div>
              <div><span>артефактов</span><b>{stats.artifacts}</b></div>
            </div>
            {stats.model ? <div className={styles.statsTools}>Модель: {stats.model}</div> : null}
            {stats.tools_used?.length ? (
              <div className={styles.statsTools}>Использованы: {stats.tools_used.join(', ')}</div>
            ) : null}
            {stats.notes?.length ? (
              <ul className={styles.statsNotes}>
                {stats.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>История запусков</h3>
              <button type='button' className={styles.linkBtn} onClick={loadHistory}>
                обновить
              </button>
            </div>
            <div className={styles.historyList}>
              {history.length === 0 && <div className={styles.empty}>Пока нет запусков</div>}
              {history.map(item => (
                <button
                  key={item.run_id}
                  type='button'
                  className={`${styles.historyItem} ${item.run_id === runId ? styles.historyItem_active : ''}`}
                  onClick={() => openRun(item.run_id)}
                >
                  <span className={styles.historyTop}>
                    <b>{STATUS_LABELS[item.status] || item.status}</b>
                    <span>{item.created_at}</span>
                  </span>
                  <span className={styles.historyTask}>{item.task}</span>
                  <span className={styles.historyMeta}>
                    {item.model_label} · инструментов {item.tools?.length || 0}
                    {item.dataset_name ? ` · ${item.dataset_name}` : ''}
                    {item.stats?.tokens ? ` · ${item.stats.tokens} токенов` : ''}
                    {item.cost_usd ? ` · $${item.cost_usd}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Внешние инструменты (коннекторы)</h3>
            </div>
            <div className={styles.empty}>
              Подключите свои сервисы по HTTP или MCP — агент сможет вызывать их как инструменты.
            </div>
            <div className={styles.connectorList}>
              {connectors.map(item => (
                <div key={item.name} className={styles.connectorItem}>
                  <div>
                    <b>{item.name}</b>
                    <span className={styles.connectorMeta}>
                      {item.type}
                      {item.base_url ? ` · ${item.base_url}` : ''}
                      {item.has_secret ? ' · секрет сохранён' : ''}
                    </span>
                  </div>
                  <button type='button' className={styles.linkBtn} onClick={() => removeConnector(item.name)}>
                    удалить
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.connectorForm}>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Имя</span>
                  <input
                    value={connectorForm.name}
                    onChange={e => setConnectorForm({ ...connectorForm, name: e.target.value })}
                    placeholder='crm'
                  />
                </label>
                <label className={styles.field}>
                  <span>Тип</span>
                  <select
                    value={connectorForm.type}
                    onChange={e => setConnectorForm({ ...connectorForm, type: e.target.value })}
                  >
                    <option value='http'>HTTP</option>
                    <option value='mcp'>MCP</option>
                  </select>
                </label>
              </div>
              <label className={styles.field}>
                <span>{connectorForm.type === 'mcp' ? 'URL MCP-сервера' : 'Базовый URL'}</span>
                <input
                  value={connectorForm.url}
                  onChange={e => setConnectorForm({ ...connectorForm, url: e.target.value })}
                  placeholder='https://service.example.com/api'
                />
              </label>
              <label className={styles.field}>
                <span>Токен (необязательно)</span>
                <input
                  value={connectorForm.token}
                  onChange={e => setConnectorForm({ ...connectorForm, token: e.target.value })}
                  placeholder='Bearer-токен доступа'
                />
              </label>
              <Button
                style={{ width: 'calc(200/1440*100vw)', height: 'calc(46/1440*100vw)' }}
                onClick={saveConnector}
              >
                Добавить коннектор
              </Button>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AgentMode;
