import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import GraphVisualization from './GraphVisualization';
import { $axios as api } from '../../api';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { USER_ID, TOKEN } from '../../app.constants';
import { useInitUserData } from '../../hooks/useInitUserData';
import { useLocation } from 'react-router-dom';
import useClickOutside from '../../hooks/useClickOutside';

import Layout from '@/components/layout/Layout';
import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import styles from './GraphAnalysis.module.scss';

const GRAPH_TYPES = [
  { value: 'author', label: 'Граф авторов' },
  { value: 'topic', label: 'Граф тем' },
  { value: 'geo', label: 'География' },
];

const launchButtonStyle = {
  width: 'calc(220/1440*100vw)',
  height: 'calc(56/1440*100vw)',
};

const truncateName = (value, maxLength = 28) => {
  if (!value || typeof value !== 'string') return '';
  return value.length <= maxLength ? value : `${value.substring(0, maxLength)}...`;
};

const formatCount = (value) => Number(value || 0).toLocaleString('ru-RU');

const FileSelect = ({ folders, value, onSelect, onDeleteFile, loading }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const selected = folders
    .flatMap((folder) => folder.files)
    .find((file) => file.fullPath === value);

  return (
    <div className={`${styles.wrapper_select} ${styles.wrapper_file}`} ref={ref}>
      <div
        className={`${styles.block__data} ${open ? styles.active : ''}`}
        onClick={() => setOpen(!open)}
      >
        <div className={styles.block__description}>
          {selected ? (
            <p className={styles.selectedOption}>{truncateName(selected.displayName, 32)}</p>
          ) : (
            <h2>Выберите тему</h2>
          )}
        </div>
        <img
          className={styles.data__arrow}
          src="/images/icons/arrow_for_search.svg"
          alt="arrow"
        />
      </div>
      {open && (
        <div className={styles.block__options}>
          {loading && <div className={styles.empty}>Загрузка...</div>}
          {!loading && folders.length === 0 && (
            <div className={styles.empty}>Файлы графа не найдены</div>
          )}
          {folders.map((folder) => (
            <div key={folder.folderPath}>
              <h3 className={styles.groupTitle}>{folder.folderDisplayName}</h3>
              {folder.files.map((file) => (
                <div
                  key={file.fullPath}
                  className={`${styles.option} ${file.fullPath === value ? styles.active : ''}`}
                  onClick={() => {
                    onSelect(file);
                    setOpen(false);
                  }}
                >
                  <p className={styles.optionText}>{file.displayName}</p>
                  {onDeleteFile && (
                    <button
                      type='button'
                      className={styles.deleteBtn}
                      title='Удалить файл'
                      onClick={(e) => { e.stopPropagation(); onDeleteFile(file); }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TypeSelect = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const current = GRAPH_TYPES.find((item) => item.value === value) || GRAPH_TYPES[0];

  return (
    <div className={`${styles.wrapper_select} ${styles.wrapper_type}`} ref={ref}>
      <div
        className={`${styles.block__data} ${open ? styles.active : ''}`}
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
      >
        <div className={styles.block__description}>
          <h2>Тип графа</h2>
          <p>{current.label}</p>
        </div>
        <img
          className={styles.data__arrow}
          src="/images/icons/arrow_for_search.svg"
          alt="arrow"
        />
      </div>
      {open && (
        <div className={styles.block__options}>
          {GRAPH_TYPES.map((item) => (
            <div
              key={item.value}
              className={`${styles.option} ${item.value === value ? styles.active : ''}`}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <p className={styles.optionText}>{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GraphAnalysis = () => {
  useInitUserData();
  const { pathname } = useLocation();
  const { active_menu } = useSelector((store) => store.booleanValues);

  const [graphData, setGraphData] = useState(null);
  const [graphType, setGraphType] = useState('author');
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphBuilt, setIsGraphBuilt] = useState(false);

  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  const userIdRedux = useSelector((store) => store.dataUsersSlice?.user_id);
  const cookieUserId = Cookies.get(USER_ID);
  const userId =
    cookieUserId && String(cookieUserId) !== String(userIdRedux)
      ? cookieUserId
      : userIdRedux || cookieUserId;

  const dispatch = useDispatch();

  useEffect(() => {
    if (cookieUserId && userIdRedux && String(cookieUserId) !== String(userIdRedux)) {
      console.log('🔄 Обнаружена смена пользователя. Очистка старых данных Redux...');
    }
  }, [cookieUserId, userIdRedux, dispatch]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [csvTreeData, setCsvTreeData] = useState([]);

  useEffect(() => {
    const token = Cookies.get(TOKEN);

    if (userId) {
      fetchUserFolders();
    } else if (!token) {
      message.error('User ID не найден. Пожалуйста, авторизуйтесь.');
      setIsLoadingFolders(false);
    }
  }, [userId]);

  const fetchUserFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const response = await api.get(`/user-folders/${userId}`);

      if (response.data && response.data.csv_files_directory) {
        const treeData = buildCsvTreeData(response.data.csv_files_directory);
        setCsvTreeData(treeData);
      } else {
        setCsvTreeData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching user folders:', error);
      if (error.response?.status === 404) {
        message.error('Пользователь не найден');
      } else {
        message.error(`Ошибка загрузки данных: ${error.message}`);
      }
      setCsvTreeData([]);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const buildCsvTreeData = (csvFilesDirectory) => {
    if (
      !csvFilesDirectory ||
      typeof csvFilesDirectory !== 'object' ||
      Object.keys(csvFilesDirectory).length === 0
    ) {
      return [];
    }

    const treeData = [];

    Object.entries(csvFilesDirectory).forEach(([folderPath, files]) => {
      if (!Array.isArray(files) || files.length === 0) {
        return;
      }

      const folderDisplayName = folderPath.split('/').pop().replace(/_/g, ' ');

      treeData.push({
        folderPath,
        folderDisplayName,
        files: files
          .map((fileInfo, index) => {
            const fileName = fileInfo.file || `file_${index}`;
            const fullPath = fileInfo.full_path;
            if (!fullPath) return null;

            return {
              displayName: fileName
                .replace('result_graph_', '')
                .replace('.csv', '')
                .replace(/_/g, ' '),
              fullPath,
              fileName,
              folderPath,
              relativePath: fileInfo.relative_path,
              fileInfo,
            };
          })
          .filter(Boolean),
      });
    });

    return treeData;
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm('Удалить файл «' + (file.displayName || file.fileName) + '»? Это действие необратимо.')) return;
    if (!userId) { message.error('Не определён пользователь'); return; }
    try {
      await api.delete('/delete-csv-file', { params: { user_id: userId, file_name: file.fileName } });
      message.success('Файл удалён');
      if (selectedFile && selectedFile.fullPath === file.fullPath) { setSelectedFile(null); setIsGraphBuilt(false); setGraphData(null); }
      await fetchUserFolders();
    } catch (e) {
      message.error('Ошибка удаления: ' + (e?.response?.data?.detail || e?.message || 'неизвестно'));
    }
  };

  const handleFileSelect = (file) => {
    if (!file) {
      setSelectedFile(null);
      setIsGraphBuilt(false);
      setGraphData(null);
      return;
    }

    setSelectedFile({
      fullPath: file.fullPath,
      file: file.fileName,
      folder: file.folderPath,
      relativePath: file.relativePath || '',
      info: file.fileInfo || {},
    });

    if (isGraphBuilt) {
      setIsGraphBuilt(false);
      setGraphData(null);
    }
  };

  const buildGraph = async (type = graphType) => {
    if (!selectedFile) {
      message.warning('Сначала выберите тему для построения графа');
      return;
    }

    setIsLoading(true);
    setIsGraphBuilt(false);
    setGraphData(null);

    try {
      const formData = new FormData();
      formData.append('graph_type', type);
      formData.append('csv_path', selectedFile.fullPath);

      const response = await api.post('/build-from-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data?.graph?.nodes?.length) {
        throw new Error('Граф не содержит узлов');
      }

      setGraphData(response.data);
      setGraphType(type);
      setIsGraphBuilt(true);
    } catch (error) {
      console.error('❌ Build graph error:', error);
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`);
      setIsGraphBuilt(false);
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const nodesCount = graphData?.graph?.nodes?.length || 0;
  const linksCount = graphData?.graph?.links?.length || 0;
  const clustersCount = graphData?.graph?.clusters?.length || 0;
  const postsCount = (graphData?.graph?.nodes || []).reduce(
    (sum, node) => sum + (node.posts_count || 0),
    0
  );
  const statsLine = `${formatCount(nodesCount)} узлов · ${formatCount(linksCount)} связей · ${formatCount(clustersCount)} кластеров · ${formatCount(postsCount)} сообщений`;

  return (
    <Layout>
      {isLoading && (
        <>
          <BackgroundLoader />
          <Loader />
        </>
      )}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

      <Content alignStart={isGraphBuilt}>
        <div
          className={styles.stickyTop}
        >
          <div
            className={styles.block__pageName}
            style={isGraphBuilt ? {} : { alignSelf: 'center' }}
          >
            {isGraphBuilt && graphData ? (
              <>
                <h3 className={styles.pageName__title}>Анализ графа связей</h3>
                <p>{statsLine}</p>
              </>
            ) : (
              <BeforeSearch title="Анализ графа связей" />
            )}
          </div>
          <div
            className={styles.block__configureSearch}
            style={isGraphBuilt ? {} : { alignSelf: 'center' }}
          >
            <FileSelect
              folders={csvTreeData}
              value={selectedFile?.fullPath}
              onSelect={handleFileSelect}
              onDeleteFile={handleDeleteFile}
              loading={isLoadingFolders}
            />
            <TypeSelect
              value={graphType}
              onChange={setGraphType}
              disabled={isLoading}
            />
            <Button
              style={launchButtonStyle}
              onClick={() => buildGraph(graphType)}
              disabled={isLoading}
            >
              Построить граф
            </Button>
          </div>
        </div>

        {isGraphBuilt && graphData?.graph?.nodes?.length > 0 && (
          <div className={styles.graphWrap}>
            <GraphVisualization data={graphData} graphType={graphType} />
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default GraphAnalysis;
