import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import * as XLSX from 'xlsx';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import VoiceGraph from '@/components/content/graphs/voice-graphs/VoiceGraph';
import {
	applyVoiceFilters,
	emptyVoiceFilters,
	mentionCount,
	selectedList,
	sliderBounds,
	toggleVoiceFilter,
	voiceFacets,
} from '@/components/content/graphs/voice-graphs/voiceView';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import Input from '@/components/ui/fields/input/Input';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import AiAnalysisBlock from '@/components/ui/ai-analysis/AiAnalysisBlock';
import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useLazyVoiceGraphQuery } from '@/services/getGraph.service';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '../../../services/other.service';
import { useCheckAuth } from '../../../hooks/useCheckAuth';
import NoDataRequest from '../../no-data-request/NoDataRequest';

import styles from './VoiceOfCustomer.module.scss';

const DIM_TO_FILTER = { q: 'search', t: 'type', h: 'hub', s: 'tonality' };
const FILTER_TO_DIM = { search: 'q', type: 't', hub: 'h', tonality: 's' };

const facetSummary = selected => {
	const chosen = selectedList(selected);
	if (!chosen.length) return 'Все';
	if (chosen.length === 1) return chosen[0];
	return `Выбрано: ${chosen.length}`;
};

const VoiceAiAnalysis = ({
	filteredData,
	visibleMentions,
	totalMentions,
	dataForRequest,
	filters,
	ranges,
	currentNote,
}) => {
	const [showAiInput, setShowAiInput] = useState(false);
	const [aiQuery, setAiQuery] = useState('');
	const [aiAnalysis, setAiAnalysis] = useState(null);
	const [isAiLoading, setIsAiLoading] = useState(false);
	const [aiError, setAiError] = useState(null);

	const handleAiSubmit = async () => {
		if (!aiQuery.trim()) {
			setAiError('Пожалуйста, введите запрос для анализа');
			return;
		}
		setIsAiLoading(true);
		setAiAnalysis(null);
		setAiError(null);
		try {
			if (!filteredData) throw new Error('Нет отфильтрованных данных для анализа');
			const response = await fetch('/api/ai-question-voice', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question: aiQuery,
					data: { values: filteredData },
					index: dataForRequest.index,
					min_date: dataForRequest.min_date,
					max_date: dataForRequest.max_date,
					current_tab: currentNote,
					filters: { ...filters, ...ranges, filtered_mentions: visibleMentions, original_mentions: totalMentions },
				}),
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(result.error || `Ошибка запроса: ${response.status}`);
			if (result.content) setAiAnalysis(result.content);
			else if (result.response?.content) setAiAnalysis(result.response.content);
			else if (result.analysis) setAiAnalysis(result.analysis);
			else if (typeof result === 'string') setAiAnalysis(result);
			else setAiAnalysis(JSON.stringify(result, null, 2));
		} catch (error) {
			setAiError(error.message || 'Произошла ошибка при выполнении анализа.');
		} finally {
			setIsAiLoading(false);
		}
	};

	return (
		<AiAnalysisBlock
			visibleCount={visibleMentions}
			totalCount={totalMentions}
			extraNote={currentNote}
			suggestions={[
				'Какие источники дают больше всего негатива при текущем срезе?',
				'Как тип сообщения связан с тональностью?',
				'Какой путь от запроса к источнику самый объёмный?',
			]}
			showInput={showAiInput}
			onToggle={() => setShowAiInput(value => !value)}
			query={aiQuery}
			onQueryChange={setAiQuery}
			onSubmit={handleAiSubmit}
			loading={isAiLoading}
			error={aiError}
			analysis={aiAnalysis}
			loadingNode={<Loader size="small" />}
		/>
	);
};

