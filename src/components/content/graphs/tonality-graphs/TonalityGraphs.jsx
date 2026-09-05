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

  return (
    <div className={styles.block__graph}>
      <div className={styles.block__title}>
        <PanelTargetGraph
          handleClick={handleClick}
          dataButtons={tonalityButtons}
          activeButton={activeButton}
          dataCounters={dataCounters}
        />
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
              data={data}
              setData={setData}
              activeButton={activeButton}
              onVisibleChange={onVisibleSlice}
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