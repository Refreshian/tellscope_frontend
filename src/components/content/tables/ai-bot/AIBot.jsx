import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

import {
	aiFilterChannels,
	aiFilterTones,
	aiInstructionExamples,
	aiPromptPacks,
	aiTopicsData,
} from '../../../../data/aiBot.data';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../../services/other.service';
import LeftMenu from '../../../ui/left-menu/LeftMenu';
import LeftMenuActive from '../../../ui/left-menu/left-menu-active/LeftMenuActive';
import PanelTargetGraph from '../../../ui/panel-target-graph/PanelTargetGraph';
import TopicSelectorWithDelete from '../../../ui/topic-selector-with-delete/TopicSelectorWithDelete';
import Layout from '../../../layout/Layout';
import Content from '../../../content/Content';

import styles from './AIBot.module.scss';

const INSTRUCTION_EXTS = ['.txt', '.md'];
const MAX_INSTRUCTION_FILES = 4;
const MAX_INSTRUCTION_BYTES = 24 * 1024;
const MAX_INSTRUCTION_CHARS = 12000;

const toneClass = tone => {
	if (tone === 'негатив' || tone === -1 || tone === '-1') return styles.toneNeg;
	if (tone === 'позитив' || tone === 1 || tone === '1') return styles.tonePos;
	return styles.toneNeu;
};

const formatCount = value => (Number(value) || 0).toLocaleString('ru-RU');

const deepStepTitle = step => {
	if (step === 'sample') return 'Подбираем тексты';
	if (step === 'read') return 'Читаем тексты';
	if (step === 'summary') return 'Собираем сводку';
	if (step === 'done') return 'Готово';
	return 'Запускаем разбор';
};

const DeepProgressCard = ({ status, progress, message, compact }) => {
	const percent = Math.max(status === 'done' ? 100 : 4, Math.min(100, Number(progress?.percent) || 4));
	const current = Number(progress?.current) || 0;
	const total = Number(progress?.total) || 0;
	const sampled = Number(progress?.sampled) || 0;
	const running = status === 'running';
	return (
		<div className={compact ? styles.deepCard : styles.deepCardLarge}>
			<div className={styles.deepCard__head}>
				<span className={running ? styles.deepPulse : undefined}>
					{running ? 'Идёт глубокий разбор' : deepStepTitle(progress?.step)}
				</span>
				<strong>{percent}%</strong>
			</div>
			<div className={styles.deepBar} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
				<span style={{ width: `${percent}%` }} />
			</div>
			<p className={styles.deepCard__msg}>{message || 'Готовим разбор…'}</p>
			{(total > 0 || sampled > 0) && (
				<p className={styles.deepCard__meta}>
					{total > 0 ? `Пачка ${current} из ${total}` : null}
					{total > 0 && sampled > 0 ? ' · ' : null}
					{sampled > 0 ? `${formatCount(sampled)} текстов` : null}
				</p>
			)}
		</div>
	);
};

const asSourceCard = (source, index) => {
	if (source && typeof source === 'object' && !Array.isArray(source)) {
		return {
			id: source.id || index + 1,
			title: source.title || source.hub || `Источник ${index + 1}`,
			hub: source.hub || '',
			hubtype: source.hubtype || '',
			url: source.url || '',
			author: source.author || '',
			timeLabel: source.timeLabel || '',
			audienceCount: source.audienceCount || 0,
			duplicateCount: source.duplicateCount || 0,
			tone: source.tone || '',
			snippet: source.snippet || '',
			score: source.score,
		};
	}
	return {
		id: index + 1,
		title: String(source || `Источник ${index + 1}`),
		hub: String(source || ''),
		hubtype: '',
		url: '',
		author: '',
		timeLabel: '',
		audienceCount: 0,
		duplicateCount: 0,
		tone: '',
		snippet: '',
		score: null,
	};
};

