import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Card, Button, Input, message, Empty, Select, Tag, Space, Radio, Slider, TreeSelect, Progress } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, QuestionCircleOutlined, ClearOutlined, SearchOutlined, FolderOutlined, FileOutlined, ReloadOutlined, LinkOutlined, ExportOutlined } from '@ant-design/icons';
import './GraphVisualization.scss';
import { API_URL } from '../../app.constants';
import axios from 'axios';
import { $axios as api } from '../../api';
import { useSelector } from 'react-redux';

const LINK_STYLE = {
  exact: { color: '#1890ff', dash: 'none', label: 'Точные темы' },
  similar: { color: '#52c41a', dash: '5,5', label: 'Похожие темы' },
  same_hub: { color: '#722ed1', dash: 'none', label: 'Одна площадка' },
  reprint: { color: '#fa8c16', dash: '2,3', label: 'Перепечатки' },
  co_time: { color: '#8c8c8c', dash: '1,4', label: 'Близко по времени' },
};
const ALL_LINK_TYPES = Object.keys(LINK_STYLE);
const CLUSTER_COLORS = ['#13c2c2', '#eb2f96', '#faad14', '#2f54eb', '#a0d911', '#f5222d', '#722ed1', '#fa8c16'];

const { TextArea } = Input;
const { Option } = Select;
const { CheckableTag } = Tag;
const { SHOW_PARENT } = TreeSelect;

const formatReach = (value) => {
  const num = Number(value) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (num >= 1000) return `${Math.round(num / 1000)} тыс.`;
  return String(num);
};

const stripTopicPrefix = (text) => String(text || '')
  .replace(/^(тематика(\s+текста)?|тема(\s+текста)?|topic)\s*[:\-—–]\s*/i, '')
  .replace(/^это\s+/i, '')
  .replace(/\s+/g, ' ')
  .replace(/^[ ;,.\-]+|[ ;,.\-]+$/g, '')
  .trim();

const topicRank = (text) => {
  if (/ваканси|требуется\s+сотруд|ищем\s+сотруд|соискател|резюме|на работу\s+сотруд/i.test(text)) return 2;
  if (/реклам|скидк|промокод|прайс|акци[яи]|купить|заказать|услуги по|оплате штрафов|проездн(ых|ые)\s+сбор/i.test(text)) return 1;
  return 0;
};

const asSentence = (text) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').replace(/^[ ;,]+|[ ;,.!:]+$/g, '');
  if (!cleaned) return '';
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
};

const lowerFirst = (text) => (text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : '');

const topicTokens = (text) => new Set(String(text || '').toLowerCase().match(/[а-яёa-z0-9]{4,}/g) || []);

const tooSimilar = (text, existing) => {
  const tokens = topicTokens(text);
  if (tokens.size < 3) return false;
  return existing.some((prev) => {
    const other = topicTokens(prev);
    if (other.size < 3) return false;
    let overlap = 0;
    tokens.forEach((tok) => {
      if (other.has(tok)) overlap += 1;
    });
    return overlap / Math.min(tokens.size, other.size) >= 0.55;
  });
};

const composeClusterAbout = (topics = []) => {
  const items = [];
  const kept = [];
  (topics || []).forEach((raw, index) => {
    const source = Array.isArray(raw) ? raw[0] : raw;
    const cleaned = stripTopicPrefix(source);
    if (cleaned.length < 8) return;
    if (tooSimilar(cleaned, kept)) return;
    kept.push(cleaned);
    items.push({ rank: topicRank(cleaned), index, text: cleaned });
  });
  items.sort((a, b) => a.rank - b.rank || a.index - b.index);
  const primary = items.filter((item) => item.rank === 0).slice(0, 3).map((item) => asSentence(item.text));
  const ads = items.filter((item) => item.rank === 1).slice(0, 2).map((item) => asSentence(item.text));
  const jobs = items.filter((item) => item.rank === 2).slice(0, 2).map((item) => asSentence(item.text));
  const chunks = [];
  if (primary.length) {
    const [first, ...rest] = primary;
    chunks.push(rest.length ? `${first} Также ${lowerFirst(rest.join(' '))}` : first);
  }
  if (ads.length) {
    const joined = ads.join(' ');
    chunks.push(chunks.length ? `Также ${lowerFirst(joined)}` : joined);
  }
  if (jobs.length) {
    const joined = jobs.join(' ');
    chunks.push(chunks.length ? `В стороне от основной темы — ${lowerFirst(joined)}` : joined);
  }
  return chunks.filter(Boolean).join(' ');
};

const clusterAbout = (cluster) => cluster?.about || composeClusterAbout(cluster?.topics || []);

const seedClusterLayout = (nodes, width, height) => {
  const groups = new Map();
  nodes.forEach((node) => {
    const key = Number(node.cluster_id) || 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  });
  const ids = Array.from(groups.keys());
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.3;
  ids.forEach((cid, index) => {
    const angle = (2 * Math.PI * index) / Math.max(ids.length, 1);
    const gx = ids.length === 1 ? cx : cx + radius * Math.cos(angle);
    const gy = ids.length === 1 ? cy : cy + radius * Math.sin(angle);
    const members = groups.get(cid) || [];
    members.forEach((node, memberIndex) => {
      const spread = 28 + Math.min(members.length, 18) * 2;
      const a = (2 * Math.PI * memberIndex) / Math.max(members.length, 1);
      node.x = gx + spread * Math.cos(a);
      node.y = gy + spread * Math.sin(a);
    });
  });
};

