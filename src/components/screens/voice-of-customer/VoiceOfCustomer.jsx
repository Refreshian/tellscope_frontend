import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Slider from 'rc-slider';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import Sankey from "@/components/content/graphs/voice-graphs/sankey/Sankey";

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import VoiceGraph from '@/components/content/graphs/voice-graphs/VoiceGraph';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import Input from '@/components/ui/fields/input/Input';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '../../../hooks/useCheckAuth';
import {
  useGetUserFoldersQuery,
  useGetUserIdQuery,
} from '../../../services/other.service';
import NoDataRequest from '../../no-data-request/NoDataRequest';
import QueryStringHelp from '../../ui/query-string-help/QueryStringHelp';
import * as XLSX from 'xlsx';

import styles from './VoiceOfCustomer.module.scss';
import voiceStyles from './VoiceOfCustomer.module.scss';
import { useLazyVoiceGraphQuery } from '@/services/getGraph.service';

const VoiceOfCustomer = () => {
  useCheckAuth();

  const { pathname } = useLocation();
  const { addData, addMinDate, addMaxDate, addIndex, addQueryStr } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(
    store => store.dataUsersSlice,
  );

  const {
    data: data_getUserId,
    isError: isError_getUserId,
    error: error_getUserId,
    isLoading: isLoading_getUserId,
  } = useGetUserIdQuery();
  const { data, isError, error, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);

  useAddBaseAndDate(
    dataUser,
    data,
    isSuccess,
    dataForRequest.index,
    addData,
    addMinDate,
    addMaxDate,
    addIndex,
  );

  const onChange = e => {
    addQueryStr(e.target.value);
  };

  const [
    trigger,
    {
      data: data_voice,
      isLoading: isLoading_voice,
      isSuccess: isSuccess_voice,
      isError: isError_voice,
      error: error_voice,
    }
  ] = useLazyVoiceGraphQuery();

  const getVoiceData = useCallback(() => {
    trigger(dataForRequest);
  }, [dataForRequest, trigger]);

  const [isNoData, setIsNoData] = useState(false);
  useEffect(() => {
    if (isError_voice) {
      setIsNoData(true);
      const timer = setTimeout(() => setIsNoData(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isError_voice]);

  // Состояния для фильтров
  const [audienceRange, setAudienceRange] = useState([0, 0]);
  const [commentsRange, setCommentsRange] = useState([0, 0]);
  const [viewsRange, setViewsRange] = useState([0, 0]);
  const [repostsRange, setRepostsRange] = useState([0, 0]);
  const [filteredData, setFilteredData] = useState(null);

  // Получаем максимальные значения для слайдеров из данных
// Обновим useEffect для инициализации диапазонов слайдеров
useEffect(() => {
  if (isSuccess_voice && data_voice?.values) {
    // Собираем все значения метрик из всех записей
    const allMetrics = data_voice.values.flatMap(item => 
      item.sunkey_data.map(sunkey => ({
        audience: sunkey.audienceCount || 0,
        comments: sunkey.commentsCount || 0,
        views: sunkey.viewsCount || 0,
        reposts: sunkey.repostsCount || 0
      }))
    );
    
    // Находим максимальные значения
    const maxAudience = Math.max(...allMetrics.map(m => m.audience), 10000);
    const maxComments = Math.max(...allMetrics.map(m => m.comments), 100);
    const maxViews = Math.max(...allMetrics.map(m => m.views), 1000);
    const maxReposts = Math.max(...allMetrics.map(m => m.reposts), 100);
    
    // Устанавливаем диапазоны слайдеров от 0 до максимального значения
    setAudienceRange([0, maxAudience]);
    setCommentsRange([0, maxComments]);
    setViewsRange([0, maxViews]);
    setRepostsRange([0, maxReposts]);
    
    // Также инициализируем отфильтрованные данные
    setFilteredData(data_voice);
  }
}, [isSuccess_voice, data_voice]);

  // Функция для фильтрации данных на основе слайдеров
  useEffect(() => {
    if (isSuccess_voice && data_voice?.values) {
      const filteredValues = data_voice.values.map(item => {
        const filteredSunkeyData = item.sunkey_data.filter(
          sunkey =>
            sunkey.audienceCount >= audienceRange[0] &&
            sunkey.audienceCount <= audienceRange[1] &&
            sunkey.commentsCount >= commentsRange[0] &&
            sunkey.commentsCount <= commentsRange[1] &&
            sunkey.viewsCount >= viewsRange[0] &&
            sunkey.viewsCount <= viewsRange[1] &&
            sunkey.repostsCount >= repostsRange[0] &&
            sunkey.repostsCount <= repostsRange[1]
        );

        return {
          ...item,
          sunkey_data: filteredSunkeyData
        };
      });

      setFilteredData({
        ...data_voice,
        values: filteredValues
      });
    }
  }, [audienceRange, commentsRange, viewsRange, repostsRange, isSuccess_voice, data_voice]);

  // Состояния для ИИ анализа
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAiSubmit = async () => {
    if (!aiQuery.trim()) {
      setAiError('Пожалуйста, введите запрос для анализа');
      return;
    }
  
    setIsAiLoading(true);
    setAiAnalysis(null);
    setAiError(null);
  
    try {
      if (!filteredData) {
        throw new Error('Нет отфильтрованных данных для анализа');
      }
  
      // Определяем текущую активную вкладку для анализа
      let currentTabValue;
      if (activeTable === 'sources') {
        currentTabValue = "Источники";
      } else if (activeTable === 'mention_types') {
        currentTabValue = "Тип упоминаний";
      } else {
        currentTabValue = "Неизвестная вкладка";
      }
  
      // Подготовка данных для запроса - используем только отфильтрованные данные
      const requestData = {
        question: aiQuery,
        data: filteredData, // Уже отфильтрованные данные
        index: dataForRequest.index,
        min_date: dataForRequest.min_date,
        max_date: dataForRequest.max_date,
        current_tab: activeTable,
        // Добавляем текущие значения фильтров для контекста
        filters: {
          audienceRange,
          commentsRange,
          viewsRange,
          repostsRange
        },
        // Добавляем отфильтрованные табличные данные
        tableData: {
          sources: activeTable === 'sources' ? filteredSourcesForTable : [],
          mentionTypes: activeTable === 'mention_types' ? mentionTypesTable : []
        }
      };
  
      console.log('Отправляем запрос с отфильтрованными данными:', requestData);
  
      // Отправка запроса на бэкенд
      // http://localhost:5001/ai-question-voice
      const response = await fetch('/api/ai-question-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      }); 
  
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
  
      const result = await response.json();
  
      // Обработка различных форматов ответа
      if (result.content) {
        setAiAnalysis(result.content);
      } else if (result.response?.content) {
        setAiAnalysis(result.response.content);
      } else if (result.analysis) {
        setAiAnalysis(result.analysis);
      } else if (typeof result === 'string') {
        setAiAnalysis(result);
      } else {
        setAiAnalysis(JSON.stringify(result, null, 2));
      }
  
    } catch (error) {
      console.error('Ошибка при запросе к ИИ:', error);
      setAiError(error.message || 'Произошла ошибка при выполнении анализа. Пожалуйста, попробуйте позже.');
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (filteredData) {
      console.log('Данные после фильтрации (filteredData):', filteredData);
    }
  }, [filteredData]);

  // Состояния для таблиц
  const [showTable, setShowTable] = useState(false);
  const [activeTable, setActiveTable] = useState('sources');
  const [sortConfig, setSortConfig] = useState({
    key: 'total',
    direction: 'desc'
  });
  

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleAuthorsSort = (key) => {
    let direction = 'desc';
    if (authorsSortConfig.key === key && authorsSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setAuthorsSortConfig({ key, direction });
  };

  const exportSourcesTable = () => {
    if (!filteredSourcesForTable || filteredSourcesForTable.length === 0) {
      alert("Нет данных для экспорта");
      return;
    }
  
    const headers = [
      'Источник',
      'Нейтральные',
      'Позитивные',
      'Негативные',
      'Аудитория',
      'Всего'
    ];
  
    const tableData = filteredSourcesForTable.map(source => [
      source.source,
      source.neutral,
      source.positive,
      source.negative,
      source.audience,
      source.total
    ]);
  
    const worksheetData = [headers, ...tableData];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Источники');
    XLSX.writeFile(workbook, 'Источники_упоминаний.xlsx');
  };

  function getFilteredSourcesForTable(filteredData, sortConfig) {
    // Накапливаем метрику по источникам по всем value (по всем дням или как у вас структура)
    const sourceStatsMap = new Map();
  
    if (!filteredData?.values) return [];
  
    filteredData.values.forEach(value => {
      // Фильтруем sunkey_data по слайдерам
      const filteredSunkeys = value.sunkey_data.filter(s =>
        s.audienceCount >= audienceRange[0] && s.audienceCount <= audienceRange[1] &&
        s.commentsCount >= commentsRange[0] && s.commentsCount <= commentsRange[1] &&
        s.viewsCount >= viewsRange[0] && s.viewsCount <= viewsRange[1] &&
        s.repostsCount >= repostsRange[0] && s.repostsCount <= repostsRange[1]
      );
    
      // Собираем валидные hub'ы
      const validHubs = new Set(filteredSunkeys.map(s => s.hub));
  
      // Для каждого валидного hub собираем все показатели
      validHubs.forEach(hub => {
        // Для одной value точим один срез по каждому hub
        // Тональность
        const itemTonality = value.tonality.find(t => t.source === hub) || {};
        // Аудитория
        const audience = filteredSunkeys
          .filter(s => s.hub === hub)
          .reduce((acc, s) => acc + (s.audienceCount || 0), 0);
  
        // Если уже есть этот hub — агрегируем
        if (!sourceStatsMap.has(hub)) {
          sourceStatsMap.set(hub, {
            source: hub,
            neutral: 0,
            positive: 0,
            negative: 0,
            audience: 0,
            total: 0,
          });
        }
        const prev = sourceStatsMap.get(hub);
        prev.neutral += itemTonality.Нейтрал || 0;
        prev.positive += itemTonality.Позитив || 0;
        prev.negative += itemTonality.Негатив || 0;
        prev.audience += audience;
        prev.total += (itemTonality.Нейтрал || 0) + (itemTonality.Позитив || 0) + (itemTonality.Негатив || 0);
        sourceStatsMap.set(hub, prev);
      });
    });

    const handleMentionTypeSort = (key) => {
      let direction = 'desc';
      if (mentionTypeSortConfig.key === key && mentionTypeSortConfig.direction === 'desc') {
        direction = 'asc';
      }
      setMentionTypeSortConfig({ key, direction });
    };
  
    // В массив + сортировка
    const arr = Array.from(sourceStatsMap.values());
    if (!sortConfig.key) return arr.sort((a, b) => b.total - a.total);
  
    return arr.sort((a, b) => {
      const getCompareValue = (item) => item[sortConfig.key];
      const valueA = getCompareValue(a);
      const valueB = getCompareValue(b);
      if (valueA < valueB) return sortConfig.direction === 'desc' ? 1 : -1;
      if (valueA > valueB) return sortConfig.direction === 'desc' ? -1 : 1;
      return 0;
    });
  }

  const filteredSourcesForTable = getFilteredSourcesForTable(filteredData, sortConfig);

  function getMentionTypesTableData(filteredData, sortConfig) {
    if (!filteredData?.values) return [];
    const mentionTypeMap = new Map();
    
    filteredData.values.forEach(value => {
      // Применяем фильтрацию по слайдерам
      const filteredSunkeys = value.sunkey_data.filter(s =>
        s.audienceCount >= audienceRange[0] && s.audienceCount <= audienceRange[1] &&
        s.commentsCount >= commentsRange[0] && s.commentsCount <= commentsRange[1] &&
        s.viewsCount >= viewsRange[0] && s.viewsCount <= viewsRange[1] &&
        s.repostsCount >= repostsRange[0] && s.repostsCount <= repostsRange[1]
      );
      
      filteredSunkeys.forEach(item => {
        // По каждому hub + type собираем
        const key = item.hub + '//' + item.type;
        if (!mentionTypeMap.has(key)) {
          mentionTypeMap.set(key, {
            hub: item.hub,
            type: item.type,
            count: 0,
            audience: 0
          });
        }
        const cur = mentionTypeMap.get(key);
        cur.count += 1;
        cur.audience += item.audienceCount || 0;
      });
    });
    
    let arr = Array.from(mentionTypeMap.values());
    if (sortConfig?.key) {
      arr = arr.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'desc' ? 1 : -1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'desc' ? -1 : 1;
        return 0;
      });
    } else {
      arr = arr.sort((a, b) => b.count - a.count);
    }
    return arr;
  }
  
  const mentionTypesTable = getMentionTypesTableData(filteredData, sortConfig);
  
  // Экспорт для "Типов упоминаний"
  const exportMentionTypesTable = () => {
    if (!mentionTypesTable || mentionTypesTable.length === 0) {
      alert("Нет данных для экспорта");
      return;
    }
    const headers = ['Источник', 'Тип упоминания', 'Кол-во', 'Аудитория, суммарно'];
    const tableData = mentionTypesTable.map(row => [
      row.hub,
      row.type,
      row.count,
      row.audience
    ]);
    const worksheetData = [headers, ...tableData];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Типы упоминаний');
    XLSX.writeFile(workbook, 'Типы_упоминаний.xlsx');
  };

  const [mentionTypeSortConfig, setMentionTypeSortConfig] = useState({
    key: 'audience', // столбец по умолчанию для сортировки
    direction: 'asc' // направление сортировки
  });
  

  return (
    <Layout>
      {(isLoading || isLoading_voice) && (
        <>
          <BackgroundLoader />
          <Loader />
        </>
      )}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
      <Content>
        <div
          className={styles.block__pageName}
          style={!isSuccess_voice ? { alignSelf: 'center' } : {}}
        >
          {isSuccess_voice ? (
            <></>
          ) : (
            <BeforeSearch
              title="Голос клиента"
              link="https://tsdoc.headsmade.com/en/voice-of-customer"
            />
          )}
        </div>
        <div
          className={styles.block__configureSearch}
          style={!isSuccess_voice ? { alignSelf: 'center' } : {}}
        >
          {isSuccess && dataUser && Object.keys(dataUser).length > 0 && (
            <DataForSearch />
          )}
          {isSuccess && dataForRequest.index !== null && dataUser && Object.keys(dataUser).length > 0 && (
            <CustomCalendar />
          )}
          <Input
            placeholder="Поиск по тексту"
            styleInput={{
              width: 'auto',
              height: 'calc(55.9/1440*100vw)',
              borderRadius: 'calc(8/1440*100vw)',
              marginRight: '10px'
            }}
            styleLabel={{ display: 'none' }}
            onChange={onChange}
            value={dataForRequest.query_str === null ? 'yes' : dataForRequest.query_str}
          />
          <Button
            style={{
              width: 'calc(220/1440*100vw)',
              height: 'calc(56/1440*100vw)',
              marginLeft: '10px',
            }}
            onClick={getVoiceData}
          >
            Запуск
          </Button>
        </div>
        {isNoData && <NoDataRequest />}
        {!isNoData && isSuccess_voice && (
          <div className={styles.scrollableResults}>
            {/* Слайдеры */}
            <div className={voiceStyles.slidersContainer}>
              <div className={voiceStyles.sliderWrapper}>
                <label>Аудитория:</label>
                <Slider range min={0} max={audienceRange[1]} value={audienceRange} onChange={setAudienceRange} />
                <div className={voiceStyles.sliderValues}>
                  <span>{audienceRange[0]}</span> - <span>{audienceRange[1]}</span>
                </div>
              </div>
              <div className={voiceStyles.sliderWrapper}>
                <label>Комментариев:</label>
                <Slider range min={0} max={commentsRange[1]} value={commentsRange} onChange={setCommentsRange} />
                <div className={voiceStyles.sliderValues}>
                  <span>{commentsRange[0]}</span> - <span>{commentsRange[1]}</span>
                </div>
              </div>
              <div className={voiceStyles.sliderWrapper}>
                <label>Просмотров:</label>
                <Slider range min={0} max={viewsRange[1]} value={viewsRange} onChange={setViewsRange} />
                <div className={voiceStyles.sliderValues}>
                  <span>{viewsRange[0]}</span> - <span>{viewsRange[1]}</span>
                </div>
              </div>
              <div className={voiceStyles.sliderWrapper}>
                <label>Репостов:</label>
                <Slider range min={0} max={repostsRange[1]} value={repostsRange} onChange={setRepostsRange} />
                <div className={voiceStyles.sliderValues}>
                  <span>{repostsRange[0]}</span> - <span>{repostsRange[1]}</span>
                </div>
              </div>
            </div>
  
            {/* График */}
            <Suspense fallback={<Loader />}>
              <VoiceGraph voiceData={filteredData?.values || []} />
            </Suspense>
  
            {/* AI Анализ */}
            <div className={styles.aiAnalysisBlock}>
              <button className={styles.analyzeButton} onClick={() => setShowAiInput(!showAiInput)}>
                {showAiInput ? 'Скрыть анализ' : 'Проанализировать данные через ИИ'}
              </button>
              {showAiInput && (
                <div className={styles.aiInteractionWrapper}>
                  <div className={styles.aiInputContainer}>
                    <div className={styles.aiInputGroup}>
                      <textarea
                        className={styles.aiTextarea}
                        placeholder={`Примеры запросов:
  - Проанализируй данные по площадкам публикаций сообщений - какие самые популярные площадки?
  - Какие самые активные источники упоминаний? Приведи примеры сообщений и ссылки на них.
  - Какие тематики есть в положительных отзывах? Приведи примеры и ссылки.`}
                        rows="4"
                        value={aiQuery}
                        onChange={e => setAiQuery(e.target.value)}
                      />
                      <button
                        className={styles.sendButton}
                        onClick={handleAiSubmit}
                        disabled={isAiLoading}
                      >
                        {isAiLoading ? 'Анализируем...' : 'Отправить запрос'}
                      </button>
                    </div>
                  </div>
                  {isAiLoading && (
                    <div className={styles.aiLoading}>
                      <Loader size="small" />
                      <p>Анализируем данные. Это может занять некоторое время...</p>
                    </div>
                  )}
                  {aiError && (
                    <div className={styles.aiError}>
                      <p>Ошибка: {aiError}</p>
                    </div>
                  )}
                  {aiAnalysis && (
                    <div className={styles.aiResponse}>
                      <h4>Результаты анализа:</h4>
                      <div className={styles.aiResponseContent}>
                        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                          {aiAnalysis}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
  
            {/* Таблицы */}
            <div className={styles.tableSection}>
              <div
                className={styles.tableToggleHeader}
                onClick={() => setShowTable(!showTable)}
              >
                <div className={styles.toggleTitle}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`${styles.toggleIcon} ${showTable ? styles.rotated : ''}`}
                  >
                    <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Таблицы данных</span>
                </div>
                <div className={styles.toggleStatus}>
                  {showTable ? 'Скрыть' : 'Показать'}
                </div>
              </div>
              {showTable && (
                <>
                  <div className={styles.tableControls}>
                    <div className={styles.tableTabs}>
                      <button
                        className={`${styles.tabButton} ${activeTable === 'sources' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTable('sources')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M3 17H21M3 12H21M3 7H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Источники
                      </button>
                      <button
                        className={`${styles.tabButton} ${activeTable === 'mention_types' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTable('mention_types')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M3 7H21M3 12H21M3 17H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Типы упоминаний
                      </button>
                    </div>
                    {activeTable === 'sources' && (
                      <button className={styles.exportButton} onClick={exportSourcesTable}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Выгрузить таблицу
                      </button>
                    )}
                    {activeTable === 'mention_types' && (
                      <button className={styles.exportButton} onClick={exportMentionTypesTable}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Выгрузить таблицу
                      </button>
                    )}
                  </div>
                  <div className={styles.tableWrapper}>
                    {activeTable === 'sources' && (
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Источник</th>
                            <th className={styles.sortableHeader} onClick={() => handleSort('neutral')}>
                              Нейтральные
                              {sortConfig.key === 'neutral' && (
                                <span className={styles.sortIcon}>{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                              )}
                            </th>
                            <th className={styles.sortableHeader} onClick={() => handleSort('positive')}>
                              Позитивные
                              {sortConfig.key === 'positive' && (
                                <span className={styles.sortIcon}>{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                              )}
                            </th>
                            <th className={styles.sortableHeader} onClick={() => handleSort('negative')}>
                              Негативные
                              {sortConfig.key === 'negative' && (
                                <span className={styles.sortIcon}>{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                              )}
                            </th>
                            <th className={styles.sortableHeader} onClick={() => handleSort('audience')}>
                              Аудитория
                              {sortConfig.key === 'audience' && (
                                <span className={styles.sortIcon}>{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                              )}
                            </th>
                            <th className={styles.sortableHeader} onClick={() => handleSort('total')}>
                              Всего
                              {sortConfig.key === 'total' && (
                                <span className={styles.sortIcon}>{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSourcesForTable.length > 0 ? filteredSourcesForTable.map((source, index) => (
                            <tr key={`source-${source.source}-${index}`}>
                              <td>{source.source}</td>
                              <td>{source.neutral}</td>
                              <td>{source.positive}</td>
                              <td>{source.negative}</td>
                              <td>{source.audience.toLocaleString()}</td>
                              <td>{source.total}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center' }}>Нет данных по заданным фильтрам</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                    {activeTable === 'mention_types' && (
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Источник</th>
                            <th>Тип упоминания</th>
                            <th className={styles.sortableHeader} onClick={() => handleMentionTypeSort('count')}>
                              Количество
                              {mentionTypeSortConfig.key === 'count' && (
                                <span className={styles.sortIcon}>
                                  {mentionTypeSortConfig.direction === 'desc' ? '↓' : '↑'}
                                </span>
                              )}
                            </th>
                            <th className={styles.sortableHeader} onClick={() => handleMentionTypeSort('audience')}>
                              Аудитория
                              {mentionTypeSortConfig.key === 'audience' && (
                                <span className={styles.sortIcon}>
                                  {mentionTypeSortConfig.direction === 'desc' ? '↓' : '↑'}
                                </span>
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {mentionTypesTable.length > 0 ? mentionTypesTable.map((row, idx) => (
                            <tr key={`${row.hub}-${row.type}-${idx}`}>
                              <td>{row.hub}</td>
                              <td>{row.type}</td>
                              <td>{row.count}</td>
                              <td>{row.audience.toLocaleString()}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center' }}>Нет данных по заданным фильтрам</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default VoiceOfCustomer;