const SourceCard = ({ source }) => {
	const card = asSourceCard(source, 0);
	const inner = (
		<>
			<div className={styles.sourceCard__top}>
				<span className={styles.sourceCard__id}>[{card.id}]</span>
				<strong>{card.title}</strong>
			</div>
			<div className={styles.sourceCard__meta}>
				{card.tone ? (
					<span className={`${styles.tone} ${toneClass(card.tone)}`}>{card.tone}</span>
				) : null}
				{card.hubtype ? <span>{card.hubtype}</span> : null}
				{card.hub ? <span>{card.hub}</span> : null}
				{card.timeLabel ? <span>{card.timeLabel}</span> : null}
			</div>
			{(card.audienceCount > 0 || card.duplicateCount > 0 || card.author) && (
				<div className={styles.sourceCard__meta}>
					{card.author ? <span>{card.author}</span> : null}
					{card.audienceCount > 0 ? <span>охват {formatCount(card.audienceCount)}</span> : null}
					{card.duplicateCount > 0 ? <span>дубли {formatCount(card.duplicateCount)}</span> : null}
				</div>
			)}
			{card.snippet ? <p className={styles.sourceCard__snippet}>{card.snippet}</p> : null}
		</>
	);

	if (card.url) {
		return (
			<a
				className={styles.sourceCard}
				href={card.url}
				target="_blank"
				rel="noopener noreferrer"
			>
				{inner}
			</a>
		);
	}
	return <div className={styles.sourceCard}>{inner}</div>;
};

