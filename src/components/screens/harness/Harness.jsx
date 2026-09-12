import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Content from '@/components/content/Content';
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

import { $axios } from '@/api';
import styles from './Harness.module.scss';

const EXAMPLES = [
	'Отчёт по подтеме «просрочка»: тональность, авторы, цепочки, негатив и позитив, выводы',
	'Мониторинг негатива по доставке за неделю: где горит и что делать',
	'Сравни упоминания бренда и конкурентов, предложи, что поправить в коммуникации',
];

const fmtDate = value => {
	if (value === null || value === undefined || value === '') return '';
	const text = String(value);
	if (/^\d+$/.test(text)) {
		const number = Number(text);
		const date = new Date(text.length > 10 ? number : number * 1000);
		return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU');
	}
	return text;
};

const Harness = () => {
	useCheckAuth();

	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { addData, addMinDate, addMaxDate, addIndex } = useActions();
	const { active_menu } = useSelector(store => store.booleanValues);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { json_files_directory: dataUser } = useSelector(state => state.dataUsersSlice);

	const { data: data_getUserId } = useGetUserFoldersQuery();
	const { data, isError, isLoading, isSuccess } = useGetUserFoldersQuery(data_getUserId);

	const [info, setInfo] = useState(null);
	const [tasks, setTasks] = useState([]);
	const [current, setCurrent] = useState(null);
	const [text, setText] = useState('');
	const [mode, setMode] = useState('explain');
	const [model, setModel] = useState('deepseek');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const [notice, setNotice] = useState(null);
	const [events, setEvents] = useState([]);
	const [showData, setShowData] = useState(false);
	const [showAllTasks, setShowAllTasks] = useState(false);
	const pollRef = useRef(null);
	const resultRef = useRef(null);

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

	const datasetChosen = dataForRequest.index !== null && dataForRequest.index !== undefined;

	useEffect(() => {
		setShowData(!datasetChosen);
		// раскрываем выбор данных, только если набор ещё не выбран
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadTasks = useCallback(async () => {
		try {
			const { data: payload } = await $axios.get('/harness/tasks');
			setTasks(payload.tasks || []);
		} catch (err) {
			/* список задач не критичен */
		}
	}, []);

	const loadInfo = useCallback(async () => {
		try {
			const { data: payload } = await $axios.get('/harness/info');
			setInfo(payload);
			if (payload.default_model) setModel(payload.default_model);
		} catch (err) {
			setError(err.response?.data?.detail || 'Не удалось загрузить возможности ассистента');
		}
	}, []);

	useEffect(() => {
		loadInfo();
		loadTasks();
	}, [loadInfo, loadTasks]);

	useEffect(() => () => clearInterval(pollRef.current), []);

	const watchRun = useCallback(
		runId => {
			clearInterval(pollRef.current);
			setEvents([]);
			pollRef.current = setInterval(async () => {
				try {
					const { data: run } = await $axios.get(`/agent/run/${runId}`);
					setEvents((run.events || []).slice(-70));
					setCurrent(prev => (prev ? { ...prev, run } : prev));
					if (['completed', 'failed'].includes(run.status)) {
						clearInterval(pollRef.current);
						pollRef.current = null;
						setBusy(false);
						await loadTasks();
					}
				} catch (err) {
					clearInterval(pollRef.current);
					pollRef.current = null;
					setBusy(false);
				}
			}, 3000);
		},
		[loadTasks]
	);

	const submit = useCallback(
		async (overrideText, overrideMode) => {
			const query = (overrideText ?? text).trim();
			const chosenMode = overrideMode || mode;
			if (!query) {
				setError('Опишите задачу обычными словами');
				return;
			}
			if (chosenMode !== 'explain' && !datasetChosen) {
				setError('Сначала выберите набор данных и период');
				setShowData(true);
				return;
			}
			setBusy(true);
			setError(null);
			setNotice(null);
			setCurrent(null);
			setEvents([]);
			try {
				const { data: payload } = await $axios.post('/harness/task', {
					text: query,
					mode: chosenMode,
					index: dataForRequest.index,
					min_date: dataForRequest.min_date,
					max_date: dataForRequest.max_date,
					model,
				});
				setCurrent(payload.task);
				if (payload.run_id) {
					setNotice('Задача выполняется — журнал шагов обновляется ниже');
					watchRun(payload.run_id);
				} else {
					setBusy(false);
					setNotice('Готово');
				}
				await loadTasks();
				setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
			} catch (err) {
				setBusy(false);
				setError(err.response?.data?.detail || 'Не удалось обработать задачу');
			}
		},
		[text, mode, model, datasetChosen, dataForRequest, watchRun, loadTasks]
	);

	const runExisting = useCallback(
		async task => {
			setBusy(true);
			setError(null);
			try {
				const { data: payload } = await $axios.post(`/harness/task/${task.id}/run`);
				setNotice('Выполняю задачу');
				watchRun(payload.run_id);
				setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
			} catch (err) {
				setBusy(false);
				setError(err.response?.data?.detail || 'Не удалось запустить задачу');
			}
		},
		[watchRun]
	);

	const openTask = useCallback(
		async task => {
			setError(null);
			setNotice(null);
			setEvents([]);
			try {
				const { data: payload } = await $axios.get(`/harness/task/${task.id}`);
				setCurrent(payload.task);
				setText(payload.task.text || '');
				setMode(payload.task.mode || 'explain');
				if (payload.task.run) setEvents((payload.task.run.events || []).slice(-70));
				setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
			} catch (err) {
				setError(err.response?.data?.detail || 'Не удалось открыть задачу');
			}
		},
		[]
	);

	const removeTask = useCallback(
		async task => {
			try {
				await $axios.delete(`/harness/task/${task.id}`);
				if (current?.id === task.id) setCurrent(null);
				await loadTasks();
			} catch (err) {
				setError('Не удалось удалить задачу');
			}
		},
		[current, loadTasks]
	);

	const result = current?.result || null;
	const run = current?.run || null;
	const modes = info?.modes || [];
	const difyUrl = info?.dify_url || 'https://tellscope40.headsmade.com:8443';
	const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 5);

	const periodLabel = useMemo(() => {
		const from = fmtDate(dataForRequest.min_date);
		const to = fmtDate(dataForRequest.max_date);
		if (from && to) return `${from} — ${to}`;
		return from || to || 'весь период датасета';
	}, [dataForRequest.min_date, dataForRequest.max_date]);

	const modeButtons = useMemo(
		() =>
			modes.map(item => (
				<button
					key={item.id}
					type='button'
					className={`${styles.mode} ${mode === item.id ? styles.modeActive : ''}`}
					onClick={() => setMode(item.id)}
					title={item.hint}
				>
					{item.title}
				</button>
			)),
		[modes, mode]
	);

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
				<div className={styles.head}>
					<span className={styles.headMark}>AI</span>
					<h2 className={styles.headTitle}>Центр ИИ-задач</h2>
					<span className={styles.headHint}>
						опишите задачу словами — ассистент соберёт данные инструментами Tellscope и подготовит отчёт
						{info?.tools_total ? ` · инструментов: ${info.tools_total}` : ''}
						{tasks.length ? ` · задач у вас: ${tasks.length}` : ''}
					</span>
					<div className={styles.headActions}>
						<button type='button' className={styles.linkBtn} onClick={() => navigate('/agents')}>
							мои агенты
						</button>
						<button
							type='button'
							className={styles.linkBtn}
							onClick={() => window.open(difyUrl, '_blank', 'noopener,noreferrer')}
						>
							конструктор Dify
						</button>
					</div>
				</div>

				<div className={styles.composer}>
					<textarea
						className={styles.input}
						value={text}
						placeholder='Опишите задачу: что выяснить, за какой период и что должно быть в итоге'
						onChange={event => setText(event.target.value)}
						onKeyDown={event => {
							if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
						}}
						rows={2}
					/>
					<div className={styles.composerRow}>
						<div className={styles.modes}>{modeButtons}</div>
						<div className={styles.composerRight}>
							{info?.models?.length ? (
								<select
									className={styles.model}
									value={model}
									onChange={event => setModel(event.target.value)}
									title='Модель ассистента'
								>
									{info.models.map(item => (
										<option key={item.id} value={item.id}>
											{item.label}
										</option>
									))}
								</select>
							) : null}
							<Button
								style={{ width: '138px', height: '32px', fontSize: '13px' }}
								onClick={() => submit()}
							>
								{busy ? 'Работаю…' : 'Отправить'}
							</Button>
						</div>
					</div>

					<div className={styles.dataRow}>
						<span className={styles.dataLabel}>Данные:</span>
						<span className={datasetChosen ? styles.dataValue : styles.dataEmpty}>
							{datasetChosen ? `набор #${dataForRequest.index}` : 'набор не выбран'}
							{datasetChosen ? ` · ${periodLabel}` : ''}
						</span>
						<button type='button' className={styles.linkBtn} onClick={() => setShowData(v => !v)}>
							{showData ? 'скрыть выбор' : datasetChosen ? 'изменить' : 'выбрать данные'}
						</button>
					</div>
					{showData && isSuccess && Object.keys(dataUser || {}).length > 0 && (
						<div className={styles.dataPicker}>
							<DataForSearch />
						</div>
					)}

					<div className={styles.examples}>
						<span className={styles.examplesLabel}>Примеры:</span>
						{EXAMPLES.map(example => (
							<button key={example} type='button' className={styles.example} onClick={() => setText(example)}>
								{example.length > 62 ? `${example.slice(0, 62)}…` : example}
							</button>
						))}
					</div>
				</div>

				{error && (
					<div className={styles.errorBlock}>
						<h4>Не получилось</h4>
						<p>{error}</p>
					</div>
				)}
				{notice && <div className={styles.noticeBlock}>{notice}</div>}

				{current && (
					<div className={styles.panel} ref={resultRef}>
						<div className={styles.panelHead}>
							<h3>
								{modeLabel(modes, current.mode)}: {current.text.length > 86 ? `${current.text.slice(0, 86)}…` : current.text}
							</h3>
							<span className={styles.panelHint}>
								{current.status}
								{result?.model?.cost_usd ? ` · $${result.model.cost_usd}` : ''}
								{result?.model?.tokens ? ` · ${result.model.tokens} токенов` : ''}
							</span>
						</div>

						{current.status === 'running' && run && (
							<div className={styles.runBox}>
								<div className={styles.runHead}>
									модель: {run.model_label || '—'} · статус: {run.status}
									{run.cost_usd ? ` · $${run.cost_usd}` : ''}
								</div>
								<ol className={styles.log}>
									{events.map((event, index) => (
										<li key={`${event.type}-${index}`} className={event.ok === false ? styles.logBad : ''}>
											<b>{event.type === 'tool_start' ? 'запуск' : event.type}</b>{' '}
											{event.title || event.name || ''}
											{event.summary ? ` — ${event.summary}` : ''}
											{event.text ? ` ${String(event.text).slice(0, 150)}` : ''}
										</li>
									))}
									{!events.length && <li>ожидаю первые шаги…</li>}
								</ol>
								{run.artifacts?.length ? (
									<div className={styles.artifacts}>
										{run.artifacts.map(artifact => (
											<a key={artifact.name} href={artifact.url} target='_blank' rel='noreferrer'>
												{artifact.name}
											</a>
										))}
									</div>
								) : null}
							</div>
						)}

						{result?.summary && (
							<div className={styles.card}>
								<b>План решения</b>
								<p>{result.summary}</p>
								{(result.steps || []).length ? (
									<ol className={styles.plan}>
										{result.steps.map(step => (
											<li key={step.title}>
												<b>{step.title}</b>
												{step.tool_title ? ` · ${step.tool_title}` : step.tool ? ` · ${step.tool}` : ''}
												{step.why ? ` — ${step.why}` : ''}
											</li>
										))}
									</ol>
								) : null}
								{result.outputs?.length ? <p className={styles.muted}>На выходе: {result.outputs.join('; ')}</p> : null}
								{result.cautions?.length ? (
									<p className={styles.warn}>Обратить внимание: {result.cautions.join('; ')}</p>
								) : null}
							</div>
						)}

						{result?.agent && (
							<div className={styles.card}>
								<b>Цепочка собрана</b>
								<p>
									Агент «{result.agent.name}» из {(result.steps || []).length} шагов сохранён во вкладке «Мои
									агенты» (папка отчётов: {result.agent.folder}).
								</p>
								<ol className={styles.plan}>
									{(result.steps || []).map(step => (
										<li key={`${step.kind}-${step.save_as}`}>
											<b>{step.kind}</b> · {step.title}
											{step.tool ? ` · ${step.tool}` : ''}
											{step.from ? ` ← ${step.from}` : ''}
										</li>
									))}
								</ol>
							</div>
						)}

						{result?.spec && (
							<div className={styles.card}>
								<b>Dify-workflow готов</b>
								<p>
									«{result.spec.title}» — узлов: {result.nodes}. {result.instructions}
								</p>
								{result.download ? (
									<a className={styles.fileLink} href={result.download}>
										скачать DSL-файл ({result.file})
									</a>
								) : null}
							</div>
						)}

						<div className={styles.actions}>
							{(result?.summary || result?.spec) && !result?.agent ? (
								<Button
									style={{ width: '152px', height: '32px', fontSize: '13px' }}
									onClick={() => runExisting(current)}
								>
									Выполнить сейчас
								</Button>
							) : null}
							{result?.agent ? (
								<>
									<Button
										style={{ width: '152px', height: '32px', fontSize: '13px' }}
										onClick={() => runExisting(current)}
									>
										Запустить цепочку
									</Button>
									<button type='button' className={styles.linkBtn} onClick={() => navigate('/agents')}>
										открыть в «Мои агенты»
									</button>
								</>
							) : null}
							{result?.spec ? (
								<button
									type='button'
									className={styles.linkBtn}
									onClick={() => window.open(difyUrl, '_blank', 'noopener,noreferrer')}
								>
									открыть Dify и импортировать файл
								</button>
							) : null}
							<button type='button' className={styles.linkBtnDanger} onClick={() => removeTask(current)}>
								удалить задачу
							</button>
						</div>
					</div>
				)}

				<div className={styles.panel}>
					<div className={styles.panelHead}>
						<h3>Мои задачи</h3>
						<span className={styles.panelHint}>видны только вам · {tasks.length}</span>
					</div>
					{!tasks.length && <p className={styles.muted}>Пока пусто — опишите первую задачу выше.</p>}
					<div className={styles.taskList}>
						{visibleTasks.map(task => (
							<div
								key={task.id}
								className={`${styles.taskRow} ${current?.id === task.id ? styles.taskRowActive : ''}`}
							>
								<button type='button' className={styles.taskMain} onClick={() => openTask(task)}>
									<span className={styles.taskText}>{task.text}</span>
									<span className={styles.taskMeta}>
										{task.created_at} · {modeLabel(modes, task.mode)} · {task.run_status || task.status}
									</span>
								</button>
								<button type='button' className={styles.linkBtnDanger} onClick={() => removeTask(task)}>
									удалить
								</button>
							</div>
						))}
					</div>
					{tasks.length > 5 ? (
						<button type='button' className={styles.linkBtn} onClick={() => setShowAllTasks(v => !v)}>
							{showAllTasks ? 'свернуть список' : `показать все (${tasks.length})`}
						</button>
					) : null}
				</div>
			</Content>
		</Layout>
	);
};

const modeLabel = (modes, id) => (modes || []).find(item => item.id === id)?.title || id;

export default Harness;
