import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Layout from '@/components/layout/Layout';
import Content from '@/components/content/Content';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import Button from '@/components/ui/button/Button';
import TextArea from '@/components/ui/textarea/TextArea';
import Loader from '@/components/loading/loader/Loader';

import styles from './MetaphorExamples.module.scss';

// Фиксированные портреты по типам метафор (по таблице 8.1 Word-отчёта)
const FIXED_LCA_PROFILES_BY_TYPE = {
  '4. СЕМЕЙНЫЕ': {
    author_gender: 'Женский',
    author_age_group: '51+',
    platform: 'VK',
  },
  '1. ПРОСТРАНСТВЕННЫЕ': {
    author_gender: 'Женский',
    author_age_group: '51+',
    platform: 'VK',
  },
  '6. ВОЕННЫЕ': {
    author_gender: 'Женский',
    author_age_group: '51+',
    platform: 'VK',
  },
  '2. ОРГАНИЧЕСКИЕ': {
    author_gender: 'Женский',
    author_age_group: '36-50',
    platform: 'VK',
  },
  '10. ИСТОРИЧЕСКИЕ': {
    author_gender: 'Женский',
    author_age_group: '51+',
    platform: 'VK',
  },
  '3. МЕХАНИЧЕСКИЕ': {
    author_gender: 'Мужской',
    author_age_group: '36-50',
    platform: 'VK',
  },
  '9. ИГРОВЫЕ': {
    author_gender: 'Женский',
    author_age_group: '51+',
    platform: 'VK',
  },
  '5. САКРАЛЬНЫЕ': {
    author_gender: 'Мужской',
    author_age_group: '51+',
    platform: 'VK',
  },
  '7. ПРИРОДНЫЕ': {
    author_gender: 'Мужской',
    author_age_group: '51+',
    platform: 'VK',
  },
  '8. МЕДИЦИНСКИЕ': {
    author_gender: 'Женский',
    author_age_group: '51+',
    platform: 'VK',
  },
};

