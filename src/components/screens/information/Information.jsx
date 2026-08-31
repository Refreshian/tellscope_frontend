import React, {
	Suspense,
	useCallback,
	useEffect,
	useState,
	useMemo
} from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import * as XLSX from 'xlsx';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import InformationGraphs from '@/components/content/graphs/information-graphs/InformationGraphs';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import AdditionalParameters from '@/components/ui/additional-parameters/AdditionalParameters';
import Button from '@/components/ui/button/Button';
import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import Input from '@/components/ui/fields/input/Input';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import NoDataRequest from '@/components/no-data-request/NoDataRequest';
import QueryStringHelp from '@/components/ui/query-string-help/QueryStringHelp';

import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '@/services/other.service';
import { useLazyInformationGraphQuery } from '@/services/getGraph.service';

import styles from './Information.module.scss';

const Information = () => {
	useCheckAuth();
	const { pathname } = useLocation();
	const { addData, addMinDate, addMaxDate, addIndex, addQueryStr } = useActions();
	const { active_menu } = useSelector((store) => store.booleanValues);
	const { json_files_directory: dataUser } = useSelector((store) => store.dataUsersSlice);
	const dataForRequest = useSelector((state) => state.dataForRequest);

	const {
		data: data_getUserId,
	} = useGetUserIdQuery();
	const {
		data,
		isError,
		isLoading,
		isSuccess,
	} = useGetUserFoldersQuery(data_getUserId);

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

	const [
		trigger,
		{
			data: data_information,
			isLoading: isLoading_information,
			isSuccess: isSuccess_information,
			isError: isError_information,
		},
	] = useLazyInformationGraphQuery();

	const [externalNoData, setExternalNoData] = useState(false);

	useEffect(() => {
		if (isError_information) {
			setExternalNoData(true);
			const timer = setTimeout(() => setExternalNoData(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [isError_information]);

	const [audienceRange, setAudienceRange] = useState([0, 10000]);
	const [repostsRange, setRepostsRange] = useState([0, 10]);
	const [erRange, setErRange] = useState([0, 10]);
	const [viewsCountRange, setViewsCountRange] = useState([0, 10000]);

	// Установка максимальных значений для фильтров по полученным данным
	useEffect(() => {
		if (data_information && data_information.values && data_information.values.length > 0) {
			const maxAudience = Math.max(...data_information.values.map(
				item => Number(item.author.audienceCount) || 0
			));
			const maxReposts = Math.max(...data_information.values.map(
				item => item.reposts ? item.reposts.length : 0
			));
			const maxER = Math.max(...data_information.values.map(
				item => Number(item.author.er) || 0
			));
			const maxViews = Math.max(...data_information.values.map(
				item => Number(item.author.viewsCount) || 0
			));
			setAudienceRange([0, Math.ceil(maxAudience * 1.1) || 10]);
			setRepostsRange([0, Math.ceil(maxReposts * 1.1) || 10]);
			setErRange([0, Math.ceil(maxER * 1.1) || 10]);
			setViewsCountRange([0, Math.ceil(maxViews * 1.1) || 10]);
		}
	}, [data_information]);

	const [initOnce, setInitOnce] = useState(false);

	// Для инициализации фильтров при первом получении данных
	useEffect(() => {
		if (
			data_information &&
			data_information.values &&
			data_information.values.length > 0 &&
			!initOnce
		) {
			const maxAudience = Math.max(...data_information.values.map(item => Number(item.author.audienceCount) || 0));
			const maxReposts = Math.max(...data_information.values.map(item => (item.reposts ? item.reposts.length : 0) ));
			const maxER = Math.max(...data_information.values.map(item => Number(item.author.er) || 0));
			const maxViews = Math.max(...data_information.values.map(item => Number(item.author.viewsCount) || 0));
			setAudienceRange([0, Math.ceil(maxAudience * 1.1) || 10]);
			setRepostsRange([0, Math.ceil(maxReposts * 1.1) || 10]);
			setErRange([0, Math.ceil(maxER * 1.1) || 10]);
			setViewsCountRange([0, Math.ceil(maxViews * 1.1) || 10]);
			setInitOnce(true);
		}
	}, [data_information, initOnce]);

	const getInformationData = useCallback(() => {
		trigger(dataForRequest);
	}, [dataForRequest, trigger]);

	const onChange = (e) => {
		addQueryStr(e.target.value);
	};

	// ===================
	//  FILTERING
	// ===================
	const filteredData = useMemo(() => {
		if (!data_information || !data_information.values)
			return null;

		const passesFilter = (item) => {
			const engagementRate = Number(item.er) || 0;
			const views = Number(item.viewsCount) || 0;
			const audience = Number(item.audienceCount) || 0;
			const [minER, maxER] = erRange;
			const [minViews, maxViews] = viewsCountRange;
			const [minAudience, maxAudience] = audienceRange;
			return engagementRate >= minER &&
				engagementRate <= maxER &&
				views >= minViews &&
				views <= maxViews &&
				audience >= minAudience &&
				audience <= maxAudience;
		};

		const filteredValues = data_information.values.map(item => {
			const mainPassesFilter = passesFilter(item.author);
			if (!mainPassesFilter && item.reposts && item.reposts.length > 0) {
				const filteredReposts = item.reposts.filter(repost => passesFilter(repost));
				if (filteredReposts.length > 0) {
					return { ...item, reposts: filteredReposts };
				}
				return null;
			}
			if (mainPassesFilter) {
				const filteredReposts = item.reposts ? item.reposts.filter(passesFilter) : [];
				return { ...item, reposts: filteredReposts };
			}
			return null;
		}).filter(Boolean);

		return { ...data_information, values: filteredValues };
	}, [data_information, erRange, audienceRange, viewsCountRange, repostsRange]);

	// ===================
	//   AI-ANALYSIS
	// ===================
	const [showAiInput, setShowAiInput] = useState(false);
	const [aiQuery, setAiQuery] = useState('');
	const [isAiLoading, setIsAiLoading] = useState(false);
	const [aiAnalysis, setAiAnalysis] = useState(null);
	const [aiError, setAiError] = useState(null);
	const [searchInTexts, setSearchInTexts] = useState(false);

	const handleAiSubmit = async () => {
		if (!aiQuery.trim()) {
			setAiError('Пожалуйста, введите запрос для анализа');
			return;
		}
		setIsAiLoading(true);
		setAiAnalysis(null);
		setAiError(null);

		try {
			if (!filteredData || !filteredData.values)
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

			const response = await fetch('/api/ai-question-information-graph', {
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

	// ===============
	//  TABLE & EXPORT
	// ===============
	const [showTable, setShowTable] = useState(false);
	const [sortConfig, setSortConfig] = useState({ key: 'audience', direction: 'desc' });

	const handleSort = (key) => {
		let direction = 'desc';
		if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
		setSortConfig({ key, direction });
	};

	// FLATTENED data for table (each row = один текст, не важно репост или нет)
	const flattenedTableData = useMemo(() => {
		if (!filteredData || !filteredData.values) return [];
		let result = [];
		filteredData.values.forEach((item) => {
			// основной текст
			result.push({
				...item.author,
				repostCount: item.reposts ? item.reposts.length : 0,
				type: 'original',
				rootAuthor: item.author.fullname,
				rootUrl: item.author.url, // добавим rootUrl для возможного дальнейшего использования
			});
			// репосты
			if (item.reposts && Array.isArray(item.reposts) && item.reposts.length > 0) {
				item.reposts.forEach((repost) => {
					result.push({ 
						...repost,
						repostCount: '',
						type: 'repost',
						rootAuthor: item.author.fullname,
						rootUrl: item.author.url, // вот тут понадобится!
					});
				});
			}
		});
		return result;
	}, [filteredData]);

	const sortedTableData = useMemo(() => {
	const dataCopy = [...flattenedTableData];
	dataCopy.sort((a, b) => {
		let valA, valB;
		switch (sortConfig.key) {
		case 'audience':
			valA = Number(a.audienceCount) || 0;
			valB = Number(b.audienceCount) || 0;
			break;
		case 'reposts':
			valA = Number(a.repostCount) || 0;
			valB = Number(b.repostCount) || 0;
			break;
		case 'er':
			valA = Number(a.er) || 0;
			valB = Number(b.er) || 0;
			break;
		case 'viewsCount':
			valA = Number(a.viewsCount) || 0;
			valB = Number(b.viewsCount) || 0;
			break;
		default:
			return 0;
		}
		if (valA < valB) return sortConfig.direction === 'desc' ? 1 : -1;
		if (valA > valB) return sortConfig.direction === 'desc' ? -1 : 1;
		return 0;
	});
	return dataCopy;
	}, [flattenedTableData, sortConfig]);

	const exportTable = () => {
	if (!sortedTableData.length) return;
	const worksheetData = [
		['Имя', 'Тип профиля', 'Источник', 'Пол', 'Возраст', 'Аудитория', 'Репосты (только для оригинала)', 'Вовлеченность (ER)', 'Просмотры', 'URL', 'Тип', 'Оригинальный автор'],
	];

	sortedTableData.forEach((author) => {
		worksheetData.push([
		author.fullname,
		author.author_type,
		author.hub,
		author.sex,
		author.age || '-',
		author.audienceCount,
		author.repostCount !== undefined ? author.repostCount : '',
		author.er || 0,
		author.viewsCount || 0,
		author.url,
		author.type === 'repost' ? 'репост' : 'оригинал',
		author.rootAuthor,
		]);
	});
	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Данные');
	XLSX.writeFile(workbook, 'Информационный граф.xlsx');
	};

	const countTotalMessages = (data) => {
		if (!data || !data.values) return 0;
		let count = data.values.length;
		for (const item of data.values) {
			if (item.reposts && Array.isArray(item.reposts))
				count += item.reposts.length;
		}
		return count;
	};

	useEffect(() => {
		console.log('sortedTableData актуально:', sortedTableData);
		if (sortedTableData.length > 0) {
		  console.log('Поля первого автора:', sortedTableData[0].author);
		}
	}, [sortedTableData]);

	return ( 
		<Layout>
			{(isLoading || isLoading_information) && (
				<>
					<BackgroundLoader />
					<Loader />
				</>
			)}
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>
				<div className={styles.stickyTop}>
				<div className={styles.block__pageName} style={isSuccess_information ? {} : { alignSelf: 'center' }}>
					{isSuccess_information ? (
					<>
						<h3 className={styles.pageName__title}>Информационный граф</h3>
						<p>
						{data_information && data_information.num_messages
							? `${data_information.num_messages} текста(ов) и ${data_information.num_unique_authors} автора(ов)`
							: ''}
						</p>
					</>
					) : (
					<BeforeSearch
						title="Информационный граф"
						link="https://tsdoc.headsmade.com/en/information-graf"
					/>
					)}
				</div>
				<div className={styles.topControls}>
					{isSuccess &&
					Object.keys(dataUser ? dataUser : {}).length > 0 && (
						<DataForSearch multi={false} 
						style={{ width: "217px", minWidth: "180px", maxWidth: "260px" }}/>
					)}
					{isSuccess &&
					dataForRequest.index !== null &&
					Object.keys(dataUser ? dataUser : {}).length > 0 && (
						<CustomCalendar />
					)}
					<Input
					placeholder="Поиск по тексту"
					styleInput={{
						width: 'calc(281/1440*100vw)',
						height: 'calc(55.9/1440*100vw)',
						borderRadius: 'calc(8/1440*100vw)',
					}}
					styleLabel={{ display: 'none' }}
					onChange={onChange}
					value={
						dataForRequest.query_str === null
						? ''
						: dataForRequest.query_str
					}
					/>
					<Button
					style={{
						width: 'calc(220/1440*100vw)',
						height: 'calc(56/1440*100vw)',
					}}
					onClick={getInformationData}
					>
					Запуск
					</Button>
				</div>
				</div>

				{externalNoData && <NoDataRequest />}

				{isSuccess_information && (
					<div className={styles.scrollableResults}>
						{/* Ползунки фильтрации */}
						<div className={styles.slidersContainer}>
							<div className={styles.sliderRow}>
								<div className={styles.sliderWrapper}>
									<label>Аудитория:</label>
									<Slider range min={0} max={audienceRange[1]} value={audienceRange} onChange={setAudienceRange} />
									<div className={styles.sliderValues}>
										<span>{audienceRange[0]}</span> - <span>{audienceRange[1]}</span>
									</div>
								</div>
								<div className={styles.sliderWrapper}>
									<label>Репосты:</label>
									<Slider range min={0} max={repostsRange[1]} value={repostsRange} onChange={setRepostsRange} />
									<div className={styles.sliderValues}>
										<span>{repostsRange[0]}</span> - <span>{repostsRange[1]}</span>
									</div>
								</div>
								<div className={styles.sliderWrapper}>
									<label>Вовлеченность (ER):</label>
									<Slider range min={0} max={erRange[1]} value={erRange} onChange={setErRange} />
									<div className={styles.sliderValues}>
										<span>{erRange[0]}</span> - <span>{erRange[1]}</span>
									</div>
								</div>
								<div className={styles.sliderWrapper}>
									<label>Просмотры:</label>
									<Slider range min={0} max={viewsCountRange[1]} value={viewsCountRange} onChange={setViewsCountRange} />
									<div className={styles.sliderValues}>
										<span>{viewsCountRange[0]}</span> - <span>{viewsCountRange[1]}</span>
									</div>
								</div>
							</div>
						</div>

						{/* Информация о количестве упоминаний */}
						<div className={styles.filterInfo}>
							Текущие фильтры содержат <b>{countTotalMessages(filteredData) || 0}</b>
							&nbsp;упоминаний из <b>{countTotalMessages(data_information) || 0}</b>
						</div>

						{/* Контейнер для графика с ограничением высоты */}
						<div className={styles.graphContainer}>
							<Suspense fallback={<Loader />}>
								<InformationGraphs data={filteredData || { values: [] }} />
							</Suspense>
						</div>

						{/* Блок ИИ-анализа */}
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

						{/* Таблица */}
						<div className={styles.tableSection}>
							<button
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
										<path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									<span>Таблица авторов</span>
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
													<th>Имя</th>
													<th>Тип профиля</th>
													<th>Источник</th>
													<th>Пол</th>
													<th>Возраст</th>
													<th onClick={() => handleSort('audience')} className={styles.sortableHeader}>
														Аудитория
														{sortConfig.key === 'audience' && (
															<span className={styles.sortIcon}>
																{sortConfig.direction === 'desc' ? '↓' : '↑'}
															</span>
														)}
													</th>
													<th onClick={() => handleSort('reposts')} className={styles.sortableHeader}>
														Репосты
														{sortConfig.key === 'reposts' && (
															<span className={styles.sortIcon}>
																{sortConfig.direction === 'desc' ? '↓' : '↑'}
															</span>
														)}
													</th>
													<th onClick={() => handleSort('er')} className={styles.sortableHeader}>
														Вовлеченность (ER)
														{sortConfig.key === 'er' && (
															<span className={styles.sortIcon}>
																{sortConfig.direction === 'desc' ? '↓' : '↑'}
															</span>
														)}
													</th>
													<th onClick={() => handleSort('viewsCount')} className={styles.sortableHeader}>
														Просмотры
														{sortConfig.key === 'viewsCount' && (
															<span className={styles.sortIcon}>
																{sortConfig.direction === 'desc' ? '↓' : '↑'}
															</span>
														)}
													</th>
													<th>URL</th>
												</tr>
											</thead>
												<tbody>
												{sortedTableData.map((author, index) => (
												<tr key={`${author.fullname}-${author.url}-${index}`} className={author.type === 'repost' ? styles.repostRow : ''}>
													<td>
													{author.fullname}
													{author.type === 'repost' && author.rootUrl && (
														<>
														&nbsp;(
														<a
															href={author.rootUrl}
															target="_blank"
															rel="noopener noreferrer"
															style={{ color: 'gray', fontSize: 12, textDecoration: 'underline' }}
														>
															репост от {author.rootAuthor}
														</a>
														)
														</>
													)} 
													</td>
													<td>{author.author_type}</td>
													<td>{author.hub}</td>
													<td>{author.sex || '-'}</td>
													<td>{author.age || '-'}</td>
													<td>{author.audienceCount}</td>
													<td>{author.repostCount !== undefined ? author.repostCount : ''}</td>
													<td>{author.er || 0}</td>
													<td>{author.viewsCount || 0}</td>
													<td className={styles.textCell}>
													<a href={author.url} target="_blank" rel="noopener noreferrer">{author.url}</a>
													</td>
												</tr>
												))}
												</tbody>
										</table>
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

export default Information;