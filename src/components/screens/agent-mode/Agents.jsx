import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

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

import { $axios } from '@/api';
import styles from './Agents.module.scss';

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];

const emptySchedule = () => ({ enabled: false, mode: 'manual', hour: 9, minute: 0, weekdays: [1, 2, 3, 4, 5] });

const Agents = () => {
  useCheckAuth();

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { addData, addMinDate, addMaxDate, addIndex } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(state => state.dataUsersSlice);

  const { data: data_getUserId } = useGetUserIdQuery();
  const { data, isError, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);

  const [agents, setAgents] = useState([]);
  const [presets, setPresets] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [meta, setMeta] = useState({ models: [], default_model: 'gpt', default_token_budget: 120000, tokens_today: 0, tokens_per_day_limit: 0 });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

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

  const datasetLabel = useMemo(() => {
    if (dataForRequest.index === null || dataForRequest.index === undefined) return '';
    const folders = Object.entries(dataUser || {});
    for (const [, files] of folders) {
      for (const file of files || []) {
        if (file === undefined) continue;
      }
    }
    return `датасет ${dataForRequest.index}`;
  }, [dataForRequest.index, dataUser]);

  const load = useCallback(async () => {
    try {
      const [{ data: list }, { data: tools }] = await Promise.all([
        $axios.get('/agent/agents'),
        $axios.get('/agent/tools'),
      ]);
      setAgents(list.agents || []);
      setPresets(list.presets || []);
      setMeta({
        models: list.models || [],
        default_model: list.default_model || 'gpt',
        default_token_budget: list.default_token_budget || 120000,
        tokens_today: list.tokens_today || 0,
        tokens_per_day_limit: list.tokens_per_day_limit || 0,
      });
      setCatalog(tools);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить агентов');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toolOptions = useMemo(
    () => (catalog?.groups || []).flatMap(group => (group.tools || []).map(tool => ({ ...tool, group: group.title }))),
    [catalog]
  );

  const startFromPreset = useCallback(
    async preset => {
      if (dataForRequest.index === null || dataForRequest.index === undefined) {
        setError('Сначала выберите набор данных и период');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await $axios.post('/agent/agents', {
          preset: preset.id,
          dataset_index: dataForRequest.index,
        });
        setNotice(`Агент «${preset.name}» добавлен. Настроить расписание можно в его карточке.`);
        await load();
      } catch (err) {
        setError(err.response?.data?.detail || 'Не удалось добавить агента');
      } finally {
        setBusy(false);
      }
    },
    [dataForRequest.index, load]
  );

  const runAgent = useCallback(
    async agent => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const { data: started } = await $axios.post(`/agent/agents/${agent.id}/run`);
        setNotice(`Агент «${agent.name}» запущен. Открываю журнал выполнения…`);
        await load();
        setTimeout(() => navigate(`/agent-mode?run=${started.run_id}`), 700);
      } catch (err) {
        setError(err.response?.data?.detail || 'Не удалось запустить агента');
      } finally {
        setBusy(false);
      }
    },
    [load, navigate]
  );

  const removeAgent = useCallback(
    async agent => {
      setBusy(true);
      try {
        await $axios.delete(`/agent/agents/${agent.id}`);
        await load();
      } catch (err) {
        setError(err.response?.data?.detail || 'Не удалось удалить агента');
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const openEditor = useCallback(
    agent => {
      setEditor({
        id: agent?.id || null,
        name: agent?.name || '',
        description: agent?.description || '',
        instruction: agent?.instruction || '',
        tools: agent?.tools || catalog?.default_enabled || [],
        model: agent?.model || meta.default_model,
        token_budget: agent?.token_budget || meta.default_token_budget,
        folder: agent?.folder || 'Агент',
        dataset_index: agent?.dataset_index ?? dataForRequest.index ?? null,
        dataset_name: agent?.dataset_name || datasetLabel,
        schedule: agent?.schedule ? { ...emptySchedule(), ...agent.schedule } : emptySchedule(),
        enabled: agent?.enabled ?? true,
      });
    },
    [catalog, meta, dataForRequest.index, datasetLabel]
  );

  const saveEditor = useCallback(async () => {
    if (!editor) return;
    if (!editor.name.trim() || editor.instruction.trim().length < 20) {
      setError('Нужны название и инструкция (не короче 20 символов)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await $axios.post('/agent/agents', {
        id: editor.id || undefined,
        name: editor.name,
        description: editor.description,
        instruction: editor.instruction,
        tools: editor.tools,
        model: editor.model,
        token_budget: Number(editor.token_budget) || meta.default_token_budget,
        dataset_index: editor.dataset_index,
        folder: editor.folder,
        schedule: editor.schedule,
        enabled: editor.enabled,
      });
      setEditor(null);
      setNotice('Агент сохранён');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось сохранить агента');
    } finally {
      setBusy(false);
    }
  }, [editor, meta.default_token_budget, load]);

  const toggleTool = useCallback(name => {
    setEditor(prev => {
      if (!prev) return prev;
      const has = prev.tools.includes(name);
      return { ...prev, tools: has ? prev.tools.filter(item => item !== name) : [...prev.tools, name] };
    });
  }, []);

  const toggleWeekday = useCallback(day => {
    setEditor(prev => {
      if (!prev) return prev;
      const days = prev.schedule.weekdays || [];
      const next = days.includes(day) ? days.filter(item => item !== day) : [...days, day].sort((a, b) => a - b);
      return { ...prev, schedule: { ...prev.schedule, weekdays: next.length ? next : [day] } };
    });
  }, []);

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
          <BeforeSearch title='Мои агенты' link='https://tsdoc.headsmade.com/en/smart-agent' />
        </div>

        <div className={styles.hint}>
          Агент — это сохранённая задача для аналитика Tellscope: инструкция, набор инструментов, модель, датасет и расписание.
          Добавьте готовый шаблон или соберите своего агента, запускайте вручную или по расписанию — отчёты попадают во вкладку «Отчёты».
          {meta.tokens_per_day_limit ? (
            <span className={styles.hintSpend}>
              Токенов израсходовано сегодня: {meta.tokens_today.toLocaleString('ru-RU')} из {meta.tokens_per_day_limit.toLocaleString('ru-RU')}
            </span>
          ) : null}
        </div>

        {isSuccess && Object.keys(dataUser || {}).length > 0 && <DataForSearch />}

        {error && (
          <div className={styles.errorBlock}>
            <h4>Ошибка</h4>
            <p>{error}</p>
          </div>
        )}
        {notice && <div className={styles.noticeBlock}>{notice}</div>}

        <div className={styles.section}>
          <h3>Готовые шаблоны</h3>
          <div className={styles.cards}>
            {presets.map(preset => (
              <div key={preset.id} className={styles.card}>
                <div className={styles.cardTitle}>{preset.name}</div>
                <div className={styles.cardText}>{preset.description}</div>
                <div className={styles.cardMeta}>
                  <span>{preset.schedule_text}</span>
                  <span>инструментов: {(preset.tools || []).length}</span>
                  <span>бюджет: {preset.token_budget?.toLocaleString('ru-RU')} токенов</span>
                </div>
                <Button
                  style={{ width: 'calc(220/1440*100vw)', height: 'calc(46/1440*100vw)' }}
                  onClick={() => startFromPreset(preset)}
                  disabled={busy}
                >
                  Добавить агента
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>Мои агенты</h3>
            <div className={styles.sectionActions}>
              <button type="button" className={styles.linkBtn} onClick={() => openEditor(null)}>
                создать с нуля
              </button>
              <button type="button" className={styles.linkBtn} onClick={load}>
                обновить
              </button>
            </div>
          </div>
          {agents.length === 0 && <div className={styles.empty}>Пока нет ни одного агента — добавьте шаблон выше.</div>}
          <div className={styles.cards}>
            {agents.map(agent => (
              <div key={agent.id} className={`${styles.card} ${agent.enabled ? '' : styles.card_off}`}>
                <div className={styles.cardTitle}>{agent.name}</div>
                <div className={styles.cardText}>{agent.description || agent.instruction?.slice(0, 160)}</div>
                <div className={styles.cardMeta}>
                  <span>{agent.schedule_text}</span>
                  <span>{agent.dataset_name || 'датасет не выбран'}</span>
                  <span>{agent.model === 'qwen' ? 'Qwen (локально)' : agent.model === 'claude' ? 'Claude' : 'GPT-4.1 mini'}</span>
                  <span>инструментов: {agent.tools_count ?? (agent.tools || []).length}</span>
                  <span>бюджет: {(agent.token_budget || 0).toLocaleString('ru-RU')}</span>
                  {agent.last_run_at ? <span>последний запуск: {agent.last_run_at}</span> : null}
                </div>
                <div className={styles.cardButtons}>
                  <Button
                    style={{ width: 'calc(170/1440*100vw)', height: 'calc(44/1440*100vw)' }}
                    onClick={() => runAgent(agent)}
                    disabled={busy}
                  >
                    Запустить
                  </Button>
                  <button type="button" className={styles.linkBtn} onClick={() => openEditor(agent)}>
                    изменить
                  </button>
                  {agent.last_run_id ? (
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => navigate(`/agent-mode?run=${agent.last_run_id}`)}
                    >
                      журнал
                    </button>
                  ) : null}
                  <button type="button" className={styles.linkBtnDanger} onClick={() => removeAgent(agent)}>
                    удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {editor && (
          <div className={styles.editor}>
            <div className={styles.sectionHead}>
              <h3>{editor.id ? 'Настройка агента' : 'Новый агент'}</h3>
              <button type="button" className={styles.linkBtn} onClick={() => setEditor(null)}>
                закрыть
              </button>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Название</span>
                <input value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Короткое описание</span>
                <input value={editor.description} onChange={e => setEditor({ ...editor, description: e.target.value })} />
              </label>
            </div>
            <label className={styles.field}>
              <span>Инструкция агенту (что и за какой период сделать)</span>
              <textarea
                rows={7}
                value={editor.instruction}
                onChange={e => setEditor({ ...editor, instruction: e.target.value })}
              />
            </label>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Модель</span>
                <select value={editor.model} onChange={e => setEditor({ ...editor, model: e.target.value })}>
                  {(meta.models || []).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {item.price_in ? ` · $${item.price_in}/$${item.price_out}` : ' · без оплаты'}
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
                  value={editor.token_budget}
                  onChange={e => setEditor({ ...editor, token_budget: e.target.value })}
                />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Датасет (index)</span>
                <input
                  type="number"
                  value={editor.dataset_index ?? ''}
                  onChange={e => setEditor({ ...editor, dataset_index: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </label>
              <label className={styles.field}>
                <span>Папка отчётов</span>
                <input value={editor.folder} onChange={e => setEditor({ ...editor, folder: e.target.value })} />
              </label>
            </div>

            <div className={styles.scheduleBlock}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={editor.schedule.enabled}
                  onChange={e =>
                    setEditor({
                      ...editor,
                      schedule: { ...editor.schedule, enabled: e.target.checked, mode: e.target.checked ? (editor.schedule.mode === 'manual' ? 'daily' : editor.schedule.mode) : 'manual' },
                    })
                  }
                />
                <span>Запускать по расписанию</span>
              </label>
              {editor.schedule.enabled && (
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Периодичность</span>
                    <select
                      value={editor.schedule.mode}
                      onChange={e => setEditor({ ...editor, schedule: { ...editor.schedule, mode: e.target.value } })}
                    >
                      <option value="daily">ежедневно</option>
                      <option value="weekly">еженедельно</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Время</span>
                    <div className={styles.timeRow}>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={editor.schedule.hour}
                        onChange={e => setEditor({ ...editor, schedule: { ...editor.schedule, hour: Number(e.target.value) } })}
                      />
                      <span>:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editor.schedule.minute}
                        onChange={e => setEditor({ ...editor, schedule: { ...editor.schedule, minute: Number(e.target.value) } })}
                      />
                    </div>
                  </label>
                </div>
              )}
              {editor.schedule.enabled && editor.schedule.mode === 'weekly' && (
                <div className={styles.weekdays}>
                  {WEEKDAYS.map(day => (
                    <label key={day.value} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={(editor.schedule.weekdays || []).includes(day.value)}
                        onChange={() => toggleWeekday(day.value)}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.toolsBlock}>
              <div className={styles.toolsHead}>Инструменты агента: выбрано {editor.tools.length}</div>
              <div className={styles.toolsGrid}>
                {toolOptions.map(tool => (
                  <label key={tool.name} className={styles.checkbox} title={tool.description}>
                    <input type="checkbox" checked={editor.tools.includes(tool.name)} onChange={() => toggleTool(tool.name)} />
                    <span>{tool.title || tool.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.cardButtons}>
              <Button
                style={{ width: 'calc(220/1440*100vw)', height: 'calc(46/1440*100vw)' }}
                onClick={saveEditor}
                disabled={busy}
              >
                Сохранить агента
              </Button>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={editor.enabled}
                  onChange={e => setEditor({ ...editor, enabled: e.target.checked })}
                />
                <span>агент включён</span>
              </label>
            </div>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Agents;
