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
import AiAnalysisBlock from '@/components/ui/ai-analysis/AiAnalysisBlock';

import styles from './MediaRating.module.scss';
import { useLazyMediaGraphQuery } from '@/services/getGraph.service';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatTime } from '@/components/content/graphs/media-graphs/mediaView';

const POS_COLOR = '#32ff32';
const NEG_COLOR = '#FF3232';
const NUMERIC_SORT_KEYS = new Set(['index', 'message_count', 'time', 'duplicateCount']);

const pickSourceUrl = (items, name, sign, index) => {
  const color = sign === 'positive' ? POS_COLOR : NEG_COLOR;
  const sameTone = (items || []).filter(
    item =>
      item.name === name &&
      String(item.color || '').toLowerCase() === color.toLowerCase() &&
      item.url
  );
  const exact = sameTone.find(item => Number(item.index) === Number(index));
  if (exact?.url) return exact.url;
  if (sameTone[0]?.url) return sameTone[0].url;
  const any = (items || []).find(
    item => item.name === name && Number(item.index) === Number(index) && item.url
  );
  return any?.url || '';
};

const rowValue = (row, key) => {
  if (key === 'sign') return row.sign === 'positive' ? 'позитив' : 'негатив';
  if (key === 'categoryName') return row.categoryName || row.category_name || '';
  if (key === 'duplicateCount') return row.duplicateCount ?? row.duplicate_count ?? 1;
  return row[key];
};

const compareRows = (a, b, key, direction) => {
  const dir = direction === 'asc' ? 1 : -1;
  const va = rowValue(a, key);
  const vb = rowValue(b, key);
  if (NUMERIC_SORT_KEYS.has(key)) {
    const na = Number(va);
    const nb = Number(vb);
    const da = Number.isFinite(na) ? na : 0;
    const db = Number.isFinite(nb) ? nb : 0;
    if (da !== db) return (da - db) * dir;
  } else {
    const sa = String(va ?? '').toLowerCase();
    const sb = String(vb ?? '').toLowerCase();
    if (sa !== sb) return sa.localeCompare(sb, 'ru') * dir;
  }
  const ia = Number(a.index) || 0;
  const ib = Number(b.index) || 0;
  if (ia !== ib) return ib - ia;
  return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
};

const SortableTh = ({ label, sortKey, sortConfig, onSort, styles }) => (
  <th onClick={() => onSort(sortKey)} className={styles.sortableHeader}>
    {label}
    {sortConfig.key === sortKey && (
      <span className={styles.sortIcon}>
        {sortConfig.direction === 'desc' ? '↓' : '↑'}
      </span>
    )}
  </th>
);

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
        data: {
          ...filteredData,
          first_graph: filteredData.filtered_first_graph || filteredData.first_graph,
          second_graph: filteredData.filtered_second_graph || filteredData.second_graph,
        },
        index: dataForRequest.index,
        min_date: dataForRequest.min_date,
        max_date: dataForRequest.max_date,
        filters: {
          audienceRange,
          repostsRange,
          erRange,
          viewsCountRange,
          indexRange: appliedRange,
          sliderRange: appliedRange,
        },
        searchInTexts,
      };
