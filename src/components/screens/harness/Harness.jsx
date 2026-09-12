import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Cookies from 'js-cookie';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '@/hooks/useActions';
import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useGetUserFoldersQuery, useGetUserIdQuery } from '@/services/other.service';

import { TOKEN } from '@/app.constants';
import { $axios } from '@/api';
import { fmtDay } from '@/utils/fileMeta';
import { truncateDescription } from '@/utils/editText';
import ThemePicker from '@/components/ui/theme-picker/ThemePicker';

import styles from './Harness.module.scss';

const EXAMPLES = [
	'Отчёт по подтеме «просрочка»: тональность, авторы, цепочки, негатив и позитив, выводы',
	'Мониторинг негатива по доставке за неделю: где горит и что делать',
	'Сравни упоминания бренда и конкурентов, предложи, что поправить в коммуникации',
];

// чем режимы отличаются — показываем под чипами выбора
const MODE_NOTES = {
	explain: 'Покажет план: какие инструменты сработают, что будет на выходе и на что обратить внимание. Ничего не запускает.',
	run: 'Выполнит задачу прямо сейчас: агент сам вызовет инструменты Tellscope, соберёт данные и подготовит отчёт DOCX/PDF.',
	chain: 'Соберёт цепочку шагов и сохранит её агентом в «Мои агенты»: данные → графики → выводы ИИ → отчёт. Дальше её можно запускать по кнопке или по расписанию.',
	flow: 'Соберёт схему для Dify отдельным файлом (DSL): узлы-инструменты и разбор моделью. Файл импортируется в визуальный конструктор и правится мышкой.',
};

// Статусы запуска и задачи — человеческими словами, чтобы в списке не было «running»
const RUN_STATUS_LABELS = {
	queued: 'в очереди',
	running: 'выполняется',
	completed: 'выполнено',
	failed: 'неуспешно',
	cancelled: 'остановлено пользователем',
	interrupted: 'прервано',
};

const TASK_STATUS_LABELS = {
	new: 'новая',
	queued: 'в очереди',
	running: 'выполняется',
	done: 'выполнено',
	completed: 'выполнено',
	error: 'ошибка',
	failed: 'неуспешно',
	cancelled: 'остановлено пользователем',
	interrupted: 'прервано',
};

const ACTIVE_RUN_STATUSES = ['queued', 'running'];
const FINISHED_RUN_STATUSES = ['completed', 'failed', 'cancelled'];

// Как сообщить о завершении запуска (в том числе об остановке пользователем)
const runMessage = status =>
	status === 'completed'
		? 'Задача выполнена'
		: status === 'cancelled'
			? 'Запуск остановлен пользователем'
			: 'Задача завершилась неуспешно';

// Через сколько секунд без событий показывать подсказку и когда предлагать обновить страницу
const STALE_HINT_SEC = 60;
const STALE_ALERT_SEC = 300;

// Журнал для пользователя: технические типы событий превращаем в человеческие подписи.
// log и heartbeat в журнале не показываем: log — служебные заметки инструментов (видны
// в подробном режиме), heartbeat — источник «живости» для таймера, а не строка журнала.
const humanStage = stage => {
	const text = String(stage || '').trim();
	if (!text) return 'Работаю';
	if (/^подготовка запуска$/i.test(text)) return 'Готовлю запуск';
	if (/^модель/i.test(text)) return 'Модель думает…';
	const tool = text.match(/^Инструмент:\s*(.+)$/i);
	if (tool) return tool[1];
	if (/^чтение текстов$/i.test(text)) return 'Читаю тексты датасета';
	const step = text.match(/^Шаг\s+(\d+)\.\s*(.+)$/i);
	if (step) return `Шаг ${step[1]}: ${step[2]}`;
	return text;
};

// «прочитано 24 из 41 сообщений (пачек: 2 из 3, последняя за 50 с)» → «прочитано 24 из 41 сообщений»
const humanDetail = detail => String(detail || '').replace(/\s*\(пачек:[^)]*\)/i, '').trim();

