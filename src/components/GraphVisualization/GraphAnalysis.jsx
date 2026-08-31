import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Tabs, Statistic, Row, Col, message, Space, Alert, TreeSelect, Tag, Spin } from 'antd';
import { BarChartOutlined, ShareAltOutlined, GlobalOutlined, FileTextOutlined, FolderOutlined, FileOutlined, ReloadOutlined } from '@ant-design/icons';
import GraphVisualization from './GraphVisualization';
import { $axios as api } from '../../api';
import { useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { USER_ID, TOKEN } from '../../app.constants';
import { useInitUserData } from '../../hooks/useInitUserData';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

// ✅ Импорт компонентов меню и Layout
import Layout from '@/components/layout/Layout';
import Content from '@/components/content/Content';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

const { Option } = Select;
const { TabPane } = Tabs;

const GraphAnalysis = () => {
  useInitUserData();
  const { pathname } = useLocation();
  const { active_menu } = useSelector(store => store.booleanValues);

  const [graphData, setGraphData] = useState(null);
  const [graphType, setGraphType] = useState('author');
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphBuilt, setIsGraphBuilt] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const [userFoldersData, setUserFoldersData] = useState(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  
  const userIdRedux = useSelector((store) => store.dataUsersSlice?.user_id);
  const cookieUserId = Cookies.get(USER_ID);

  const userId = (cookieUserId && String(cookieUserId) !== String(userIdRedux)) 
    ? cookieUserId 
    : (userIdRedux || cookieUserId);

  const dispatch = useDispatch();
  
  useEffect(() => {
    if (cookieUserId && userIdRedux && String(cookieUserId) !== String(userIdRedux)) {
        console.log('🔄 Обнаружена смена пользователя. Очистка старых данных Redux...');
        // dispatch(actions.clearData()); 
    }
  }, [cookieUserId, userIdRedux, dispatch]);

  console.log('store.dataUsersSlice', useSelector(s => s.dataUsersSlice));
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvTreeData, setCsvTreeData] = useState([]);

  useEffect(() => {
    const token = Cookies.get(TOKEN);

    if (userId) {
      fetchUserFolders();
    } else if (!token) {
      message.error('User ID не найден. Пожалуйста, авторизуйтесь.');
      setIsLoadingFolders(false);
    } else {
      console.log('⏳ Ожидание загрузки User ID...');
    }
  }, [userId]);

  const fetchUserFolders = async () => {
    setIsLoadingFolders(true);
    try {
      console.log('📡 Fetching user folders for user_id:', userId);
      
      const response = await api.get(`/user-folders/${userId}`);
      
      console.log('✅ User folders response:', response.data);
      
      if (response.data && response.data.csv_files_directory) {
        setUserFoldersData(response.data);
        
        const treeData = buildCsvTreeData(response.data.csv_files_directory);
        setCsvTreeData(treeData);
        
        if (treeData.length === 0) {
          message.warning('CSV файлы не найдены в папках пользователя');
        } else {
          message.success(`Загружено ${treeData.reduce((sum, folder) => sum + (folder.children?.length || 0), 0)} файлов`);
        }
      } else {
        message.warning('CSV файлы отсутствуют');
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
    console.log('🔍 Building tree from csvFilesDirectory:', csvFilesDirectory);
    
    if (!csvFilesDirectory || typeof csvFilesDirectory !== 'object' || Object.keys(csvFilesDirectory).length === 0) {
      console.warn('⚠️ Invalid csvFilesDirectory');
      return [];
    }

    const treeData = [];

    Object.entries(csvFilesDirectory).forEach(([folderPath, files]) => {
      console.log(`📁 Processing folder: ${folderPath}`, files);
      
      if (!Array.isArray(files) || files.length === 0) {
        console.warn(`⚠️ No files in folder: ${folderPath}`);
        return;
      }

      const folderDisplayName = folderPath
        .split('/')
        .pop()
        .replace(/_/g, ' ');

      const folderNode = {
        title: (
          <span>
            <FolderOutlined style={{ marginRight: 8, color: '#faad14' }} />
            <strong>{folderDisplayName}</strong>
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>
              {files.length} файл(ов)
            </Tag>
          </span>
        ),
        value: `folder_${folderPath}`,
        key: `folder_${folderPath}`,
        selectable: false,
        children: files.map((fileInfo, index) => {
          const fileName = fileInfo.file || `file_${index}`;
          const fullPath = fileInfo.full_path;
          
          if (!fullPath) {
            console.error(`❌ No full_path for file:`, fileInfo);
            return null;
          }
          
          const displayName = fileName
            .replace('result_graph_', '')
            .replace('.csv', '')
            .replace(/_/g, ' ');
          
          const dateMatch = fileName.match(/(\d{8}_\d{6})/);
          const dateString = dateMatch ? dateMatch[1] : null;
          
          return {
            title: (
              <span>
                <FileOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                {displayName}
                {fileInfo.size && (
                  <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 11 }}>
                    {(fileInfo.size / 1024).toFixed(1)} KB
                  </Tag>
                )}
                {dateString && (
                  <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>
                    {dateString.replace('_', ' ')}
                  </Tag>
                )}
              </span>
            ),
            value: fullPath,
            key: `${folderPath}_${fileName}_${index}`,
            isLeaf: true,
            fileInfo: fileInfo,
            folderPath: folderPath,
            fileName: fileName,
            fullPath: fullPath,
            relativePath: fileInfo.relative_path
          };
        }).filter(Boolean)
      };

      treeData.push(folderNode);
    });

    console.log('🌳 Final tree data:', treeData);
    return treeData;
  };

  const handleFileSelect = (value, node) => {
    console.log('📁 File select triggered:', { value, node });
    
    if (!value) {
      setSelectedFile(null);
      setIsGraphBuilt(false);
      setGraphData(null);
      message.info('Выбор файла отменен');
      return;
    }

    let selectedNode = node;
    
    if (Array.isArray(node)) {
      selectedNode = node[0];
    }
    
    if (selectedNode?.triggerNode) {
      selectedNode = selectedNode.triggerNode.props;
    }
    
    console.log('📌 Processed node:', selectedNode);
    
    if (value && typeof value === 'string' && value.startsWith('/')) {
      const fileData = {
        fullPath: value,
        file: selectedNode?.fileName || value.split('/').pop(),
        folder: selectedNode?.folderPath || 'unknown',
        relativePath: selectedNode?.relativePath || '',
        info: selectedNode?.fileInfo || {}
      };
      
      setSelectedFile(fileData);
      
      if (isGraphBuilt) {
        setIsGraphBuilt(false);
        setGraphData(null);
        message.info(`Выбран новый файл: ${fileData.file}. Постройте граф заново.`);
      } else {
        message.success(`Выбран файл: ${fileData.file}`);
      }
      
      console.log('✅ Selected file data:', fileData);
    } else {
      console.error('❌ Invalid value format:', value);
      message.error('Ошибка при выборе файла');
    }
  };

  const refreshFileList = () => {
    fetchUserFolders();
  };

  const buildGraph = async (type = graphType) => {
    if (!selectedFile) {
      message.warning('Выберите CSV файл для построения графа');
      return;
    }

    setIsLoading(true);
    setIsGraphBuilt(false);
    setGraphData(null);
    
    try {
      const formData = new FormData();
      formData.append('graph_type', type);
      formData.append('csv_path', selectedFile.fullPath);
      
      console.log('📊 Building graph from:', selectedFile.fullPath);
      
      const response = await api.post('/build-from-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('📊 Graph response:', response.data);
      
      if (!response.data?.graph?.nodes?.length) {
        throw new Error('Граф не содержит узлов');
      }
      
      setGraphData(response.data);
      setGraphType(type);
      setIsGraphBuilt(true);
      setShowSuccessAlert(true);

      setTimeout(() => setShowSuccessAlert(false), 3000);
      
      message.success({
        content: `Граф "${getGraphTypeName(type)}" построен! Узлов: ${response.data.graph.nodes.length}, связей: ${response.data.graph.links?.length || 0}`,
        duration: 5
      });
      
    } catch (error) {
      console.error('❌ Build graph error:', error);
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`);
      setIsGraphBuilt(false);
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getGraphTypeName = (type) => {
    const types = {
      'author': 'Граф авторов',
      'topic': 'Граф тем',
      'geo': 'Географический граф'
    };
    return types[type] || type;
  };

  if (isLoadingFolders) {
    return (
      <Layout>
        {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
        <Content>
          <div style={{ textAlign: 'center', padding: '100px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 20, fontSize: 16 }}>Загрузка файлов пользователя...</div>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ✅ Добавляем левое меню навигации */}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
      
      <Content>
        <div className="graph-analysis-page" style={{ padding: '20px', width: '100%', maxWidth: '100%' }}>
          <Card 
            title="Анализ графа связей авторов" 
            style={{ width: '100%', maxWidth: '100%' }}
            bodyStyle={{ padding: '20px' }}
          >
            
            {/* Шаг 1: Выбор CSV файла */}
            <Card 
              type="inner" 
              title="1️⃣ Выбор CSV файла для анализа"
              style={{ marginBottom: 20, width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    📁 Выберите файл графа (result_graph_*.csv):
                  </span>
                </div>
                
                <TreeSelect
                  style={{ width: '100%' }}
                  value={selectedFile?.fullPath}
                  dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                  treeData={csvTreeData}
                  placeholder="Выберите файл графа из доступных папок..."
                  treeDefaultExpandAll={true}
                  onChange={handleFileSelect}
                  showSearch
                  treeNodeFilterProp="title"
                  allowClear
                  suffixIcon={<FileOutlined />}
                  size="large"
                  disabled={csvTreeData.length === 0}
                />
                
                {selectedFile && (
                  <div style={{
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '4px',
                    padding: '12px',
                  }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div><strong>📄 Файл:</strong> {selectedFile.file}</div>
                      {selectedFile.info?.size && (
                        <div>
                          <strong>📦 Размер:</strong>{' '}
                          <Tag color="blue">
                            {(selectedFile.info.size / 1024).toFixed(1)} KB
                          </Tag>
                        </div>
                      )}
                    </Space>
                  </div>
                )}
                
                {csvTreeData.length === 0 && !isLoadingFolders && (
                  <Alert 
                    message="CSV файлы не найдены" 
                    description={
                      <div>
                        <p>Возможные причины:</p>
                        <ul>
                          <li>Файлы еще не созданы (запустите BERTopic анализ)</li>
                          <li>Файлы должны начинаться с 'result_graph_'</li>
                          <li>Проверьте папку bertopic_files_directory</li>
                        </ul>
                      </div>
                    }
                    type="warning" 
                    showIcon 
                  />
                )}
              </Space>
            </Card>

            {/* Шаг 2: Выбор типа графа и построение */}
            <Card 
              type="inner" 
              title="2️⃣ Построение графа"
              style={{ marginBottom: 20, width: '100%' }}
            >
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}><strong>Тип графа:</strong></div>
                  <Select 
                    value={graphType} 
                    onChange={setGraphType}
                    style={{ width: '100%' }}
                    disabled={isLoading}
                    size="large"
                  >
                    <Option value="author">
                      <ShareAltOutlined /> Граф авторов
                    </Option>
                    <Option value="topic">
                      <BarChartOutlined /> Граф тем
                    </Option>
                    <Option value="geo">
                      <GlobalOutlined /> География
                    </Option>
                  </Select>
                </Col>
                
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>&nbsp;</div>
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={() => buildGraph(graphType)}
                    loading={isLoading}
                    disabled={!selectedFile}
                    block
                  >
                    {isLoading ? 'Построение графа...' : 'Построить граф'}
                  </Button>
                </Col>
              </Row>

              {!selectedFile && (
                <Alert 
                  message="Выберите CSV файл на шаге 1" 
                  type="warning" 
                  showIcon 
                  style={{ marginTop: 16 }}
                />
              )}

              {isGraphBuilt && graphData && showSuccessAlert && (
                <Alert 
                  message="✅ Граф успешно построен!" 
                  description={`Тип: ${getGraphTypeName(graphType)}, Узлов: ${graphData?.graph?.nodes?.length || 0}, Связей: ${graphData?.graph?.links?.length || 0}`}
                  type="success" 
                  showIcon 
                  closable
                  onClose={() => setShowSuccessAlert(false)}
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* Визуализация графа */}
            {isGraphBuilt && graphData?.graph?.nodes?.length > 0 ? (
              <div style={{ width: '100%' }}>
                <Row gutter={16} style={{ marginBottom: 20 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="Узлов в графе" 
                        value={graphData.graph.nodes.length}
                        prefix={<ShareAltOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="Связей" 
                        value={graphData.graph.links?.length || 0}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="Записей" 
                        value={graphData.metadata?.total_records || 0}
                        prefix={<BarChartOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="Сообщений"
                        value={graphData.graph.nodes.reduce((sum, node) => sum + (node.posts_count || 0), 0)}
                      />
                    </Card>
                  </Col>
                </Row>

                <Tabs defaultActiveKey="graph" style={{ width: '100%' }}>
                  <TabPane tab="📊 Визуализация" key="graph">
                    <div style={{ width: '100%' }}>
                      <GraphVisualization 
                        data={graphData} 
                        graphType={graphType}
                      />
                    </div>
                  </TabPane>
                </Tabs>
              </div>
            ) : !isLoading && (
              <Alert 
                message="Данные графа не загружены" 
                description={
                  <ol>
                    <li>Выберите CSV файл из доступных папок</li>
                    <li>Выберите тип графа</li>
                    <li>Нажмите "Построить граф"</li>
                  </ol>
                }
                type="info" 
                showIcon 
                style={{ marginTop: 20, width: '100%' }}
              />
            )}

            {isLoading && (
              <Card style={{ textAlign: 'center', padding: '40px', marginTop: 20, width: '100%' }}>
                <Spin size="large" />
                <div style={{ fontSize: 18, marginTop: 20 }}>⏳ Построение графа...</div>
              </Card>
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default GraphAnalysis;