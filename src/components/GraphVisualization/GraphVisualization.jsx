import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Card, Button, Input, message, Empty, Select, Tag, Space, Radio, Collapse, Badge, Slider, Checkbox, TreeSelect } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, AimOutlined, QuestionCircleOutlined, FilterOutlined, ClearOutlined, SearchOutlined, TagsOutlined, UserOutlined, TeamOutlined, FolderOutlined, FileOutlined, ReloadOutlined } from '@ant-design/icons';
import './GraphVisualization.scss';
import { API_URL } from '../../app.constants';
import axios from 'axios';
import { useSelector } from 'react-redux';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { SHOW_PARENT } = TreeSelect;

const GraphVisualization = ({ data, onNodeClick, graphType = 'author', userId }) => {
  const svgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [clickTimer, setClickTimer] = useState(null);
  
  // ✅ Получаем данные пользователя из Redux
  const { bertopic_files_directory: dataUser } = useSelector((store) => store.dataUsersSlice);
  
  // ✅ Состояния для выбора CSV файлов
  const [selectedFile, setSelectedFile] = useState(null);
  const { csv_files_directory: csvData } = useSelector((store) => store.dataUsersSlice);
  
  const [csvTreeData, setCsvTreeData] = useState([]);
  
  // Фильтры по тематикам и фразам
  const [excludedTopics, setExcludedTopics] = useState(new Set());
  const [availableTopics, setAvailableTopics] = useState([]);
  const [excludedPhrases, setExcludedPhrases] = useState(new Set());
  const [keyPhrases, setKeyPhrases] = useState([]);
  const [phraseGroups, setPhraseGroups] = useState({});
  
  // Поиск по словам/фразам
  const [searchMode, setSearchMode] = useState('exclude');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPhrases, setSearchPhrases] = useState([]);
  
  // Поиск по имени автора
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  
  // Фильтры по характеристикам
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [availableTypes, setAvailableTypes] = useState([]);
  const [audienceRange, setAudienceRange] = useState([0, 1000000]);
  const [audienceMinMax, setAudienceMinMax] = useState([0, 1000000]);
  const [postsRange, setPostsRange] = useState([0, 100]);
  const [postsMinMax, setPostsMinMax] = useState([0, 100]);

  // ✅ Построение дерева файлов при загрузке данных пользователя
  useEffect(() => {
      if (csvData && Object.keys(csvData).length > 0) {
        const treeData = buildCsvTreeData(csvData);
        setCsvTreeData(treeData);
        console.log('✅ CSV Tree data built:', treeData);
      }
    }, [csvData]);

  // ✅ Функция построения дерева для TreeSelect из папок пользователя
  const buildCsvTreeData = (userData) => {
      if (!userData || Object.keys(userData).length === 0) return [];

      const treeData = [];

      Object.entries(userData).forEach(([folderPath, files]) => {
        if (!files || files.length === 0) return;

        const folderName = folderPath === 'root' ? 'Корневая папка' : folderPath;

        const folderNode = {
          title: (
            <span>
              <FolderOutlined style={{ marginRight: 8, color: '#faad14' }} />
              {folderName}
            </span>
          ),
          value: `folder_${folderPath}`,
          key: `folder_${folderPath}`,
          selectable: false,
          children: files.map(fileInfo => {
            const fileName = fileInfo.file;
            const displayName = fileName.replace('result_graph_', '').replace('.csv', '');
            
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
                </span>
              ),
              value: fileInfo.full_path,
              key: fileInfo.full_path,
              isLeaf: true,
              fileInfo: fileInfo,
              folderPath: folderPath,
              fileName: fileName
            };
          })
        };

        treeData.push(folderNode);
      });

      return treeData;
    };

    // ✅ Обработчик выбора файла
    const handleFileSelect = (value, node) => {
      if (!value) {
        setSelectedFile(null);
        message.info('Выбор файла отменен');
        return;
      }

      const selectedNode = Array.isArray(node) ? node[0] : node;
      
      if (selectedNode?.fileInfo) {
        setSelectedFile({
          folder: selectedNode.folderPath,
          file: selectedNode.fileName,
          info: selectedNode.fileInfo,
          fullPath: selectedNode.fileInfo.full_path
        });
        
        message.success(`Выбран файл: ${selectedNode.fileName}`);
        console.log('📁 Selected file:', {
          folder: selectedNode.folderPath,
          file: selectedNode.fileName,
          fullPath: selectedNode.fileInfo.full_path
        });
      }
    };

  // ✅ Функция обновления списка файлов
  const refreshFileList = () => {
    if (dataUser && Object.keys(dataUser).length > 0) {
      const treeData = buildCsvTreeData(dataUser);
      setCsvTreeData(treeData);
      message.success('Список файлов обновлен');
    } else {
      message.warning('Нет данных для обновления');
    }
  };

  const graphData = useMemo(() => {
    if (!data) return null;
    return data.graph || data;
  }, [data]);
  
  // Извлекаем ключевые фразы
  useEffect(() => {
    if (!data?.topic_analysis) return;
    
    const analysis = data.topic_analysis;
    setKeyPhrases(analysis.phrases || []);
    setPhraseGroups(analysis.groups || {});
  }, [data]);
  
  // Извлекаем все уникальные тематики и типы узлов
  useEffect(() => {
    if (!graphData?.nodes) return;
    
    const topicsSet = new Set();
    const typesSet = new Set();
    let maxAudience = 0;
    let maxPosts = 0;
    
    graphData.nodes.forEach(node => {
      // Тематики
      if (node.topics && Array.isArray(node.topics)) {
        node.topics.forEach(topic => {
          const topicText = typeof topic === 'string' ? topic : topic.text;
          if (topicText) topicsSet.add(topicText);
        });
      }
      
      // Типы узлов
      if (node.type) typesSet.add(node.type);
      
      // Максимумы для ползунков
      if (node.audience > maxAudience) maxAudience = node.audience;
      if (node.posts_count > maxPosts) maxPosts = node.posts_count;
    });
    
    setAvailableTopics(Array.from(topicsSet).sort());
    setAvailableTypes(Array.from(typesSet).sort());
    
    // Устанавливаем диапазоны ползунков
    setAudienceMinMax([0, Math.ceil(maxAudience / 1000) * 1000]);
    setAudienceRange([0, Math.ceil(maxAudience / 1000) * 1000]);
    
    setPostsMinMax([0, Math.ceil(maxPosts / 10) * 10]);
    setPostsRange([0, Math.ceil(maxPosts / 10) * 10]);
    
    // По умолчанию все типы выбраны
    setSelectedTypes(new Set(typesSet));
    
    console.log('📊 Filter ranges:', {
      topics: topicsSet.size,
      types: typesSet.size,
      audienceMax: maxAudience,
      postsMax: maxPosts
    });
  }, [graphData]);

  const getConnectedNodes = (nodeId) => {
    if (!graphData?.links) return new Set([nodeId]);
    
    const connected = new Set([nodeId]);
    
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === nodeId) connected.add(targetId);
      if (targetId === nodeId) connected.add(sourceId);
    });
    
    return connected;
  };
  
  const nodeMatchesSearch = (node) => {
    if (searchPhrases.length === 0) return true;
    
    if (!node.topics || node.topics.length === 0) return false;
    
    const allTopicsText = node.topics
      .map(topic => (typeof topic === 'string' ? topic : topic.text))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    const hasMatch = searchPhrases.some(phrase => 
      allTopicsText.includes(phrase.toLowerCase().trim())
    );
    
    return hasMatch;
  };
  
  const nodeMatchesExcludedPhrases = (node) => {
    if (excludedPhrases.size === 0) return false;
    
    if (!node.topics || node.topics.length === 0) return false;
    
    const allTopicsText = node.topics
      .map(topic => (typeof topic === 'string' ? topic : topic.text))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    return Array.from(excludedPhrases).some(phrase => 
      allTopicsText.includes(phrase.toLowerCase())
    );
  };

  const nodeMatchesAuthorSearch = (node) => {
    if (!authorSearchQuery.trim()) return true;
    
    const query = authorSearchQuery.toLowerCase().trim();
    const label = (node.label || '').toLowerCase();
    
    return label.includes(query);
  };

  const filteredGraphData = useMemo(() => {
    if (!graphData) return graphData;
    
    console.log('🔍 Filtering graph:', {
      excludedTopics: Array.from(excludedTopics),
      excludedPhrases: Array.from(excludedPhrases),
      searchPhrases,
      authorSearchQuery,
      selectedTypes: Array.from(selectedTypes),
      audienceRange,
      postsRange,
      focusedNodeId
    });
    
    let filteredNodes = graphData.nodes.filter(node => {
      // 1. Поиск по имени автора
      if (!nodeMatchesAuthorSearch(node)) {
        return false;
      }
      
      // 2. Фильтр по типу узла
      if (selectedTypes.size > 0 && !selectedTypes.has(node.type)) {
        return false;
      }
      
      // 3. Фильтр по аудитории
      const audience = node.audience || 0;
      if (audience < audienceRange[0] || audience > audienceRange[1]) {
        return false;
      }
      
      // 4. Фильтр по количеству постов
      const posts = node.posts_count || 0;
      if (posts < postsRange[0] || posts > postsRange[1]) {
        return false;
      }
      
      // 5. Фильтр по фокусу на узле
      if (focusedNodeId !== null) {
        const connectedNodes = getConnectedNodes(focusedNodeId);
        if (!connectedNodes.has(node.id)) return false;
      }
      
      // 6. Фильтр по тематикам
      if (excludedTopics.size > 0 && excludedTopics.size < availableTopics.length) {
        if (!node.topics || node.topics.length === 0) return true;
        
        const hasValidTopic = node.topics.some(topic => {
          const topicText = typeof topic === 'string' ? topic : topic.text;
          return !excludedTopics.has(topicText);
        });
        
        if (!hasValidTopic) return false;
      }
      
      // 7. Фильтр по исключенным фразам
      if (excludedPhrases.size > 0) {
        if (nodeMatchesExcludedPhrases(node)) {
          return false;
        }
      }
      
      // 8. Фильтр по поиску слов/фраз
      if (searchPhrases.length > 0) {
        const matches = nodeMatchesSearch(node);
        
        if (searchMode === 'include') {
          return matches;
        } else {
          return !matches;
        }
      }
      
      return true;
    });
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    const filteredLinks = (graphData.links || []).filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    console.log(`✅ Filtered: ${filteredNodes.length}/${graphData.nodes.length} nodes, ${filteredLinks.length}/${graphData.links?.length || 0} links`);
    
    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [graphData, excludedTopics, excludedPhrases, searchPhrases, searchMode, focusedNodeId, selectedTypes, audienceRange, postsRange, authorSearchQuery, availableTopics.length]);
  
  const isValidData = useMemo(() => {
    const valid = filteredGraphData && 
                  filteredGraphData.nodes && 
                  Array.isArray(filteredGraphData.nodes) && 
                  filteredGraphData.nodes.length > 0;
    
    return valid;
  }, [data, filteredGraphData]);

  useEffect(() => {
    if (!isValidData) {
      console.warn('⚠️ GraphVisualization: Invalid data, skipping draw');
      return;
    }
    
    drawGraph();
  }, [isValidData, graphType, excludedTopics, excludedPhrases, searchPhrases, searchMode, focusedNodeId, selectedTypes, audienceRange, postsRange, authorSearchQuery]);

  const drawGraph = () => {
    d3.select(svgRef.current).selectAll('*').remove();
    
    if (!isValidData) {
      console.warn('drawGraph: Invalid data, skipping');
      return;
    }

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g');
    
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    const color = d3.scaleOrdinal()
      .domain(['Сообщество', 'Аккаунт СМИ', 'Личный профиль', 'Личность', 'topic', 'region'])
      .range(['#1890ff', '#52c41a', '#faad14', '#ff7a45', '#722ed1', '#eb2f96']);
    
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(filteredGraphData.nodes, d => d.audience || d.count || 0)])
      .range([5, 30]);
    
    const simulation = d3.forceSimulation(filteredGraphData.nodes)
      .force('link', d3.forceLink(filteredGraphData.links || [])
        .id(d => d.id)
        .distance(d => 100 / (d.weight || 1)))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => radiusScale(d.audience || d.count || 0) + 5));
    
    const link = g.append('g')
      .selectAll('line')
      .data(filteredGraphData.links || [])
      .join('line')
      .attr('class', 'link')
      .attr('stroke', d => d.type === 'exact' ? '#1890ff' : '#52c41a')
      .attr('stroke-opacity', d => d.type === 'exact' ? 0.8 : 0.4)
      .attr('stroke-width', d => Math.sqrt(d.weight || 1))
      .attr('stroke-dasharray', d => d.type === 'similar' ? '5,5' : 'none');
    
    const node = g.append('g')
      .selectAll('circle')
      .data(filteredGraphData.nodes)
      .join('circle')
      .attr('class', 'node')
      .attr('r', d => radiusScale(d.audience || d.count || 0))
      .attr('fill', d => color(d.type))
      .attr('stroke', d => d.id === focusedNodeId ? '#ff4d4f' : '#fff')
      .attr('stroke-width', d => d.id === focusedNodeId ? 4 : 2)
      .attr('opacity', d => {
        if (!focusedNodeId) return 1;
        return d.id === focusedNodeId ? 1 : 0.7;
      })
      .call(drag(simulation))
      .on('click', function(event, d) {
        event.preventDefault();
        
        if (clickTimer) {
          clearTimeout(clickTimer);
          setClickTimer(null);
        }
        
        const timer = setTimeout(() => {
          setSelectedNode(d);
          if (onNodeClick) onNodeClick(d);
          setClickTimer(null);
        }, 250);
        
        setClickTimer(timer);
      })
      .on('dblclick', function(event, d) {
        event.preventDefault();
        
        if (clickTimer) {
          clearTimeout(clickTimer);
          setClickTimer(null);
        }
        
        if (focusedNodeId === d.id) {
          setFocusedNodeId(null);
          message.info('Фокус снят, показаны все узлы');
        } else {
          setFocusedNodeId(d.id);
          const connectedCount = getConnectedNodes(d.id).size - 1;
          message.info(`Показаны связи узла "${d.label}" (${connectedCount} связей)`);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke', '#ff4d4f')
          .attr('stroke-width', 3);
        showTooltip(event, d);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke', d.id === focusedNodeId ? '#ff4d4f' : '#fff')
          .attr('stroke-width', d.id === focusedNodeId ? 4 : 2);
        hideTooltip();
      });
    
    const labels = g.append('g')
      .selectAll('text')
      .data(filteredGraphData.nodes)
      .join('text')
      .text(d => d.label)
      .attr('font-size', 10)
      .attr('dx', d => radiusScale(d.audience || d.count || 0) + 5)
      .attr('dy', 4);
    
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      
      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
    
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
    
    const tooltip = d3.select('body').select('.graph-tooltip');
    const tooltipExists = !tooltip.empty();
    
    const tooltipDiv = tooltipExists ? tooltip : d3.select('body').append('div')
      .attr('class', 'graph-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'white')
      .style('padding', '10px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('z-index', 1000);
    
    function showTooltip(event, d) {
      let html = `<strong>${d.label}</strong><br/>`;
      html += `Тип: ${d.type}<br/>`;
      if (d.audience) html += `Аудитория: ${d.audience.toLocaleString()}<br/>`;
      if (d.count) html += `Упоминаний: ${d.count}<br/>`;
      if (d.posts_count) html += `Постов: ${d.posts_count}<br/>`;
      
      tooltipDiv
        .html(html)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
    }
    
    function hideTooltip() {
      tooltipDiv.style('opacity', 0);
    }
    
    svgRef.current.zoomIn = () => svg.transition().call(zoom.scaleBy, 1.3);
    svgRef.current.zoomOut = () => svg.transition().call(zoom.scaleBy, 0.7);
    svgRef.current.resetZoom = () => svg.transition().call(zoom.transform, d3.zoomIdentity);
  };

  const handlePhraseToggle = (phrase) => {
    setExcludedPhrases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phrase)) {
        newSet.delete(phrase);
        message.info(`Фраза "${phrase}" включена`);
      } else {
        newSet.add(phrase);
        const group = phraseGroups[phrase];
        const affectedTopics = group?.topics_count || 0;
        message.info(`Фраза "${phrase}" исключена (${affectedTopics} тематик)`);
      }
      return newSet;
    });
  };

  const handleTopicToggle = (topic) => {
    setExcludedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }
      return newSet;
    });
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes(new Set(availableTypes));
    message.success('Все типы выбраны');
  };

  const handleDeselectAllTypes = () => {
    setSelectedTypes(new Set());
    message.info('Все типы сняты');
  };

  const handleClearFilters = () => {
    setExcludedTopics(new Set());
    setExcludedPhrases(new Set());
    setSearchPhrases([]);
    setSearchQuery('');
    setAuthorSearchQuery('');
    setFocusedNodeId(null);
    setSelectedTypes(new Set(availableTypes));
    setAudienceRange(audienceMinMax);
    setPostsRange(postsMinMax);
    message.success('Все фильтры сброшены');
  };

  const handleAddSearchPhrase = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      message.warning('Введите слово или фразу для поиска');
      return;
    }
    
    if (searchPhrases.includes(trimmed)) {
      message.warning('Эта фраза уже добавлена');
      return;
    }
    
    setSearchPhrases([...searchPhrases, trimmed]);
    setSearchQuery('');
    message.success(`Добавлена фраза: "${trimmed}"`);
  };

  const handleRemoveSearchPhrase = (phrase) => {
    setSearchPhrases(searchPhrases.filter(p => p !== phrase));
    message.info(`Фраза "${phrase}" удалена`);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      message.warning('Введите вопрос');
      return;
    }
    
    if (!isValidData) {
      message.error('Данные графа не загружены. Постройте граф на предыдущем шаге.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const filteredData = {
        graph: filteredGraphData,
        statistics: data?.statistics || {},
        metadata: {
          ...(data?.metadata || {}),
          filtered: excludedTopics.size > 0 || excludedPhrases.size > 0 || searchPhrases.length > 0 || authorSearchQuery.trim() !== '',
          excluded_topics: Array.from(excludedTopics),
          excluded_phrases: Array.from(excludedPhrases),
          search_phrases: searchPhrases,
          search_mode: searchMode,
          author_search: authorSearchQuery,
          selected_types: Array.from(selectedTypes),
          audience_range: audienceRange,
          posts_range: postsRange,
          original_nodes_count: graphData?.nodes?.length || 0,
          filtered_nodes_count: filteredGraphData.nodes.length
        }
      };
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          graph_data: filteredData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Analyze error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setAiAnswer(result.answer);
      message.success('Анализ завершен');
    } catch (error) {
      console.error('Analyze error:', error);
      message.error('Ошибка анализа: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Подсчет активных фильтров
  const activeFiltersCount = 
    excludedTopics.size + 
    excludedPhrases.size + 
    searchPhrases.length + 
    (authorSearchQuery.trim() ? 1 : 0) +
    (selectedTypes.size !== availableTypes.length ? 1 : 0) +
    (audienceRange[0] !== audienceMinMax[0] || audienceRange[1] !== audienceMinMax[1] ? 1 : 0) +
    (postsRange[0] !== postsMinMax[0] || postsRange[1] !== postsMinMax[1] ? 1 : 0);

  if (!isValidData && graphData?.nodes?.length > 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Empty 
          description={
            <div>
              <p style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>
                🔍 Все узлы отфильтрованы
              </p>
              <p style={{ color: '#999', marginBottom: '15px' }}>
                Выбранные фильтры скрыли все узлы графа.
              </p>
              <Button 
                type="primary" 
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
              >
                Сбросить фильтры
              </Button>
            </div>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  // if (!isValidData) {
  //   return (
  //     <div style={{ padding: '40px', textAlign: 'center' }}>
  //       <Empty 
  //         description={
  //           <div>
  //             <p style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>
  //               📊 Данные графа не загружены
  //             </p>
  //             <p style={{ color: '#999', marginBottom: '5px' }}>
  //               Для визуализации графа необходимо:
  //             </p>
  //             <ol style={{ textAlign: 'left', display: 'inline-block', color: '#666' }}>
  //               <li>Выбрать CSV файл из списка ниже</li>
  //               <li>Выбрать тип графа (авторы, темы или география)</li>
  //               <li>Нажать кнопку "Построить граф"</li>
  //             </ol>
  //           </div>
  //         }
  //         image={Empty.PRESENTED_IMAGE_SIMPLE}
  //       />
  //     </div>
  //   );
  // }

  return (
    <div className="graph-visualization">
      {/* ПАНЕЛЬ ФИЛЬТРОВ */}
      <div className="filters-section">
        {/* Подсказка по управлению */}
        <div className="hint-box">
          <Space>
            <span>💡</span>
            <span>
              <strong>Одинарный клик</strong> — информация об узле | 
              <strong style={{ marginLeft: '8px' }}>Двойной клик</strong> — фокус на связях
            </span>
          </Space>
        </div>

        {/* Поиск по имени автора */}
        {authorSearchQuery && (
          <div className="author-search-active" style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <Space>
              <SearchOutlined style={{ color: '#1890ff' }} />
              <span>
                Поиск по имени: 
                <strong style={{ marginLeft: '5px' }}>"{authorSearchQuery}"</strong>
              </span>
              <Tag color="blue">
                {filteredGraphData?.nodes?.length || 0} совпадений
              </Tag>
              <Button 
                size="small"
                type="link"
                onClick={() => {
                  setAuthorSearchQuery('');
                  message.info('Поиск по имени сброшен');
                }}
              >
                ✕ Очистить
              </Button>
            </Space>
          </div>
        )}

        {/* Фокус на узле */}
        {focusedNodeId && (
          <div className="focus-box">
            <Space>
              <AimOutlined style={{ color: '#fa8c16' }} />
              <span>
                Фокус на узле: 
                <strong style={{ marginLeft: '5px' }}>
                  {graphData?.nodes.find(n => n.id === focusedNodeId)?.label}
                </strong>
                ({getConnectedNodes(focusedNodeId).size - 1} связей)
              </span>
              <Button 
                size="small"
                type="link"
                onClick={() => {
                  setFocusedNodeId(null);
                  message.success('Фокус снят');
                }}
              >
                ✕ Сбросить фокус
              </Button>
            </Space>
          </div>
        )}

        {/* Легенда связей */}
        <div className="legend-box">
          <Space>
            <span style={{ fontWeight: 'bold' }}>Легенда связей:</span>
            <Tag color="blue">━━ Точное совпадение</Tag>
            <Tag color="green">╌╌ Похожие тематики (AI)</Tag>
          </Space>
        </div>

        {/* Счетчик активных фильтров */}
        {activeFiltersCount > 0 && (
          <div className="active-filters-box">
            <Space>
              <FilterOutlined />
              <span><strong>Активных фильтров: {activeFiltersCount}</strong></span>
              <Button 
                size="small"
                danger
                onClick={handleClearFilters}
              >
                Сбросить все
              </Button>
            </Space>
          </div>
        )}
        
        <Collapse defaultActiveKey={[]} ghost>
          {/* Поиск по имени автора */}
          <Panel 
            header={
              <Space>
                <UserOutlined />
                <span><strong>Поиск по имени автора</strong></span>
                {authorSearchQuery && (
                  <Badge 
                    count={filteredGraphData?.nodes?.length || 0} 
                    style={{ backgroundColor: '#52c41a' }}
                  />
                )}
              </Space>
            } 
            key="author-search"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Input
                placeholder="Введите имя автора или часть имени..."
                value={authorSearchQuery}
                onChange={(e) => setAuthorSearchQuery(e.target.value)}
                allowClear
                prefix={<SearchOutlined />}
                suffix={
                  authorSearchQuery && (
                    <Tag color="blue">
                      {filteredGraphData?.nodes?.length || 0} найдено
                    </Tag>
                  )
                }
              />
              <div style={{ color: '#999', fontSize: '12px' }}>
                💡 Начните вводить имя автора - граф будет обновляться автоматически
              </div>
            </Space>
          </Panel>

          {/* Фильтр по типам узлов */}
          <Panel 
            header={
              <Space>
                <TeamOutlined />
                <span><strong>Типы узлов</strong></span>
                <Badge count={`${selectedTypes.size}/${availableTypes.length}`} />
              </Space>
            } 
            key="types"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space>
                <Button size="small" onClick={handleSelectAllTypes}>
                  Выбрать все
                </Button>
                <Button size="small" onClick={handleDeselectAllTypes}>
                  Снять все
                </Button>
              </Space>
              
              <div className="filter-checkboxes">
                {availableTypes.map(type => (
                  <Checkbox
                    key={type}
                    checked={selectedTypes.has(type)}
                    onChange={() => handleTypeToggle(type)}
                  >
                    {type}
                  </Checkbox>
                ))}
              </div>
            </Space>
          </Panel>

          {/* Фильтр по аудитории */}
          <Panel 
            header={
              <Space>
                <UserOutlined />
                <span><strong>Аудитория</strong></span>
                <Tag color="blue">
                  {audienceRange[0].toLocaleString()} - {audienceRange[1].toLocaleString()}
                </Tag>
              </Space>
            } 
            key="audience"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                Диапазон аудитории узлов
              </div>
              <Slider
                range
                min={audienceMinMax[0]}
                max={audienceMinMax[1]}
                value={audienceRange}
                onChange={setAudienceRange}
                tooltip={{
                  formatter: (value) => value.toLocaleString()
                }}
                marks={{
                  [audienceMinMax[0]]: audienceMinMax[0].toLocaleString(),
                  [audienceMinMax[1]]: audienceMinMax[1].toLocaleString()
                }}
              />
              <Button 
                size="small" 
                type="link"
                onClick={() => setAudienceRange(audienceMinMax)}
              >
                Сбросить
              </Button>
            </Space>
          </Panel>

          {/* Фильтр по количеству постов */}
          <Panel 
            header={
              <Space>
                <TagsOutlined />
                <span><strong>Количество постов</strong></span>
                <Tag color="green">
                  {postsRange[0]} - {postsRange[1]}
                </Tag>
              </Space>
            } 
            key="posts"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                Диапазон количества постов
              </div>
              <Slider
                range
                min={postsMinMax[0]}
                max={postsMinMax[1]}
                value={postsRange}
                onChange={setPostsRange}
                marks={{
                  [postsMinMax[0]]: postsMinMax[0],
                  [postsMinMax[1]]: postsMinMax[1]
                }}
              />
              <Button 
                size="small" 
                type="link"
                onClick={() => setPostsRange(postsMinMax)}
              >
                Сбросить
              </Button>
            </Space>
          </Panel>

          {/* Быстрые фильтры по фразам */}
          <Panel 
            header={
              <Space>
                <TagsOutlined />
                <span><strong>Быстрые фильтры по фразам</strong></span>
                <Badge count={excludedPhrases.size} />
              </Space>
            } 
            key="phrases"
          >
            <div style={{ marginBottom: '10px', color: '#666', fontSize: '13px' }}>
              Выберите фразы для быстрого исключения связанных тематик
            </div>
            
            <Space wrap>
              {keyPhrases.map(phraseInfo => {
                const isExcluded = excludedPhrases.has(phraseInfo.phrase);
                const group = phraseGroups[phraseInfo.phrase];
                
                return (
                  <Tag
                    key={phraseInfo.phrase}
                    color={isExcluded ? 'default' : 'blue'}
                    style={{ 
                      cursor: 'pointer',
                      opacity: isExcluded ? 0.5 : 1,
                      textDecoration: isExcluded ? 'line-through' : 'none',
                      fontSize: '13px',
                      padding: '4px 8px'
                    }}
                    onClick={() => handlePhraseToggle(phraseInfo.phrase)}
                  >
                    {phraseInfo.phrase}
                    <Badge 
                      count={group?.topics_count || phraseInfo.count} 
                      style={{ 
                        marginLeft: '6px',
                        backgroundColor: isExcluded ? '#999' : '#1890ff'
                      }}
                    />
                  </Tag>
                );
              })}
            </Space>
          </Panel>

          {/* Поиск по содержанию */}
          <Panel 
            header={
              <Space>
                <SearchOutlined />
                <span><strong>Поиск по содержанию тематик</strong></span>
                <Badge count={searchPhrases.length} />
              </Space>
            } 
            key="search"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Radio.Group 
                value={searchMode} 
                onChange={(e) => setSearchMode(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="include">Показать только с фразами</Radio.Button>
                <Radio.Button value="exclude">Скрыть узлы с фразами</Radio.Button>
              </Radio.Group>
              
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Введите слово или фразу (например: 'айфон', 'экономика России')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onPressEnter={handleAddSearchPhrase}
                  allowClear
                />
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  onClick={handleAddSearchPhrase}
                >
                  Добавить
                </Button>
              </Space.Compact>
              
              {searchPhrases.length > 0 && (
                <div>
                  <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px' }}>
                    Активные фразы ({searchPhrases.length}):
                  </div>
                  <Space wrap>
                    {searchPhrases.map(phrase => (
                      <Tag
                        key={phrase}
                        closable
                        onClose={() => handleRemoveSearchPhrase(phrase)}
                        color="blue"
                      >
                        {phrase}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </Panel>

          {/* Фильтр по отдельным тематикам */}
          <Panel 
            header={
              <Space>
                <FilterOutlined />
                <span><strong>Все тематики</strong> ({availableTopics.length})</span>
                {excludedTopics.size > 0 && excludedTopics.size < availableTopics.length && (
                  <Badge count={excludedTopics.size} style={{ backgroundColor: '#ff4d4f' }} />
                )}
                {excludedTopics.size === availableTopics.length && (
                  <Tag color="warning">Все выключены</Tag>
                )}
              </Space>
            } 
            key="topics"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {/* Информационное сообщение */}
              {excludedTopics.size === availableTopics.length && (
                <div style={{
                  background: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '12px'
                }}>
                  💡 Все тематики выключены — фильтр игнорируется, показаны все узлы
                </div>
              )}
              
              {/* Кнопки управления */}
              <Space>
                <Button 
                  size="small" 
                  type={excludedTopics.size === 0 ? 'primary' : 'default'}
                  onClick={() => {
                    setExcludedTopics(new Set());
                    message.success('Все тематики включены');
                  }}
                >
                  Включить все
                </Button>
                <Button 
                  size="small" 
                  danger={excludedTopics.size === availableTopics.length}
                  onClick={() => {
                    setExcludedTopics(new Set(availableTopics));
                    message.warning('Все тематики выключены (фильтр игнорируется)');
                  }}
                >
                  Выключить все
                </Button>
                <Button 
                  size="small"
                  type="link"
                  disabled={excludedTopics.size === 0}
                  onClick={() => {
                    setExcludedTopics(new Set());
                    message.success('Выбор тематик сброшен');
                  }}
                >
                  Сбросить
                </Button>
              </Space>
              
              {/* Счетчик */}
              <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                {excludedTopics.size === 0 && '✅ Включены все тематики'}
                {excludedTopics.size > 0 && excludedTopics.size < availableTopics.length && 
                  `⚠️ Выключено ${excludedTopics.size} из ${availableTopics.length}`}
                {excludedTopics.size === availableTopics.length && 
                  `🔴 Все ${availableTopics.length} тематик выключены (фильтр не применяется)`}
              </div>
              
              {/* Сетка тематик */}
              <div className="topics-grid">
                {availableTopics.map(topic => {
                  const isExcluded = excludedTopics.has(topic);
                  return (
                    <Tag
                      key={topic}
                      color={isExcluded ? 'default' : 'green'}
                      style={{ 
                        cursor: 'pointer',
                        opacity: isExcluded ? 0.5 : 1,
                        textDecoration: isExcluded ? 'line-through' : 'none'
                      }}
                      onClick={() => handleTopicToggle(topic)}
                    >
                      {topic}
                    </Tag>
                  );
                })}
              </div>
            </Space>
          </Panel>
        </Collapse>
      </div>

      {/* Блок визуализации */}
      <div className="graph-section">
        <div className="graph-container">
          <svg ref={svgRef} className="graph-svg"></svg>
        </div>
      </div>

      {/* AI Ассистент под графом */}
      <div className="bottom-section">
        <Card 
          className="ai-assistant" 
          title={
            <span>
              <QuestionCircleOutlined /> AI Ассистент
            </span>
          }
        >
          <TextArea
            rows={3}
            placeholder="Задайте вопрос о графе, например: 'Кто самые влиятельные авторы?' или 'Какие темы наиболее популярны?'"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isAnalyzing}
          />
          <Button 
            type="primary" 
            onClick={handleAskQuestion}
            loading={isAnalyzing}
            style={{ marginTop: 10 }}
            size="large"
            block
          >
            {isAnalyzing ? 'Анализирую...' : 'Анализировать'}
          </Button>
          
          {aiAnswer && (
            <Card 
              className="ai-answer" 
              style={{ marginTop: 20 }}
              title="Ответ AI"
            >
              <div dangerouslySetInnerHTML={{ 
                __html: aiAnswer
                  .replace(/\n/g, '<br/>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }} />
            </Card>
          )}
        </Card>

        {/* Детали узла */}
        {selectedNode && (
          <Card 
            className="node-details" 
            title={`Автор: ${selectedNode.label}`}
          >
            <p><strong>Тип:</strong> {selectedNode.type}</p>
            {selectedNode.audience && (
              <p><strong>Аудитория:</strong> {selectedNode.audience.toLocaleString()}</p>
            )}
            {selectedNode.posts_count && (
              <p><strong>Постов:</strong> {selectedNode.posts_count}</p>
            )}
            
            {selectedNode.topics && selectedNode.topics.length > 0 && (
              <div>
                <strong>Тематики текстов:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  {selectedNode.topics.map((topic, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      {typeof topic === 'string' ? (
                        <span>{topic}</span>
                      ) : (
                        <a 
                          href={topic.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#1890ff',
                            textDecoration: 'none',
                            transition: 'color 0.3s'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#40a9ff'}
                          onMouseLeave={(e) => e.target.style.color = '#1890ff'}
                        >
                          {topic.text}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedNode.url && (
              <a href={selectedNode.url} target="_blank" rel="noopener noreferrer">
                Открыть профиль
              </a>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default GraphVisualization;
