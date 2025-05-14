import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import TonalityGraphs from '@/components/content/graphs/tonality-graphs/TonalityGraphs';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
import NoDataRequest from '@/components/no-data-request/NoDataRequest';

import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '@/services/other.service';
import { useLazyUserTonalityQuery } from '@/services/getGraph.service';

import styles from './UserTonality.module.scss';
import * as XLSX from 'xlsx';

const UserTonality = () => {
  useCheckAuth();

  // Основные состояния компонента
  const [currentTab, setCurrentTab] = useState('Негативные упоминания');
  const { pathname } = useLocation();
  const { addData, addIndex, addMinDate, addMaxDate } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const { json_files_directory: dataUser } = useSelector(store => store.dataUsersSlice);
  const { index: baseData, min_range_date, max_range_date } = useSelector(state => state.dataForRequest);

  // Добавляем новое состояние для выбора таблицы
  const [activeTable, setActiveTable] = useState('sources'); // 'sources' или 'authors'
  const [showTable, setShowTable] = useState(false);

  // Добавляем в начало компонента, где объявляются состояния
  const [sortConfig, setSortConfig] = useState({
    key: null, // 'comments', 'likes', 'views', 'audience'
    direction: 'desc', // 'asc' или 'desc'
  });

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const [authorsSortConfig, setAuthorsSortConfig] = useState({
    key: 'audience', // По умолчанию сортируем по аудитории
    direction: 'desc', // По убыванию (от большего к меньшему)
  });

  const handleAuthorsSort = (key) => {
    let direction = 'desc';
    if (authorsSortConfig.key === key && authorsSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setAuthorsSortConfig({ key, direction });
  };

  // Состояния для API запросов
  const [
    trigger,
    {
      data: data_tonality,
      isLoading: isLoading_tonality,
      isSuccess: isSuccess_tonality,
      isError: isError_tonality,
      error: error_tonality,
    },
  ] = useLazyUserTonalityQuery();
  
  const {
    data: data_getUserId,
    isError: isError_getUserId,
    error: error_getUserId,
    isLoading: isLoading_getUserId,
  } = useGetUserIdQuery();
  
  const { 
    data, 
    isError, 
    error, 
    isLoading, 
    isSuccess 
  } = useGetUserFoldersQuery(data_getUserId);

  // Состояния для фильтрации данных
  const [commentsRange, setCommentsRange] = useState([0, 1000]);
  const [likesRange, setLikesRange] = useState([0, 1000]);
  const [viewsRange, setViewsRange] = useState([0, 10000]);
  const [audienceRange, setAudienceRange] = useState([0, 50000]);

  useEffect(() => {
    if (data_tonality) {
      // Найти максимальные значения для каждого показателя
      let maxComments = 1000;
      let maxLikes = 1000;
      let maxViews = 10000;
      let maxAudience = 50000;
  
      const allHubs = [
        ...(data_tonality.tonality_hubs_values?.positive_hubs || []),
        ...(data_tonality.tonality_hubs_values?.negative_hubs || [])
      ];
  
      allHubs.forEach(hub => {
        maxComments = Math.max(maxComments, hub.comments_sum);
        maxLikes = Math.max(maxLikes, hub.likes_sum);
        maxViews = Math.max(maxViews, hub.views_sum);
        maxAudience = Math.max(maxAudience, hub.audience_sum);
      });
  
      // Установить значения фильтров с запасом
      setCommentsRange([0, Math.ceil(maxComments * 1.1)]);
      setLikesRange([0, Math.ceil(maxLikes * 1.1)]);
      setViewsRange([0, Math.ceil(maxViews * 1.1)]);
      setAudienceRange([0, Math.ceil(maxAudience * 1.1)]);
    }
  }, [data_tonality]);

  // Состояния для ИИ-анализа
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [isNoData, setIsNoData] = useState(false);

  // Хуки и эффекты
  useAddBaseAndDate(
    dataUser,
    data,
    isSuccess,
    baseData,
    addData,
    addMinDate,
    addMaxDate,
    addIndex,
  );

  const data_request = useMemo(
    () => ({
      index: baseData,
      min_date: min_range_date,
      max_date: max_range_date,
    }),
    [baseData, min_range_date, max_range_date],
  );

  const getTonalityData = useCallback(() => {
    trigger(data_request);
  }, [data_request]);

  useEffect(() => {
    if (isError_tonality) {
      setIsNoData(true);
      const timer = setTimeout(() => setIsNoData(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isError_tonality]);

  // Обработчики событий
  const handleSliderChange = (setter) => (value) => {
    setter(value);
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };


  const filteredData = useMemo(() => {
    if (!data_tonality) return null;
  
    const dataCopy = JSON.parse(JSON.stringify(data_tonality));
  
    if (dataCopy.tonality_hubs_values) {
      dataCopy.tonality_hubs_values.positive_hubs = dataCopy.tonality_hubs_values.positive_hubs.filter(hub => {
        return (
          hub.comments_sum >= commentsRange[0] &&
          hub.comments_sum <= commentsRange[1] &&
          hub.likes_sum >= likesRange[0] &&
          hub.likes_sum <= likesRange[1] &&
          hub.views_sum >= viewsRange[0] &&
          hub.views_sum <= viewsRange[1] &&
          hub.audience_sum >= audienceRange[0] &&
          hub.audience_sum <= audienceRange[1]
        );
      });
  
      dataCopy.tonality_hubs_values.negative_hubs = dataCopy.tonality_hubs_values.negative_hubs.filter(hub => {
        return (
          hub.comments_sum >= commentsRange[0] &&
          hub.comments_sum <= commentsRange[1] &&
          hub.likes_sum >= likesRange[0] &&
          hub.likes_sum <= likesRange[1] &&
          hub.views_sum >= viewsRange[0] &&
          hub.views_sum <= viewsRange[1] &&
          hub.audience_sum >= audienceRange[0] &&
          hub.audience_sum <= audienceRange[1]
        );
      });
  
      if (dataCopy.tonality_values) {
        dataCopy.tonality_values.positive_count = dataCopy.tonality_hubs_values.positive_hubs.reduce(
          (sum, hub) => sum + hub.values, 0
        );
        dataCopy.tonality_values.negative_count = dataCopy.tonality_hubs_values.negative_hubs.reduce(
          (sum, hub) => sum + hub.values, 0
        );
      }
    }
  
    // Фильтрация положительных авторов с учётом fullname/hub/Без имени
    if (dataCopy.positive_authors_values) {
      dataCopy.positive_authors_values = dataCopy.positive_authors_values
        .map(authorGroup => {
          authorGroup.author_data = authorGroup.author_data
            .map(author => {
              if (!author.texts || author.texts.length === 0) return null;
  
              // фильтр текстов по диапазонам
              const filteredTexts = author.texts.filter(text => {
                const commentsCount = parseInt(text.commentsCount) || 0;
                const likesCount = parseInt(text.likesCount) || 0;
                const viewsCount = parseInt(text.viewsCount) || 0;
                const audienceCount = parseInt(text.audienceCount) || 0;
  
                return (
                  commentsCount >= commentsRange[0] &&
                  commentsCount <= commentsRange[1] &&
                  likesCount >= likesRange[0] &&
                  likesCount <= likesRange[1] &&
                  viewsCount >= viewsRange[0] &&
                  viewsCount <= viewsRange[1] &&
                  audienceCount >= audienceRange[0] &&
                  audienceCount <= audienceRange[1]
                );
              });
  
              if (filteredTexts.length === 0) return null;
  
              // Проставляем fullname: сначала fullname, иначе hub из текстов, иначе "Без имени"
              let fullName = (author.fullname && author.fullname.trim() !== '' && author.fullname !== 'Без имени')
                ? author.fullname
                : (
                    filteredTexts[0]?.hub
                      ? filteredTexts[0].hub
                      : 'Без имени'
                  );
  
              return {
                ...author,
                texts: filteredTexts,
                fullname: fullName,
                count_texts: filteredTexts.length
              };
            })
            .filter(Boolean);
  
          return authorGroup.author_data.length > 0 ? authorGroup : null;
        })
        .filter(Boolean);
    }
  
    // Фильтрация отрицательных авторов с учётом fullname/hub/Без имени
    if (dataCopy.negative_authors_values) {
      dataCopy.negative_authors_values = dataCopy.negative_authors_values
        .map(authorGroup => {
          authorGroup.author_data = authorGroup.author_data
            .map(author => {
              if (!author.texts || author.texts.length === 0) return null;
  
              const filteredTexts = author.texts.filter(text => {
                const commentsCount = parseInt(text.commentsCount) || 0;
                const likesCount = parseInt(text.likesCount) || 0;
                const viewsCount = parseInt(text.viewsCount) || 0;
                const audienceCount = parseInt(text.audienceCount) || 0;
  
                return (
                  commentsCount >= commentsRange[0] &&
                  commentsCount <= commentsRange[1] &&
                  likesCount >= likesRange[0] &&
                  likesCount <= likesRange[1] &&
                  viewsCount >= viewsRange[0] &&
                  viewsCount <= viewsRange[1] &&
                  audienceCount >= audienceRange[0] &&
                  audienceCount <= audienceRange[1]
                );
              });
  
              if (filteredTexts.length === 0) return null;
  
              // Проставляем fullname: сначала fullname, иначе hub из текстов, иначе "Без имени"
              let fullName = (author.fullname && author.fullname.trim() !== '' && author.fullname !== 'Без имени')
                ? author.fullname
                : (
                    filteredTexts[0]?.hub
                      ? filteredTexts[0].hub
                      : 'Без имени'
                  );
  
              return {
                ...author,
                texts: filteredTexts,
                fullname: fullName,
                count_texts: filteredTexts.length
              };
            })
            .filter(Boolean);
  
          return authorGroup.author_data.length > 0 ? authorGroup : null;
        })
        .filter(Boolean);
    }
  
    return dataCopy;
  }, [data_tonality, commentsRange, likesRange, viewsRange, audienceRange]);
  

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

      const requestData = {
        question: aiQuery,
        data: filteredData,
        index: baseData,
        min_date: min_range_date,
        max_date: max_range_date,
        current_tab: currentTab
      };
      // http://localhost:5001/ai-question-raw
      const response = await fetch('/api/ai-question-raw', {
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

      // Изменения здесь - правильно извлекаем content из ответа
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

    // Функция для экспорта текущей таблицы
    const exportCurrentTable = () => {
      if (!filteredData) return;
    
      let worksheetData = [];
      let fileName = '';
    
      if (activeTable === 'sources') {
        fileName = 'Источники_упоминаний.xlsx';
        
        const headers = [
          'Источник', 
          'Тональность', 
          'Комментарии', 
          'Лайки', 
          'Просмотры', 
          'Аудитория'
        ];
    
        worksheetData.push(headers);
    
        // Сортируем данные перед экспортом
        const sortedData = [...(filteredData?.tonality_hubs_values?.positive_hubs || []), 
                           ...(filteredData?.tonality_hubs_values?.negative_hubs || [])]
          .sort((a, b) => {
            if (!sortConfig.key) return 0;
            
            const valueA = a[`${sortConfig.key}_sum`];
            const valueB = b[`${sortConfig.key}_sum`];
            
            if (valueA < valueB) {
              return sortConfig.direction === 'desc' ? 1 : -1;
            }
            if (valueA > valueB) {
              return sortConfig.direction === 'desc' ? -1 : 1;
            }
            return 0;
          });
    
        sortedData.forEach(hub => {
          worksheetData.push([
            hub.name,
            hub.tonality === 'positive' ? 'Положительная' : 'Отрицательная',
            hub.comments_sum,
            hub.likes_sum,
            hub.views_sum,
            hub.audience_sum
          ]);
        });
      } else {
      // Подготовка данных для таблицы авторов
      fileName = 'Авторы_упоминаний.xlsx';
      
      // Заголовки
      const headers = [
        'Имя', 
        'Тип', 
        'Пол', 
        'Возраст', 
        'Регион', 
        'Тональность', 
        // 'Сообщений', 
        'Аудитория', 
        'URL'
      ];

      worksheetData.push(headers);

      // Положительные авторы
      filteredData?.positive_authors_values?.forEach(authorGroup => {
        authorGroup.author_data.forEach(author => {
          worksheetData.push([
            author.fullname,
            author.author_type,
            author.sex,
            author.age,
            author.texts[0]?.region || '-',
            'Положительная',
            // author.count_texts,
            author.texts[0]?.audienceCount || 0,
            author.url
          ]);
        });
      });

      // Отрицательные авторы
      filteredData?.negative_authors_values?.forEach(authorGroup => {
        authorGroup.author_data.forEach(author => {
          worksheetData.push([
            author.fullname,
            author.author_type,
            author.sex,
            author.age,
            author.texts[0]?.region || '-',
            'Отрицательная',
            author.count_texts,
            author.texts[0]?.audienceCount || 0,
            author.url
          ]);
        });
      });
    }

    // Создание книги и листа
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Данные');

    // Генерация и скачивание файла
    XLSX.writeFile(workbook, fileName);
  };

  // Функция для экспорта всех таблиц
  const exportAllTables = () => {
    if (!filteredData) return;

    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new();

    // 1. Лист с источниками
    let sourcesData = [
      ['Источник', 'Тональность', 'Комментарии', 'Лайки', 'Просмотры', 'Аудитория']
    ];

    // Добавляем положительные источники
    filteredData?.tonality_hubs_values?.positive_hubs?.forEach(hub => {
      sourcesData.push([
        hub.name,
        'Положительная',
        hub.comments_sum,
        hub.likes_sum,
        hub.views_sum,
        hub.audience_sum
      ]);
    });

    // Добавляем отрицательные источники
    filteredData?.tonality_hubs_values?.negative_hubs?.forEach(hub => {
      sourcesData.push([
        hub.name,
        'Отрицательная',
        hub.comments_sum,
        hub.likes_sum,
        hub.views_sum,
        hub.audience_sum
      ]);
    });

    const sourcesSheet = XLSX.utils.aoa_to_sheet(sourcesData);
    XLSX.utils.book_append_sheet(workbook, sourcesSheet, 'Источники');

    // 2. Лист с авторами
    let authorsData = [
      ['Имя', 'Тип', 'Пол', 'Возраст', 'Регион', 'Тональность', 'Аудитория', 'URL']
    ];

    // Добавляем положительных авторов
    filteredData?.positive_authors_values?.forEach(authorGroup => {
      authorGroup.author_data.forEach(author => {
        authorsData.push([
          author.fullname,
          author.author_type,
          author.sex,
          author.age,
          author.texts[0]?.region || '-',
          'Положительная',
          // author.count_texts,
          author.texts[0]?.audienceCount || 0,
          author.url
        ]);
      });
    });

    // Добавляем отрицательных авторов
    filteredData?.negative_authors_values?.forEach(authorGroup => {
      authorGroup.author_data.forEach(author => {
        authorsData.push([
          author.fullname,
          author.author_type,
          author.sex,
          author.age,
          author.texts[0]?.region || '-',
          'Отрицательная',
          // author.count_texts,
          author.texts[0]?.audienceCount || 0,
          author.url
        ]);
      });
    });

    const authorsSheet = XLSX.utils.aoa_to_sheet(authorsData);
    XLSX.utils.book_append_sheet(workbook, authorsSheet, 'Авторы');

    // Генерация и скачивание файла
    XLSX.writeFile(workbook, 'Тональность_данные.xlsx');
  };

  return (
<Layout>
  {(isLoading || isLoading_tonality) && (
    <>
      <BackgroundLoader />
      <Loader />
    </>
  )}
  {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
  <Content>
    {/* Липкая верхняя часть */}
    <div className={styles.stickyTop}>
      <div
        className={styles.block__pageName}
        style={isSuccess_tonality ? {} : { alignSelf: 'center' }}
      >
        {isSuccess_tonality ? (
          <>
            <h3 className={styles.pageName__title}>Тональный ландшафт</h3>
            <p>
              {data_tonality
                ? data_tonality?.tonality_values?.negative_count +
                  data_tonality?.tonality_values?.positive_count
                : '0'}{' '}
              упоминаний
            </p>
          </>
        ) : (
          <BeforeSearch
            title='Тональный ландшафт'
            link='https://tsdoc.headsmade.com/en/user-tonality'
          />
        )}
      </div>
      <div
        className={styles.block__configureSearch}
        style={isSuccess_tonality ? {} : { alignSelf: 'center' }}
      >
        {isSuccess && Object.keys(dataUser ? dataUser : {}).length > 0 && (
          <DataForSearch />
        )}
        <CustomCalendar />
        <Button
          style={{
            width: 'calc(220/1440*100vw)',
            height: 'calc(56/1440*100vw)',
          }}
          onClick={getTonalityData}
        >
          Запуск
        </Button>
      </div>
    </div>
    {/* End stickyTop */}

    {/* После получения данных — единое прокручиваемое окно */}
    {isSuccess_tonality && (
      <div className={styles.scrollableResults}>
        {/* Ползунки-фильтры */}
        <div className={styles.slidersContainer}>
          <div className={styles.sliderWrapper}>
            <label>Комментариев:</label>
            <Slider
              range
              min={0}
              max={1000}
              defaultValue={commentsRange}
              onChange={handleSliderChange(setCommentsRange)}
            />
            <div className={styles.sliderValues}>
              <span>{commentsRange[0]}</span> - <span>{commentsRange[1]}</span>
            </div>
          </div>
          <div className={styles.sliderWrapper}>
            <label>Лайков:</label>
            <Slider
              range
              min={0}
              max={1000}
              defaultValue={likesRange}
              onChange={handleSliderChange(setLikesRange)}
            />
            <div className={styles.sliderValues}>
              <span>{likesRange[0]}</span> - <span>{likesRange[1]}</span>
            </div>
          </div>
          <div className={styles.sliderWrapper}>
            <label>Просмотров:</label>
            <Slider
              range
              min={0}
              max={10000}
              defaultValue={viewsRange}
              onChange={handleSliderChange(setViewsRange)}
            />
            <div className={styles.sliderValues}>
              <span>{viewsRange[0]}</span> - <span>{viewsRange[1]}</span>
            </div>
          </div>
          <div className={styles.sliderWrapper}>
            <label>Аудитория:</label>
            <Slider
              range
              min={0}
              max={50000}
              defaultValue={audienceRange}
              onChange={handleSliderChange(setAudienceRange)}
            />
            <div className={styles.sliderValues}>
              <span>{audienceRange[0]}</span> - <span>{audienceRange[1]}</span>
            </div>
          </div>
        </div>

        <div className={styles.filterInfo}>
          Текущие фильтры содержат <b>{filteredData?.tonality_values?.positive_count || 0}</b>
          &nbsp;упоминаний из <b>{data_tonality?.tonality_values?.positive_count + data_tonality?.tonality_values?.negative_count || 0}</b>
        </div>

        {/* Граф */}
        <Suspense fallback={<Loader />}>
          <TonalityGraphs
            data={filteredData}
            onTabChange={handleTabChange}
          />
        </Suspense>


        {/* Блок ИИ-анализа (AI Analysis) */}
        <div className={styles.aiAnalysisBlock}>
          <button
            className={styles.analyzeButton}
            onClick={() => setShowAiInput(!showAiInput)}
          >
            {showAiInput ? 'Скрыть анализ' : 'Проанализировать данные через ИИ'}
          </button>

          {showAiInput && (
            <div className={styles.aiInteractionWrapper}>
              <div className={styles.aiInputContainer}>
                <textarea
                  className={styles.aiTextarea}
                  placeholder="Примеры запросов:
- Какие основные темы в негативных упоминаниях?
- Кто самые активные авторы негативных сообщений?
- Какие тенденции наблюдаются в положительных отзывах?"
                  rows="4"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                />
                <div className={styles.aiControls}>
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

        {/* Блок с таблицами */}
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
            <div className={styles.tableControls}>
              <div className={styles.tableTabs}>
                <button
                  className={`${styles.tabButton} ${activeTable === 'sources' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTable('sources')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17H21M3 12H21M3 7H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Источники
                </button>
                <button
                  className={`${styles.tabButton} ${activeTable === 'authors' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTable('authors')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M12.5 11C14.7091 11 16.5 9.20914 16.5 7C16.5 4.79086 14.7091 3 12.5 3C10.2909 3 8.5 4.79086 8.5 7C8.5 9.20914 10.2909 11 12.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Авторы
                </button>
              </div>
              <div className={styles.exportButtons}>
                <button
                  className={styles.exportButton}
                  onClick={exportCurrentTable}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Выгрузить таблицу
                </button>
              </div>
              <div className={styles.tableWrapper}>
                {/* ТАБЛИЦА */}
                {activeTable === 'sources' ? (
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Источник</th>
                        <th className={styles.sortableHeader} onClick={() => handleSort('comments')}>
                          Комментарии
                          {sortConfig.key === 'comments' && (
                            <span className={styles.sortIcon}>
                              {sortConfig.direction === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </th>
                        <th className={styles.sortableHeader} onClick={() => handleSort('likes')}>
                          Лайки
                          {sortConfig.key === 'likes' && (
                            <span className={styles.sortIcon}>
                              {sortConfig.direction === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </th>
                        <th className={styles.sortableHeader} onClick={() => handleSort('views')}>
                          Просмотры
                          {sortConfig.key === 'views' && (
                            <span className={styles.sortIcon}>
                              {sortConfig.direction === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </th>
                        <th className={styles.sortableHeader} onClick={() => handleSort('audience')}>
                          Аудитория
                          {sortConfig.key === 'audience' && (
                            <span className={styles.sortIcon}>
                              {sortConfig.direction === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(filteredData?.tonality_hubs_values?.positive_hubs || []),
                        ...(filteredData?.tonality_hubs_values?.negative_hubs || [])]
                        .sort((a, b) => {
                          if (!sortConfig.key) return 0;
                          const valueA = a[`${sortConfig.key}_sum`];
                          const valueB = b[`${sortConfig.key}_sum`];
                          if (valueA < valueB) {
                            return sortConfig.direction === 'desc' ? 1 : -1;
                          }
                          if (valueA > valueB) {
                            return sortConfig.direction === 'desc' ? -1 : 1;
                          }
                          return 0;
                        })
                        .map((hub, index) => (
                          <tr key={`${hub.tonality}-${index}`}>
                            <td>{hub.name}</td>
                            <td>{hub.comments_sum}</td>
                            <td>{hub.likes_sum}</td>
                            <td>{hub.views_sum}</td>
                            <td>{hub.audience_sum}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Тип</th>
                        <th>Пол</th>
                        <th>Возраст</th>
                        <th>Регион</th>
                        <th>Тональность</th>
                        <th
                          className={styles.sortableHeader}
                          onClick={() => handleAuthorsSort('audience')}
                        >
                          Аудитория
                          {authorsSortConfig.key === 'audience' && (
                            <span className={styles.sortIcon}>
                              {authorsSortConfig.direction === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </th>
                        <th>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Положительные авторы (с сортировкой) */}
                      {filteredData?.positive_authors_values
                        ?.flatMap(group => group.author_data)
                        .sort((a, b) => {
                          const audienceA = parseInt(a.texts[0]?.audienceCount) || 0;
                          const audienceB = parseInt(b.texts[0]?.audienceCount) || 0;
                          if (authorsSortConfig.direction === 'desc') {
                            return audienceB - audienceA; // По убыванию
                          } else {
                            return audienceA - audienceB; // По возрастанию
                          }
                        })
                        .map((author, index) => (
                          <tr key={`positive-author-${index}`}>
                            <td>{author.fullname}</td>
                            <td>{author.author_type}</td>
                            <td>{author.sex}</td>
                            <td>{author.age}</td>
                            <td>{author.texts[0]?.region || '-'}</td>
                            <td>Положительная</td>
                            <td>{author.texts[0]?.audienceCount || 0}</td>
                            <td className={styles.textCell}>
                              <a href={author.url} target="_blank" rel="noopener noreferrer">
                                {author.url}
                              </a>
                            </td>
                          </tr>
                        ))}

                      {/* Отрицательные авторы (с сортировкой) */}
                      {filteredData?.negative_authors_values
                        ?.flatMap(group => group.author_data)
                        .sort((a, b) => {
                          const audienceA = parseInt(a.texts[0]?.audienceCount) || 0;
                          const audienceB = parseInt(b.texts[0]?.audienceCount) || 0;
                          if (authorsSortConfig.direction === 'desc') {
                            return audienceB - audienceA; // По убыванию
                          } else {
                            return audienceA - audienceB; // По возрастанию
                          }
                        })
                        .map((author, index) => (
                          <tr key={`negative-author-${index}`}>
                            <td>{author.fullname}</td>
                            <td>{author.author_type}</td>
                            <td>{author.sex}</td>
                            <td>{author.age}</td>
                            <td>{author.texts[0]?.region || '-'}</td>
                            <td>Отрицательная</td>
                            <td>{author.texts[0]?.audienceCount || 0}</td>
                            <td className={styles.textCell}>
                              <a href={author.url} target="_blank" rel="noopener noreferrer">
                                {author.url}
                              </a>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Конец блока с таблицами */}
      </div>
    )}

    {/* Если нет данных */}
    {isNoData && <NoDataRequest />}
  </Content>
</Layout>
  );
};

export default UserTonality;