// Одна строка журнала: { text, bad } или null, если событие показывать не нужно
const journalEntry = event => {
	const type = event?.type;
	if (!type || type === 'heartbeat' || type === 'keepalive') return null;
	if (type === 'log') {
		// Служебные заметки инструментов по умолчанию не показываем: они видны по кнопке
		// «служебные записи». Исключение — сообщения об ошибках: они важны пользователю.
		if (String(event.level || '').toLowerCase() !== 'error') return null;
		return { text: `Внимание: ${event.message || ''}`.trim(), bad: true };
	}
	if (type === 'notice') return { text: event.message || 'Сообщение', bad: event.level === 'warning' };
	if (type === 'progress') {
		const stage = humanStage(event.stage);
		const sub = event.sub;
		if (sub && sub.total) {
			if (!sub.done) {
				// Чтение только началось — не показываем «прочитано 0 из 41»
				const batches = sub.units_total ? `, пачек ${sub.units_total}` : '';
				return { text: `${stage}: начинаю — ${sub.total} сообщений${batches}` };
			}
			const batches = sub.units_total ? ` · пачка ${sub.units_done || 0} из ${sub.units_total}` : '';
			const eta = event.eta_seconds ? ` · осталось ~${fmtDuration(event.eta_seconds)}` : '';
			return { text: `${stage}: прочитано ${sub.done} из ${sub.total}${batches}${eta}` };
		}
		const detail = humanDetail(event.detail);
		return detail && detail !== event.stage ? { text: `${stage} — ${detail}` } : { text: stage };
	}
	if (type === 'tool_start') return { text: `Шаг начат: ${event.title || event.name || ''}`.trim() };
	if (type === 'tool_end') {
		const summary = event.summary ? ` — ${event.summary}` : '';
		return { text: `Шаг завершён: ${event.title || event.name || ''}${summary}`.trim(), bad: event.ok === false };
	}
	if (type === 'llm') {
		const planned = (event.planned || []).filter(Boolean);
		if (planned.length) return { text: `Модель выбрала инструмент: ${planned.join(', ')}` };
		return { text: event.final ? 'Модель готовит итог…' : 'Модель думает…' };
	}
	if (type === 'start') {
		const tools = Array.isArray(event.tools) ? ` · инструментов ${event.tools.length}` : '';
		return { text: `Запуск${event.model ? `: ${event.model}` : ''}${tools}` };
	}
	if (type === 'answer') return { text: 'Ответ готов' };
	if (type === 'final') return { text: 'Итог сформирован' };
	if (type === 'done') return { text: `Запуск завершён: ${RUN_STATUS_LABELS[event.status] || event.status || 'без статуса'}` };
	if (type === 'error') return { text: `Ошибка: ${event.message || ''}`.trim(), bad: true };
	return { text: event.title || event.message || type };
};

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

// MM:SS (и Ч:ММ:СС для долгих запусков)
const fmtClock = seconds => {
	const total = Math.max(0, Math.round(Number(seconds) || 0));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const rest = total % 60;
	const pad = value => String(value).padStart(2, '0');
	return hours ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
};