const MetaphorExamples = () => {
  const { pathname } = useLocation();
  const { active_menu } = useSelector(store => store.booleanValues);

  const [allFrames, setAllFrames] = useState([]); // кадры с LCA-примерами
  const [taxonomy, setTaxonomy] = useState([]);   // полная типология (все типы)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [frameType, setFrameType] = useState('');
  const [limit, setLimit] = useState(3);

  const [examples, setExamples] = useState([]);
  const [portrait, setPortrait] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [modelName, setModelName] = useState('deepseek-v3.2');
  const [showCustomTopic, setShowCustomTopic] = useState(false);
  const [authorGender, setAuthorGender] = useState('');
  const [authorAgeGroup, setAuthorAgeGroup] = useState('');
  const [person, setPerson] = useState('');
  const [maxChars, setMaxChars] = useState('');
  const [demStats, setDemStats] = useState(null);
  const [dominantPortrait, setDominantPortrait] = useState(null);
  const [dominantLoading, setDominantLoading] = useState(false);

  // Загружаем таксономию и (опционально) первые LCA-примеры при монтировании
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError('');

        // 1) таксономия (все типы метафор)
        const taxResp = await fetch('/api/metaphor-taxonomy');
        if (!taxResp.ok) {
          const err = await taxResp.json().catch(() => ({}));
          throw new Error(err.detail || `Ошибка загрузки таксономии: ${taxResp.status}`);
        }
        const taxData = await taxResp.json();
        const taxonomyList = (taxData.taxonomy || []).map(t => ({
          frame_type: t.frame_type,
        }));
        setTaxonomy(taxonomyList);

        // 2) пробуем заранее получить LCA-примеры (может не быть для всех типов)
        try {
          const resp = await fetch('/api/lca-examples', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit_per_cluster: 3 }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const frames = data.frames || [];
            setAllFrames(frames);
          }
        } catch {
          // Если упало — не критично, просто не будет стартовых примеров
        }

        // Инициализируем выбор первым типом из таксономии
        if (taxonomyList.length > 0) {
          const firstType = taxonomyList[0];
          setFrameType(firstType.frame_type || '');
        }
      } catch (e) {
        setError(e.message || 'Не удалось загрузить данные для метафор');
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  const frameTypeOptions = useMemo(
    () => taxonomy.map(t => t.frame_type),
    [taxonomy]
  );

  const handleChangeType = e => {
    const value = e.target.value;
    setFrameType(value);
    setPortrait(null);
    setExamples([]);
    // При смене типа сбрасываем выбор пола/возраста — дальше подставим доминирующие по Excel
    setAuthorGender('');
    setAuthorAgeGroup('');
  };

  // Загружаем доминирующий портрет (пол/возраст) по типу из Excel
  useEffect(() => {
    if (!frameType) {
      setDominantPortrait(null);
      return;
    }

    const fetchDominant = async () => {
      try {
        setDominantLoading(true);
        const params = new URLSearchParams({ frame_type: frameType });
        const resp = await fetch(`/api/metaphor-dominant-demographics?${params.toString()}`);
        if (!resp.ok) {
          setDominantPortrait(null);
          return;
        }
        const data = await resp.json();
        if (data && data.author_gender && data.author_age_group) {
          // Нормализуем, чтобы значения совпадали с option.value
          const gRaw = String(data.author_gender).trim();
          const gLower = gRaw.toLowerCase();
          const genderValue =
            gLower === 'женский' ? 'Женский' : gLower === 'мужской' ? 'Мужской' : gLower === 'не указан' ? 'не указан' : gRaw;

          const ageValue = String(data.author_age_group).trim();
          setDominantPortrait({
            author_gender: genderValue,
            author_age_group: ageValue,
            platform: 'VK',
          });
          // Автоматически выбираем доминирующие значения в меню
          setAuthorGender(genderValue);
          setAuthorAgeGroup(ageValue);
        } else {
          setDominantPortrait(null);
        }
      } catch {
        setDominantPortrait(null);
      } finally {
        setDominantLoading(false);
      }
    };

    fetchDominant();
  }, [frameType]);

  // Подтягиваем статистику пола/возраста по выбранному типу
  useEffect(() => {
    if (!frameType || (!authorGender && !authorAgeGroup)) {
      setDemStats(null);
      return;
    }

    const fetchDem = async () => {
      try {
        const params = new URLSearchParams({ frame_type: frameType });
        if (authorGender) params.set('author_gender', authorGender);
        if (authorAgeGroup) params.set('author_age_group', authorAgeGroup);
        const resp = await fetch(`/api/metaphor-demographics?${params.toString()}`);
        if (!resp.ok) {
          setDemStats(null);
          return;
        }
        const data = await resp.json();
        setDemStats(data);
      } catch {
        setDemStats(null);
      }
    };

    fetchDem();
  }, [frameType, authorGender, authorAgeGroup]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      setExamples([]);

      const resp = await fetch('/api/lca-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_type: frameType || null,
          frame_subtype: null,
          limit_per_cluster: Number(limit) || 3,
          custom_topic: customTopic || null,
          model_name: modelName || null,
          author_gender: authorGender || null,
          author_age_group: authorAgeGroup || null,
          person: person || null,
          max_chars: maxChars ? Number(maxChars) : null,
        }),
      });

      if (resp.status === 404) {
        // Для выбранного типа/подтипа нет LCA-примеров
        setPortrait(null);
        setExamples([]);
        setError('Для выбранного типа/подтипа пока нет сгенерированных примеров (нет данных LCA).');
        return;
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Ошибка генерации: ${resp.status}`);
      }

      const data = await resp.json();
      const frames = data.frames || [];

      // Обновляем кэш фреймов с LCA
      setAllFrames(prev => {
        const combined = [...prev];
        frames.forEach(f => {
          const idx = combined.findIndex(
            x =>
              x.frame_type === f.frame_type &&
              x.frame_subtype === f.frame_subtype
          );
          if (idx >= 0) {
            combined[idx] = f;
          } else {
            combined.push(f);
          }
        });
        return combined;
      });

      if (frames.length > 0) {
        const f0 = frames[0];
        setPortrait(f0.portrait || null);
        setExamples(f0.examples || []);
      } else {
        setPortrait(null);
        setExamples([]);
      }
    } catch (e) {
      setError(e.message || 'Не удалось сгенерировать примеры');
    } finally {
      setLoading(false);
    }
  };

  // Портрет для отображения:
  // 1) доминирующий по Excel (пол/возраст),
  // 2) портрет из бэкенда (если есть),
  // 3) фиксированный по типу (fallback)
  const effectivePortrait =
    dominantPortrait || portrait || FIXED_LCA_PROFILES_BY_TYPE[frameType] || null;

  return (
    <Layout>
      {loading && <Loader />}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
      <Content>
        <div className={styles.topPanel}>
          <div className={styles.header}>
            <h3 className={styles.title}>Генератор примеров метафор</h3>
            <p className={styles.subtitle}>
              Примеры сообщений по типам и подтипам метафор с учётом
              характерного портрета аудитории.
            </p>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlRow}>
              <label className={styles.label}>
                Тип метафоры
                <select
                  className={styles.select}
                  value={frameType}
                  onChange={handleChangeType}
                >
                  {frameTypeOptions.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.label}>
                Кол-во примеров
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={styles.numberInput}
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                />
              </label>

              <label className={styles.label}>
                Модель LLM
                <select
                  className={styles.select}
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                >
                  <option value="deepseek-v3.2">deepseek-v3.2</option>
                  <option value="claude-sonnet-4.6">claude-sonnet-4.6</option>
                  <option value="gpt-5.4">gpt-5.4</option>
                </select>
              </label>

              <Button
                className={styles.generateButton}
                style={{ height: 40, padding: '0 16px' }}
                onClick={handleGenerate}
              >
                Сгенерировать
              </Button>
            </div>

            <div className={styles.controlRow}>
              <label className={styles.label}>
                Пол (персонажа)
                <select
                  className={styles.select}
                  value={authorGender}
                  onChange={e => setAuthorGender(e.target.value)}
                >
                  <option value="" disabled>
                    {dominantLoading ? 'Загрузка…' : '—'}
                  </option>
                  <option value="не указан">Не выбран (пол не указан)</option>
                  <option value="Женский">Женский</option>
                  <option value="Мужской">Мужской</option>
                </select>
              </label>

              <label className={styles.label}>
                Возраст
                <select
                  className={styles.select}
                  value={authorAgeGroup}
                  onChange={e => setAuthorAgeGroup(e.target.value)}
                >
                  <option value="" disabled>
                    {dominantLoading ? 'Загрузка…' : '—'}
                  </option>
                  <option value="Не указана">Не указан</option>
                  <option value="18-25">18-25</option>
                  <option value="26-35">26-35</option>
                  <option value="36-50">36-50</option>
                  <option value="51+">51+</option>
                </select>
              </label>

              <label className={styles.label}>
                Лицо / позиция
                <select
                  className={styles.select}
                  value={person}
                  onChange={e => setPerson(e.target.value)}
                >
                  <option value="">Не задано</option>
                  <option value="я">Я (1-е лицо ед.)</option>
                  <option value="мы">Мы (1-е лицо мн.)</option>
                  <option value="они">Они (3-е лицо мн.)</option>
                  <option value="он/она">Он / она (3-е лицо ед.)</option>
                  <option value="ты/вы">Ты / Вы (обращение)</option>
                </select>
              </label>

              <label className={styles.label}>
                Макс. длина (символы)
                <input
                  type="number"
                  min={50}
                  max={8000}
                  className={styles.numberInput}
                  value={maxChars}
                  onChange={e => setMaxChars(e.target.value)}
                  placeholder="по умолч. ~300 (50–8000)"
                />
              </label>
            </div>

            <div className={styles.customTopicToggle}>
              <button
                type="button"
                className={styles.customTopicButton}
                onClick={() => setShowCustomTopic(v => !v)}
              >
                {showCustomTopic ? 'Скрыть свой текст-пример' : 'Показать поле для своего текста-примера'}
              </button>
            </div>

            {showCustomTopic && (
              <div className={styles.customTopicBlock}>
                <label className={styles.label}>
                  Текст-пример (по нему будут генерироваться варианты)
                  <TextArea
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    placeholder="Вставьте сюда свой текст или оставьте пустым, чтобы использовать типовой контекст для этого типа метафор"
                  />
                </label>
              </div>
            )}
            {effectivePortrait && (
              <div className={styles.portrait}>
                <h4>Характерный портрет аудитории (по результатам кластеризации)</h4>
                {/* Строка 1 — доминирующий портрет по данным */}
                <div className={styles.portraitInfo}>
                  <span>
                    <strong>Пол:</strong> {effectivePortrait.author_gender || 'Не указан'}
                  </span>
                  <span>
                    <strong>Возраст:</strong>{' '}
                    {effectivePortrait.author_age_group === 'Не указана'
                      ? 'Не указан'
                      : effectivePortrait.author_age_group || 'Не указан'}
                  </span>
                  <span>
                    <strong>Платформа:</strong> {effectivePortrait.platform || '—'}
                  </span>
                </div>
                {/* Строка 2 — текущий выбор пользователя и процент */}
                {demStats && (
                  <div className={styles.portraitInfo}>
                    {(() => {
                      const hasGender = !!demStats.author_gender;
                      const hasAge = !!demStats.author_age_group;

                      const displayGender =
                        authorGender === 'не указан'
                          ? 'Не указан'
                          : authorGender || 'Не выбран';
                      const displayAge =
                        authorAgeGroup === 'Не указана'
                          ? 'Не указан'
                          : authorAgeGroup || 'Не выбрана';

                      if (!hasGender && !hasAge) {
                        return null;
                      }

                      if (demStats.total === 0 || demStats.percent === 0) {
                        return (
                          <span>
                            <strong>Выбранные параметры:</strong>
                            <br />
                            Пол: {displayGender}, Возраст: {displayAge}
                            <br />
                            Менее <strong>1%</strong> сообщений в этом типе метафор.
                          </span>
                        );
                      }

                      return (
                        <span>
                          <strong>Выбранные параметры:</strong>
                          <br />
                          Пол: {displayGender}, Возраст: {displayAge}
                          <br />
                          <strong>{demStats.percent}%</strong> сообщений в этом типе
                          метафор.
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.examples}>
          {examples.map(ex => (
            <div key={ex.cluster_id + '-' + ex.example_idx} className={styles.exampleCard}>
              <div className={styles.exampleHeader}>
                <span className={styles.exampleMeta}>
                  Пример {ex.example_idx}
                </span>
              </div>
              <div className={styles.generated}>
                <strong>Сгенерированный текст:</strong>
                <TextArea
                  value={ex.generated_post || ''}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            </div>
          ))}
          {/* {!loading && !error && examples.length === 0 && (
            <div className={styles.noExamples}>
              Нет примеров для выбранного типа / подтипа. Попробуйте изменить
              настройки или заново запустить анализатор метафор.
            </div>
          )} */}
        </div>
      </Content>
    </Layout>
  );
};

export default MetaphorExamples;

