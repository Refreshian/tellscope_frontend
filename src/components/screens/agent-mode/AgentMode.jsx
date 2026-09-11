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

import { TOKEN } from '@/app.constants';
import { $axios } from '@/api';
import styles from './AgentMode.module.scss';

const STATUS_LABELS = {
  queued: 'В очереди',
  running: 'Работает',
  completed: 'Готово',
  failed: 'Ошибка',
};

const QUICK_TASKS = [
  {
    title: 'Подробный разбор темы',
    task: 'Сделай подробный анализ темы: о чём пишут, на что жалуются, какие детали, приведи примеры со ссылками и собери отчёт.',
  },
  {
    title: 'Сводный отчёт по бренду',
    task: 'Собери сводный отчёт: динамика упоминаний, тональность, площадки, ключевые инфоповоды и выводы. С графиками.',
  },
  {
    title: 'Негатив и жалобы',
    task: 'Разбери негатив и жалобы: темы, площадки, города, конкретные примеры со ссылками и что с этим делать.',
  },
  {
    title: 'Сравнить периоды',
    task: 'Сравни два периода по объёму упоминаний, тональности и инфоповодам: что изменилось и почему.',
  },
];

const apiPath = url => (url || '').replace(/^\/api/, '');

const AgentMode = () => {
  useCheckAuth();

  const { pathname } = useLocation();
  const { addData, addMinDate, addMaxDate, addIndex } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(state => state.dataUsersSlice);

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
  const [task, setTask] = useState('');

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

  // второстепенное скрыто по умолчанию
  const [showTools, setShowTools] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    ws.onclose = () => setIsRunning(false);
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

  const runParamRef = useRef(null);
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('run');
    if (requested && requested !== runParamRef.current) {
      runParamRef.current = requested;
      openRun(requested);
    }
  }, [location.search, openRun]);

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

  const saveConnector = useCallback(async () => {
    if (!connectorForm.name.trim() || !connectorForm.url.trim()) {
      setError('Для коннектора нужны имя и адрес');
      return;
    }
    try {
      const body = { name: connectorForm.name, type: connectorForm.type, description: connectorForm.description };
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

  const datasetChosen = dataForRequest.index !== null && dataForRequest.index !== undefined;
  const models = catalog?.models || [{ id: 'gpt', label: 'GPT-4.1 mini — дёшево' }];
  const reports = useMemo(() => artifacts.filter(item => item.kind === 'report'), [artifacts]);
  const charts = useMemo(() => artifacts.filter(item => item.kind !== 'report'), [artifacts]);

  const renderEvent = (ev, index) => {
    const time = new Date(ev.ts || Date.now()).toLocaleTimeString();
    if (ev.type === 'tool_start') {
      return (
        <div key={index} className={`${styles.event} ${styles.event_tool}`}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.eventBody}>
            <b>{ev.title || ev.name}</b>
            <code className={styles.eventArgs}>{JSON.stringify(ev.args || {})}</code>
          </span>
        </div>
      );
    }
    if (ev.type === 'tool_end') {
      return (
        <div key={index} className={`${styles.event} ${ev.ok ? styles.event_ok : styles.event_error}`}>
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
            {ev.final ? 'формирует ответ' : `выбирает инструменты: ${(ev.planned || []).join(', ')}`}
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
            запуск: модель {ev.model}, инструментов доступно {(ev.tools || []).length}
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
          <BeforeSearch title='Агентный режим' link='https://tsdoc.headsmade.com/en/smart-agent' />
        </div>

        <p className={styles.lead}>
          Опишите, что нужно выяснить по данным: агент сам выберет инструменты, соберёт цифры и примеры со ссылками,
          подготовит отчёт. Нужен регулярный процесс — сохраните агента на странице «Мои агенты».
        </p>

        <div className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNumber}>1</span>
            <div>
              <div className={styles.stepTitle}>Выберите данные</div>
              <div className={styles.stepHint}>набор данных и период, по которым работает агент</div>
            </div>
            {datasetChosen ? <span className={styles.stepDone}>выбрано</span> : null}
          </div>
          {isSuccess && Object.keys(dataUser || {}).length > 0 && <DataForSearch />}
        </div>

        <div className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNumber}>2</span>
            <div>
              <div className={styles.stepTitle}>Опишите задачу</div>
              <div className={styles.stepHint}>что нужно выяснить: тема, сравнение, период, формат результата</div>
            </div>
          </div>
          <textarea
            className={styles.textarea}
            rows={4}
            value={task}
            onChange={e => setTask(e.target.value)}
            disabled={isRunning}
            placeholder='Например: сделай подробный анализ темы «отравились» — о чём пишут, на что жалуются, примеры со ссылками, и собери отчёт'
          />
          <div className={styles.quickTasks}>
            {QUICK_TASKS.map(item => (
              <button
                key={item.title}
                type='button'
                className={styles.quickTask}
                onClick={() => setTask(item.task)}
                disabled={isRunning}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.runBar}>
          <Button
            style={{ width: 'calc(280/1440*100vw)', height: 'calc(56/1440*100vw)' }}
            onClick={handleRun}
            disabled={isRunning || !task.trim() || !datasetChosen}
          >
            {isRunning ? 'Агент работает…' : 'Запустить анализ'}
          </Button>
          <div className={styles.runBarInfo}>
            <span className={styles.runBarPrimary}>
              Инструментов: {selectedTools.length} из {catalog?.total ?? '—'}
              {!datasetChosen ? ' · сначала выберите данные' : ''}
            </span>
            <button type='button' className={styles.linkBtn} onClick={() => setShowTools(v => !v)}>
              {showTools ? 'скрыть настройку инструментов' : 'настроить инструменты'}
            </button>
            {spend ? (
              <span className={styles.runBarMuted}>
                токенов сегодня: {spend.tokens_today.toLocaleString('ru-RU')}
                {spend.limit ? ` / ${spend.limit.toLocaleString('ru-RU')}` : ''}
                {runState?.status ? ` · статус: ${STATUS_LABELS[runState.status] || runState.status}` : ''}
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.advancedToggle}>
          <button type='button' className={styles.linkBtn} onClick={() => setShowAdvanced(v => !v)}>
            {showAdvanced ? 'скрыть дополнительные настройки' : 'дополнительно: модель, бюджет, папка отчётов'}
          </button>
        </div>

        {showTools && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h3>Инструменты агента</h3>
              <div className={styles.panelActions}>
                <button type='button' className={styles.linkBtn} onClick={() => setSelectedTools(catalog?.default_enabled || [])}>
                  рекомендованные
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
            {(catalog?.groups || []).map(group => (
              <div key={group.id} className={styles.toolGroup}>
                <div className={styles.toolGroupTitle}>{group.title}</div>
                <div className={styles.toolsGrid}>
                  {(group.tools || []).map(tool => (
                    <label key={tool.name} className={styles.checkbox} title={tool.description}>
                      <input
                        type='checkbox'
                        checked={selectedTools.includes(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                      />
                      <span>{tool.title || tool.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showAdvanced && (
          <div className={styles.panel}>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Модель агента</span>
                <select value={model} onChange={e => setModel(e.target.value)} disabled={isRunning}>
                  {models.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {item.price_in || item.price_out ? ` · $${item.price_in}/$${item.price_out} за 1M токенов` : ' · без оплаты'}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Бюджет прогона, токенов</span>
                <input
                  type='number'
                  min='20000'
                  max='2000000'
                  step='10000'
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  disabled={isRunning}
                />
              </label>
              <label className={styles.field}>
                <span>Папка отчётов</span>
                <input value={folder} onChange={e => setFolder(e.target.value)} disabled={isRunning} />
              </label>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBlock}>
            <h4>Не получилось</h4>
            <p>{error}</p>
          </div>
        )}

        {(events.length > 0 || isRunning) && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h3>{isRunning ? 'Агент работает' : 'Ход выполнения'}</h3>
              {isRunning && <span className={styles.spinner} />}
            </div>
            <div ref={progressLogRef} className={styles.progressLog}>
              {events.map(renderEvent)}
            </div>
          </div>
        )}

        {answer && (
          <div className={styles.answerCard}>
            <div className={styles.panelHead}>
              <h3>Ответ агента</h3>
              {runId ? <span className={styles.runningHint}>запуск {runId.slice(0, 8)}</span> : null}
            </div>
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{answer}</ReactMarkdown>
          </div>
        )}

        {reports.length > 0 && (
          <div className={styles.reportsCard}>
            <div className={styles.panelHead}>
              <h3>Готовые отчёты</h3>
              <span className={styles.runningHint}>сохранены во вкладке «Отчёты»</span>
            </div>
            <div className={styles.reportList}>
              {reports.map(art => (
                <button key={art.name} type='button' className={styles.reportItem} onClick={() => downloadArtifact(art)}>
                  <span className={styles.reportName}>{art.name}</span>
                  <span className={styles.reportAction}>скачать</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {charts.length > 0 && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h3>Графики и файлы запуска</h3>
            </div>
            <div className={styles.artifactsList}>
              {charts.map(art => (
                <div key={`${art.kind}-${art.name}`} className={styles.artifactCard}>
                  <div className={styles.artifactHead}>
                    <span className={styles.artifactKind}>{art.kind === 'chart' ? 'график' : art.kind}</span>
                    <span className={styles.artifactName}>{art.name}</span>
                  </div>
                  {art.kind === 'chart' && previews[art.name] ? (
                    <img className={styles.artifactImage} src={previews[art.name]} alt={art.title} />
                  ) : null}
                  <button type='button' className={styles.linkBtn} onClick={() => downloadArtifact(art)}>
                    скачать
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && (
          <div className={styles.panel}>
            <div className={styles.statsGrid}>
              <div><span>обращений к модели</span><b>{stats.llm_calls}</b></div>
              <div><span>вызовов инструментов</span><b>{stats.tool_calls}</b></div>
              <div>
                <span>токенов</span>
                <b>{stats.tokens}{stats.token_budget ? ` / ${stats.token_budget}` : ''}</b>
              </div>
              <div>
                <span>стоимость</span>
                <b>{stats.cost_usd ? `$${stats.cost_usd}` : 'бесплатно'}</b>
              </div>
            </div>
            {stats.notes?.length ? (
              <ul className={styles.statsNotes}>
                {stats.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <div className={styles.footerRow}>
          <button type='button' className={styles.footerToggle} onClick={() => setShowHistory(v => !v)}>
            История запусков ({history.length})
          </button>
          <button type='button' className={styles.footerToggle} onClick={() => setShowConnectors(v => !v)}>
            Внешние инструменты ({connectors.length})
          </button>
        </div>

        {showHistory && (
          <div className={styles.panel}>
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
                    {item.model_label}
                    {item.dataset_name ? ` · ${item.dataset_name}` : ''}
                    {item.stats?.tokens ? ` · ${item.stats.tokens} токенов` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showConnectors && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h3>Внешние инструменты</h3>
              <span className={styles.runningHint}>
                подключите свои сервисы по HTTP или MCP — агент сможет вызывать их как инструменты
              </span>
            </div>
            <div className={styles.connectorList}>
              {connectors.length === 0 && <div className={styles.empty}>Пока ничего не подключено</div>}
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
                  <button type='button' className={styles.linkBtnDanger} onClick={() => removeConnector(item.name)}>
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
              <div>
                <Button
                  style={{ width: 'calc(220/1440*100vw)', height: 'calc(46/1440*100vw)' }}
                  onClick={saveConnector}
                >
                  Добавить коннектор
                </Button>
              </div>
            </div>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default AgentMode;
