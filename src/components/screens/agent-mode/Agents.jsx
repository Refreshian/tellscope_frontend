import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '@/services/other.service';

import ThemePicker from '@/components/ui/theme-picker/ThemePicker';

import { $axios } from '@/api';
import { fmtDay } from '@/utils/fileMeta';
import { truncateDescription } from '@/utils/editText';
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
  const [meta, setMeta] = useState({
    models: [],
    step_kinds: [],
    default_model: 'gpt',
    default_token_budget: 120000,
    tokens_today: 0,
    tokens_per_day_limit: 0,
  });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // второстепенные блоки скрыты по умолчанию
  const [showPresets, setShowPresets] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openStep, setOpenStep] = useState(null);

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

  const datasetChosen = dataForRequest.index !== null && dataForRequest.index !== undefined;

  const datasetOption = useMemo(() => {
    const list = Object.values(dataUser || {}).flat();
    return (
      list.find(item => item && item.index_number === dataForRequest.index && !item['html-file']) || null
    );
  }, [dataUser, dataForRequest.index]);

  const datasetLabel = datasetOption
    ? truncateDescription(datasetOption.file || '', 34)
    : datasetChosen
      ? `набор #${dataForRequest.index}`
      : '';

  const periodLabel = useMemo(() => {
    if (datasetOption?.min_data && datasetOption?.max_data) {
      return `${fmtDay(datasetOption.min_data)} — ${fmtDay(datasetOption.max_data)}`;
    }
    return '';
  }, [datasetOption]);

  const pickTheme = useCallback(
    option => {
      addIndex(option.index_number);
      if (option.min_data) addMinDate(option.min_data);
      if (option.max_data) addMaxDate(option.max_data);
    },
    [addIndex, addMinDate, addMaxDate]
  );

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
        step_kinds: list.step_kinds || [],
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
      if (!datasetChosen) {
        setError('Сначала выберите набор данных и период');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await $axios.post('/agent/agents', { preset: preset.id, dataset_index: dataForRequest.index });
        setNotice(`Агент «${preset.name}» добавлен. Расписание можно изменить в его карточке.`);
        await load();
      } catch (err) {
        setError(err.response?.data?.detail || 'Не удалось добавить агента');
      } finally {
        setBusy(false);
      }
    },
    [dataForRequest.index, datasetChosen, load]
  );

  const runAgent = useCallback(
    async agent => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const { data: started } = await $axios.post(`/agent/agents/${agent.id}/run`);
        setNotice(`Агент «${agent.name}» запущен — открываю журнал выполнения`);
        await load();
        setTimeout(() => navigate(`/agent-mode?run=${started.run_id}`), 600);
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

  const scrollTop = useCallback(() => {
    const container = document.querySelector('[class*="wrapper_content"]');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openEditor = useCallback(
    agent => {
      scrollTop();
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
        dataset_name: agent?.dataset_name || '',
        schedule: agent?.schedule ? { ...emptySchedule(), ...agent.schedule } : emptySchedule(),
        enabled: agent?.enabled ?? true,
        steps: agent?.steps ? JSON.parse(JSON.stringify(agent.steps)) : [],
      });
      setShowAdvanced(false);
      setOpenStep(null);
    },
    [catalog, meta, dataForRequest.index, scrollTop]
  );

  const stepDefaults = useCallback(
    kind => {
      if (kind === 'tool') {
        return { kind, title: 'Собрать данные', tool: 'dataset_overview', args: { top_n: 10 }, save_as: `step${(editor?.steps?.length || 0) + 1}` };
      }
      if (kind === 'chart') {
        return {
          kind,
          title: 'График',
          from: '{{step1.monthly_dynamics}}',
          label_field: 'month',
          value_field: 'count',
          chart_type: 'line',
          series_name: 'Значение',
          save_as: `step${(editor?.steps?.length || 0) + 1}`,
        };
      }
      if (kind === 'llm') {
        return {
          kind,
          title: 'Выводы ИИ',
          prompt: 'Данные шагов:\n{{step1}}\n\nНапиши аналитический разбор: что видно по динамике, тональности, площадкам и инфоповодам, и какие выводы.',
          save_as: `step${(editor?.steps?.length || 0) + 1}`,
        };
      }
      return {
        kind: 'report',
        title: 'Собрать отчёт',
        report_title: 'Аналитический отчёт',
        subtitle: '',
        sections: [{ heading: 'Аналитика и выводы', text: '{{step1.text}}', chart_ids: [] }],
        save_as: `step${(editor?.steps?.length || 0) + 1}`,
      };
    },
    [editor]
  );

  const addStep = useCallback(
    kind => {
      setEditor(prev => (prev ? { ...prev, steps: [...(prev.steps || []), stepDefaults(kind)] } : prev));
      setOpenStep((editor?.steps?.length || 0));
    },
    [stepDefaults, editor]
  );

  const updateStep = useCallback((index, patch) => {
    setEditor(prev => {
      if (!prev) return prev;
      const steps = [...(prev.steps || [])];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, steps };
    });
  }, []);

  const removeStep = useCallback(index => {
    setEditor(prev => (prev ? { ...prev, steps: (prev.steps || []).filter((_, i) => i !== index) } : prev));
    setOpenStep(null);
  }, []);

  const moveStep = useCallback((index, delta) => {
    setEditor(prev => {
      if (!prev) return prev;
      const steps = [...(prev.steps || [])];
      const target = index + delta;
      if (target < 0 || target >= steps.length) return prev;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...prev, steps };
    });
    setOpenStep(null);
  }, []);

  const applyChain = useCallback(
    presetId => {
      const preset = presets.find(item => item.id === presetId);
      if (!preset?.steps?.length) return;
      setEditor(prev => (prev ? { ...prev, steps: JSON.parse(JSON.stringify(preset.steps)) } : prev));
      setNotice(`Цепочка «${preset.name}» подставлена — проверьте параметры шагов`);
      setOpenStep(null);
    },
    [presets]
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
        steps: editor.steps || [],
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

  const enabledCount = useMemo(() => agents.filter(item => item.enabled).length, [agents]);

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
        <div className={styles.head}>
          <h2 className={styles.headTitle}>Мои агенты</h2>
          <span className={styles.headHint}>
            сохранённые задачи ИИ-аналитика: инструменты, модель, расписание · отчёты — во вкладке «Отчёты»
            {agents.length ? ` · агентов: ${agents.length}` : ''}
            {enabledCount ? ` · включено ${enabledCount}` : ''}
            {meta.tokens_per_day_limit
              ? ` · токенов сегодня: ${meta.tokens_today.toLocaleString('ru-RU')} из ${meta.tokens_per_day_limit.toLocaleString('ru-RU')}`
              : ''}
          </span>
          <div className={styles.headActions}>
            <Button
              style={{ width: '150px', height: '32px', fontSize: '13px' }}
              onClick={() => openEditor(null)}
            >
              Создать агента
            </Button>
            <button type='button' className={styles.chipBtn} onClick={() => setShowPresets(v => !v)}>
              {showPresets ? 'скрыть шаблоны' : `шаблоны (${presets.length})`}
            </button>
            <button type='button' className={styles.chipBtn} onClick={() => navigate('/dify-constructor')}>
              <img src='/images/icons/menu/dify.svg' alt='' />
              конструктор Dify
            </button>
            <button type='button' className={styles.chipBtn} onClick={load}>
              обновить
            </button>
          </div>
        </div>

        <div className={styles.dataRow}>
          <ThemePicker
            dataUser={dataUser}
            currentIndex={dataForRequest.index}
            label={datasetLabel}
            period={periodLabel}
            loading={!isSuccess && !isError}
            failed={isError}
            onPick={pickTheme}
          />
          {!datasetChosen && <span className={styles.dataEmpty}>выберите тему, чтобы запускать агентов</span>}
        </div>

        {error && (
          <div className={styles.errorBlock}>
            <h4>Не получилось</h4>
            <p>{error}</p>
          </div>
        )}
        {notice && <div className={styles.noticeBlock}>{notice}</div>}

        {showPresets && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h3>Готовые шаблоны</h3>
              <span className={styles.panelHint}>
                {datasetChosen ? 'добавятся с выбранным набором данных' : 'сначала выберите набор данных ниже'}
              </span>
            </div>
            <div className={styles.presetsList}>
              {presets.map(preset => (
                <div key={preset.id} className={styles.presetRow}>
                  <div className={styles.presetMain}>
                    <div className={styles.presetTitle}>{preset.name}</div>
                    <div className={styles.presetText}>{preset.description}</div>
                  </div>
                  <div className={styles.presetMeta}>
                    <span>{preset.schedule_text}</span>
                    <span>{(preset.tools || []).length} инструментов</span>
                  </div>
                  <button type='button' className={styles.presetAction} onClick={() => startFromPreset(preset)} disabled={busy}>
                    добавить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {editor && (
          <div className={styles.editor}>
            <div className={styles.panelHead}>
              <h3>{editor.id ? `Настройка: ${editor.name}` : 'Новый агент'}</h3>
              <button type='button' className={styles.linkBtn} onClick={() => setEditor(null)}>
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
              <span>Инструкция агенту — что и за какой период сделать</span>
              <textarea
                rows={6}
                value={editor.instruction}
                onChange={e => setEditor({ ...editor, instruction: e.target.value })}
              />
            </label>

            <div className={styles.stepsBlock}>
              <div className={styles.stepsHead}>
                <div>
                  <div className={styles.stepsTitle}>Шаги агента (цепочка)</div>
                  <div className={styles.stepsHint}>
                    Шаги выполняются по порядку: данные → графики → выводы ИИ → отчёт. В параметрах можно
                    ссылаться на результат шага: {'{{step1}}'} или {'{{step1.monthly_dynamics}}'}.
                    Если шагов нет, агент работает по инструкции выше и сам выбирает инструменты.
                  </div>
                </div>
                <div className={styles.stepsActions}>
                  {(presets || [])
                    .filter(item => (item.steps || []).length)
                    .map(item => (
                      <button key={item.id} type='button' className={styles.linkBtn} onClick={() => applyChain(item.id)}>
                        цепочка: {item.name}
                      </button>
                    ))}
                  <select
                    className={styles.inlineSelect}
                    value=''
                    onChange={e => {
                      if (e.target.value) addStep(e.target.value);
                    }}
                  >
                    <option value=''>+ добавить шаг…</option>
                    {(meta.step_kinds || []).map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(editor.steps || []).length === 0 && (
                <div className={styles.stepsEmpty}>
                  Шагов пока нет — используется режим с инструкцией.
                </div>
              )}

              {(editor.steps || []).map((step, index) => (
                <div key={`${step.save_as || 'step'}-${index}`} className={styles.stepCard}>
                  <div className={styles.stepCardHead}>
                    <span className={styles.stepCardNumber}>{index + 1}</span>
                    <span className={styles.stepCardKind}>
                      {(meta.step_kinds || []).find(item => item.id === step.kind)?.title || step.kind}
                    </span>
                    <input
                      className={styles.stepCardTitle}
                      value={step.title || ''}
                      placeholder='название шага'
                      onChange={e => updateStep(index, { title: e.target.value })}
                    />
                    <button type='button' className={styles.linkBtn} onClick={() => moveStep(index, -1)} title='выше'>
                      ↑
                    </button>
                    <button type='button' className={styles.linkBtn} onClick={() => moveStep(index, 1)} title='ниже'>
                      ↓
                    </button>
                    <button
                      type='button'
                      className={styles.linkBtn}
                      onClick={() => setOpenStep(openStep === index ? null : index)}
                    >
                      {openStep === index ? 'скрыть параметры' : 'параметры'}
                    </button>
                    <button type='button' className={styles.linkBtnDanger} onClick={() => removeStep(index)}>
                      удалить
                    </button>
                  </div>

                  {openStep === index && (
                    <div className={styles.stepCardBody}>
                      {step.kind === 'tool' && (
                        <>
                          <div className={styles.row}>
                            <label className={styles.field}>
                              <span>Инструмент</span>
                              <select value={step.tool || ''} onChange={e => updateStep(index, { tool: e.target.value })}>
                                {(toolOptions || []).map(tool => (
                                  <option key={tool.name} value={tool.name}>
                                    {tool.title || tool.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className={styles.field}>
                              <span>Имя результата (для ссылок {'{{имя}}'})</span>
                              <input
                                value={step.save_as || ''}
                                onChange={e => updateStep(index, { save_as: e.target.value })}
                              />
                            </label>
                          </div>
                          <label className={styles.field}>
                            <span>Аргументы инструмента (JSON)</span>
                            <textarea
                              rows={4}
                              value={JSON.stringify(step.args || {}, null, 1)}
                              onChange={e => {
                                try {
                                  updateStep(index, { args: JSON.parse(e.target.value || '{}') });
                                } catch (err) {
                                  /* некорректный JSON — не применяем, пока не исправят */
                                }
                              }}
                            />
                          </label>
                        </>
                      )}

                      {step.kind === 'chart' && (
                        <>
                          <div className={styles.row}>
                            <label className={styles.field}>
                              <span>Откуда брать данные</span>
                              <input value={step.from || ''} onChange={e => updateStep(index, { from: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                              <span>Тип графика</span>
                              <select value={step.chart_type || 'bar'} onChange={e => updateStep(index, { chart_type: e.target.value })}>
                                <option value='bar'>столбцы</option>
                                <option value='hbar'>горизонтальные</option>
                                <option value='line'>линия</option>
                                <option value='area'>область</option>
                                <option value='pie'>круговая</option>
                              </select>
                            </label>
                          </div>
                          <div className={styles.row}>
                            <label className={styles.field}>
                              <span>Поле подписи</span>
                              <input value={step.label_field || ''} onChange={e => updateStep(index, { label_field: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                              <span>Поле значения</span>
                              <input value={step.value_field || ''} onChange={e => updateStep(index, { value_field: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                              <span>Имя ряда</span>
                              <input value={step.series_name || ''} onChange={e => updateStep(index, { series_name: e.target.value })} />
                            </label>
                          </div>
                        </>
                      )}

                      {step.kind === 'llm' && (
                        <>
                          <label className={styles.field}>
                            <span>Промпт (можно вставлять {'{{данные шагов}}'})</span>
                            <textarea
                              rows={7}
                              value={step.prompt || ''}
                              onChange={e => updateStep(index, { prompt: e.target.value })}
                            />
                          </label>
                          <div className={styles.row}>
                            <label className={styles.field}>
                              <span>Имя результата</span>
                              <input value={step.save_as || ''} onChange={e => updateStep(index, { save_as: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                              <span>Лимит ответа, токенов</span>
                              <input
                                type='number'
                                min='200'
                                max='4000'
                                step='100'
                                value={step.max_tokens || 1600}
                                onChange={e => updateStep(index, { max_tokens: Number(e.target.value) || 1600 })}
                              />
                            </label>
                          </div>
                        </>
                      )}

                      {step.kind === 'report' && (
                        <>
                          <div className={styles.row}>
                            <label className={styles.field}>
                              <span>Заголовок отчёта</span>
                              <input
                                value={step.report_title || ''}
                                onChange={e => updateStep(index, { report_title: e.target.value })}
                              />
                            </label>
                            <label className={styles.field}>
                              <span>Подзаголовок</span>
                              <input value={step.subtitle || ''} onChange={e => updateStep(index, { subtitle: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                              <span>Папка отчётов</span>
                              <input value={step.folder || ''} onChange={e => updateStep(index, { folder: e.target.value })} />
                            </label>
                          </div>
                          <label className={styles.field}>
                            <span>Разделы отчёта (JSON: heading, text, bullets, chart_ids)</span>
                            <textarea
                              rows={6}
                              value={JSON.stringify(step.sections || [], null, 1)}
                              onChange={e => {
                                try {
                                  updateStep(index, { sections: JSON.parse(e.target.value || '[]') });
                                } catch (err) {
                                  /* некорректный JSON — не применяем */
                                }
                              }}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.scheduleRow}>
              <label className={styles.checkbox}>
                <input
                  type='checkbox'
                  checked={editor.schedule.enabled}
                  onChange={e =>
                    setEditor({
                      ...editor,
                      schedule: {
                        ...editor.schedule,
                        enabled: e.target.checked,
                        mode: e.target.checked ? (editor.schedule.mode === 'manual' ? 'daily' : editor.schedule.mode) : 'manual',
                      },
                    })
                  }
                />
                <span>запускать по расписанию</span>
              </label>
              {editor.schedule.enabled && (
                <>
                  <select
                    className={styles.inlineSelect}
                    value={editor.schedule.mode}
                    onChange={e => setEditor({ ...editor, schedule: { ...editor.schedule, mode: e.target.value } })}
                  >
                    <option value='daily'>ежедневно</option>
                    <option value='weekly'>еженедельно</option>
                  </select>
                  <div className={styles.timeRow}>
                    <input
                      type='number'
                      min='0'
                      max='23'
                      value={editor.schedule.hour}
                      onChange={e => setEditor({ ...editor, schedule: { ...editor.schedule, hour: Number(e.target.value) } })}
                    />
                    <span>:</span>
                    <input
                      type='number'
                      min='0'
                      max='59'
                      value={editor.schedule.minute}
                      onChange={e => setEditor({ ...editor, schedule: { ...editor.schedule, minute: Number(e.target.value) } })}
                    />
                  </div>
                  {editor.schedule.mode === 'weekly' && (
                    <div className={styles.weekdays}>
                      {WEEKDAYS.map(day => (
                        <label key={day.value} className={styles.checkbox}>
                          <input
                            type='checkbox'
                            checked={(editor.schedule.weekdays || []).includes(day.value)}
                            onChange={() => toggleWeekday(day.value)}
                          />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <button type='button' className={styles.linkBtn} onClick={() => setShowAdvanced(v => !v)}>
                {showAdvanced ? 'скрыть инструменты и параметры' : 'инструменты, модель, бюджет и папка отчётов'}
              </button>
            </div>

            {showAdvanced && (
              <div className={styles.advancedBox}>
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
                      type='number'
                      min='20000'
                      max='2000000'
                      step='10000'
                      value={editor.token_budget}
                      onChange={e => setEditor({ ...editor, token_budget: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Датасет (index)</span>
                    <input
                      type='number'
                      value={editor.dataset_index ?? ''}
                      onChange={e => setEditor({ ...editor, dataset_index: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Папка отчётов</span>
                    <input value={editor.folder} onChange={e => setEditor({ ...editor, folder: e.target.value })} />
                  </label>
                </div>
                <div className={styles.toolsBlock}>
                  <div className={styles.toolsHead}>Инструменты агента: выбрано {editor.tools.length}</div>
                  <div className={styles.toolsGrid}>
                    {toolOptions.map(tool => (
                      <label key={tool.name} className={styles.checkbox} title={tool.description}>
                        <input type='checkbox' checked={editor.tools.includes(tool.name)} onChange={() => toggleTool(tool.name)} />
                        <span>{tool.title || tool.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className={styles.checkbox}>
                  <input type='checkbox' checked={editor.enabled} onChange={e => setEditor({ ...editor, enabled: e.target.checked })} />
                  <span>агент включён</span>
                </label>
              </div>
            )}

            <div className={styles.editorActions}>
              <Button
                style={{ width: 'calc(220/1440*100vw)', height: 'calc(48/1440*100vw)' }}
                onClick={saveEditor}
                disabled={busy}
              >
                Сохранить агента
              </Button>
              <button type='button' className={styles.linkBtn} onClick={() => setEditor(null)}>
                отменить
              </button>
            </div>
          </div>
        )}

        {agents.length === 0 ? (
          <div className={styles.empty}>
            Пока нет ни одного агента. Создайте своего или добавьте готовый шаблон — это займёт минуту.
          </div>
        ) : (
          <div className={styles.cards}>
            {agents.map(agent => (
              <div key={agent.id} className={`${styles.card} ${agent.enabled ? '' : styles.card_off}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardTitle}>{agent.name}</div>
                  <span className={`${styles.badge} ${agent.enabled ? styles.badge_on : styles.badge_off}`}>
                    {agent.enabled ? 'включён' : 'выключен'}
                  </span>
                </div>
                <div className={styles.cardText}>{agent.description || (agent.instruction || '').slice(0, 150)}</div>
                <div className={styles.cardFacts}>
                  <span className={styles.factMain}>{agent.schedule_text}</span>
                  <span>{agent.dataset_name || 'датасет не выбран'}</span>
                </div>
                <div className={styles.cardMuted}>
                  {agent.model === 'qwen' ? 'Qwen (локально)' : agent.model === 'claude' ? 'Claude' : 'GPT-4.1 mini'}
                  {agent.steps?.length ? ` · цепочка: ${agent.steps.length} шагов` : ' · режим: инструкция'}
                  {agent.last_run_at ? ` · последний запуск: ${agent.last_run_at}` : ''}
                </div>
                <div className={styles.cardButtons}>
                  <Button
                    style={{ width: '116px', height: '30px', fontSize: '12.5px' }}
                    onClick={() => runAgent(agent)}
                    disabled={busy}
                  >
                    Запустить
                  </Button>
                  <button type='button' className={styles.linkBtn} onClick={() => openEditor(agent)}>
                    изменить
                  </button>
                  {agent.last_run_id ? (
                    <button type='button' className={styles.linkBtn} onClick={() => navigate(`/agent-mode?run=${agent.last_run_id}`)}>
                      журнал
                    </button>
                  ) : null}
                  <button type='button' className={styles.linkBtnDanger} onClick={() => removeAgent(agent)}>
                    удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Agents;