// «2 мин 30 с» — для оценки остатка и итоговой длительности
const fmtDuration = seconds => {
	const total = Math.max(0, Math.round(Number(seconds) || 0));
	if (total < 60) return `${total} с`;
	const minutes = Math.floor(total / 60);
	const rest = total % 60;
	if (minutes < 60) return rest ? `${minutes} мин ${rest} с` : `${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	return `${hours} ч ${minutes % 60} мин`;
};

const fmtAgo = seconds => {
	const total = Math.max(0, Math.round(Number(seconds) || 0));
	if (total < 60) return `${total} с назад`;
	if (total < 3600) return `${Math.floor(total / 60)} мин ${total % 60} с назад`;
	return `${Math.floor(total / 3600)} ч ${Math.floor((total % 3600) / 60)} мин назад`;
};

const timeOf = value => {
	if (!value) return 0;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
};

// Время сервера без таймзоны («2026-09-12 20:43:29») — только запасной вариант
const serverTimeOf = value => {
	if (!value) return 0;
	const text = String(value);
	if (/\d{4}-\d{2}-\d{2}T/.test(text) || text.endsWith('Z')) return timeOf(text);
	const parsed = Date.parse(text.replace(' ', 'T'));
	return Number.isNaN(parsed) ? 0 : parsed;
};

const Harness = () => {
	useCheckAuth();

	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { addData, addMinDate, addMaxDate, addIndex } = useActions();
	const { active_menu } = useSelector(store => store.booleanValues);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { json_files_directory: dataUser } = useSelector(state => state.dataUsersSlice);

	const { data: data_getUserId } = useGetUserIdQuery();
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
	const [showAllTasks, setShowAllTasks] = useState(false);
	// Тик раз в секунду: по нему считаются «прошло» и «последнее обновление», иначе
	// таймеры в полосе статуса выглядят застывшими и непонятно, работает задача или нет.
	const [tick, setTick] = useState(() => Date.now());
	const wsRef = useRef(null);
	const pollRef = useRef(null);
	const watchdogRef = useRef(null);
	// Наблюдение за запуском: WebSocket первым, HTTP-опрос — как запасной канал
	const watchRef = useRef({ active: false, runId: null, taskId: null, failures: 0, ws: false });
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

	const loadTasks = useCallback(async () => {
		try {
			const { data: payload } = await $axios.get('/harness/tasks');
			const items = payload.tasks || [];
			setTasks(items);
			return items;
		} catch (err) {
			/* список задач не критичен */
			return [];
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
	}, [loadInfo]);

	/* ---------- наблюдение за запуском: WebSocket + опрос с фолбэком ---------- */

	const stopWatch = useCallback(() => {
		watchRef.current.active = false;
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
		if (watchdogRef.current) {
			clearInterval(watchdogRef.current);
			watchdogRef.current = null;
		}
		if (wsRef.current) {
			const socket = wsRef.current;
			wsRef.current = null;
			try {
				socket.onclose = null;
				socket.onerror = null;
				socket.close();
			} catch (err) {
				/* сокет уже закрыт */
			}
		}
	}, []);

	// Применяем состояние запуска: события журнала + статус задачи в карточке
	const applyRun = useCallback(runPayload => {
		if (!runPayload) return null;
		setEvents((runPayload.events || []).slice(-80));
		setCurrent(prev => {
			if (!prev) return prev;
			const runStatus = runPayload.status;
			let nextStatus = prev.status || 'running';
			if (!ACTIVE_RUN_STATUSES.includes(runStatus)) {
				if (runStatus === 'completed') nextStatus = 'done';
				else if (runStatus === 'cancelled') nextStatus = 'cancelled';
				else nextStatus = 'failed';
			}
			return { ...prev, run: runPayload, status: nextStatus };
		});
		return runPayload;
	}, []);

	// Запасной канал: GET /harness/task/{id} — если /agent/run недоступен, прогресс не замирает
	const fetchRun = useCallback(
		async (runId, taskId) => {
			try {
				const { data } = await $axios.get(`/agent/run/${runId}`);
				return applyRun(data);
			} catch (err) {
				try {
					const { data } = await $axios.get(`/harness/task/${taskId}`);
					return applyRun(data?.task?.run || null);
				} catch (err2) {
					return null;
				}
			}
		},
		[applyRun]
	);

	const finishWatch = useCallback(
		async message => {
			const taskId = watchRef.current.taskId;
			stopWatch();
			setBusy(false);
			setNotice(message || 'Готово');
			await loadTasks();
			if (taskId) {
				try {
					const { data } = await $axios.get(`/harness/task/${taskId}`);
					if (data?.task) setCurrent(data.task);
				} catch (err) {
					/* детали задачи не критичны: статус уже обновлён */
				}
			}
		},
		[loadTasks, stopWatch]
	);

	const startPolling = useCallback(
		(runId, taskId) => {
			if (pollRef.current || !watchRef.current.active) return;
			pollRef.current = setInterval(async () => {
				if (!watchRef.current.active) return;
				const runPayload = await fetchRun(runId, taskId);
				if (runPayload) {
					watchRef.current.failures = 0;
					if (FINISHED_RUN_STATUSES.includes(runPayload.status)) {
						await finishWatch(runMessage(runPayload.status));
					}
					return;
				}
				watchRef.current.failures += 1;
				if (watchRef.current.failures > 40) {
					await finishWatch('Обновление прогресса недоступно — обновите страницу');
				}
			}, 2500);
		},
		[fetchRun, finishWatch]
	);

	const startWatch = useCallback(
		(runId, taskId) => {
			if (!runId) return;
			if (watchRef.current.active && watchRef.current.runId === runId) return;
			stopWatch();
			watchRef.current = { active: true, runId, taskId, failures: 0, ws: false };
			let socket = null;
			try {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				const token = Cookies.get(TOKEN);
				socket = new WebSocket(
					`${protocol}//${window.location.host}/api/ws/agent-run/${runId}${token ? `?token=${token}` : ''}`
				);
			} catch (err) {
				socket = null;
			}
			if (socket) {
				wsRef.current = socket;
				watchRef.current.ws = true;
				const openTimer = setTimeout(() => {
					if (watchRef.current.active && socket.readyState !== WebSocket.OPEN) startPolling(runId, taskId);
				}, 4000);
				socket.onopen = () => clearTimeout(openTimer);
				socket.onmessage = event => {
					try {
						const payload = JSON.parse(event.data);
						if (payload.type === 'keepalive') return;
						if (payload.type === 'done') {
							finishWatch(runMessage(payload.status));
							return;
						}
						setEvents(prev => [...prev, payload].slice(-80));
					} catch (err) {
						/* некорректный кадр потока игнорируем */
					}
				};
				socket.onerror = () => {
					clearTimeout(openTimer);
					if (watchRef.current.active) startPolling(runId, taskId);
				};
				socket.onclose = () => {
					clearTimeout(openTimer);
					// поток закрылся, а запуск ещё идёт — не даём прогрессу «застыть»
					if (watchRef.current.active) startPolling(runId, taskId);
				};
			} else {
				startPolling(runId, taskId);
			}
			// Страховка: раз в 15 с уточняем состояние запуска даже при живом сокете
			watchdogRef.current = setInterval(async () => {
				if (!watchRef.current.active) return;
				const runPayload = await fetchRun(runId, taskId);
				if (runPayload && FINISHED_RUN_STATUSES.includes(runPayload.status)) {
					await finishWatch(runMessage(runPayload.status));
				}
			}, 15000);
		},
		[fetchRun, finishWatch, startPolling, stopWatch]
	);

	useEffect(() => () => stopWatch(), [stopWatch]);

	// После перезагрузки страницы подхватываем уже идущий запуск, чтобы прогресс не терялся
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const items = await loadTasks();
			if (cancelled) return;
			const active = (items || []).find(
				task => task.run_id && ACTIVE_RUN_STATUSES.includes(task.run_status || task.status)
			);
			if (!active) return;
			setBusy(true);
			setNotice('Задача выполняется — прогресс виден ниже');
			setCurrent(active);
			const payload = await fetchRun(active.run_id, active.id);
			if (cancelled) return;
			if (payload && ACTIVE_RUN_STATUSES.includes(payload.status)) {
				startWatch(active.run_id, active.id);
			} else {
				setBusy(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [fetchRun, loadTasks, startWatch]);

	const currentRun = current?.run || null;
	const runActive = !!currentRun && ACTIVE_RUN_STATUSES.includes(currentRun.status);

	// Секундный тик нужен только пока запуск активен — и всегда очищается
	useEffect(() => {
		if (!runActive) return undefined;
		setTick(Date.now());
		const id = setInterval(() => setTick(Date.now()), 1000);
		return () => clearInterval(id);
	}, [runActive]);

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
				return;
			}
			stopWatch();
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
					setNotice('Задача выполняется — прогресс виден ниже');
					startWatch(payload.run_id, payload.task?.id);
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
		[text, mode, model, datasetChosen, dataForRequest, loadTasks, startWatch, stopWatch]
	);

	const runExisting = useCallback(
		async task => {
			setBusy(true);
			setError(null);
			try {
				const { data: payload } = await $axios.post(`/harness/task/${task.id}/run`);
				setNotice('Задача выполняется — прогресс виден ниже');
				startWatch(payload.run_id, task.id);
				setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
			} catch (err) {
				setBusy(false);
				setError(err.response?.data?.detail || 'Не удалось запустить задачу');
			}
		},
		[startWatch]
	);

	// Скачиваем артефакт через $axios: у него baseURL уже заканчивается на /api,
	// поэтому из ссылки вида /api/agent/artifact/... префикс /api надо убрать.
	// Если всё же не получилось — открываем ссылку в новой вкладке (бэкенд принимает cookie).
	const downloadArtifact = useCallback(async artifact => {
		const rawUrl = artifact?.url || '';
		let target = rawUrl;
		try {
			const parsed = new URL(rawUrl, window.location.origin);
			target = parsed.pathname + parsed.search;
		} catch (e) {
			// оставляем как есть
		}
		target = target.replace(/^\/api(\/|$)/, '/');
		try {
			const response = await $axios.get(target, { responseType: 'blob' });
			let payload = response?.data ?? response;
			if (payload instanceof Blob) {
				if ((payload.type || '').includes('json')) {
					throw new Error(await payload.text());
				}
			} else {
				payload = new Blob([payload]);
			}
			if (!payload.size) {
				throw new Error('пустой файл');
			}
			const objectUrl = URL.createObjectURL(payload);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = artifact?.name || 'file';
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(objectUrl);
		} catch (error) {
			console.error('Не удалось скачать артефакт через API, открываю ссылку:', error);
			window.open(rawUrl, '_blank', 'noopener,noreferrer');
		}
	}, []);

	// Полный текст запроса: раскрытие и копирование в буфер (запрос в списке обрезан CSS)
	const [expandedTask, setExpandedTask] = useState(null);

	/* ---------- что показываем в полосе статуса ---------- */

	// Свежесть запуска: время последнего события потока (progress/heartbeat) или записи запуска
	const lastEventMs = useMemo(() => {
		const stamp = currentRun?.last_event_ts;
		if (stamp) return Number(stamp) * 1000;
		let latest = 0;
		events.forEach(event => {
			const parsed = timeOf(event.ts);
			if (parsed > latest) latest = parsed;
		});
		return latest || 0;
	}, [currentRun, events]);

	// Последнее событие прогресса: из потока или из записи запуска — что свежее
	const progress = useMemo(() => {
		let fromEvents = null;
		for (let index = events.length - 1; index >= 0; index -= 1) {
			const event = events[index];
			if (event.type === 'progress' || event.type === 'heartbeat') {
				fromEvents = event;
				break;
			}
		}
		const fromRun = currentRun?.progress || null;
		if (!fromRun) return fromEvents;
		if (!fromEvents) return fromRun;
		return Number(fromEvents.elapsed || 0) >= Number(fromRun.elapsed || 0) ? fromEvents : fromRun;
	}, [currentRun, events]);

	const startedMs = useMemo(() => {
		if (!currentRun) return 0;
		if (currentRun.started_ts) return Number(currentRun.started_ts) * 1000;
		const startEvent = events.find(event => event.type === 'start' && event.ts);
		if (startEvent) return timeOf(startEvent.ts);
		return serverTimeOf(currentRun.started_at || currentRun.created_at);
	}, [currentRun, events]);

	const liveStatus = useMemo(() => {
		const runStatus = currentRun?.status || current?.run_status || current?.status || '';
		const active = ACTIVE_RUN_STATUSES.includes(runStatus);
		const finished = ['completed', 'done'].includes(runStatus);
		// Запуск, остановленный пользователем: отдельный статус, а не «неуспешно»
		const stopped = runStatus === 'cancelled' || current?.run_status === 'cancelled' || current?.status === 'cancelled';
		const failedStatuses = ['failed', 'error', 'interrupted'];
		const failed = !stopped && (failedStatuses.includes(runStatus) || failedStatuses.includes(current?.run_status));
		const elapsed = active && startedMs ? Math.max(0, Math.round((tick - startedMs) / 1000)) : 0;
		const sinceEvent = active && lastEventMs ? Math.max(0, Math.round((tick - lastEventMs) / 1000)) : null;
		const durationSec =
			currentRun?.duration_sec ??
			(currentRun?.finished_ts && currentRun?.started_ts
				? Math.max(0, Math.round(Number(currentRun.finished_ts) - Number(currentRun.started_ts)))
				: null) ??
			current?.duration_sec ??
			(active ? elapsed : null);

		const stage = progress?.stage || '';
		// Процент: детерминированный по плану шагов, иначе по под-прогрессу шага (пачки чтения)
		const percent = progress?.percent ?? progress?.sub?.percent ?? null;
		const step = progress?.step ?? null;
		const total = progress?.total ?? null;
		const etaRaw = progress?.eta_seconds ?? null;
		const etaScope = progress?.eta_scope || '';
		const historyRun = progress?.history_run_sec ?? null;
		const sub = progress?.sub || null;
		// Оценка остатка тикает каждую секунду: между событиями вычитаем прошедшее время,
		// чтобы цифра «осталось ~2 мин» не выглядела застывшей.
		const progressAgeSec = progress?.ts ? Math.max(0, (tick - timeOf(progress.ts)) / 1000) : 0;
		const eta = etaRaw !== null && etaRaw !== undefined ? Math.max(0, Math.round(etaRaw - progressAgeSec)) : null;
		let etaText = '';
		if (active && eta !== null) {
			etaText = etaScope === 'stage' ? `на шаг осталось ~${fmtDuration(eta)}` : `осталось ~${fmtDuration(eta)}`;
		} else if (active && !total && historyRun) {
			etaText = `обычно такой запуск ${fmtDuration(historyRun)}`;
		}

		// Подробность под полосой: «прочитано 24 из 41 текстов · пачка 2 из 3»
		let detail = '';
		if (sub && sub.total) {
			detail = sub.done
				? `прочитано ${sub.done} из ${sub.total} текстов`
				: `читаю ${sub.total} текстов`;
			if (sub.units_total) detail += ` · пачка ${sub.units_done || 0} из ${sub.units_total}`;
		} else if (progress?.detail) {
			detail = humanDetail(progress.detail);
		}

		const reading = /текст|отзыв/i.test(String(stage || '')) || /текст|отзыв/i.test(String(progress?.detail || ''));

		let hint = '';
		let alert = false;
		if (active) {
			if (sinceEvent !== null && sinceEvent > STALE_ALERT_SEC) {
				alert = true;
				hint = `Событий нет уже ${fmtDuration(sinceEvent)}. Возможно, сервер перезапускался: обновите страницу или нажмите «проверить статус» — состояние подтянется.`;
			} else if (sinceEvent !== null && sinceEvent > STALE_HINT_SEC) {
				hint = `Шаг выполняется долго (${stage || 'модель или чтение текстов'}), обычно это 2–3 минуты — процесс идёт, ждём ответа модели.`;
			} else if (percent === null || percent === undefined) {
				// Оценки нет (плана шагов не знаем): вместо пустоты объясняем, что происходит
				hint = reading
					? 'Читаю тексты датасета локальной моделью — обычно это 2–3 минуты, шаг выполняется.'
					: 'Работа идёт: шаг длинный, точную оценку пока дать нельзя — обычно это 1–3 минуты.';
			}
		}

		let title = '';
		if (active) title = 'Задача выполняется';
		else if (finished) title = `Выполнено за ${fmtDuration(durationSec)}`;
		else if (stopped) title = 'Остановлено пользователем';
		else if (failed) title = `Неуспешно: ${currentRun?.error || current?.error || 'причина не указана'}`;
		else if (notice) title = notice;

		return {
			active,
			finished,
			stopped,
			failed,
			elapsed,
			sinceEvent,
			durationSec,
			stage,
			percent,
			step,
			total,
			etaText,
			hint,
			alert,
			title,
			detail,
		};
	}, [current, currentRun, lastEventMs, notice, progress, startedMs, tick]);

	const copyTaskText = useCallback(async taskText => {
		try {
			await navigator.clipboard.writeText(taskText || '');
			setNotice('Запрос скопирован в буфер обмена');
		} catch (e) {
			window.prompt('Скопируйте запрос:', taskText || '');
		}
	}, []);

	const openTask = useCallback(
		async task => {
			setError(null);
			setNotice(null);
			setEvents([]);
			stopWatch();
			try {
				const { data: payload } = await $axios.get(`/harness/task/${task.id}`);
				setCurrent(payload.task);
				setText(payload.task.text || '');
				setMode(payload.task.mode || 'explain');
				const runPayload = payload.task.run || null;
				if (runPayload) setEvents((runPayload.events || []).slice(-80));
				if (runPayload && ACTIVE_RUN_STATUSES.includes(runPayload.status)) {
					// задача ещё идёт — продолжаем показывать прогресс в реальном времени
					setBusy(true);
					setNotice('Задача выполняется — прогресс виден ниже');
					startWatch(runPayload.run_id || task.run_id, task.id);
				} else {
					setBusy(false);
				}
				setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
			} catch (err) {
				setError(err.response?.data?.detail || 'Не удалось открыть задачу');
			}
		},
		[startWatch, stopWatch]
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

	const pickTheme = useCallback(
		option => {
			addIndex(option.index_number);
			if (option.min_data) addMinDate(option.min_data);
			if (option.max_data) addMaxDate(option.max_data);
		},
		[addIndex, addMinDate, addMaxDate]
	);

	const result = current?.result || null;
	const run = current?.run || null;
	const modes = info?.modes || [];
	const difyUrl = info?.dify_url || 'https://tellscope40.headsmade.com:8443';
	const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 5);

	// Журнал для пользователя: без служебных log и без heartbeat (heartbeat — только «живость»
	// для таймера). Технические типы событий превращаются в человеческие подписи.
	const journal = useMemo(() => {
		const rows = [];
		events.forEach((event, index) => {
			const entry = journalEntry(event);
			if (!entry || !entry.text) return;
			if (rows.length && rows[rows.length - 1].text === entry.text) return;
			rows.push({ ...entry, index });
		});
		return rows.slice(-40);
	}, [events]);

	// Подробный режим: служебные заметки инструментов (log) — только по кнопке
	const [showServiceNotes, setShowServiceNotes] = useState(false);
	const serviceNotes = useMemo(
		() => events.filter(event => event.type === 'log' && event.message).slice(-25),
		[events]
	);

	const taskStatusLabel = useCallback(taskItem => {
		const key = taskItem?.run_status || taskItem?.status || '';
		const label = taskItem?.status_label || RUN_STATUS_LABELS[key] || TASK_STATUS_LABELS[key] || key;
		const seconds = taskItem?.duration_sec;
		if (['done', 'completed', 'failed', 'error', 'interrupted'].includes(key) && seconds) {
			return `${label} за ${fmtDuration(seconds)}`;
		}
		return label;
	}, []);

	const datasetOption = useMemo(() => {
		const list = Object.values(dataUser || {}).flat();
		return (
			list.find(
				item => item && item.index_number === dataForRequest.index && !item['html-file']
			) || null
		);
	}, [dataUser, dataForRequest.index]);

	const datasetLabel = datasetOption
		? truncateDescription(datasetOption.file || '', 34)
		: datasetChosen
			? `набор #${dataForRequest.index}`
			: '';

	const periodLabel = useMemo(() => {
		if (datasetOption?.min_data && datasetOption?.max_data) {
			return `${fmtDay(datasetOption.min_data)} — ${fmtDay(datasetOption.max_data)}`;
		}
		const from = fmtDate(dataForRequest.min_date);
		const to = fmtDate(dataForRequest.max_date);
		if (from && to) return `${from} — ${to}`;
		return from || to || '';
	}, [datasetOption, dataForRequest.min_date, dataForRequest.max_date]);

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

	const checkStatus = useCallback(async () => {
		if (!current) return;
		if (current.run_id) {
			const payload = await fetchRun(current.run_id, current.id);
			if (payload && ACTIVE_RUN_STATUSES.includes(payload.status)) {
				setBusy(true);
				setNotice('Задача выполняется — прогресс виден ниже');
				startWatch(current.run_id, current.id);
			} else if (!payload) {
				setError('Не удалось получить статус запуска — обновите страницу');
			}
		}
		await loadTasks();
	}, [current, fetchRun, loadTasks, startWatch]);

	// «Остановить»: просим бэкенд прервать запуск. Движок замечает флаг на ближайшем шаге,
	// статус становится cancelled, а уже собранные артефакты остаются на месте.
	const [stopping, setStopping] = useState(false);
	const stopRun = useCallback(async () => {
		if (!current) return;
		setStopping(true);
		setError(null);
		try {
			if (current.id) {
				const { data } = await $axios.post(`/harness/task/${current.id}/cancel`);
				if (data?.task) setCurrent(prev => (prev ? { ...prev, ...data.task } : prev));
			} else if (current.run_id) {
				await $axios.post(`/agent/run/${current.run_id}/cancel`);
			} else {
				setError('У задачи нет активного запуска');
				return;
			}
			setNotice('Останавливаю запуск…');
			// Продолжаем следить за запуском: он завершится статусом cancelled.
			if (current.run_id) startWatch(current.run_id, current.id);
		} catch (err) {
			setError(err.response?.data?.detail || 'Не удалось остановить запуск');
		} finally {
			setStopping(false);
		}
	}, [current, startWatch]);

	const showStatusBar = !!current || !!notice;

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
						<button type='button' className={styles.chipBtn} onClick={() => navigate('/agents')}>
							<img src='/images/icons/menu/agents.svg' alt='' />
							мои агенты
						</button>
						<button
							type='button'
							className={styles.chipBtn}
							onClick={() => window.open(difyUrl, '_blank', 'noopener,noreferrer')}
						>
							<img src='/images/icons/menu/dify.svg' alt='' />
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

					<p className={styles.modeNote}>{MODE_NOTES[mode]}</p>

					<div className={styles.dataRow}>
						<ThemePicker
							dataUser={dataUser}
							currentIndex={dataForRequest.index}
							label={datasetLabel}
							period={periodLabel}
							loading={!isSuccess && !isError}
							failed={isError}
							onPick={pickTheme}
						/>
						{!datasetChosen && <span className={styles.dataEmpty}>выберите тему, чтобы запускать задачи</span>}
					</div>

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

				{showStatusBar && (
					<div
						className={`${styles.noticeBlock} ${
							liveStatus.alert || liveStatus.stopped ? styles.noticeAlert : ''
						} ${liveStatus.failed ? styles.noticeFailed : ''}`}
					>
						<div className={styles.statusRow}>
							{liveStatus.active && <span className={styles.statusPulse} aria-hidden='true' />}
							<span className={styles.statusTitle}>{liveStatus.title || notice}</span>
							{liveStatus.active && liveStatus.stage ? (
								<span className={styles.statusStage}>{liveStatus.stage}</span>
							) : null}
							{liveStatus.active ? (
								<span className={styles.statusMeta}>
									{liveStatus.step ? (
										<span>
											шаг {liveStatus.step}
											{liveStatus.total ? ` из ${liveStatus.total}` : ''}
										</span>
									) : null}
									{liveStatus.percent !== null && liveStatus.percent !== undefined ? (
										<span>{liveStatus.percent}%</span>
									) : null}
									<span>прошло {fmtClock(liveStatus.elapsed)}</span>
									{liveStatus.sinceEvent !== null ? (
										<span
											className={liveStatus.sinceEvent > STALE_HINT_SEC ? styles.metaWarn : ''}
											title='Время с последнего события запуска — главный признак, что задача жива'
										>
											последнее обновление {fmtAgo(liveStatus.sinceEvent)}
										</span>
									) : null}
									{liveStatus.etaText ? <span>{liveStatus.etaText}</span> : null}
								</span>
							) : null}
							{liveStatus.active ? (
								<button
									type='button'
									className={styles.stopBtn}
									onClick={stopRun}
									disabled={stopping}
									title='Остановить выполнение: уже собранные артефакты сохранятся'
								>
									{stopping ? 'останавливаю…' : 'остановить'}
								</button>
							) : null}
						</div>

						{liveStatus.active ? (
							<div className={styles.progressTrack}>
								{liveStatus.percent !== null && liveStatus.percent !== undefined ? (
									<div
										className={styles.progressFill}
										style={{ width: `${Math.min(100, Math.max(0, liveStatus.percent))}%` }}
									/>
								) : (
									<div className={styles.progressIndeterminate} />
								)}
							</div>
						) : null}

						{liveStatus.active && liveStatus.detail ? (
							<div className={styles.statusDetail}>{liveStatus.detail}</div>
						) : null}
						{liveStatus.active && liveStatus.hint ? (
							<div className={styles.statusHint}>
								{liveStatus.hint}
								{liveStatus.alert ? (
									<button type='button' className={styles.hintBtn} onClick={() => window.location.reload()}>
										обновить страницу
									</button>
								) : null}
							</div>
						) : null}
						{!liveStatus.active && (liveStatus.detail || notice) ? (
							<div className={styles.statusDetail}>{liveStatus.detail || notice}</div>
						) : null}
					</div>
				)}

				{current && (
					<div className={styles.panel} ref={resultRef}>
						<div className={styles.panelHead}>
							<h3>
								{modeLabel(modes, current.mode)}: {current.text.length > 86 ? `${current.text.slice(0, 86)}…` : current.text}
									<button
										type='button'
										className={styles.taskBtn}
										title='Скопировать запрос'
										onClick={() => copyTaskText(current.text)}
									>
										копировать запрос
									</button>
							</h3>
							<span className={styles.panelHint}>
								{taskStatusLabel(current)}
								{run?.duration_sec ? ` · за ${fmtDuration(run.duration_sec)}` : ''}
								{result?.model?.cost_usd ? ` · $${result.model.cost_usd}` : ''}
								{result?.model?.tokens ? ` · ${result.model.tokens} токенов` : ''}
							</span>
						</div>

						{liveStatus.failed ? (
							<div className={styles.errorBlock}>
								<h4>Задача завершилась неуспешно</h4>
								<p>{run?.error || current.error || 'причина не указана'}</p>
							</div>
						) : null}

						{run && (liveStatus.active || journal.length) ? (
							<div className={styles.runBox}>
								<div className={styles.runHead}>
									модель: {run.model_label || '—'} · статус: {RUN_STATUS_LABELS[run.status] || run.status}
									{run.duration_sec ? ` · ${fmtDuration(run.duration_sec)}` : ''}
									{run.cost_usd ? ` · $${run.cost_usd}` : ''}
									{serviceNotes.length ? (
										<button
											type='button'
											className={styles.journalToggle}
											onClick={() => setShowServiceNotes(value => !value)}
											title='Служебные заметки инструментов: нужны для отладки'
										>
											{showServiceNotes ? 'скрыть служебные записи' : 'служебные записи'}
										</button>
									) : null}
								</div>
								<ol className={styles.log}>
									{journal.map(row => (
										<li key={`${row.key || 'row'}-${row.index}`} className={row.bad ? styles.logBad : ''}>
											{row.text}
										</li>
									))}
									{!journal.length && <li>ожидаю первые шаги…</li>}
								</ol>
								{showServiceNotes && serviceNotes.length ? (
									<ol className={styles.serviceLog}>
										{serviceNotes.map((event, index) => (
											<li key={`service-${index}`}>{event.message}</li>
										))}
									</ol>
								) : null}
								{run.artifacts?.length ? (
									<div className={styles.artifacts}>
										{run.artifacts.map(artifact => (
											<button
												key={artifact.name}
												type='button'
												className={styles.fileLink}
												onClick={() => downloadArtifact(artifact)}
											>
												{artifact.name}
											</button>
										))}
									</div>
								) : null}
							</div>
						) : null}

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
							<button type='button' className={styles.linkBtn} onClick={checkStatus}>
								проверить статус
							</button>
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
									<span
										className={`${styles.taskText} ${expandedTask === task.id ? styles.taskTextOpen : ''}`}
										title={task.text}
										onClick={() => {
										if ((task.text || '').length > 110) {
											setExpandedTask(expandedTask === task.id ? null : task.id);
										}
									}}
									>
										{task.text}
									</span>

									<span className={styles.taskMeta}>
										{task.created_at} · {modeLabel(modes, task.mode)} · {taskStatusLabel(task)}
										{task.run_progress?.percent ? ` · ${task.run_progress.percent}%` : ''}
									</span>
								</button>
																<span className={styles.taskActions}>
																		<button
																			type='button'
																			className={styles.taskBtn}
																			title='Скопировать запрос'
																			onClick={event => {
																				event.stopPropagation();
																				copyTaskText(task.text);
																			}}
																		>
																			копировать запрос
																		</button>
																</span>
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