const VoiceOfCustomer = () => {
	useCheckAuth();
	const { pathname } = useLocation();
	const { addData, addMinDate, addMaxDate, addIndex, addQueryStr } = useActions();
	const { active_menu } = useSelector(store => store.booleanValues);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { json_files_directory: dataUser } = useSelector(store => store.dataUsersSlice);

	const { data: data_getUserId, isLoading: isLoading_getUserId } = useGetUserIdQuery();
	const { data, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);

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

	const [trigger, { data: data_voice, isLoading: isLoading_voice, isSuccess: isSuccess_voice, isError: isError_voice }] =
		useLazyVoiceGraphQuery();

	const getVoiceData = useCallback(() => {
		trigger({
			...dataForRequest,
			query_str: dataForRequest.query_str || 'all',
		});
	}, [dataForRequest, trigger]);

	const [isNoData, setIsNoData] = useState(false);
	useEffect(() => {
		if (!isError_voice) return undefined;
		setIsNoData(true);
		const timer = setTimeout(() => setIsNoData(false), 5000);
		return () => clearTimeout(timer);
	}, [isError_voice]);

	const [audienceRange, setAudienceRange] = useState([0, 1]);
	const [commentsRange, setCommentsRange] = useState([0, 1]);
	const [viewsRange, setViewsRange] = useState([0, 1]);
	const [repostsRange, setRepostsRange] = useState([0, 1]);
	const [likesRange, setLikesRange] = useState([0, 1]);
	const [sliderMax, setSliderMax] = useState({
		audience: 1,
		comments: 1,
		views: 1,
		reposts: 1,
		likes: 1,
	});
	const [filters, setFilters] = useState(emptyVoiceFilters());
	const [highlightId, setHighlightId] = useState(null);

	useEffect(() => {
		if (!data_voice?.values) return;
		const bounds = sliderBounds(data_voice.values);
		setSliderMax(bounds);
		setAudienceRange([0, bounds.audience]);
		setCommentsRange([0, bounds.comments]);
		setViewsRange([0, bounds.views]);
		setRepostsRange([0, bounds.reposts]);
		setLikesRange([0, bounds.likes]);
		setFilters(emptyVoiceFilters());
		setHighlightId(null);
	}, [data_voice]);

	const ranges = useMemo(
		() => ({
			audience: audienceRange,
			comments: commentsRange,
			views: viewsRange,
			reposts: repostsRange,
			likes: likesRange,
		}),
		[audienceRange, commentsRange, viewsRange, repostsRange, likesRange],
	);

	const filteredData = useMemo(
		() => applyVoiceFilters(data_voice?.values, filters, ranges),
		[data_voice, filters, ranges],
	);
	const visibleMentions = mentionCount(filteredData);
	const totalMentions = mentionCount(data_voice?.values);
	const facets = useMemo(() => voiceFacets(data_voice?.values), [data_voice]);

	const [openFacet, setOpenFacet] = useState(null);
	const facetRowRef = useRef(null);

	useEffect(() => {
		if (!openFacet) return undefined;
		const onDoc = event => {
			if (!facetRowRef.current?.contains(event.target)) setOpenFacet(null);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpenFacet(null);
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [openFacet]);

	const toggleFilterValue = (key, value, allNames) => {
		const next = toggleVoiceFilter(filters[key], value, allNames);
		setFilters(prev => ({ ...prev, [key]: next }));
		const dim = FILTER_TO_DIM[key];
		if (dim && next.includes(value)) setHighlightId(`${dim}::${value}`);
		else setHighlightId(null);
	};

	const clearFilterKey = key => {
		setFilters(prev => ({ ...prev, [key]: [] }));
		setHighlightId(null);
	};

	const handleNodeFilter = useCallback(({ dim, value }) => {
		const key = DIM_TO_FILTER[dim];
		if (!key) return;
		setFilters(prev => ({ ...prev, [key]: toggleVoiceFilter(prev[key], value) }));
		const id = `${dim}::${value}`;
		setHighlightId(prev => (prev === id ? null : id));
	}, []);

	const handleHubFilter = useCallback(hub => {
		setFilters(prev => ({ ...prev, hub: toggleVoiceFilter(prev.hub, hub) }));
		const id = `h::${hub}`;
		setHighlightId(prev => (prev === id ? null : id));
	}, []);

	const activeNote =
		[
			...selectedList(filters.search),
			...selectedList(filters.type),
			...selectedList(filters.hub),
			...selectedList(filters.tonality),
			...selectedList(filters.author_type),
		].join(' → ') || 'Голос клиента';

	const [showTable, setShowTable] = useState(false);
	const [activeTable, setActiveTable] = useState('sources');
	const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });
	const [mentionTypeSortConfig, setMentionTypeSortConfig] = useState({
		key: 'count',
		direction: 'desc',
	});

	const handleSort = key => {
		setSortConfig(prev => ({
			key,
			direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
		}));
	};
	const handleMentionTypeSort = key => {
		setMentionTypeSortConfig(prev => ({
			key,
			direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
		}));
	};

	const filteredSourcesForTable = useMemo(() => {
		const map = new Map();
		(filteredData || []).forEach(value => {
			(value.sunkey_data || []).forEach(row => {
				if (!map.has(row.hub)) {
					map.set(row.hub, {
						source: row.hub,
						neutral: 0,
						positive: 0,
						negative: 0,
						audience: 0,
						total: 0,
					});
				}
				const prev = map.get(row.hub);
				const count = Number(row.count) || 0;
				if (row.tonality === 'Нейтрал') prev.neutral += count;
				if (row.tonality === 'Позитив') prev.positive += count;
				if (row.tonality === 'Негатив') prev.negative += count;
				prev.audience += Number(row.audienceCount) || 0;
				prev.total += count;
			});
		});
		const arr = [...map.values()];
		const dir = sortConfig.direction === 'asc' ? 1 : -1;
		return arr.sort((a, b) => ((a[sortConfig.key] || 0) - (b[sortConfig.key] || 0)) * dir);
	}, [filteredData, sortConfig]);

	const mentionTypesTable = useMemo(() => {
		const map = new Map();
		(filteredData || []).forEach(value => {
			(value.sunkey_data || []).forEach(row => {
				const key = `${row.hub}//${row.type}`;
				if (!map.has(key)) {
					map.set(key, { hub: row.hub, type: row.type, count: 0, audience: 0 });
				}
				const cur = map.get(key);
				cur.count += Number(row.count) || 0;
				cur.audience += Number(row.audienceCount) || 0;
			});
		});
		const arr = [...map.values()];
		const dir = mentionTypeSortConfig.direction === 'asc' ? 1 : -1;
		const key = mentionTypeSortConfig.key;
		return arr.sort((a, b) => {
			if (typeof a[key] === 'string') {
				return String(a[key]).localeCompare(String(b[key]), 'ru') * dir;
			}
			return ((a[key] || 0) - (b[key] || 0)) * dir;
		});
	}, [filteredData, mentionTypeSortConfig]);

	const exportSourcesTable = () => {
		const headers = ['Источник', 'Нейтральные', 'Позитивные', 'Негативные', 'Аудитория', 'Всего'];
		const rows = filteredSourcesForTable.map(row => [
			row.source,
			row.neutral,
			row.positive,
			row.negative,
			row.audience,
			row.total,
		]);
		const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
		const book = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(book, sheet, 'Источники');
		XLSX.writeFile(book, 'Источники_упоминаний.xlsx');
	};

	const exportMentionTypesTable = () => {
		const headers = ['Источник', 'Тип упоминания', 'Кол-во', 'Аудитория'];
		const rows = mentionTypesTable.map(row => [row.hub, row.type, row.count, row.audience]);
		const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
		const book = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(book, sheet, 'Типы упоминаний');
		XLSX.writeFile(book, 'Типы_упоминаний.xlsx');
	};

	const selectFilter = (label, key, options) => {
		const chosen = selectedList(filters[key]);
		const allNames = options.map(item => item.name);
		const allChecked = chosen.length === 0;
		return (
			<div className={styles.facet}>
				<span>{label}</span>
				<div className={styles.facetMenu}>
					<button
						type="button"
						className={styles.facetToggle}
						aria-expanded={openFacet === key}
						onClick={() => setOpenFacet(prev => (prev === key ? null : key))}
					>
						<span className={styles.facetToggleText}>{facetSummary(chosen)}</span>
						<span className={styles.facetArrow} aria-hidden>
							▾
						</span>
					</button>
					{openFacet === key && (
						<div className={styles.facetDropdown} role="group" aria-label={label}>
							<label className={styles.facetOption}>
								<input
									type="checkbox"
									checked={allChecked}
									onChange={() => clearFilterKey(key)}
								/>
								<span>Все</span>
							</label>
							{options.map(item => (
								<label key={item.name} className={styles.facetOption}>
									<input
										type="checkbox"
										checked={chosen.includes(item.name)}
										onChange={() => toggleFilterValue(key, item.name, allNames)}
									/>
									<span>
										{item.name} ({Number(item.count).toLocaleString('ru-RU')})
									</span>
								</label>
							))}
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<Layout>
			{(isLoading || isLoading_getUserId || isLoading_voice) && (
				<>
					<BackgroundLoader />
					<Loader />
				</>
			)}
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content alignStart={Boolean(isSuccess_voice)}>
				<div className={styles.block__pageName} style={!isSuccess_voice ? { alignSelf: 'center', textAlign: 'center', width: 'auto' } : {}}>
					{isSuccess_voice ? (
						<h3 className={styles.pageName__title}>Голос клиента</h3>
					) : (
						<BeforeSearch
							title="Голос клиента"
							link="https://tsdoc.headsmade.com/en/voice-of-customer"
						/>
					)}
				</div>
				<div className={styles.block__configureSearch} style={!isSuccess_voice ? { alignSelf: 'center', justifyContent: 'center', width: 'auto' } : {}}>
					{isSuccess && dataUser && Object.keys(dataUser).length > 0 && <DataForSearch />}
					{isSuccess && dataForRequest.index !== null && dataUser && Object.keys(dataUser).length > 0 && (
						<CustomCalendar />
					)}
					<Input
						placeholder="Поиск по тексту"
						styleInput={{
							width: 'auto',
							height: 'calc(56/1440*100vw)',
							borderRadius: 'calc(12/1440*100vw)',
							marginRight: '10px',
							marginLeft: 10,
						}}
						styleLabel={{ display: 'none' }}
						onChange={event => addQueryStr(event.target.value)}
						value={dataForRequest.query_str || ''}
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
						<div className={styles.slidersContainer}>
							<div className={styles.sliderWrapper}>
								<label>Аудитория:</label>
								<Slider range min={0} max={sliderMax.audience} value={audienceRange} onChange={setAudienceRange} />
								<div className={styles.sliderValues}>
									<span>{audienceRange[0]}</span> - <span>{audienceRange[1].toLocaleString('ru-RU')}</span>
								</div>
							</div>
							<div className={styles.sliderWrapper}>
								<label>Комментариев:</label>
								<Slider range min={0} max={sliderMax.comments} value={commentsRange} onChange={setCommentsRange} />
								<div className={styles.sliderValues}>
									<span>{commentsRange[0]}</span> - <span>{commentsRange[1].toLocaleString('ru-RU')}</span>
								</div>
							</div>
							<div className={styles.sliderWrapper}>
								<label>Просмотров:</label>
								<Slider range min={0} max={sliderMax.views} value={viewsRange} onChange={setViewsRange} />
								<div className={styles.sliderValues}>
									<span>{viewsRange[0]}</span> - <span>{viewsRange[1].toLocaleString('ru-RU')}</span>
								</div>
							</div>
							<div className={styles.sliderWrapper}>
								<label>Репостов:</label>
								<Slider range min={0} max={sliderMax.reposts} value={repostsRange} onChange={setRepostsRange} />
								<div className={styles.sliderValues}>
									<span>{repostsRange[0]}</span> - <span>{repostsRange[1].toLocaleString('ru-RU')}</span>
								</div>
							</div>
							<div className={styles.sliderWrapper}>
								<label>Лайков:</label>
								<Slider range min={0} max={sliderMax.likes} value={likesRange} onChange={setLikesRange} />
								<div className={styles.sliderValues}>
									<span>{likesRange[0]}</span> - <span>{likesRange[1].toLocaleString('ru-RU')}</span>
								</div>
							</div>
						</div>

						<div className={styles.facetRow} ref={facetRowRef}>
							{selectFilter('Запрос', 'search', facets.searches)}
							{selectFilter('Тип сообщения', 'type', facets.types)}
							{selectFilter('Источник', 'hub', facets.hubs)}
							{selectFilter('Тональность', 'tonality', facets.tonalities)}
							{facets.authorTypes.length > 1 && selectFilter('Тип автора', 'author_type', facets.authorTypes)}
							<button type="button" className={styles.resetSlice} onClick={() => { setFilters(emptyVoiceFilters()); setHighlightId(null); }}>
								Сбросить срез
							</button>
						</div>
						<div className={styles.filterInfo}>
							Текущий срез: <b>{visibleMentions.toLocaleString('ru-RU')}</b> упоминаний из{' '}
							<b>{totalMentions.toLocaleString('ru-RU')}</b>
							{activeNote !== 'Голос клиента' ? <> · {activeNote}</> : null}
						</div>

						<Suspense fallback={<Loader />}>
							<VoiceGraph
								voiceData={filteredData}
								onNodeFilter={handleNodeFilter}
								onHubFilter={handleHubFilter}
								highlightId={highlightId}
							/>
						</Suspense>

						<VoiceAiAnalysis
							filteredData={filteredData}
							visibleMentions={visibleMentions}
							totalMentions={totalMentions}
							dataForRequest={dataForRequest}
							filters={filters}
							ranges={ranges}
							currentNote={activeNote}
						/>

						<div className={styles.tableSection}>
							<div className={styles.tableToggleHeader} onClick={() => setShowTable(!showTable)}>
								<div className={styles.toggleTitle}>
									<span>Таблицы данных</span>
								</div>
								<div className={styles.toggleStatus}>{showTable ? 'Скрыть' : 'Показать'}</div>
							</div>
							{showTable && (
								<div className={styles.tableControls}>
									<div className={styles.tableTabs}>
										<button
											type="button"
											className={`${styles.tabButton} ${activeTable === 'sources' ? styles.activeTab : ''}`}
											onClick={() => setActiveTable('sources')}
										>
											Источники
										</button>
										<button
											type="button"
											className={`${styles.tabButton} ${activeTable === 'mention_types' ? styles.activeTab : ''}`}
											onClick={() => setActiveTable('mention_types')}
										>
											Типы упоминаний
										</button>
									</div>
									<button
										type="button"
										className={styles.exportButton}
										onClick={activeTable === 'sources' ? exportSourcesTable : exportMentionTypesTable}
									>
										Выгрузить таблицу
									</button>
									<div className={styles.tableWrapper}>
										{activeTable === 'sources' ? (
											<table className={styles.dataTable}>
												<thead>
													<tr>
														<th>Источник</th>
														<th className={styles.sortableHeader} onClick={() => handleSort('neutral')}>Нейтральные</th>
														<th className={styles.sortableHeader} onClick={() => handleSort('positive')}>Позитивные</th>
														<th className={styles.sortableHeader} onClick={() => handleSort('negative')}>Негативные</th>
														<th className={styles.sortableHeader} onClick={() => handleSort('audience')}>Аудитория</th>
														<th className={styles.sortableHeader} onClick={() => handleSort('total')}>Всего</th>
													</tr>
												</thead>
												<tbody>
													{filteredSourcesForTable.map(source => (
														<tr key={source.source}>
															<td>{source.source}</td>
															<td>{source.neutral}</td>
															<td>{source.positive}</td>
															<td>{source.negative}</td>
															<td>{source.audience.toLocaleString('ru-RU')}</td>
															<td>{source.total}</td>
														</tr>
													))}
												</tbody>
											</table>
										) : (
											<table className={styles.dataTable}>
												<thead>
													<tr>
														<th>Источник</th>
														<th>Тип упоминания</th>
														<th className={styles.sortableHeader} onClick={() => handleMentionTypeSort('count')}>Количество</th>
														<th className={styles.sortableHeader} onClick={() => handleMentionTypeSort('audience')}>Аудитория</th>
													</tr>
												</thead>
												<tbody>
													{mentionTypesTable.map(row => (
														<tr key={`${row.hub}-${row.type}`}>
															<td>{row.hub}</td>
															<td>{row.type}</td>
															<td>{row.count}</td>
															<td>{row.audience.toLocaleString('ru-RU')}</td>
														</tr>
													))}
												</tbody>
											</table>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</Content>
		</Layout>
	);
};

export default VoiceOfCustomer;