// http://localhost:5000/ai-question-media-rating
      const response = await fetch('/api/ai-question-media-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || `Ошибка запроса: ${response.status}`);

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
    const messages = filteredData.filtered_second_graph || [];
    if (activeTab === 'rating') {
      const toRow = (item, sign) => ({
        ...item,
        sign,
        url: pickSourceUrl(messages, item.name, sign, item.index),
      });
      return [
        ...(filteredData.filtered_first_graph.positive_smi?.map(item =>
          toRow(item, 'positive'),
        ) || []),
        ...(filteredData.filtered_first_graph.negative_smi?.map(item =>
          toRow(item, 'negative'),
        ) || []),
      ];
    }
    return messages;
  }, [filteredData, activeTab]);

  const sortedTableData = useMemo(() => {
    if (!tableData.length) return [];
    return [...tableData].sort((a, b) =>
      compareRows(a, b, sortConfig.key, sortConfig.direction),
    );
  }, [tableData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const handleGraphTab = (nextTab) => {
    setActiveTab(nextTab);
    setSortConfig(
      nextTab === 'rating'
        ? { key: 'index', direction: 'desc' }
        : { key: 'time', direction: 'desc' },
    );
  };

  const exportTable = () => {
    if (!sortedTableData?.length) return;

    let ws_data = [];
    if (activeTab === 'rating') {
      ws_data.push(['Ресурс', 'Индекс', 'Кол-во сообщений', 'Тональность', 'Ссылка на сообщение']);
      sortedTableData.forEach(row => {
        ws_data.push([
          row.name,
          row.index,
          row.message_count,
          row.sign === 'positive' ? 'Позитив' : 'Негатив',
          row.url || ''
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
      <Content
        alignStart={Boolean(isSuccess_media)}
        style={isSuccess_media ? { overflow: 'auto' } : undefined}
      >
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
            <div className={styles.results}>
              <div
                className={`${styles.graphSlot} ${showTable ? styles.graphCompact : ''}`}
              >
                <MediaGraphs
                  tab={activeTab}
                  onTabChange={handleGraphTab}
                  originalData={data_media}
                  filteredData={filteredData}
                  selectedIndexRange={sliderRange}
                />
              </div>

              <div className={styles.belowGraph}>
                <AiAnalysisBlock
                visibleCount={
                  (filteredData?.filtered_first_graph?.positive_smi?.length || 0)
                  + (filteredData?.filtered_first_graph?.negative_smi?.length || 0)
                }
                totalCount={
                  (data_media?.first_graph?.positive_smi?.length || 0)
                  + (data_media?.first_graph?.negative_smi?.length || 0)
                }
                unit="ресурсов"
                extraNote={`индекс ${appliedRange[0]}–${appliedRange[1]}`}
                suggestions={[
                  'Какие СМИ выделяются в негативе при текущем индексе?',
                  'Кто лидирует в позитиве и насколько это устойчиво?',
                  'Какие источники стоит смотреть в первую очередь?',
                ]}
                showInput={showAiInput}
                onToggle={() => setShowAiInput((v) => !v)}
                query={aiQuery}
                onQueryChange={setAiQuery}
                onSubmit={handleAiSubmit}
                loading={isAiLoading}
                error={aiError}
                analysis={aiAnalysis}
                loadingNode={<Loader size="small" />}
              />

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
                                <SortableTh label="Ресурс" sortKey="name" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Индекс" sortKey="index" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Кол-во сообщений" sortKey="message_count" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Тональность" sortKey="sign" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Ссылка на сообщение" sortKey="url" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                              </>
                            ) : (
                              <>
                                <SortableTh label="Ресурс" sortKey="name" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Индекс" sortKey="index" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Время" sortKey="time" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Категория СМИ" sortKey="categoryName" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Число дубликатов" sortKey="duplicateCount" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                                <SortableTh label="Ссылка на сообщение" sortKey="url" sortConfig={sortConfig} onSort={handleSort} styles={styles} />
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTableData.map((item, idx) => (
                            activeTab === 'rating' ? (
                              <tr key={`${item.sign}-${item.name}-${item.index}-${idx}`}>
                                <td>{item.name}</td>
                                <td>{item.index}</td>
                                <td>{item.message_count}</td>
                                <td>
                                  {item.sign === 'positive'
                                    ? <span style={{ color: '#4caf50' }}>Позитив</span>
                                    : <span style={{ color: '#f44336' }}>Негатив</span>}
                                </td>
                                <td className={styles.textCell}>
                                  {item.url
                                    ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                                    : <span style={{ color: '#aaa' }}>—</span>}
                                </td>
                              </tr>
                            ) : (
                              <tr key={`${item.elastic_id || item.url || item.name}-${idx}`}>
                                <td>{item.name}</td>
                                <td>{item.index}</td>
                                <td>{formatTime(item.time)}</td>
                                <td>{item.categoryName || item.category_name || '—'}</td>
                                <td>{item.duplicateCount ?? item.duplicate_count ?? 1}</td>
                                <td className={styles.textCell}>
                                  {item.url
                                    ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                                    : <span style={{ color: '#aaa' }}>—</span>}
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
              </div>
            </div>
          </Suspense>
        )}
      </Content>
    </Layout>
  );
};

export default MediaRating;