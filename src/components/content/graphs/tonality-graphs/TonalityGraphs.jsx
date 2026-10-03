import { memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Loader from '@/components/loading/loader/Loader';
import PanelTargetGraph from '@/components/ui/panel-target-graph/PanelTargetGraph';

import { funksTonality } from '@/utils/editData';

import styles from './TonalityGraphs.module.scss';
import AuthorsGraph from './authors-graph/AuthorsGraph';
import Mentions from './mentions/Mentions';
import { tonalityButtons } from '@/data/panel.data';

const TonalityGraphs = ({ data: filteredData, onTabChange, onVisibleSlice, rootLabel }) => {
  // Получаем данные из Redux (полные данные)
  const tonalityData = useSelector(state => state.tonalityData);
  
  // Определяем, какие данные использовать: отфильтрованные или из Redux
  const cashingData = useMemo(() => {
    if (filteredData && Object.keys(filteredData).length > 0) {
      return filteredData;
    }
    return tonalityData;
  }, [filteredData, tonalityData]);
  
  const [activeButton, setActiveButton] = useState('Негативные упоминания');
  const [isViewAuthors, setIsViewAuthors] = useState(false);
  const [data, setData] = useState([]);
  // Сколько источников показывать: 0 — все. Считается по полному списку источников, потому
  // что раньше отбор шёл по уже отфильтрованным данным: после применения фильтра список
  // сужался до выбранных источников, и ползунок нельзя было вернуть обратно.
  const [topCount, setTopCount] = useState(0);
  const activeSide = activeButton === 'Позитивные упоминания' ? 'positive' : 'negative';

  useEffect(() => {
    setTopCount(0);
  }, [activeButton]);

  const allSources = useMemo(() => {
    const hvs = tonalityData?.tonality_hubs_values || {};
    const list = isViewAuthors
      ? [...(hvs.negative_hubs || []), ...(hvs.positive_hubs || [])]
      : (activeSide === 'positive' ? hvs.positive_hubs : hvs.negative_hubs) || [];
    const seen = new Set();
    return (list || [])
      .filter(item => item && item.name && !seen.has(item.name) && seen.add(item.name))
      .sort((a, b) => Number(b.values || 0) - Number(a.values || 0));
  }, [tonalityData, activeSide, isViewAuthors]);

  const topMax = allSources.length;
  // Отобранные источники: из полного списка берём первые N, а из них — те, что не удалены
  // вручную на графике упоминаний.
  const visibleSources = useMemo(() => {
    const limit = topCount > 0 ? allSources.slice(0, topCount).map(item => item.name) : null;
    const allowed = limit ? new Set(limit) : null;
    return (data || []).filter(item => !allowed || allowed.has(item.name));
  }, [data, allSources, topCount]);

  const visibleHubNames = useMemo(
    () => (topCount > 0 ? allSources.slice(0, topCount) : allSources).map(item => item.name),
    [allSources, topCount],
  );

  // Срез отдаём в страницу: он действует на все графики, включая «Тональность авторов».
  useEffect(() => {
    if (!onVisibleSlice || visibleHubNames.length === 0) return;
    onVisibleSlice({ type: 'mentions', side: activeButton, hubNames: visibleHubNames });
  }, [visibleHubNames, activeButton, onVisibleSlice]);

  const handleClick = useCallback(button => {
    setActiveButton(button);
    if (button === 'Тональность авторов') {
      setIsViewAuthors(true);
    } else {
      setIsViewAuthors(false);
    }
    
    // Вызываем функцию обратного вызова, чтобы уведомить родителя
    if (onTabChange) {
      onTabChange(button);
    }
    
  }, [onTabChange]);

  // Обновляем данные при изменении активной кнопки или входных данных
  useEffect(() => {
    if (!cashingData || !cashingData.tonality_hubs_values) {
      return;
    }

    if (activeButton === 'Негативные упоминания') {
      const newData = funksTonality.convertValuesToValue(
        funksTonality.addColor(
          cashingData.tonality_hubs_values.negative_hubs,
          'red',
        ),
      );
      setData(newData);
    } else if (activeButton === 'Позитивные упоминания') {
      const newData = funksTonality.convertValuesToValue(
        funksTonality.addColor(
          cashingData.tonality_hubs_values.positive_hubs,
          'green',
        ),
      );
      setData(newData);
    }
  }, [activeButton, cashingData]);

  const dataCounters = useMemo(() => ({
    negative: cashingData?.tonality_values?.negative_count || 0,
    positive: cashingData?.tonality_values?.positive_count || 0,
  }), [cashingData]);

  // Сводка по источникам: негатив / позитив / нейтрал и суммарная аудитория
  const hubStats = useMemo(() => {
    const stats = {};
    const hvs = cashingData?.tonality_hubs_values || {};
    const add = (list, key) => {
      (list || []).forEach(item => {
        if (!item || !item.name) return;
        stats[item.name] = stats[item.name] || { neg: 0, pos: 0, neu: 0, aud: 0 };
        stats[item.name][key] += Number(item.values) || 0;
        stats[item.name].aud += Number(item.audience_sum) || 0;
      });
    };
    add(hvs.negative_hubs, 'neg');
    add(hvs.positive_hubs, 'pos');
    add(hvs.neutral_hubs, 'neu');
    return stats;
  }, [cashingData]);

  return (
    <div className={styles.block__graph}>
      <div className={styles.block__title}>
        <PanelTargetGraph
          handleClick={handleClick}
          dataButtons={tonalityButtons}
          activeButton={activeButton}
          dataCounters={dataCounters}
        />
        {topMax > 0 && (
          // Компактно и в одну строку, справа от вкладок: пояснение живёт в подсказке, чтобы
          // не отъедать место у графиков слева.
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              marginLeft: 'auto', paddingLeft: 8, fontSize: 11, color: '#667085',
              lineHeight: 1.2,
            }}
          >
            <span style={{ fontWeight: 600 }}>ТОП источников</span>
            <input
              type='range'
              min={1}
              max={Math.max(topMax, 1)}
              value={topCount > 0 ? Math.min(topCount, topMax) : topMax}
              onChange={event => setTopCount(Number(event.target.value))}
              style={{ width: 104, height: 14 }}
              title='Сколько источников с наибольшим числом упоминаний показывать: остальные скрываются вместе со своими авторами — на всех графиках страницы, включая «Тональность авторов»'
            />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {topCount > 0 ? Math.min(topCount, topMax) : topMax} из {topMax}
            </span>
            {topCount > 0 && (
              <button
                type='button'
                onClick={() => setTopCount(0)}
                title='Показать все источники'
                style={{
                  border: '1px solid #d0d7e2', background: '#fff', color: '#344054',
                  borderRadius: 6, padding: '1px 6px', fontSize: 11, cursor: 'pointer',
                }}
              >
                все
              </button>
            )}
            <span
              title='Остальные источники скрываются вместе с их авторами. Фильтр действует на всех вкладках — в том числе в «Тональности авторов»'
              style={{ cursor: 'help', color: '#98a2b3' }}
            >
              ⓘ
            </span>
          </div>
        )}
      </div>
      <div className={styles.container__graph}>
        {isViewAuthors ? (
          <Suspense fallback={<Loader />}>
            <AuthorsGraph
              cashingData={cashingData}
              rootName={rootLabel}
              onVisibleChange={onVisibleSlice}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<Loader />}>
            <Mentions
              data={visibleSources}
              setData={setData}
              activeButton={activeButton}
              hubStats={hubStats}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

// Установим defaultProps, чтобы компонент работал и без передачи пропсов
TonalityGraphs.defaultProps = {
  data: null
};

export default memo(TonalityGraphs);