const HEADING_EMOJI = {
  'кто в кластере': '👥',
  'о чём пишут': '💬',
  'о чем пишут': '💬',
  'чем связаны': '🔗',
  'на что обратить внимание': '⚠️',
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const isSafeHttpUrl = (url) => /^https?:\/\//i.test(String(url || '').trim());

const formatClusterMemo = (memo, nodes = []) => {
  let text = String(memo || '');
  Object.entries(LINK_STYLE).forEach(([key, style]) => {
    text = text.replace(new RegExp(`\\b${key}\\b`, 'gi'), style.label.toLowerCase());
  });
  text = text.replace(/^(?:⚠️\s*)?на что обратить внимание\s*:?\s*\n[\s\S]*?(?=(?:👥|💬|🔗|📌)\s|$)/gim, '');

  text = text.replace(/^#{1,6}\s*(.+?)\s*$/gm, (_, title) => {
    const clean = String(title).replace(/\*+/g, '').trim();
    const key = clean.toLowerCase().replace(/:$/, '');
    if (key.includes('на что обратить внимание')) return '';
    const emoji = HEADING_EMOJI[key] || '📌';
    return `%%H%%${emoji} ${clean}%%/H%%`;
  });
  text = text.replace(/^(👥|💬|🔗|📌)\s+(.+)$/gm, '%%H%%$1 $2%%/H%%');

  const authors = (nodes || [])
    .map((node) => ({
      name: String(node.label || node.id || '').trim(),
      url: node.primary_url || node.url || '',
    }))
    .filter((item) => item.name)
    .sort((a, b) => b.name.length - a.name.length);

  const seenTopicUrl = new Set();
  const topicExamples = [];
  (nodes || []).forEach((node) => {
    const fallback = node.primary_url || node.url || '';
    (node.topics || []).forEach((topic) => {
      const phrase = stripTopicPrefix(typeof topic === 'string' ? topic : topic?.text);
      const url = typeof topic === 'string' ? fallback : (topic?.url || fallback);
      if (phrase.length >= 12 && isSafeHttpUrl(url) && !seenTopicUrl.has(url)) {
        seenTopicUrl.add(url);
        topicExamples.push({ phrase, url });
      }
    });
  });
  topicExamples.sort((a, b) => b.phrase.length - a.phrase.length);
  const linkedPhrases = [];
  topicExamples.forEach(({ phrase, url }) => {
    if (text.includes(`](${url})`)) return;
    if (tooSimilar(phrase, linkedPhrases)) return;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(escaped, 'i'));
    if (!match) return;
    const start = text.toLowerCase().indexOf(match[0].toLowerCase());
    if (start < 0) return;
    const before = text.slice(0, start);
    if (before.lastIndexOf('[') > before.lastIndexOf(']')) return;
    text = `${text.slice(0, start)}[${match[0]}](${url})${text.slice(start + match[0].length)}`;
    linkedPhrases.push(phrase);
  });

  const slots = [];
  const stash = (html) => {
    const token = `%%S${slots.length}%%`;
    slots.push(html);
    return token;
  };

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => (
    isSafeHttpUrl(url)
      ? stash(`<a class="cluster-summary__link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
      : label
  ));

  text = text.replace(/\*\*(.+?)\*\*/g, (_, inner) => {
    const author = authors.find((item) => item.name.toLowerCase() === String(inner).trim().toLowerCase());
    const safe = escapeHtml(inner);
    if (author && isSafeHttpUrl(author.url)) {
      return stash(`<a class="cluster-summary__link" href="${escapeHtml(author.url)}" target="_blank" rel="noopener noreferrer"><strong>${safe}</strong></a>`);
    }
    return stash(`<strong>${safe}</strong>`);
  });

  text = escapeHtml(text);
  text = text.replace(/%%H%%([\s\S]+?)%%\/H%%/g, '<div class="cluster-summary__heading">$1</div>');
  slots.forEach((html, index) => {
    text = text.replace(`%%S${index}%%`, () => html);
  });
  return text.replace(/\n/g, '<br/>');
};

const GraphVisualization = ({ data, onNodeClick, graphType = 'author', userId }) => {
  const svgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [focusedClusterId, setFocusedClusterId] = useState(null);
  const [enabledLinkTypes, setEnabledLinkTypes] = useState(() => new Set(ALL_LINK_TYPES));
  const [clusterJob, setClusterJob] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const clickTimerRef = useRef(null);
  const pendingZoomRef = useRef(null);
  const focusedClusterIdRef = useRef(null);
  const zoomedRef = useRef(false);
  const simulationRef = useRef(null);
  
  // ✅ Получаем данные пользователя из Redux
  const { bertopic_files_directory: dataUser } = useSelector((store) => store.dataUsersSlice);
  
  // ✅ Состояния для выбора CSV файлов
  const [selectedFile, setSelectedFile] = useState(null);
  const { csv_files_directory: csvData } = useSelector((store) => store.dataUsersSlice);
  
  const [csvTreeData, setCsvTreeData] = useState([]);
  
  // Фильтры по тематикам и фразам
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [excludedPhrases, setExcludedPhrases] = useState(new Set());
  const [keyPhrases, setKeyPhrases] = useState([]);
  const [phraseGroups, setPhraseGroups] = useState({});
  
  // Поиск по словам/фразам
  const [searchMode, setSearchMode] = useState('include');
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

  const clusters = graphData?.clusters || [];
  const linkCounts = graphData?.link_counts || data?.statistics?.link_counts || {};

  const clusterAuthorNodes = (clusterId) => {
    const cluster = clusters.find((item) => Number(item.id) === Number(clusterId));
    const ids = new Set((cluster?.author_ids || []).map(String));
    return (graphData?.nodes || []).filter((node) => (
      ids.has(String(node.id)) || Number(node.cluster_id) === Number(clusterId)
    ));
  };
  
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
      if (node.type && String(node.type).toLowerCase() !== 'nan') typesSet.add(node.type);
      
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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    
    if (!node.topics || node.topics.length === 0) return false;
    
    const allTopicsText = node.topics
      .map(topic => (typeof topic === 'string' ? topic : topic.text))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    return allTopicsText.includes(query);
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
      excludedTopics: selectedTopics,
      excludedPhrases: Array.from(excludedPhrases),
      searchQuery,
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
      
      // 6. Фильтр по тематикам: пустой список — все, иначе только выбранные
      if (selectedTopics.length > 0) {
        if (!node.topics || node.topics.length === 0) return false;
        const wanted = new Set(selectedTopics);
        const hasTopic = node.topics.some(topic => {
          const topicText = typeof topic === 'string' ? topic : topic.text;
          return wanted.has(topicText);
        });
        if (!hasTopic) return false;
      }
      
      // 7. Фильтр по исключенным фразам
      if (excludedPhrases.size > 0) {
        if (nodeMatchesExcludedPhrases(node)) {
          return false;
        }
      }
      
      // 8. Фильтр по поиску в тематиках
      if (searchQuery.trim()) {
        const matches = nodeMatchesSearch(node);
        if (searchMode === 'include') {
          return matches;
        }
        return !matches;
      }
      
      return true;
    });
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    const filteredLinks = (graphData.links || []).filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
      const linkType = link.type || 'similar';
      if (enabledLinkTypes.size && !enabledLinkTypes.has(linkType)) return false;
      return true;
    });
    
    console.log(`✅ Filtered: ${filteredNodes.length}/${graphData.nodes.length} nodes, ${filteredLinks.length}/${graphData.links?.length || 0} links`);
    
    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [graphData, selectedTopics, excludedPhrases, searchQuery, searchMode, focusedNodeId, enabledLinkTypes, selectedTypes, audienceRange, postsRange, authorSearchQuery]);
  
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
  }, [isValidData, graphType, selectedTopics, excludedPhrases, searchQuery, searchMode, focusedNodeId, enabledLinkTypes, selectedTypes, audienceRange, postsRange, authorSearchQuery]);

  useEffect(() => () => {
    simulationRef.current?.stop();
  }, []);

  const drawGraph = () => {
    simulationRef.current?.stop();
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
      .filter((event) => {
        if (event.type === 'dblclick') return false;
        return (!event.ctrlKey || event.type === 'wheel') && !event.button;
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        const away = Math.abs(event.transform.k - 1) > 0.08
          || Math.abs(event.transform.x) > 24
          || Math.abs(event.transform.y) > 24;
        if (away !== zoomedRef.current) {
          zoomedRef.current = away;
          setIsZoomed(away);
        }
      });
    
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    svg.on('dblclick.overview', (event) => {
      if (event.target === svg.node()) {
        restoreOverview();
      }
    });

    const fitNodes = (items, pad = 48, duration = 240) => {
      const pts = (items || []).filter(d => d && d.x != null && d.y != null);
      if (!pts.length) {
        if (duration <= 0) {
          svg.call(zoom.transform, d3.zoomIdentity);
        } else {
          svg.transition().duration(duration).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity);
        }
        return;
      }
      const minX = d3.min(pts, d => d.x);
      const maxX = d3.max(pts, d => d.x);
      const minY = d3.min(pts, d => d.y);
      const maxY = d3.max(pts, d => d.y);
      const bw = Math.max(maxX - minX, 48);
      const bh = Math.max(maxY - minY, 48);
      const k = Math.max(0.12, Math.min(3.2, 0.86 * Math.min((width - pad * 2) / bw, (height - pad * 2) / bh)));
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(k)
        .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
      if (duration <= 0) {
        svg.call(zoom.transform, transform);
      } else {
        svg.transition().duration(duration).ease(d3.easeCubicOut).call(zoom.transform, transform);
      }
    };

    const zoomToNode = (d, scale = 2.4) => {
      if (d == null || d.x == null || d.y == null) return;
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-d.x, -d.y);
      svg.transition().duration(280).ease(d3.easeCubicOut).call(zoom.transform, transform);
    };
    
    const color = d3.scaleOrdinal()
      .domain(['Сообщество', 'Аккаунт СМИ', 'Личный профиль', 'Личность', 'topic', 'region'])
      .range(['#1890ff', '#52c41a', '#faad14', '#ff7a45', '#722ed1', '#eb2f96']);
    
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(filteredGraphData.nodes, d => d.audience || d.count || 0) || 1])
      .range([5, 30]);

    const clusterStroke = (d) => {
      if (d.id === focusedNodeId) return '#ff4d4f';
      if (d.cluster_id) return CLUSTER_COLORS[(Number(d.cluster_id) - 1) % CLUSTER_COLORS.length];
      return '#fff';
    };

    const linkStyle = (d) => LINK_STYLE[d.type] || LINK_STYLE.similar;

    const nodeOpacity = (d) => {
      const clusterId = focusedClusterIdRef.current;
      if (clusterId && Number(d.cluster_id) !== Number(clusterId)) return 0.14;
      if (!focusedNodeId) return 1;
      return d.id === focusedNodeId ? 1 : 0.72;
    };

    const linkOpacity = (d) => {
      const clusterId = focusedClusterIdRef.current;
      if (clusterId) {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const sourceNode = filteredGraphData.nodes.find(n => n.id === sourceId);
        const targetNode = filteredGraphData.nodes.find(n => n.id === targetId);
        const inside = Number(sourceNode?.cluster_id) === Number(clusterId)
          && Number(targetNode?.cluster_id) === Number(clusterId);
        return inside ? 0.95 : 0.05;
      }
      return d.type === 'exact' || d.type === 'reprint' ? 0.85 : 0.45;
    };

    const nodes = filteredGraphData.nodes;
    const allLinks = filteredGraphData.links || [];
    const layoutLinks = allLinks.length <= 4000
      ? allLinks
      : allLinks.filter((link, index) => {
          const type = link.type || 'similar';
          if (type === 'exact' || type === 'reprint' || type === 'same_hub') return true;
          if ((link.weight || 0) >= 2) return true;
          return index % 5 === 0;
        });
    const hasLayout = nodes.some((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
    if (!hasLayout) {
      seedClusterLayout(nodes, width, height);
    } else {
      nodes.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
      });
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(layoutLinks)
        .id(d => d.id)
        .distance(d => 80 / Math.max(d.weight || 1, 0.6)))
      .force('charge', d3.forceManyBody().strength(-160).distanceMax(280).theta(1.15))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.12))
      .force('collision', d3.forceCollide().radius(d => radiusScale(d.audience || d.count || 0) + 10).iterations(1))
      .alphaDecay(0.28)
      .velocityDecay(0.45)
      .stop();
    simulationRef.current = simulation;
    
    const link = g.append('g')
      .selectAll('line')
      .data(allLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', d => linkStyle(d).color)
      .attr('stroke-opacity', 0)
      .attr('stroke-width', d => Math.max(1.2, Math.sqrt(d.weight || 1)))
      .attr('stroke-dasharray', d => linkStyle(d).dash)
      .on('mouseover', (event, d) => {
        const style = linkStyle(d);
        showLinkTooltip(event, d, style);
      })
      .on('mouseout', hideTooltip);
    
    const node = g.append('g')
      .selectAll('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('opacity', 0);

    const applyTick = () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    };

    node.call(drag(simulation));

    node.append('circle')
      .attr('r', d => hasLayout ? radiusScale(d.audience || d.count || 0) : 0)
      .attr('fill', d => color(d.type))
      .attr('stroke', d => clusterStroke(d))
      .attr('stroke-width', d => d.id === focusedNodeId ? 4 : 2.5);

    node.append('text')
      .attr('class', 'node-label')
      .attr('font-size', 10)
      .attr('dx', d => radiusScale(d.audience || d.count || 0) + 6)
      .attr('dy', 0)
      .text(d => d.label);

    node.append('text')
      .attr('class', 'node-meta')
      .attr('font-size', 9)
      .attr('fill', '#8c8c8c')
      .attr('dx', d => radiusScale(d.audience || d.count || 0) + 6)
      .attr('dy', 12)
      .text(d => [d.hubtype, d.hub].filter(Boolean)[0] || '');

    const highlight = (d) => {
      const connected = getConnectedNodes(d.id);
      node.attr('opacity', n => (connected.has(n.id) ? 1 : 0.18));
      link
        .attr('stroke-opacity', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId === d.id || targetId === d.id ? 1 : 0.08;
        })
        .attr('stroke-width', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const base = Math.max(1.2, Math.sqrt(l.weight || 1));
          return sourceId === d.id || targetId === d.id ? base + 1.4 : base;
        });
    };

    node
      .on('click', function(event, d) {
        event.preventDefault();
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        if (event.shiftKey && (d.primary_url || d.url)) {
          window.open(d.primary_url || d.url, '_blank', 'noopener,noreferrer');
          return;
        }
        clickTimerRef.current = setTimeout(() => {
          setSelectedNode(d);
          if (onNodeClick) onNodeClick(d);
          highlight(d);
          zoomToNode(d);
          clickTimerRef.current = null;
        }, 220);
      })
      .on('dblclick', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        const url = d.primary_url || d.url;
        if (!url) {
          message.warning('У узла нет ссылки на сообщение');
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('circle').attr('stroke', '#ff4d4f').attr('stroke-width', 3);
        showTooltip(event, d);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('circle')
          .attr('stroke', clusterStroke(d))
          .attr('stroke-width', d.id === focusedNodeId ? 4 : 2.5);
        hideTooltip();
      });
    
    simulation.alpha(hasLayout ? 0.08 : 0.85);
    const ticks = hasLayout ? 6 : 28;
    for (let i = 0; i < ticks; i += 1) simulation.tick();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    allLinks.forEach((item) => {
      if (typeof item.source !== 'object') item.source = byId.get(item.source) || item.source;
      if (typeof item.target !== 'object') item.target = byId.get(item.target) || item.target;
    });
    applyTick();
    simulation.on('tick', applyTick);

    const appearMs = hasLayout ? 0 : 240;
    if (appearMs) {
      node.transition().duration(appearMs).ease(d3.easeCubicOut).attr('opacity', nodeOpacity);
      link.transition().duration(appearMs).ease(d3.easeCubicOut).attr('stroke-opacity', linkOpacity);
      node.select('circle')
        .transition()
        .duration(appearMs)
        .ease(d3.easeCubicOut)
        .attr('r', d => radiusScale(d.audience || d.count || 0));
    } else {
      node.attr('opacity', nodeOpacity);
      link.attr('stroke-opacity', linkOpacity);
    }

    if (!hasLayout && !focusedClusterIdRef.current) {
      fitNodes(nodes, 56, 0);
    }
    
    function drag(simulation) {
      function dragstarted(event) {
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        if (focusedClusterIdRef.current) return;
        if (!event.active) simulation.alphaTarget(0.18).restart();
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        event.subject.x = event.x;
        event.subject.y = event.y;
        applyTick();
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0).stop();
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
    
    const tooltip = d3.select('body').select('.graph-tooltip');
    const tooltipDiv = tooltip.empty()
      ? d3.select('body').append('div')
          .attr('class', 'graph-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', 'white')
          .style('padding', '10px')
          .style('border', '1px solid #ccc')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('z-index', 1000)
      : tooltip;
    
    function showTooltip(event, d) {
      const meta = [
        d.hubtype && `Площадка: ${d.hubtype}${d.hub ? ` · ${d.hub}` : ''}`,
        d.audience ? `Аудитория: ${Number(d.audience).toLocaleString('ru-RU')}` : '',
        d.posts_count ? `Сообщений: ${d.posts_count}` : '',
        d.period_start ? `Период: ${d.period_start}${d.period_end && d.period_end !== d.period_start ? ` — ${d.period_end}` : ''}` : '',
        d.cluster_id ? `Кластер ${d.cluster_id}` : '',
      ].filter(Boolean).join('<br/>');
      tooltipDiv
        .html(`<strong>${d.label}</strong><br/>Тип: ${d.type || '—'}<br/>${meta}<br/><span style="color:#8c8c8c">Клик — карточка · двойной клик — открыть сообщение</span>`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
    }

    function showLinkTooltip(event, d, style) {
      const source = typeof d.source === 'object' ? d.source.label || d.source.id : d.source;
      const target = typeof d.target === 'object' ? d.target.label || d.target.id : d.target;
      tooltipDiv
        .html(`<strong>${style.label}</strong><br/>${source} — ${target}${d.reason ? `<br/>${d.reason}` : ''}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
    }
    
    function hideTooltip() {
      tooltipDiv.style('opacity', 0);
    }
    
    svgRef.current.zoomIn = () => svg.transition().call(zoom.scaleBy, 1.3);
    svgRef.current.zoomOut = () => svg.transition().call(zoom.scaleBy, 0.7);
    svgRef.current.resetZoom = () => svg.transition().duration(280).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity);
    svgRef.current.fitAll = () => fitNodes(filteredGraphData.nodes, 56, 240);
    svgRef.current.fitCluster = (clusterId) => {
      const members = filteredGraphData.nodes.filter(n => Number(n.cluster_id) === Number(clusterId));
      fitNodes(members.length ? members : filteredGraphData.nodes, 48, 220);
    };
    svgRef.current.stopLayout = () => simulation.stop();
    svgRef.current.zoomToNode = zoomToNode;

    if (pendingZoomRef.current) {
      const target = filteredGraphData.nodes.find(n => n.id === pendingZoomRef.current);
      pendingZoomRef.current = null;
      if (target) {
        window.setTimeout(() => zoomToNode(target, 2.2), 80);
      }
    }
  };

  const restoreOverview = () => {
    focusedClusterIdRef.current = null;
    setFocusedClusterId(null);
    setFocusedNodeId(null);
    applyClusterHighlight(null);
    if (typeof svgRef.current?.fitAll === 'function') {
      svgRef.current.fitAll();
    } else {
      svgRef.current?.resetZoom?.();
    }
  };

  const applyClusterHighlight = (clusterId) => {
    if (!svgRef.current) return;
    const root = d3.select(svgRef.current);
    root.selectAll('g.node').interrupt();
    root.selectAll('line.link').interrupt();
    root.selectAll('g.node').attr('opacity', d => (
      !clusterId || Number(d.cluster_id) === Number(clusterId) ? 1 : 0.14
    ));
    root.selectAll('line.link').attr('stroke-opacity', l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      const sourceNode = (graphData?.nodes || []).find(n => n.id === sourceId);
      const targetNode = (graphData?.nodes || []).find(n => n.id === targetId);
      if (clusterId) {
        const inside = Number(sourceNode?.cluster_id) === Number(clusterId)
          && Number(targetNode?.cluster_id) === Number(clusterId);
        return inside ? 0.95 : 0.05;
      }
      return l.type === 'exact' || l.type === 'reprint' ? 0.85 : 0.45;
    });
  };

  useEffect(() => {
    focusedClusterIdRef.current = focusedClusterId;
    applyClusterHighlight(focusedClusterId);
    if (focusedClusterId) {
      simulationRef.current?.alpha(0).stop();
      window.setTimeout(() => svgRef.current?.fitCluster?.(focusedClusterId), 20);
    }
  }, [focusedClusterId]);

  const activeCluster = clusters.find(item => Number(item.id) === Number(focusedClusterId)) || null;

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

  const handleClearFilters = () => {
    setSelectedTopics([]);
    setExcludedPhrases(new Set());
    setSearchPhrases([]);
    setSearchQuery('');
    setAuthorSearchQuery('');
    setFocusedNodeId(null);
    setFocusedClusterId(null);
    setEnabledLinkTypes(new Set(ALL_LINK_TYPES));
    setSelectedTypes(new Set(availableTypes));
    setAudienceRange(audienceMinMax);
    setPostsRange(postsMinMax);
    window.setTimeout(() => svgRef.current?.fitAll?.(), 50);
    message.success('Все фильтры сброшены');
  };

  const handleLinkTypeToggle = (type) => {
    setEnabledLinkTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) {
          message.warning('Оставьте хотя бы один тип связей');
          return prev;
        }
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const openMessage = (url) => {
    if (!url) {
      message.warning('У узла нет ссылки на сообщение');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleClusterSummary = async (clusterId) => {
    const cluster = clusters.find(item => Number(item.id) === Number(clusterId));
    if (!cluster) {
      message.warning('Кластер не найден');
      return;
    }
    const memberIds = new Set(cluster.author_ids || []);
    const nodes = (graphData?.nodes || [])
      .filter(node => memberIds.has(String(node.id)))
      .map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        hubtype: node.hubtype,
        hub: node.hub,
        audience: node.audience,
        posts_count: node.posts_count,
        period_start: node.period_start,
        period_end: node.period_end,
        cluster_id: node.cluster_id,
        topics: (node.topics || []).slice(0, 8),
        primary_url: node.primary_url || node.url || '',
        url: node.primary_url || node.url || '',
      }));
    const links = (graphData?.links || []).filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return memberIds.has(String(sourceId)) && memberIds.has(String(targetId));
    }).map(link => ({
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
      type: link.type,
      weight: link.weight,
      reason: link.reason,
    }));
    setClusterJob({ status: 'running', message: 'Запускаем сводку кластера…', progress: { percent: 6 }, clusterId });
    try {
      const response = await api.post('/graph-analysis/cluster-summary', { cluster, nodes, links });
      setClusterJob({
        status: 'running',
        jobId: response.data.job_id,
        message: response.data.message,
        progress: response.data.progress || { percent: 6 },
        clusterId,
      });
    } catch (error) {
      const detail = error.response?.data?.error || error.message;
      setClusterJob({ status: 'error', message: detail, clusterId });
      message.error(detail);
    }
  };

  useEffect(() => {
    if (!clusterJob?.jobId || clusterJob.status !== 'running') return undefined;
    const timer = setInterval(async () => {
      try {
        const response = await api.get('/graph-analysis/cluster-summary/status', {
          params: { job_id: clusterJob.jobId },
        });
        const payload = response.data || {};
        setClusterJob(prev => ({
          ...(prev || {}),
          status: payload.status,
          message: payload.message,
          progress: payload.progress,
          memo: payload.memo,
          error: payload.error,
        }));
        if (payload.status === 'done' || payload.status === 'error') {
          clearInterval(timer);
        }
      } catch (error) {
        setClusterJob(prev => ({ ...(prev || {}), status: 'error', message: error.message }));
        clearInterval(timer);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [clusterJob?.jobId, clusterJob?.status]);

  const handleAskQuestion = async (preset) => {
    const asked = String(preset || question || '').trim();
    if (!asked) {
      message.warning('Введите вопрос');
      return;
    }
    if (preset) setQuestion(asked);
    
    if (!isValidData) {
      message.error('Данные графа не загружены. Постройте граф на предыдущем шаге.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const nodes = filteredGraphData.nodes || [];
      const links = filteredGraphData.links || [];
      const edgeTypes = {};
      links.forEach((link) => {
        const type = link.type || 'similar';
        edgeTypes[type] = (edgeTypes[type] || 0) + 1;
      });
      const ranked = [...nodes]
        .sort((a, b) => (b.audience || b.posts_count || 0) - (a.audience || a.posts_count || 0))
        .slice(0, 24)
        .map((node) => ({
          id: node.id,
          label: node.label,
          type: node.type,
          hubtype: node.hubtype,
          hub: node.hub,
          audience: node.audience,
          posts_count: node.posts_count,
          cluster_id: node.cluster_id,
          topics: (node.topics || []).slice(0, 2).map((topic) => (
            typeof topic === 'string' ? topic : topic?.text
          )).filter(Boolean),
        }));
      const visibleClusters = (clusters || [])
        .map((cluster) => {
          const size = nodes.filter((node) => Number(node.cluster_id) === Number(cluster.id)).length;
          return {
            id: cluster.id,
            size,
            about: cluster.about || clusterAbout(cluster),
            topics: (cluster.topics || []).slice(0, 4),
          };
        })
        .filter((cluster) => cluster.size > 0);
      const filteredData = {
        graph: {
          nodes: ranked,
          clusters: visibleClusters,
          links: [],
        },
        statistics: {
          nodes_count: nodes.length,
          edges_count: links.length,
          original_nodes_count: graphData?.nodes?.length || 0,
          original_edges_count: graphData?.links?.length || 0,
          edge_types: edgeTypes,
        },
        metadata: {
          filtered: nodes.length !== (graphData?.nodes?.length || 0) || activeFiltersCount > 0,
          selected_topics: selectedTopics,
          excluded_phrases: Array.from(excludedPhrases),
          search_query: searchQuery,
          search_mode: searchMode,
          author_search: authorSearchQuery,
          selected_types: Array.from(selectedTypes),
          audience_range: audienceRange,
          posts_range: postsRange,
          enabled_link_types: Array.from(enabledLinkTypes),
          focused_cluster_id: focusedClusterId,
          focused_node_id: focusedNodeId,
          original_nodes_count: graphData?.nodes?.length || 0,
          filtered_nodes_count: nodes.length,
        },
      };
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: asked,
          graph_data: filteredData
        })
      });
      
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      setAiAnswer(result.answer || result.content);
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
    selectedTopics.length + 
    excludedPhrases.size + 
    (searchQuery.trim() ? 1 : 0) + 
    (authorSearchQuery.trim() ? 1 : 0) +
    (selectedTypes.size !== availableTypes.length ? 1 : 0) +
    (audienceRange[0] !== audienceMinMax[0] || audienceRange[1] !== audienceMinMax[1] ? 1 : 0) +
    (postsRange[0] !== postsMinMax[0] || postsRange[1] !== postsMinMax[1] ? 1 : 0) +
    (enabledLinkTypes.size !== ALL_LINK_TYPES.length ? 1 : 0);

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
              <strong>Клик</strong> — карточка · 
              <strong style={{ marginLeft: '8px' }}>Двойной клик</strong> — сообщение · 
              <strong style={{ marginLeft: '8px' }}>Весь граф</strong> — исходный вид
            </span>
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => {
                setQuestion((prev) => prev || 'Кто самые влиятельные авторы в текущей выборке?');
                document.getElementById('graph-ai-assistant')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              Спросить ИИ
            </Button>
          </Space>
        </div>

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
          <Space wrap>
            <span style={{ fontWeight: 'bold' }}>Типы связей:</span>
            {ALL_LINK_TYPES.map(type => {
              const style = LINK_STYLE[type];
              const on = enabledLinkTypes.has(type);
              const count = linkCounts[type];
              return (
                <Tag
                  key={type}
                  color={on ? undefined : 'default'}
                  onClick={() => handleLinkTypeToggle(type)}
                  style={{
                    cursor: 'pointer',
                    borderColor: on ? style.color : '#d9d9d9',
                    color: on ? style.color : '#8c8c8c',
                    background: on ? '#fff' : '#fafafa',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 18,
                    borderBottom: `2px ${style.dash === 'none' ? 'solid' : 'dashed'} ${on ? style.color : '#bfbfbf'}`,
                    marginRight: 6,
                    transform: 'translateY(-3px)',
                  }} />
                  {style.label}{count ? ` · ${count}` : ''}
                </Tag>
              );
            })}
          </Space>
        </div>

        {clusters.length > 0 && (
          <div className="cluster-box">
            <Space wrap>
              <span style={{ fontWeight: 'bold' }}>Кластеры:</span>
              {clusters.slice(0, 10).map(cluster => {
                const active = Number(focusedClusterId) === Number(cluster.id);
                const color = CLUSTER_COLORS[(Number(cluster.id) - 1) % CLUSTER_COLORS.length];
                const hint = [
                  clusterAbout(cluster),
                  (cluster.authors || []).slice(0, 3).join(', '),
                ].filter(Boolean).join(' · ');
                return (
                  <Tag
                    key={cluster.id}
                    color={active ? 'blue' : 'default'}
                    title={hint || `Кластер ${cluster.id}`}
                    onClick={() => {
                      if (active) {
                        restoreOverview();
                        return;
                      }
                      setFocusedNodeId(null);
                      setFocusedClusterId(cluster.id);
                    }}
                    style={{ cursor: 'pointer', borderColor: color }}
                  >
                    Кластер {cluster.id} · {cluster.size} авт.
                  </Tag>
                );
              })}
            </Space>
          </div>
        )}

        <div className="filter-bar">
          <div className="filter-search-row">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Автор"
              value={authorSearchQuery}
              onChange={(e) => setAuthorSearchQuery(e.target.value)}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Тема или фраза"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Radio.Group
              size="small"
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: 'Найти', value: 'include' },
                { label: 'Скрыть', value: 'exclude' },
              ]}
            />
            {activeFiltersCount > 0 && (
              <Button size="small" type="link" icon={<ClearOutlined />} onClick={handleClearFilters}>
                Сбросить · {activeFiltersCount}
              </Button>
            )}
          </div>

          {availableTypes.length > 0 && (
            <div className="filter-types">
              <span className="filter-label">Тип</span>
              {availableTypes.map(type => (
                <CheckableTag
                  key={type}
                  checked={selectedTypes.has(type)}
                  onChange={() => handleTypeToggle(type)}
                >
                  {type}
                </CheckableTag>
              ))}
            </div>
          )}

          <div className="filter-sliders">
            <div className="slider-wrapper">
              <div className="slider-head">
                <span className="filter-label">Аудитория</span>
                <span className="slider-values">
                  {formatReach(audienceRange[0])} — {formatReach(audienceRange[1])}
                </span>
              </div>
              <Slider
                range
                min={audienceMinMax[0]}
                max={audienceMinMax[1] || 1}
                value={audienceRange}
                onChange={setAudienceRange}
                tooltip={{ formatter: (value) => Number(value).toLocaleString('ru-RU') }}
              />
            </div>
            <div className="slider-wrapper">
              <div className="slider-head">
                <span className="filter-label">Постов</span>
                <span className="slider-values">{postsRange[0]} — {postsRange[1]}</span>
              </div>
              <Slider
                range
                min={postsMinMax[0]}
                max={postsMinMax[1] || 1}
                value={postsRange}
                onChange={setPostsRange}
              />
            </div>
          </div>

          <div className="filter-selects">
            <Select
              mode="multiple"
              allowClear
              showSearch
              maxTagCount="responsive"
              placeholder={`Тематики · ${availableTopics.length}`}
              value={selectedTopics}
              onChange={setSelectedTopics}
              options={availableTopics.map(topic => ({ value: topic, label: topic }))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        </div>
      </div>

      {/* Блок визуализации */}
      <div className="graph-section">
        <div className="graph-container">
          <svg ref={svgRef} className="graph-svg"></svg>
          <div className="zoom-controls">
            <Button size="small" icon={<ZoomInOutlined />} onClick={() => svgRef.current?.zoomIn?.()} />
            <Button size="small" icon={<ZoomOutOutlined />} onClick={() => svgRef.current?.zoomOut?.()} />
            <Button
              size="small"
              type={isZoomed || focusedClusterId ? 'primary' : 'default'}
              icon={<ExpandOutlined />}
              onClick={restoreOverview}
            >
              Весь граф
            </Button>
          </div>
          {activeCluster && (
            <aside className="cluster-card">
              <div className="cluster-card__head">
                <span
                  className="cluster-card__dot"
                  style={{ background: CLUSTER_COLORS[(Number(activeCluster.id) - 1) % CLUSTER_COLORS.length] }}
                />
                <strong>Кластер {activeCluster.id}</strong>
                <Button type="text" size="small" onClick={restoreOverview}>Весь граф</Button>
              </div>
              <p>
                {activeCluster.size} авторов · охват {formatReach(activeCluster.audience)}
              </p>
              {activeCluster.hubtypes?.length > 0 && (
                <p>
                  <span className="cluster-card__label">Площадки</span>
                  {activeCluster.hubtypes.map(item => item.name).filter(Boolean).join(', ')}
                </p>
              )}
              {clusterAbout(activeCluster) && (
                <p>
                  <span className="cluster-card__label">О чём</span>
                  {clusterAbout(activeCluster)}
                </p>
              )}
              {activeCluster.authors?.length > 0 && (
                <p>
                  <span className="cluster-card__label">Авторы</span>
                  {activeCluster.authors.slice(0, 5).join(', ')}
                </p>
              )}
              {(activeCluster.period_start || activeCluster.period_end) && (
                <p>
                  <span className="cluster-card__label">Период</span>
                  {[activeCluster.period_start, activeCluster.period_end].filter(Boolean).join(' — ')}
                </p>
              )}
              <Button
                block
                type="primary"
                loading={clusterJob?.status === 'running' && Number(clusterJob.clusterId) === Number(activeCluster.id)}
                onClick={() => handleClusterSummary(activeCluster.id)}
              >
                Описать кластер
              </Button>
              {clusterJob && Number(clusterJob.clusterId) === Number(activeCluster.id) && (
                <div className="cluster-summary">
                  {clusterJob.status === 'running' && (
                    <>
                      <Progress percent={Math.max(6, Number(clusterJob.progress?.percent) || 6)} size="small" />
                      <p>{clusterJob.message || 'Готовим сводку…'}</p>
                    </>
                  )}
                  {clusterJob.status === 'error' && (
                    <p style={{ color: '#cf1322' }}>{clusterJob.error || clusterJob.message}</p>
                  )}
                  {clusterJob.memo && (
                    <div
                      className="cluster-summary__text"
                      dangerouslySetInnerHTML={{
                        __html: formatClusterMemo(clusterJob.memo, clusterAuthorNodes(activeCluster.id)),
                      }}
                    />
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* AI Ассистент под графом */}
      <div className="bottom-section" id="graph-ai-assistant">
        <Card 
          className="ai-assistant" 
          title={
            <span>
              <QuestionCircleOutlined /> Спросить ИИ по текущей выборке
            </span>
          }
        >
          <p className="ai-filter-note">
            В запрос уйдут {filteredGraphData.nodes.length.toLocaleString('ru-RU')} узлов
            {graphData?.nodes?.length && filteredGraphData.nodes.length !== graphData.nodes.length
              ? ` из ${graphData.nodes.length.toLocaleString('ru-RU')}`
              : ''}
            {' · '}
            {filteredGraphData.links.length.toLocaleString('ru-RU')} связей
            {focusedClusterId ? ` · кластер ${focusedClusterId}` : ''}
            {activeFiltersCount ? ` · фильтров: ${activeFiltersCount}` : ''}.
          </p>
          <div className="ai-chips">
            {[
              'Кто самые влиятельные авторы в текущей выборке?',
              'Какие кластеры самые крупные и о чём они?',
              'Какие типы связей преобладают и что это значит?',
            ].map((item) => (
              <Button key={item} size="small" onClick={() => handleAskQuestion(item)}>
                {item}
              </Button>
            ))}
          </div>
          <TextArea
            rows={3}
            placeholder="Или свой вопрос: например, какие авторы связаны перепечатками?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isAnalyzing}
          />
          <Button 
            type="primary" 
            onClick={() => handleAskQuestion()}
            loading={isAnalyzing}
            style={{ marginTop: 10 }}
            size="large"
            block
          >
            {isAnalyzing ? 'Анализирую...' : 'Проанализировать данные через ИИ'}
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
            <p><strong>Тип:</strong> {selectedNode.type || '—'}</p>
            {selectedNode.hubtype && (
              <p><strong>Площадка:</strong> {selectedNode.hubtype}{selectedNode.hub ? ` · ${selectedNode.hub}` : ''}</p>
            )}
            {selectedNode.audience ? (
              <p><strong>Аудитория:</strong> {Number(selectedNode.audience).toLocaleString('ru-RU')}</p>
            ) : null}
            {selectedNode.posts_count ? (
              <p><strong>Сообщений:</strong> {selectedNode.posts_count}</p>
            ) : null}
            {(selectedNode.likes || selectedNode.views || selectedNode.comments) ? (
              <p>
                <strong>Вовлечение:</strong>{' '}
                {selectedNode.likes ? `лайки ${Number(selectedNode.likes).toLocaleString('ru-RU')}` : ''}
                {selectedNode.comments ? ` · комм. ${Number(selectedNode.comments).toLocaleString('ru-RU')}` : ''}
                {selectedNode.views ? ` · просмотры ${Number(selectedNode.views).toLocaleString('ru-RU')}` : ''}
              </p>
            ) : null}
            {selectedNode.period_start && (
              <p><strong>Период:</strong> {selectedNode.period_start}{selectedNode.period_end && selectedNode.period_end !== selectedNode.period_start ? ` — ${selectedNode.period_end}` : ''}</p>
            )}
            {(selectedNode.region || selectedNode.city) && (
              <p><strong>Гео:</strong> {[selectedNode.region, selectedNode.city].filter(Boolean).join(', ')}</p>
            )}
            {selectedNode.cluster_id ? (
              <p>
                <strong>Кластер:</strong> {selectedNode.cluster_id}
                <Button type="link" size="small" onClick={() => setFocusedClusterId(selectedNode.cluster_id)}>
                  показать на графе
                </Button>
              </p>
            ) : null}

            <Space wrap style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                disabled={!selectedNode.primary_url && !selectedNode.url}
                onClick={() => openMessage(selectedNode.primary_url || selectedNode.url)}
              >
                Открыть сообщение
              </Button>
              {selectedNode.author_url && (
                <Button icon={<ExportOutlined />} onClick={() => openMessage(selectedNode.author_url)}>
                  Профиль автора
                </Button>
              )}
              {selectedNode.cluster_id ? (
                <Button
                  loading={clusterJob?.status === 'running' && Number(clusterJob.clusterId) === Number(selectedNode.cluster_id)}
                  onClick={() => handleClusterSummary(selectedNode.cluster_id)}
                >
                  Сводка кластера
                </Button>
              ) : null}
            </Space>

            {clusterJob && Number(clusterJob.clusterId) === Number(selectedNode.cluster_id) && (
              <div className="cluster-summary">
                {clusterJob.status === 'running' && (
                  <>
                    <Progress percent={Math.max(6, Number(clusterJob.progress?.percent) || 6)} size="small" />
                    <p>{clusterJob.message || 'Готовим сводку…'}</p>
                  </>
                )}
                {clusterJob.status === 'error' && <p style={{ color: '#cf1322' }}>{clusterJob.error || clusterJob.message}</p>}
                {clusterJob.memo && (
                  <div
                    className="cluster-summary__text"
                    dangerouslySetInnerHTML={{
                      __html: formatClusterMemo(clusterJob.memo, clusterAuthorNodes(selectedNode.cluster_id)),
                    }}
                  />
                )}
              </div>
            )}
            
            {selectedNode.topics && selectedNode.topics.length > 0 && (
              <div>
                <strong>Сообщения и темы:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  {selectedNode.topics.map((topic, idx) => {
                    const text = typeof topic === 'string' ? topic : topic.text;
                    const url = typeof topic === 'string' ? null : topic.url;
                    const extra = typeof topic === 'string' ? '' : [topic.hubtype, topic.time].filter(Boolean).join(' · ');
                    return (
                      <li key={idx} style={{ marginBottom: '8px' }}>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            {text}
                          </a>
                        ) : (
                          <span>{text}</span>
                        )}
                        {extra ? <div style={{ color: '#8c8c8c', fontSize: 11 }}>{extra}</div> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default GraphVisualization;
