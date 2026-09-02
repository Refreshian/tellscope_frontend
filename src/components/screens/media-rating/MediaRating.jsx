import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import MediaGraphs from '@/components/content/graphs/media-graphs/MediaGraphs';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '@/services/other.service';

import NoDataRequest from '../../no-data-request/NoDataRequest';

import styles from './MediaRating.module.scss';
import { useLazyMediaGraphQuery } from '@/services/getGraph.service';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const MediaRating = () => {
  useCheckAuth();

  const { pathname } = useLocation();
  const { addData, addMinDate, addMaxDate, addIndex } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(store => store.dataUsersSlice);

  const { data: data_getUserId } = useGetUserIdQuery();
  const { data, isError, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);

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

  const [trigger, { data: data_media, isLoading: isLoading_media, isSuccess: isSuccess_media, isError: isError_media }] = useLazyMediaGraphQuery();

  const [indexRange, setIndexRange] = useState([0, 100_000]);
  const [maxIndex, setMaxIndex] = useState(100_000);

  useEffect(() => {
    if (!data_media) return;
    const indices = [];
    data_media.second_graph?.forEach(item => { if (item.index != null) indices.push(+item.index); });
    data_media.first_graph?.positive_smi?.forEach(item => { if (item.index != null) indices.push(+item.index); });
    data_media.first_graph?.negative_smi?.forEach(item => { if (item.index != null) indices.push(+item.index); });
    if (indices.length) {
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      setIndexRange([min, max]);
      setMaxIndex(max);
    }
  }, [data_media]);

  const [sliderRange, setSliderRange] = useState([0, 100_000]);
  const [appliedRange, setAppliedRange] = useState([0, 100_000]);
  useEffect(() => {
    setSliderRange(indexRange);
    setAppliedRange(indexRange);
  }, [indexRange[0], indexRange[1]]);

  const [isNoData, setIsNoData] = useState(false);
  useEffect(() => {
    if (isError_media) {
      setIsNoData(true);
      const t = setTimeout(() => setIsNoData(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isError_media]);

  // ---------------- Новое: индексируем ссылки для rating ----------------
  const urlMap = useMemo(() => {
    // Ключ вида "${name}___${index}" => ссылка
    if (!data_media?.second_graph) return {};
    const map = {};
    data_media.second_graph.forEach(item => {
      const key = `${item.name}___${item.index}`;
      map[key] = item.url;
    });
    return map;
  }, [data_media?.second_graph]);
  // ---------------------------------------------------------------------

  const filteredData = useMemo(() => {
    if (!data_media) return null;
    const result = { ...data_media };
    result.filtered_second_graph = result.second_graph?.filter(
      item => item.index >= appliedRange[0] && item.index <= appliedRange[1]
    ) || [];
    result.filtered_first_graph = {
      positive_smi: result.first_graph?.positive_smi?.filter(
        item => item.index >= appliedRange[0] && item.index <= appliedRange[1]
      ) || [],
      negative_smi: result.first_graph?.negative_smi?.filter(
        item => item.index >= appliedRange[0] && item.index <= appliedRange[1]
      ) || []
    };
    return result;
  }, [data_media, appliedRange]);

  const handleSliderChange = value => setSliderRange(value);
  const getMediaData = useCallback(() => { trigger(dataForRequest); }, [dataForRequest, trigger]);

  // AI
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [searchInTexts, setSearchInTexts] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Фиктивные значения для фильтров
  // Если у вас они есть в стейте или пропсах, замените!
  const audienceRange = [0, 10000];
  const repostsRange = [0, 1000];
  const erRange = [0, 1];
  const viewsCountRange = [0, 100000];

  // Новый способ отправки AI-запроса
  const handleAiSubmit = async () => {
    if (!aiQuery.trim()) {
      setAiError('Пожалуйста, введите запрос для анализа');
      setAiAnalysis(null);
      return;
    }
    setIsAiLoading(true);
    setAiAnalysis(null);
    setAiError(null);

    try {
      if (!filteredData)
        throw new Error('Нет отфильтрованных данных для анализа');

      const requestData = {
        question: aiQuery,
        data: filteredData,
        index: dataForRequest.index,
        min_date: dataForRequest.min_date,
        max_date: dataForRequest.max_date,
        filters: {
          audienceRange,
          repostsRange,
          erRange,
          viewsCountRange,
        },
        searchInTexts,
      };
// http://localhost:5000/ai-question-media-rating
      const response = await fetch('/api/ai-question-media-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok)
        throw new Error(`Ошибка запроса: ${response.status}`);
 
      const result = await response.json();

      if (result.content)
        setAiAnalysis(result.content);
      else if (result.response?.content)
        setAiAnalysis(result.response.content);
      else if (result.analysis)
        setAiAnalysis(result.analysis);
      else if (typeof result === 'string')
        setAiAnalysis(result);
      else
        setAiAnalysis(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Ошибка при запросе к ИИ:', error);
      setAiError(error.message || 'Произошла ошибка при анализе. Попробуйте позже.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Table Tabs and Data
  const [activeTab, setActiveTab] = useState('rating'); // 'rating' или 'dynamics'
  const [showTable, setShowTable] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'index', direction: 'desc' });

  const tableData = useMemo(() => {
    if (!filteredData) return [];
    if (activeTab === 'rating') {
      return [
        ...(filteredData.filtered_first_graph.positive_smi?.map(item => ({
          ...item, sign: 'positive',
        })) || []),
        ...(filteredData.filtered_first_graph.negative_smi?.map(item => ({
          ...item, sign: 'negative',
        })) || []),
      ];
    } else {
      return filteredData.filtered_second_graph || [];
    }
  }, [filteredData, activeTab]);

  const sortedTableData = useMemo(() => {
    if (!tableData) return [];
    if (!sortConfig.key) return tableData;
    const sorted = [...tableData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [tableData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const exportTable = () => {
    if (!sortedTableData?.length) return;

    let ws_data = [];
    if (activeTab === 'rating') {
      ws_data.push(['Ресурс', 'Индекс', 'Кол-во сообщений', 'Тональность', 'Ссылка на сообщение']);
      sortedTableData.forEach(row => {
        const key = `${row.name}___${row.index}`;
        const url = urlMap[key] || '';
        ws_data.push([
          row.name,
          row.index,
          row.message_count,
          row.sign === 'positive' ? 'Позитив' : 'Негатив',
          url
        ]);
      });
    } else {
      ws_data.push(['Ресурс', 'Индекс', 'Время', 'Категория СМИ', 'Число дубликатов', 'URL']);
      sortedTableData.forEach(row => {
        ws_data.push([
          row.name,
          row.index,
          row.time,
          row.categoryName || row.category_name || '',
          row.duplicateCount ?? row.duplicate_count ?? 1,
          row.url,
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Таблица');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `media_table_${activeTab}.xlsx`);
  };

  return (
    <Layout>
      {(isLoading || isLoading_media) && (<><BackgroundLoader /><Loader /></>)}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
      <Content>
        <div className={styles.block__pageName} style={isSuccess_media ? {} : { alignSelf: 'center' }}>
          {isSuccess_media
            ? <h3 className={styles.pageName__title}>Медиа рейтинг</h3>
            : <BeforeSearch title='Медиа рейтинг' link='https://tsdoc.headsmade.com/en/media-rating' />
          }
        </div>
        <div className={styles.block__configureSearch} style={isSuccess_media ? {} : { alignSelf: 'center' }}>
          {isSuccess && Object.keys(dataUser || {}).length > 0 && <DataForSearch />}
          {isSuccess &&
            dataForRequest.index !== null &&
            Object.keys(dataUser || {}).length > 0 && (
              <CustomCalendar />
            )}
          <Button
            style={{
              width: 'calc(220/1440*100vw)',
              height: 'calc(56/1440*100vw)',
            }}
            onClick={getMediaData}
          >
            Запуск
          </Button>
        </div>
        {isSuccess_media && data_media && (
          <div className={styles.slidersContainer}>
            <div className={styles.sliderRow}>
              <div className={styles.sliderWrapper}>
                <span style={{ fontWeight: 500, marginBottom: 6, display: 'inline-block' }}>Индекс:</span>
                <Slider
                  range
                  min={indexRange[0]}
                  max={indexRange[1]}
                  value={sliderRange}
                  onChange={handleSliderChange}
                  onChangeComplete={setAppliedRange}
                  onAfterChange={setAppliedRange}
                  trackStyle={[{ backgroundColor: '#6ED2FF', height: 4 }]}
                  handleStyle={[
                    { borderColor: '#fff', backgroundColor: '#3E8DF6', width: 14, height: 14 },
                    { borderColor: '#fff', backgroundColor: '#3E8DF6', width: 14, height: 14 }
                  ]}
                  railStyle={{ backgroundColor: '#E8F4FB', height: 4 }}
                />
                <div className={styles.sliderValues}>
                  <span>{sliderRange[0]}</span> — <span>{sliderRange[1]}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {isNoData && <NoDataRequest />}
{!isNoData && isSuccess_media && (
  <Suspense fallback={<Loader />}>
    <MediaGraphs
      tab={activeTab}
      originalData={data_media}
      filteredData={filteredData}
      selectedIndexRange={sliderRange}
    />

    {/* Добавьте обёртку */}
    <div className={styles.scrollContainer}>
      <div className={styles.scrollableResults}>

              {/* ====== AI Блок анализа ====== */}
              <div className={styles.aiAnalysisBlock}>
                <button
                  className={styles.analyzeButton}
                  onClick={() => setShowAiInput((v) => !v)}
                >
                  {showAiInput ? 'Скрыть анализ' : 'Проанализировать данные с помощью ИИ'}
                </button>
                {showAiInput && (
                  <div className={styles.aiInteractionWrapper}>
                    <div className={styles.aiInputContainer}>
                      <textarea
                        className={styles.aiTextarea}
                        placeholder={
                          "Примеры запросов:\n- Какие основные тенденции в данных?\n- Расскажи, как распространялась информация, приведи примеры и ссылки на важные сообщения.\n- Выяви самых активных авторов с высоким значением вовлеченности."
                        }
                        rows={4}
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                      />
                      <div className={styles.aiControls}>
                        <div className={styles.aiCheckboxContainer}>
                          <input
                            type="checkbox"
                            id="searchInTexts"
                            className={styles.aiCheckbox}
                            checked={searchInTexts}
                            onChange={(e) => setSearchInTexts(e.target.checked)}
                          />
                          <label htmlFor="searchInTexts" className={styles.aiCheckboxLabel}>
                            Искать по текстам
                          </label>
                        </div>
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

              {/* ====== Таблица ====== */}
              <div className={styles.tableSection}>
                <button
                  className={styles.tableToggleHeader}
                  onClick={() => setShowTable(v => !v)}
                >
                  <div className={styles.toggleTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`${styles.toggleIcon} ${showTable ? styles.rotated : ''}`}>
                      <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>
                      {activeTab === 'rating'
                        ? 'Таблица данных'
                        : 'Таблица данных'}
                    </span>
                  </div>
                  <div className={styles.toggleStatus}>
                    {showTable ? 'Скрыть таблицу' : 'Показать таблицу'}
                  </div>
                </button>
                {showTable && (
                  <div className={styles.tableControls}>
                    <div className={styles.exportButtons}>
                      <button className={styles.exportButton} onClick={exportTable}>
                        <svg width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Выгрузить таблицу
                      </button>
                    </div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            {activeTab === 'rating' ? (
                              <>
                                <th onClick={() => handleSort('name')} className={styles.sortableHeader}>Ресурс
                                  {sortConfig.key === 'name' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th onClick={() => handleSort('index')} className={styles.sortableHeader}>Индекс
                                  {sortConfig.key === 'index' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th onClick={() => handleSort('message_count')} className={styles.sortableHeader}>Кол-во сообщений
                                  {sortConfig.key === 'message_count' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th>Тональность</th>
                                <th>Ссылка на сообщение</th>
                              </>
                            ) : (
                              <>
                                <th onClick={() => handleSort('name')} className={styles.sortableHeader}>Ресурс
                                  {sortConfig.key === 'name' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th onClick={() => handleSort('index')} className={styles.sortableHeader}>Индекс
                                  {sortConfig.key === 'index' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th onClick={() => handleSort('time')} className={styles.sortableHeader}>Время
                                  {sortConfig.key === 'time' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th onClick={() => handleSort('categoryName')} className={styles.sortableHeader}>Категория СМИ
                                  {sortConfig.key === 'categoryName' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th onClick={() => handleSort('duplicateCount')} className={styles.sortableHeader}>Число дубликатов
                                  {sortConfig.key === 'duplicateCount' && (
                                    <span className={styles.sortIcon}>
                                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                                <th>Ссылка на сообщение</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTableData.map((item, idx) => (
                            activeTab === 'rating' ? (
                              <tr key={item.name + item.index}>
                                <td>{item.name}</td>
                                <td>{item.index}</td>
                                <td>{item.message_count}</td>
                                <td>
                                  {item.sign === 'positive'
                                    ? <span style={{ color: '#4caf50' }}>Позитив</span>
                                    : <span style={{ color: '#f44336' }}>Негатив</span>}
                                </td>
                                <td className={styles.textCell}>
                                  {
                                    (() => {
                                      const key = `${item.name}___${item.index}`;
                                      const url = urlMap[key];
                                      return url
                                        ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                                        : <span style={{ color: '#aaa' }}>—</span>
                                    })()
                                  }
                                </td>
                              </tr>
                            ) : (
                              <tr key={item.url + idx}>
                                <td>{item.name}</td>
                                <td>{item.index}</td>
                                <td>{item.time}</td>
                                <td>{item.categoryName || item.category_name || '—'}</td>
                                <td>{item.duplicateCount ?? item.duplicate_count ?? 1}</td>
                                <td className={styles.textCell}>
                                  {item.url
                                    ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                                    : <span style={{ color: '#aaa' }}>—</span>
                                  }
                                </td>
                              </tr>
                            )
                          ))}
                          {!sortedTableData.length && (
                            <tr>
                              <td colSpan={activeTab === 'rating' ? 5 : 6}>
                                Нет данных для отображения
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              {/* ====== /Table Section ====== */}
            </div>
            {/* ====== /SCROLLABLE ====== */}
            </div>
          </Suspense>
        )}
      </Content>
    </Layout>
  );
};

export default MediaRating;