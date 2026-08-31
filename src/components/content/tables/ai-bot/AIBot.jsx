import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import { aiTopicsData, aiSubtopicsData } from '../../../../data/aiBot.data';
import { useGetUserIdQuery, useGetUserFoldersQuery } from '../../../../services/other.service';
import PanelTargetGraph from '../../../ui/panel-target-graph/PanelTargetGraph';
import FileUploader from '../../../ui/file-uploader/FileUploader';
import DataForSearch from '../../../ui/data-for-search/DataForSearch';
import TopicSelector from '../../../ui/topic-selector/TopicSelector';
import TopicSelectorWithDelete from '../../../ui/topic-selector-with-delete/TopicSelectorWithDelete';
import Layout from '../../../layout/Layout';
import LeftMenu from '../../../ui/left-menu/LeftMenu';
import LeftMenuActive from '../../../ui/left-menu/left-menu-active/LeftMenuActive';
import Content from '../../../content/Content';

import styles from './AIBot.module.scss';

const TypewriterText = ({ text, speed = 25, maxLength = 500 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (text.length > maxLength) {
    return <span>{text}</span>;
  }

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayedText}</span>;
};

const AIBot = () => {
  const location = useLocation();
  const { active_menu } = useSelector(store => store.booleanValues);
  
  const { data: data_getUserId } = useGetUserIdQuery();
  const { refetch: refetchFolders } = useGetUserFoldersQuery(data_getUserId);

  useEffect(() => {
    if (location.state?.fileName) {
      console.log('Файл загружен:', location.state.fileName);
      
      setTimeout(() => {
        refetchFolders();
      }, 1000);
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetchFolders]);

  const [activeButton, setActiveButton] = useState('Анализ данных');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [currentlyTypingMessageId, setCurrentlyTypingMessageId] = useState(null);
  const [collections, setCollections] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const dataForRequest = useSelector(state => state.dataForRequest);

  // Загружаем коллекции из Qdrant
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const response = await axios.get('/api/qdrant/collections');
        const collectionsData = response.data.collections || [];
        
        const collectionsWithIndex = collectionsData.map((collection, index) => ({
          ...collection,
          index_number: index
        }));
        
        setCollections(collectionsWithIndex);
      } catch (error) {
        console.error('Ошибка загрузки коллекций:', error);
      }
    };

    loadCollections();
  }, []);

  // Получаем выбранные базы данных на основе collections
  const selectedDatabases = dataForRequest.themes_ind?.map(indexNumber => {
    const collection = collections.find(c => c.index_number === indexNumber);
    return collection ? collection.name : null;
  }).filter(Boolean) || [];

  // Проверяем через themes_ind напрямую
  const isTopicSelected = dataForRequest.themes_ind?.length > 0;

  // Логирование для отладки
  useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('themes_ind:', dataForRequest.themes_ind);
    console.log('collections:', collections);
    console.log('selectedDatabases:', selectedDatabases);
    console.log('isTopicSelected:', isTopicSelected);
    console.log('==================');
  }, [dataForRequest.themes_ind, collections, selectedDatabases, isTopicSelected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Обновляем сообщение при изменении выбора
  useEffect(() => {
    if (isTopicSelected && selectedDatabases.length > 0 && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        type: 'system',
        content: `Выбрана тема для анализа: ${selectedDatabases.join(', ')}. Теперь вы можете задавать вопросы по заданной теме.`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } else if (!isTopicSelected && messages.length > 0 && messages[0]?.type === 'system') {
      setMessages([]);
    }
  }, [isTopicSelected, selectedDatabases.length]);

  const handleClick = useCallback(but => {
    setActiveButton(but);
    setMessages([]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isTopicSelected) {
      console.log('Отправка заблокирована:', {
        hasInput: !!inputMessage.trim(),
        isLoading,
        isTopicSelected
      });
      return;
    }

    setSkipAnimation(false);
    setCurrentlyTypingMessageId(null);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString(),
      topic: activeButton,
      selectedDatabases: selectedDatabases,
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : null
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = inputMessage;
    setInputMessage('');
    setUploadedFiles([]);
    setIsLoading(true);

    const botMessageId = Date.now() + 1;
    const botMessage = {
      id: botMessageId,
      type: 'bot',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      sources: [],
      confidence: null,
      status: 'streaming',
      isTyping: true,
      originalQuestion: currentQuestion,
      searchSummary: null,
      documentsAnalyzed: null,
      totalDocumentsFound: null
    };

    setMessages(prev => [...prev, botMessage]);
    setCurrentlyTypingMessageId(botMessageId);

    try {
      const response = await fetch('/api/ai-question-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          topic: activeButton,
          selected_databases: selectedDatabases,
          userId: data_getUserId,
          folderName: dataForRequest.folder_name_html_file_request
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') {
                break;
              }
              
              try {
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'token') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ));
                } else if (data.type === 'metadata') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId 
                      ? { 
                          ...msg, 
                          sources: data.sources || [],
                          confidence: data.confidence,
                          searchSummary: data.search_summary,
                          documentsAnalyzed: data.documents_analyzed,
                          totalDocumentsFound: data.total_documents_found
                        }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('Ошибка парсинга JSON:', e);
              }
            }
          }
        }

        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, status: 'completed', isTyping: false }
            : msg
        ));

      } else {
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { 
                ...msg, 
                content: data.answer || 'Извините, не удалось получить ответ.',
                sources: data.sources || [],
                confidence: data.confidence || null,
                status: data.status || 'completed',
                isTyping: true,
                searchSummary: data.search_summary,
                documentsAnalyzed: data.documents_analyzed,
                totalDocumentsFound: data.total_documents_found
              }
            : msg
        ));

        const finalUserMessage = userMessage;
        const finalBotMessage = {
          ...botMessage,
          content: data.answer || 'Извините, не удалось получить ответ.',
          sources: data.sources || [],
          confidence: data.confidence || null,
          status: data.status || 'completed',
          isTyping: false,
          searchSummary: data.search_summary,
          documentsAnalyzed: data.documents_analyzed,
          totalDocumentsFound: data.total_documents_found
        };
        
        saveChatToHistory(finalUserMessage, finalBotMessage);
      }

    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { 
              ...msg, 
              content: error.message || 'Произошла ошибка при обработке запроса. Попробуйте еще раз.',
              isError: true,
              status: 'error',
              isTyping: false
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setCurrentlyTypingMessageId(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (files) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (fileIndex) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== fileIndex));
  };

  const clearChat = () => {
    setMessages([]);
    setUploadedFiles([]);
    setSkipAnimation(false);
    setCurrentlyTypingMessageId(null);
  };

  const saveChatToHistory = (userMessage, botMessage) => {
    const chatSession = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      topic: activeButton,
      selectedDatabases: selectedDatabases,
      messages: [userMessage, botMessage]
    };

    setChatHistory(prev => [chatSession, ...prev]);
    
    const existingHistory = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');
    localStorage.setItem('aiChatHistory', JSON.stringify([chatSession, ...existingHistory]));
  };

  const loadChatHistory = () => {
    const history = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');
    setChatHistory(history);
  };

  const loadHistorySession = (session) => {
    setActiveButton(session.topic);
    setMessages(session.messages || []);
    setShowHistory(false);
  };

  const handleSkipAnimation = () => {
    setSkipAnimation(true);
    if (currentlyTypingMessageId) {
      setMessages(prev => prev.map(msg => 
        msg.id === currentlyTypingMessageId 
          ? { ...msg, isTyping: false }
          : msg
      ));
    }
  };

  const currentTypingMessage = messages.find(msg => 
    msg.id === currentlyTypingMessageId && msg.isTyping && msg.content.length > 0
  );

  return (
    <Layout>
      {location.pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

      <Content>
        <div className={styles.block__aiBot}>
          {/* Модальное окно подтверждения удаления */}
          {showDeleteConfirm && (
            <div className={styles.modal__overlay} onClick={() => setShowDeleteConfirm(false)}>
              <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
                <h3>Подтверждение удаления</h3>
                <p>Вы уверены, что хотите удалить коллекцию "{collectionToDelete?.name}"?</p>
                <div className={styles.modal__actions}>
                  <button 
                    className={styles.modal__button_cancel}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setCollectionToDelete(null);
                    }}
                  >
                    Отмена
                  </button>
                  <button 
                    className={styles.modal__button_confirm}
                    onClick={async () => {
                      if (collectionToDelete) {
                        try {
                          await axios.delete(`/api/qdrant/collections/${collectionToDelete.name}`);
                          
                          // Обновляем список коллекций
                          const response = await axios.get('/api/qdrant/collections');
                          const collectionsData = response.data.collections || [];
                          const collectionsWithIndex = collectionsData.map((collection, index) => ({
                            ...collection,
                            index_number: index
                          }));
                          setCollections(collectionsWithIndex);
                          
                          setShowDeleteConfirm(false);
                          setCollectionToDelete(null);
                          alert(`Коллекция "${collectionToDelete.name}" успешно удалена`);
                        } catch (error) {
                          console.error('Ошибка удаления коллекции:', error);
                          alert('Ошибка при удалении коллекции: ' + (error.response?.data?.error || error.message));
                        }
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.block__title}>
            <PanelTargetGraph
              handleClick={handleClick}
              dataButtons={aiTopicsData}
              activeButton={activeButton}
            />
          </div>

          <div className={styles.container__main}>
            <div className={styles.sidebar}>
              <div className={styles.section}>
                <TopicSelectorWithDelete 
                  multi={true}
                  style={{ width: '100%' }}
                  onDeleteRequest={(collection) => {
                    setCollectionToDelete(collection);
                    setShowDeleteConfirm(true);
                  }}
                />
                {selectedDatabases.length > 0 && (
                  <div className={styles.selected__databases}>
                    <h4>Выбранные темы:</h4>
                    {selectedDatabases.map((database, index) => (
                      <div key={index} className={styles.database__item}>
                        <span className={styles.database__name}>
                          {database.length > 30 ? `${database.substring(0, 30)}...` : database}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.section}>
                <h3 className={styles.section__title}>Загрузка файлов</h3>

                <div className={styles.fileUploaderDisabled}>
                  <FileUploader onFileUpload={handleFileUpload} disabled />
                  <div className={styles.fileUploaderOverlay}>
                    В разработке
                  </div>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className={styles.uploaded__files}>
                    <h4>Загруженные файлы:</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className={styles.file__item}>
                        <span className={styles.file__name}>{file.name}</span>
                        <button
                          className={styles.remove__file}
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.section}>
                <button
                  className={styles.history__button}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Скрыть историю' : 'Показать историю'}
                </button>
              </div>
            </div>

            <div className={styles.chat__container}>
              {showHistory ? (
                <div className={styles.history__container}>
                  <h3>История чатов</h3>
                  <div className={styles.history__list}>
                    {chatHistory.map((session) => (
                      <div
                        key={session.id}
                        className={styles.history__item}
                        onClick={() => loadHistorySession(session)}
                      >
                        <div className={styles.history__meta}>
                          <span className={styles.history__date}>
                            {session.date} {session.time}
                          </span>
                          <span className={styles.history__topic}>
                            {session.topic}
                          </span>
                        </div>
                        <div className={styles.history__preview}>
                          {session.messages[0]?.content.substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.messages__container} ref={chatContainerRef}>
                    {messages.length === 0 ? (
                      <div className={styles.welcome__message}>
                        <h3>Добро пожаловать в AI Ассистент!</h3>
                        {!isTopicSelected ? (
                          <p className={styles.hint}>
                            Выберите тему для анализа в меню слева
                          </p>
                        ) : (
                          <p className={styles.hint__success}>
                            Тема выбрана! Можете задавать вопросы
                          </p>
                        )}
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`${styles.message} ${styles[message.type]}`}
                        >
                          <div className={styles.message__content}>
                            {message.type === 'bot' ? (
                              <>
                                <div className={styles.message__text}>
                                  {message.isTyping && !skipAnimation && message.content ? (
                                    <TypewriterText text={message.content} speed={25} />
                                  ) : (
                                    <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
                                  )}
                                </div>
                                {message.sources && message.sources.length > 0 && (
                                  <div className={styles.message__sources}>
                                    <strong>Источники данных:</strong>
                                    <div className={styles.sources__list}>
                                      {message.sources.map((source, index) => (
                                        <span key={index} className={styles.source__tag}>
                                          {source}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {message.confidence && (
                                  <div className={styles.message__confidence}>
                                    <span className={styles.confidence__label}>Уверенность:</span>
                                    <span className={styles.confidence__value}>
                                      {Math.round(message.confidence * 100)}%
                                    </span>
                                  </div>
                                )}
                                {message.searchSummary && (
                                  <div className={styles.message__searchSummary}>
                                    <strong>Поиск по теме:</strong>
                                    <ul className={styles.searchSummary__list}>
                                      {message.searchSummary.map((summary, index) => (
                                        <li key={index}>
                                          {summary.database}: {summary.found_documents || 0} документов
                                          {summary.error && ` (ошибка: ${summary.error})`}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className={styles.message__text}>
                                {message.content}
                              </div>
                            )}
                            {message.files && (
                              <div className={styles.message__files}>
                                <small>Файлы: {message.files.map(f => f.name).join(', ')}</small>
                              </div>
                            )}
                          </div>
                          <div className={styles.message__time}>
                            {message.timestamp}
                          </div>
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className={`${styles.message} ${styles.bot}`}>
                        <div className={styles.message__content}>
                          <div className={styles.typing__indicator}>
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className={styles.input__container}>
                    <div className={styles.input__actions}>
                      <button
                        className={styles.clear__button}
                        onClick={clearChat}
                        disabled={messages.length === 0}
                      >
                        Очистить чат
                      </button>
                    </div>
                    <div className={styles.input__wrapper}>
                      <textarea
                        className={styles.message__input}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={
                          isTopicSelected 
                            ? "Задайте вопрос по выбранной теме..."
                            : "Сначала выберите тему для анализа"
                        }
                        disabled={!isTopicSelected || isLoading}
                        rows={3}
                      />
                      <button
                        className={styles.send__button}
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || !isTopicSelected || isLoading}
                      >
                        {isLoading ? '...' : 'Отправить'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AIBot;