const AIBot = () => {
	const location = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);
	const dataForRequest = useSelector(state => state.dataForRequest);

	const { data: data_getUserId } = useGetUserIdQuery();
	const { refetch: refetchFolders } = useGetUserFoldersQuery(data_getUserId);

	const [activeButton, setActiveButton] = useState('Обзор');
	const [messages, setMessages] = useState([]);
	const [inputMessage, setInputMessage] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [chatHistory, setChatHistory] = useState([]);
	const [instructionFiles, setInstructionFiles] = useState([]);
	const [instructionError, setInstructionError] = useState('');
	const [openExampleId, setOpenExampleId] = useState(null);
	const [collections, setCollections] = useState([]);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [collectionToDelete, setCollectionToDelete] = useState(null);
	const [toneFilter, setToneFilter] = useState('all');
	const [channelFilter, setChannelFilter] = useState('all');
	const [hubtypeFilter, setHubtypeFilter] = useState([]);
	const [corpus, setCorpus] = useState(null);
	const [corpusError, setCorpusError] = useState('');
	const [showDeepModal, setShowDeepModal] = useState(false);
	const [deepJobId, setDeepJobId] = useState('');
	const [deepStatus, setDeepStatus] = useState('');
	const [deepMessage, setDeepMessage] = useState('');
	const [deepMemo, setDeepMemo] = useState('');
	const [deepError, setDeepError] = useState('');
	const [deepProgress, setDeepProgress] = useState(null);
	const [deepWatch, setDeepWatch] = useState(false);

	const messagesEndRef = useRef(null);
	const chatContainerRef = useRef(null);

	useEffect(() => {
		if (location.state?.fileName) {
			setTimeout(() => refetchFolders(), 1000);
			window.history.replaceState({}, document.title);
		}
	}, [location.state, refetchFolders]);

	useEffect(() => {
		const loadCollections = async () => {
			try {
				const response = await axios.get('/api/qdrant/collections');
				const collectionsData = response.data.collections || [];
				setCollections(
					collectionsData.map((collection, index) => ({
						...collection,
						index_number: index,
					})),
				);
			} catch (error) {
				console.error('Ошибка загрузки коллекций:', error);
			}
		};
		loadCollections();
	}, []);

	const selectedDatabases =
		dataForRequest.themes_ind
			?.map(indexNumber => {
				const collection = collections.find(c => c.index_number === indexNumber);
				return collection ? collection.name : null;
			})
			.filter(Boolean) || [];

	const isTopicSelected = dataForRequest.themes_ind?.length > 0;
	const promptPack = aiPromptPacks[activeButton] || aiPromptPacks['Обзор'];

	const filtersPayload = useMemo(() => {
		const next = {};
		if (toneFilter !== 'all') next.tone = toneFilter;
		if (hubtypeFilter.length) next.hubtypes = hubtypeFilter;
		else if (channelFilter !== 'all') next.channel = channelFilter;
		return next;
	}, [toneFilter, channelFilter, hubtypeFilter]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, isLoading]);

	useEffect(() => {
		try {
			setChatHistory(JSON.parse(localStorage.getItem('aiChatHistory') || '[]'));
		} catch {
			setChatHistory([]);
		}
	}, []);

	useEffect(() => {
		if (!isTopicSelected || selectedDatabases.length === 0) {
			setCorpus(null);
			setCorpusError('');
			setHubtypeFilter([]);
			return;
		}
		let cancelled = false;
		const loadCorpus = async () => {
			try {
				const response = await axios.post('/api/ai-bot/corpus-summary', {
					selected_databases: selectedDatabases,
				});
				if (!cancelled) {
					setCorpus(response.data);
					setCorpusError(response.data?.error || '');
					setHubtypeFilter([]);
					setDeepMemo('');
					setDeepJobId('');
					setDeepStatus('');
					setDeepMessage('');
					setDeepError('');
					setDeepProgress(null);
					setDeepWatch(false);
				}
			} catch (error) {
				if (!cancelled) {
					setCorpus(null);
					setCorpusError(error.response?.data?.error || 'Не удалось загрузить сводку по теме');
				}
			}
		};
		loadCorpus();
		return () => {
			cancelled = true;
		};
	}, [isTopicSelected, selectedDatabases.join('|')]);

	useEffect(() => {
		if (!deepJobId || deepStatus !== 'running') return undefined;
		let cancelled = false;
		const tick = async () => {
			try {
				const response = await axios.get('/api/ai-bot/deep-brief', {
					params: { job_id: deepJobId },
				});
				if (cancelled) return;
				const nextStatus = response.data.status || '';
				setDeepStatus(nextStatus);
				setDeepMessage(response.data.message || '');
				if (response.data.progress) setDeepProgress(response.data.progress);
				if (nextStatus === 'done') {
					setDeepMemo(response.data.memo || '');
					setDeepError('');
				}
				if (nextStatus === 'error') {
					setDeepError(response.data.error || response.data.message || 'Разбор не удался');
				}
			} catch (error) {
				if (!cancelled) {
					setDeepStatus('error');
					setDeepError(error.response?.data?.error || error.message || 'Не удалось проверить разбор');
				}
			}
		};
		tick();
		const timer = setInterval(tick, 1500);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [deepJobId, deepStatus]);

	const handleClick = useCallback(but => {
		setActiveButton(but);
	}, []);

	const saveChatToHistory = (userMessage, botMessage) => {
		const chatSession = {
			id: Date.now(),
			date: new Date().toLocaleDateString(),
			time: new Date().toLocaleTimeString(),
			topic: activeButton,
			selectedDatabases,
			messages: [userMessage, botMessage],
		};
		setChatHistory(prev => [chatSession, ...prev].slice(0, 40));
		const existingHistory = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');
		localStorage.setItem(
			'aiChatHistory',
			JSON.stringify([chatSession, ...existingHistory].slice(0, 40)),
		);
	};

	const handleSendMessage = async (presetText) => {
		const currentQuestion = String(
			typeof presetText === 'string' ? presetText : inputMessage,
		).trim();
		if (!currentQuestion || isLoading || !isTopicSelected) return;

		const userMessage = {
			id: Date.now(),
			type: 'user',
			content: currentQuestion,
			timestamp: new Date().toLocaleTimeString(),
			topic: activeButton,
			selectedDatabases,
			files: instructionFiles.length > 0 ? instructionFiles.map(file => file.name) : null,
		};

		setMessages(prev => [...prev, userMessage]);
		setInputMessage('');
		setIsLoading(true);

		const botMessageId = Date.now() + 1;
		setMessages(prev => [
			...prev,
			{
				id: botMessageId,
				type: 'bot',
				content: '',
				timestamp: new Date().toLocaleTimeString(),
				sources: [],
				confidence: null,
				status: 'streaming',
				originalQuestion: currentQuestion,
				searchSummary: null,
				documentsAnalyzed: null,
				totalDocumentsFound: null,
				grounding: null,
				coverage: null,
				followUps: [],
				deepMemoUsed: false,
			},
		]);

		const history = messages
			.filter(msg => msg.type === 'user' || msg.type === 'bot')
			.slice(-6)
			.map(msg => ({
				role: msg.type === 'user' ? 'user' : 'assistant',
				content: msg.content,
			}));

		try {
			const response = await fetch('/api/ai-question-analysis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question: currentQuestion,
					topic: activeButton,
					selected_databases: selectedDatabases,
					userId: data_getUserId,
					folderName: dataForRequest.folder_name_html_file_request,
					filters: filtersPayload,
					history,
					deep_memo: deepMemo,
					instructions: instructionFiles.map(file => ({
						name: file.name,
						text: file.text,
					})),
				}),
			});

			if (!response.ok) {
				const errBody = await response.json().catch(() => ({}));
				throw new Error(errBody.error || `HTTP error! status: ${response.status}`);
			}

			const contentType = response.headers.get('content-type') || '';
			let data = {};

			if (contentType.includes('text/event-stream')) {
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
						if (!line.startsWith('data: ')) continue;
						const jsonStr = line.slice(6);
						if (jsonStr === '[DONE]') break;
						try {
							const event = JSON.parse(jsonStr);
							if (event.type === 'token') {
								setMessages(prev =>
									prev.map(msg =>
										msg.id === botMessageId
											? { ...msg, content: msg.content + event.content }
											: msg,
									),
								);
							} else if (event.type === 'metadata') {
								data = event;
							}
						} catch {
							/* keep stream alive */
						}
					}
				}
			} else {
				data = await response.json();
				if (data.error) throw new Error(data.error);
			}

			const finalBotMessage = {
				id: botMessageId,
				type: 'bot',
				content: data.answer || '',
				timestamp: new Date().toLocaleTimeString(),
				sources: data.sources || [],
				confidence: data.confidence || null,
				status: data.status || 'completed',
				searchSummary: data.search_summary,
				documentsAnalyzed: data.documents_analyzed,
				totalDocumentsFound: data.total_documents_found,
				grounding: data.grounding,
				followUps: data.follow_ups || [],
				coverage: data.coverage || null,
				deepMemoUsed: Boolean(data.deep_memo_used),
			};

			setMessages(prev =>
				prev.map(msg =>
					msg.id === botMessageId
						? { ...msg, ...finalBotMessage }
						: msg,
				),
			);
			saveChatToHistory(userMessage, finalBotMessage);
		} catch (error) {
			setMessages(prev =>
				prev.map(msg =>
					msg.id === botMessageId
						? {
								...msg,
								content:
									error.message ||
									'Произошла ошибка при обработке запроса. Попробуйте ещё раз.',
								isError: true,
								status: 'error',
							}
						: msg,
				),
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = e => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleInstructionFiles = async event => {
		const list = Array.from(event.target.files || []);
		event.target.value = '';
		if (!list.length) return;
		setInstructionError('');
		const next = [...instructionFiles];
		for (const file of list) {
			const lower = String(file.name || '').toLowerCase();
			if (!INSTRUCTION_EXTS.some(ext => lower.endsWith(ext))) {
				setInstructionError('Пока принимаются только .txt и .md — как инструкции к ответу, не как индекс RAG.');
				continue;
			}
			if (file.size > MAX_INSTRUCTION_BYTES) {
				setInstructionError(`«${file.name}» больше 24 КБ`);
				continue;
			}
			if (next.length >= MAX_INSTRUCTION_FILES) {
				setInstructionError('Можно прикрепить не больше 4 файлов');
				break;
			}
			try {
				let text = await file.text();
				text = String(text || '').trim();
				if (!text) {
					setInstructionError(`«${file.name}» пустой`);
					continue;
				}
				if (text.length > MAX_INSTRUCTION_CHARS) {
					text = text.slice(0, MAX_INSTRUCTION_CHARS);
				}
				next.push({ name: file.name, text });
			} catch {
				setInstructionError(`Не удалось прочитать «${file.name}»`);
			}
		}
		const joined = next.reduce((sum, item) => sum + item.text.length, 0);
		if (joined > MAX_INSTRUCTION_CHARS) {
			setInstructionError('Суммарный текст инструкций обрезан до 12 000 символов');
			let remain = MAX_INSTRUCTION_CHARS;
			setInstructionFiles(
				next
					.map(item => {
						if (remain <= 0) return null;
						const text = item.text.slice(0, remain);
						remain -= text.length;
						return { ...item, text };
					})
					.filter(Boolean),
			);
			return;
		}
		setInstructionFiles(next);
	};

	const removeInstruction = fileIndex => {
		setInstructionFiles(prev => prev.filter((_, index) => index !== fileIndex));
		setInstructionError('');
	};

	const attachExample = example => {
		setInstructionError('');
		setInstructionFiles(prev => {
			const without = prev.filter(file => file.name !== example.fileName);
			if (without.length >= MAX_INSTRUCTION_FILES) {
				setInstructionError('Можно прикрепить не больше 4 файлов');
				return prev;
			}
			return [...without, { name: example.fileName, text: example.body.trim() }];
		});
	};

	const downloadExample = example => {
		const blob = new Blob([example.body.trim() + '\n'], {
			type: 'text/markdown;charset=utf-8',
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = example.fileName;
		link.click();
		URL.revokeObjectURL(url);
	};

	const clearChat = () => {
		setMessages([]);
	};

	const loadHistorySession = session => {
		setActiveButton(session.topic || 'Обзор');
		setMessages(session.messages || []);
		setShowHistory(false);
	};

	const toggleHubtype = name => {
		setHubtypeFilter(prev =>
			prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name],
		);
	};

	const closeDeepModal = () => {
		setShowDeepModal(false);
		setDeepWatch(false);
	};

	const startDeepBrief = async () => {
		if (!isTopicSelected || deepStatus === 'running') return;
		setDeepError('');
		setDeepStatus('running');
		setDeepProgress({ step: 'start', current: 0, total: 0, percent: 4, sampled: 0 });
		setDeepMessage('Запускаем разбор…');
		setDeepWatch(true);
		try {
			const response = await axios.post('/api/ai-bot/deep-brief', {
				selected_databases: selectedDatabases,
				filters: filtersPayload,
			});
			setDeepJobId(response.data.job_id);
			setDeepMessage(response.data.message || 'Запускаем разбор…');
			if (response.data.progress) setDeepProgress(response.data.progress);
		} catch (error) {
			setDeepStatus('error');
			setDeepError(
				error.response?.data?.error || error.message || 'Не удалось запустить глубокий разбор',
			);
		}
	};

	const visibleTone = useMemo(() => {
		const empty = { negative: 0, neutral: 0, positive: 0 };
		if (!corpus) return empty;
		if (!hubtypeFilter.length) return corpus.tone || empty;
		return hubtypeFilter.reduce(
			(acc, name) => {
				const row = (corpus.hubtypes || []).find(item => item.name === name);
				const tone = row?.tone || empty;
				acc.negative += tone.negative || 0;
				acc.neutral += tone.neutral || 0;
				acc.positive += tone.positive || 0;
				return acc;
			},
			{ negative: 0, neutral: 0, positive: 0 },
		);
	}, [corpus, hubtypeFilter]);

	const visibleCount = useMemo(() => {
		if (!corpus) return 0;
		if (!hubtypeFilter.length) return corpus.count || 0;
		return hubtypeFilter.reduce((sum, name) => {
			const row = (corpus.hubtypes || []).find(item => item.name === name);
			return sum + (row?.count || 0);
		}, 0);
	}, [corpus, hubtypeFilter]);

	const toneTotal =
		(visibleTone.negative || 0) +
		(visibleTone.neutral || 0) +
		(visibleTone.positive || 0);

	const tonePct = key => {
		if (!toneTotal) return 0;
		return Math.round(((visibleTone[key] || 0) / toneTotal) * 100);
	};

	return (
		<Layout>
			{location.pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

			<Content>
				<div className={styles.block__aiBot}>
					{showDeepModal && (
						<div
							className={styles.modal__overlay}
							onClick={() => {
								if (deepStatus !== 'running') closeDeepModal();
							}}
						>
							<div className={styles.modal__content} onClick={e => e.stopPropagation()}>
								{deepStatus === 'running' ? (
									<>
										<h3>Глубокий разбор темы</h3>
										<DeepProgressCard
											status={deepStatus}
											progress={deepProgress}
											message={deepMessage}
										/>
										<div className={styles.modal__actions}>
											<button
												className={styles.modal__button_cancel}
												type="button"
												onClick={() => setShowDeepModal(false)}
											>
												Свернуть
											</button>
										</div>
									</>
								) : deepStatus === 'done' && deepMemo && deepWatch ? (
									<>
										<h3>Разбор готов</h3>
										<p>Следующие ответы будут опираться на эту сводку вместе со статистикой темы.</p>
										<div className={styles.modal__actions}>
											<button
												className={styles.modal__button_primary}
												type="button"
												onClick={closeDeepModal}
											>
												Хорошо
											</button>
										</div>
									</>
								) : deepStatus === 'error' ? (
									<>
										<h3>Не удалось выполнить разбор</h3>
										<p>{deepError || 'Попробуйте ещё раз через несколько минут.'}</p>
										<div className={styles.modal__actions}>
											<button
												className={styles.modal__button_cancel}
												type="button"
												onClick={closeDeepModal}
											>
												Закрыть
											</button>
										</div>
									</>
								) : (
									<>
										<h3>Глубокий разбор темы</h3>
										<p>
											В теме {formatCount(visibleCount)} сообщений. Разбор займёт несколько минут:
											модель пройдёт по текстам разных типов площадок и соберёт сводку для следующих ответов.
										</p>
										<div className={styles.modal__actions}>
											<button
												className={styles.modal__button_cancel}
												type="button"
												onClick={() => setShowDeepModal(false)}
											>
												Отмена
											</button>
											<button
												className={styles.modal__button_primary}
												type="button"
												onClick={startDeepBrief}
											>
												Запустить разбор
											</button>
										</div>
									</>
								)}
							</div>
						</div>
					)}
					{showDeleteConfirm && (
						<div className={styles.modal__overlay} onClick={() => setShowDeleteConfirm(false)}>
							<div className={styles.modal__content} onClick={e => e.stopPropagation()}>
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
											if (!collectionToDelete) return;
											try {
												await axios.delete(
													`/api/qdrant/collections/${collectionToDelete.name}`,
												);
												const response = await axios.get('/api/qdrant/collections');
												const collectionsData = response.data.collections || [];
												setCollections(
													collectionsData.map((collection, index) => ({
														...collection,
														index_number: index,
													})),
												);
												setShowDeleteConfirm(false);
												setCollectionToDelete(null);
											} catch (error) {
												alert(
													'Ошибка при удалении коллекции: ' +
														(error.response?.data?.error || error.message),
												);
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
								<h3 className={styles.section__title}>Тема</h3>
								<TopicSelectorWithDelete
									multi={true}
									style={{ width: '100%' }}
									onDeleteRequest={collection => {
										setCollectionToDelete(collection);
										setShowDeleteConfirm(true);
									}}
								/>
							</div>

							{isTopicSelected && (
								<div className={styles.section}>
									<h3 className={styles.section__title}>Сводка корпуса</h3>
									{corpusError && !corpus?.count ? (
										<p className={styles.hint}>{corpusError}</p>
									) : corpus ? (
										<div className={styles.corpus}>
											<div className={styles.corpus__stats}>
												<div>
													<strong>{formatCount(visibleCount)}</strong>
													<span>
														{hubtypeFilter.length
															? 'сообщений в выбранных типах'
															: 'сообщений'}
													</span>
												</div>
												<div>
													<strong>
														{corpus.period?.fromLabel || '—'}
														{corpus.period?.toLabel ? ` — ${corpus.period.toLabel}` : ''}
													</strong>
													<span>период</span>
												</div>
											</div>
											<div
												className={styles.toneBar}
												title={
													hubtypeFilter.length
														? `Тональность: ${hubtypeFilter.join(', ')}`
														: 'Тональность по всему корпусу'
												}
											>
												<span className={styles.toneNeg} style={{ width: `${tonePct('negative')}%` }} />
												<span className={styles.toneNeu} style={{ width: `${tonePct('neutral')}%` }} />
												<span className={styles.tonePos} style={{ width: `${tonePct('positive')}%` }} />
											</div>
											<div className={styles.corpus__legend}>
												<span>нег. {formatCount(visibleTone.negative)}</span>
												<span>нейтр. {formatCount(visibleTone.neutral)}</span>
												<span>поз. {formatCount(visibleTone.positive)}</span>
											</div>
											<div className={styles.pills}>
												{(corpus.hubtypes || []).map(item => {
													const active = hubtypeFilter.includes(item.name);
													return (
														<button
															key={item.name}
															type="button"
															className={`${styles.pill} ${active ? styles.pillActive : ''}`}
															onClick={() => toggleHubtype(item.name)}
														>
															{item.name} · {formatCount(item.count)}
														</button>
													);
												})}
											</div>
											<p className={styles.filterHint}>
												Нажмите тип площадки, чтобы пересчитать тональность и сузить поиск. Повторный клик снимает фильтр.
											</p>
											<button
												type="button"
												className={styles.deepButton}
												onClick={() => setShowDeepModal(true)}
												disabled={isLoading || deepStatus === 'running'}
											>
												{deepStatus === 'running'
													? 'Идёт глубокий разбор…'
													: deepMemo
														? 'Повторить глубокий разбор'
														: 'Глубокий разбор темы'}
											</button>
											{deepStatus === 'running' ? (
												<DeepProgressCard
													compact
													status={deepStatus}
													progress={deepProgress}
													message={deepMessage}
												/>
											) : null}
											{deepStatus === 'done' && deepMemo ? (
												<p className={styles.hint}>
													Глубокий разбор готов. Следующие ответы будут опираться на него.
												</p>
											) : null}
											{deepError ? <p className={styles.hint}>{deepError}</p> : null}
										</div>
									) : (
										<p className={styles.hint}>Собираем сводку по метаданным…</p>
									)}
								</div>
							)}

							<div className={styles.section}>
								<h3 className={styles.section__title}>Фильтры поиска</h3>
								<div className={styles.filterRow}>
									{aiFilterTones.map(item => (
										<button
											key={item.id}
											className={`${styles.chip} ${toneFilter === item.id ? styles.chipActive : ''}`}
											onClick={() => setToneFilter(item.id)}
											type="button"
										>
											{item.label}
										</button>
									))}
								</div>
								<div className={styles.filterRow}>
									{aiFilterChannels.map(item => (
										<button
											key={item.id}
											className={`${styles.chip} ${channelFilter === item.id ? styles.chipActive : ''}`}
											onClick={() => setChannelFilter(item.id)}
											type="button"
										>
											{item.label}
										</button>
									))}
								</div>
								<p className={styles.filterHint}>
									Фильтры ниже сужают RAG-поиск по тональности и каналу. Типы площадок в сводке тоже меняют тональность и уходят в поиск.
								</p>
							</div>

							<div className={styles.section}>
								<h3 className={styles.section__title}>Инструкции к ответу</h3>
								<label className={styles.instructionDrop}>
									<input
										type="file"
										accept=".txt,.md,text/plain,text/markdown"
										multiple
										onChange={handleInstructionFiles}
									/>
									<span>Прикрепить .txt / .md</span>
								</label>
								<p className={styles.filterHint}>
									Файл не индексируется в RAG. Текст уходит как инструкция: бриф, промпт, на что смотреть в теме.
								</p>
								<div className={styles.exampleList}>
									<p className={styles.exampleList__label}>Примеры, что можно положить в файл</p>
									{aiInstructionExamples.map(example => {
										const isOpen = openExampleId === example.id;
										const attached = instructionFiles.some(
											file => file.name === example.fileName,
										);
										return (
											<div
												key={example.id}
												className={`${styles.exampleItem} ${
													example.lens === activeButton ? styles.exampleItemActive : ''
												}`}
											>
												<button
													type="button"
													className={styles.exampleItem__toggle}
													onClick={() =>
														setOpenExampleId(isOpen ? null : example.id)
													}
												>
													<span>
														<strong>{example.title}</strong>
														<small>{example.purpose}</small>
													</span>
													<span className={styles.exampleItem__chevron}>
														{isOpen ? '−' : '+'}
													</span>
												</button>
												{isOpen && (
													<div className={styles.exampleItem__body}>
														<pre>{example.body.trim()}</pre>
														<div className={styles.exampleItem__actions}>
															<button
																type="button"
																className={`${styles.chip} ${styles.chipActive}`}
																onClick={() => attachExample(example)}
															>
																{attached ? 'Обновить в чате' : 'Подставить'}
															</button>
															<button
																type="button"
																className={styles.chip}
																onClick={() => downloadExample(example)}
															>
																Скачать {example.fileName}
															</button>
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
								{instructionError ? <p className={styles.hint}>{instructionError}</p> : null}
								{instructionFiles.length > 0 && (
									<div className={styles.instructionChips}>
										{instructionFiles.map((file, index) => (
											<span key={`${file.name}-${index}`} className={styles.chip}>
												{file.name}
												<button
													type="button"
													className={styles.remove__file}
													onClick={() => removeInstruction(index)}
												>
													×
												</button>
											</span>
										))}
									</div>
								)}
							</div>

							<div className={styles.section}>
								<button
									className={styles.history__button}
									onClick={() => setShowHistory(!showHistory)}
									type="button"
								>
									{showHistory ? 'Скрыть историю' : 'Показать историю'}
								</button>
								{showHistory && (
									<div className={styles.history__list}>
										{chatHistory.length === 0 ? (
											<p className={styles.hint}>История пуста</p>
										) : (
											chatHistory.map(session => (
												<button
													key={session.id}
													type="button"
													className={styles.history__item}
													onClick={() => loadHistorySession(session)}
												>
													<div className={styles.history__meta}>
														<span>{session.date} {session.time}</span>
														<span className={styles.history__topic}>{session.topic}</span>
													</div>
													<div className={styles.history__preview}>
														{(session.messages?.[0]?.content || '').substring(0, 90)}
													</div>
												</button>
											))
										)}
									</div>
								)}
							</div>
						</div>

						<div className={styles.chat__container}>
							<div className={styles.messages__container} ref={chatContainerRef}>
								{messages.length === 0 ? (
									<div className={styles.welcome__message}>
										<h3>Разбор темы по текстам</h3>
										<p>
											Цифры тональности и типов площадок считаются по всем сообщениям темы.
											В ответе рядом — источники по запросу.
										</p>
										{!isTopicSelected ? (
											<p className={styles.hint}>Сначала выберите тему слева</p>
										) : (
											<div className={styles.promptGrid}>
												{promptPack.map(item => (
													<button
														key={item.title}
														type="button"
														className={styles.promptCard}
														onClick={() => handleSendMessage(item.text)}
													>
														<strong>{item.title}</strong>
														<span>{item.text}</span>
													</button>
												))}
											</div>
										)}
									</div>
								) : (
									messages.map(message => (
										<div
											key={message.id}
											className={`${styles.message} ${styles[message.type]}`}
										>
											<div className={styles.message__content}>
												{message.type === 'bot' ? (
													<>
														<div className={styles.message__text}>
															{message.content ? (
																<ReactMarkdown>{message.content}</ReactMarkdown>
															) : (
																<span className={styles.hint}>Ищу фрагменты в теме…</span>
															)}
														</div>
														{message.coverage?.label || message.deepMemoUsed ? (
															<div className={styles.message__coverage}>
																{message.coverage?.label ? (
																	<strong>{message.coverage.label}</strong>
																) : null}
																{message.deepMemoUsed ? (
																	<span>Учтён глубокий разбор темы.</span>
																) : null}
															</div>
														) : null}
														{message.sources && message.sources.length > 0 && (
															<div className={styles.message__sources}>
																<strong>Источники</strong>
																<div className={styles.sourcesGrid}>
																	{message.sources.map((source, index) => (
																		<SourceCard key={`${message.id}-${index}`} source={asSourceCard(source, index)} />
																	))}
																</div>
															</div>
														)}
														{message.followUps && message.followUps.length > 0 && !isLoading && (
															<div className={styles.followUps}>
																{message.followUps.map(item => (
																	<button
																		key={item}
																		type="button"
																		className={styles.followChip}
																		onClick={() => handleSendMessage(item)}
																	>
																		{item}
																	</button>
																))}
															</div>
														)}
													</>
												) : (
													<>
														<div className={styles.message__text}>{message.content}</div>
														{message.files?.length ? (
															<div className={styles.message__files}>
																Инструкции: {message.files.join(', ')}
															</div>
														) : null}
													</>
												)}
											</div>
											<div className={styles.message__time}>{message.timestamp}</div>
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
								{messages.length === 0 && isTopicSelected ? null : (
									<div className={styles.quickRow}>
										{(promptPack || []).slice(0, 3).map(item => (
											<button
												key={item.title}
												type="button"
												className={styles.quickChip}
												disabled={!isTopicSelected || isLoading}
												onClick={() => handleSendMessage(item.text)}
											>
												{item.title}
											</button>
										))}
									</div>
								)}
								<div className={styles.input__actions}>
									<button
										className={styles.clear__button}
										onClick={clearChat}
										disabled={messages.length === 0}
										type="button"
									>
										Очистить чат
									</button>
								</div>
								<div className={styles.input__wrapper}>
									<textarea
										className={styles.message__input}
										value={inputMessage}
										onChange={e => setInputMessage(e.target.value)}
										onKeyPress={handleKeyPress}
										placeholder={
											isTopicSelected
												? 'Спросите, что в текстах: сюжеты, тональность, площадки, риски для PR…'
												: 'Сначала выберите тему для анализа'
										}
										disabled={!isTopicSelected || isLoading}
										rows={3}
									/>
									<button
										className={styles.send__button}
										onClick={() => handleSendMessage()}
										disabled={!inputMessage.trim() || !isTopicSelected || isLoading}
										type="button"
									>
										{isLoading ? '…' : 'Отправить'}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Content>
		</Layout>
	);
};

export default AIBot;
