import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

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

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import styles from './SmartAgent.module.scss';
import { $axios } from '@/api';

const SmartAgent = () => {
  useCheckAuth();

  const { pathname } = useLocation();
  const { addData, addMinDate, addMaxDate, addIndex } = useActions();
  const { active_menu } = useSelector(store => store.booleanValues);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(store => store.dataUsersSlice);

  const { data: data_getUserId } = useGetUserIdQuery();
  const { data, isError, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);
  const progressLogRef = useRef(null);

  // State
  const [userQuery, setUserQuery] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentError, setAgentError] = useState(null);
  const [agentStatus, setAgentStatus] = useState('');
  const [agentProgress, setAgentProgress] = useState([]);
  const [reportUrl, setReportUrl] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);

  // Функция прокрутки - объявляем ДО использования в useEffect
  const scrollToBottom = useCallback(() => {
    if (!progressLogRef.current) return;
    requestAnimationFrame(() => {
      progressLogRef.current.scrollTop = progressLogRef.current.scrollHeight;
    });
  }, []);

  // useEffect для прокрутки - теперь ПОСЛЕ объявления scrollToBottom
  useEffect(() => {
    scrollToBottom();
  }, [agentProgress, scrollToBottom]);

  // useEffect для базы данных
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

  // WebSocket cleanup
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsConnection]);

  // WebSocket connection function
  const connectWebSocket = useCallback((taskId) => {
      // --- ИСПРАВЛЕНИЕ: Надежное формирование WebSocket URL ---
      // Определяем протокол: wss для https, ws для http
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Используем текущий хост (домен)
      const host = window.location.host;
      // Собираем полный URL. Путь /api/ws/agent/ соответствует конфигурации Nginx и FastAPI
      const wsUrl = `${protocol}//${host}/api/ws/agent/${taskId}`;
      // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout');
          setAgentError('Не удалось установить соединение с сервером (таймаут). Проверьте консоль браузера на наличие ошибок сети.');
          setIsAgentRunning(false);
          ws.close();
        }
      }, 15000); // Увеличим таймаут до 15 секунд для надежности

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      clearTimeout(connectionTimeout);
      setWsConnection(ws); // Сохраняем соединение в стейт
      // Не нужно ничего отправлять сразу, бэкенд сам начнет слать данные
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'keepalive') {
          // Игнорируем keepalive сообщения, они нужны только для поддержания соединения
          return;
        }

        if (data.type === 'status') {
          setAgentStatus(data.message);
          setAgentProgress(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: data.message,
            type: 'info'
          }]);
        } else if (data.type === 'progress') {
          setAgentProgress(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: data.message,
            type: 'progress',
            current: data.current,
            total: data.total
          }]);
        } else if (data.type === 'error') {
          setAgentError(data.message);
          setAgentProgress(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `Ошибка: ${data.message}`,
            type: 'error'
          }]);
          setIsAgentRunning(false);
          ws.close();
        } else if (data.type === 'complete') {
          setReportUrl(data.report_url);
          setAgentStatus('Готово!');
          setAgentProgress(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: 'Отчет готов к скачиванию!',
            type: 'success'
          }]);
          setIsAgentRunning(false);
          setTimeout(() => ws.close(), 1000);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(connectionTimeout);
      setAgentError('Произошла ошибка WebSocket соединения. Проверьте консоль для деталей.');
      setIsAgentRunning(false);
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
      clearTimeout(connectionTimeout);

      // Если соединение закрылось не штатно (код не 1000) и агент все еще "работал"
      if (event.code !== 1000 && isAgentRunning) {
        console.error('Unexpected WebSocket closure.');
        setAgentError(`Соединение с сервером было неожиданно прервано (код: ${event.code}).`);
        setIsAgentRunning(false);
      }
      setWsConnection(null);
    };
    
  }, [isAgentRunning]); // isAgentRunning добавлена в зависимости, чтобы onclose мог корректно проверить статус

  const handleRunAgent = useCallback(async () => {
    if (!userQuery.trim()) {
      setAgentError('Пожалуйста, введите задачу для агента');
      return;
    }

    if (dataForRequest.index === null) {
      setAgentError('Пожалуйста, выберите файл данных');
      return;
    }

    setIsAgentRunning(true);
    setAgentError(null);
    setAgentStatus('Запуск агента...');
    setAgentProgress([{
      time: new Date().toLocaleTimeString(),
      message: 'Инициализация задачи на сервере...',
      type: 'info'
    }]);
    setReportUrl(null);

    try {
      const response = await $axios.post('/run-smart-agent', {
        user_query: userQuery,
        index: dataForRequest.index,
        min_date: dataForRequest.min_date,
        max_date: dataForRequest.max_date,
        user_id: data_getUserId?.user_id ?? null
      });

      const result = response.data;
      if (result.task_id) {
        setAgentStatus('Задача создана. Устанавливаем соединение...');
        // --- ИСПРАВЛЕНИЕ: Небольшая задержка остается как дополнительная страховка ---
        // Основная проблема решается на бэкенде, но эта задержка не повредит.
        await new Promise(resolve => setTimeout(resolve, 500));
        connectWebSocket(result.task_id);
      } else {
        throw new Error(result.detail || 'Не получен ID задачи от сервера');
      }
    } catch (error) {
      console.error('Error starting agent:', error);
      const errorMessage = error.response?.data?.detail 
                          || error.message 
                          || 'Произошла ошибка при запуске агента';
      setAgentError(errorMessage);
      setIsAgentRunning(false);
    }
  }, [userQuery, dataForRequest, data_getUserId, connectWebSocket]);

  const downloadReport = useCallback(() => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  }, [reportUrl]);

  const clearResults = useCallback(() => {
    setAgentProgress([]);
    setAgentStatus('');
    setAgentError(null);
    setReportUrl(null);
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
          <BeforeSearch 
            title='Умный агент анализа данных' 
            link='https://tsdoc.headsmade.com/en/smart-agent' 
          />
        </div>

        <div className={styles.block__configureSearch}>
          {isSuccess && Object.keys(dataUser || {}).length > 0 && <DataForSearch />}
          
          <div className={styles.queryInputContainer}>
            <label className={styles.queryLabel}>Задача для агента:</label>
            <textarea
              className={styles.queryTextarea}
              placeholder="Например: Проанализируй сообщения авторов мужского пола, найди основные тематики, покажи распределение по площадкам, приведи примеры самых популярных постов"
              rows={4}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              disabled={isAgentRunning}
            />
          </div>

          <div className={styles.buttonGroup}>
            <Button
              style={{
                flex: '1 1 180px',
                minWidth: 160,
                height: 56,
              }}
              onClick={handleRunAgent}
              disabled={isAgentRunning || !userQuery.trim() || dataForRequest.index === null}
            >
              {isAgentRunning ? 'Агент работает...' : 'Запустить агента'}
            </Button>
            
            {agentProgress.length > 0 && (
              <Button
                style={{
                  flex: '1 1 160px',
                  minWidth: 140,
                  height: 56,
                  backgroundColor: '#6c757d',
                }}
                onClick={clearResults}
                disabled={isAgentRunning}
              >
                Очистить результаты
              </Button>
            )}
          </div>
        </div>

        {agentError && (
          <div className={styles.errorBlock}>
            <h4>Ошибка:</h4>
            <p>{agentError}</p>
          </div>
        )}

        {agentProgress.length > 0 && (
          <div className={styles.progressContainer}>
            <div className={styles.progressHeader}>
              <h3>Прогресс выполнения</h3>
              {agentStatus && (
                <div className={styles.currentStatus}>
                  {isAgentRunning && <div className={styles.spinner} />}
                  <span>{agentStatus}</span>
                </div>
              )}
            </div>

            <div ref={progressLogRef} className={styles.progressLog}>
              {agentProgress.map((item, index) => (
                <div 
                  key={index} 
                  className={`${styles.progressItem} ${styles[item.type]}`}
                >
                  <span className={styles.progressTime}>{item.time}</span>
                  <div className={styles.progressMessage}>
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                      {item.message}
                    </ReactMarkdown>
                    {item.current !== undefined && item.total !== undefined && (
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressBarFill}
                          style={{ width: `${(item.current / item.total) * 100}%` }}
                        />
                        <span className={styles.progressBarText}>
                          {item.current} / {item.total}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {reportUrl && (
              <div className={styles.reportDownload}>
                <h4>Отчет готов!</h4>
                <Button onClick={downloadReport}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Скачать отчет
                </Button>
              </div>
            )}
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default SmartAgent;