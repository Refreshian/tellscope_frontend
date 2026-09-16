import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cookies from 'js-cookie';
import { message } from 'antd';

import { API_URL, TOKEN, USER_ID } from '@/app.constants';

import styles from './FileOrigin.module.scss';

const STATUS_LABELS = {
	done: 'завершено',
	completed: 'завершено',
	success: 'завершено',
	running: 'выполняется',
	queued: 'в очереди',
	failed: 'ошибка',
	error: 'ошибка',
	stopped: 'остановлено',
	cancelled: 'отменено',
};

const TOOLTIP_QUERY = 'Показать запрос, по которому появился файл';
const TOOLTIP_SUMMARY = 'Показать происхождение файла';

const POPOVER_WIDTH = 420;
const TOOLTIP_WIDTH = 340;
const EDGE = 12;
const GAP = 8;

/* ------------------------------------------------------------------ запросы */

/**
 * Очередь проверок «есть ли запрос у файла».
 *
 * В списке отчётов десятки строк, поэтому проверки идут лениво (только когда строка
 * появилась на экране), не больше PROBE_CONCURRENCY одновременно и с общим кэшем на
 * сессию: повторный рендер строки не порождает новый запрос к API.
 */
const PROBE_CONCURRENCY = 4;
const probeCache = new Map();
const probePending = new Map();
const probeQueue = [];
let probesRunning = 0;

const pumpQueue = () => {
	while (probesRunning < PROBE_CONCURRENCY && probeQueue.length) {
		const job = probeQueue.shift();
		probesRunning += 1;
		job().finally(() => {
			probesRunning -= 1;
			pumpQueue();
		});
	}
};

const probe = (uid, folder, file) => {
	const key = `${uid}|${folder}|${file}`;
	if (probeCache.has(key)) return Promise.resolve(probeCache.get(key));
	if (probePending.has(key)) return probePending.get(key);

	const promise = new Promise((resolve, reject) => {
		probeQueue.push(() => {
			const params = new URLSearchParams({
				user_id: String(uid),
				folder: folder || '',
				file: file || '',
			});
			return fetch(`${API_URL}/file-origin?${params.toString()}`, {
				headers: { Authorization: `Bearer ${Cookies.get(TOKEN) || ''}` },
			})
				.then(response => {
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					return response.json();
				})
				.then(payload => {
					probeCache.set(key, payload);
					resolve(payload);
				})
				.catch(error => reject(error))
				.finally(() => {
					probePending.delete(key);
				});
		});
		pumpQueue();
	});

	probePending.set(key, promise);
	return promise;
};

/* ---------------------------------------------------------------- утилиты */

const fmtStamp = value => {
	if (!value) return '';
	const text = String(value);
	// '2026-09-12 20:52:09' и ISO-форматы — приводим к локальному «ДД.ММ.ГГГГ ЧЧ:ММ»
	const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'));
	if (Number.isNaN(parsed.getTime())) return text;
	return parsed.toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const statusLabel = value => STATUS_LABELS[String(value || '').toLowerCase()] || value || '';

/** Знак «i» рисуем SVG, а не символом «ⓘ»: на 16px текстовая глифа смазывается. */
const InfoGlyph = () => (
	<svg
		className={styles.glyph}
		viewBox='0 0 16 16'
		role='presentation'
		aria-hidden='true'
		focusable='false'
	>
		<circle cx='8' cy='8' r='6.4' fill='none' stroke='currentColor' strokeWidth='1.5' />
		<circle cx='8' cy='4.85' r='1.05' fill='currentColor' />
		<rect x='7.2' y='6.85' width='1.6' height='4.6' rx='0.8' fill='currentColor' />
	</svg>
);

/** Позиция всплывающей карточки: карточка отчёта обрезает то, что нарисовано внутри неё. */
const placeNear = node => {
	const rect = node.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const popWidth = Math.min(POPOVER_WIDTH, vw - EDGE * 2);
	const tipWidth = Math.min(TOOLTIP_WIDTH, vw - EDGE * 2);
	const left = popWidth => Math.min(Math.max(EDGE, rect.right - popWidth), Math.max(EDGE, vw - popWidth - EDGE));

	const spaceBelow = vh - rect.bottom - EDGE - GAP;
	const flip = spaceBelow < 260 && rect.top > 340;

	return {
		popover: flip
			? {
					flip: true,
					left: left(popWidth),
					width: popWidth,
					bottom: vh - rect.top + GAP,
					maxHeight: Math.max(180, rect.top - EDGE - GAP),
				}
			: {
					flip: false,
					left: left(popWidth),
					width: popWidth,
					top: rect.bottom + GAP,
					maxHeight: Math.max(180, spaceBelow),
				},
		tooltip: {
			left: left(tipWidth),
			width: tipWidth,
			bottom: vh - rect.top + GAP,
		},
	};
};

/**
 * Компактная кнопка «запрос»: по какому запросу (задаче) появился файл.
 *
 * Кнопка активна только тогда, когда запрос реально есть. Проверка ленивая — при
 * появлении строки на экране. Если у файла запроса нет, кнопка не показывается вовсе
 * (место в строке при этом сохраняется, поэтому соседние «Скачать»/корзина не сдвигаются),
 * и никакой модалки с ошибкой не появляется.
 */
const FileOrigin = ({ userId, folder = '', file = '', variant = 'icon' }) => {
	const [state, setState] = useState('idle'); // idle | probing | found | missing | error
	const [data, setData] = useState(null);
	const [open, setOpen] = useState(false);
	const [hover, setHover] = useState(false);
	const [anchor, setAnchor] = useState(null);

	const wrapRef = useRef(null);
	const popoverRef = useRef(null);
	const aliveRef = useRef(true);

	const uid = userId || Cookies.get(USER_ID) || '';

	useEffect(() => {
		aliveRef.current = true;
		return () => {
			aliveRef.current = false;
		};
	}, []);

	const ensure = useCallback(() => {
		if (!file || !uid) return undefined;
		const cacheKey = `${uid}|${folder}|${file}`;
		if (probeCache.has(cacheKey)) {
			const payload = probeCache.get(cacheKey);
			setData(payload);
			setState(payload && payload.found ? 'found' : 'missing');
			return undefined;
		}
		setState(current => (current === 'found' ? current : 'probing'));
		return probe(uid, folder, file)
			.then(payload => {
				if (!aliveRef.current) return;
				setData(payload);
				setState(payload && payload.found ? 'found' : 'missing');
			})
			.catch(error => {
				if (!aliveRef.current) return;
				// Молча: интерфейс не должен пугать ошибкой на каждой строке. Кнопка просто не появится.
				// eslint-disable-next-line no-console
				console.warn('file-origin:', file, String(error && error.message));
				setState('error');
			});
	}, [file, folder, uid]);

	useEffect(() => {
		setOpen(false);
		setHover(false);
		setAnchor(null);
		setData(null);
		setState('idle');
	}, [uid, folder, file]);

	// Ленивая проверка: строка попала в зону видимости (с запасом 240px) — спрашиваем API.
	useEffect(() => {
		if (!file || !uid) return undefined;
		const node = wrapRef.current;
		if (!node || typeof IntersectionObserver === 'undefined') {
			ensure();
			return undefined;
		}
		let done = false;
		const observer = new IntersectionObserver(
			entries => {
				if (done) return;
				if (entries.some(entry => entry.isIntersecting)) {
					done = true;
					observer.disconnect();
					ensure();
				}
			},
			{ rootMargin: '240px 0px' },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [ensure, file, uid]);

	const found = state === 'found' && Boolean(data && data.found && data.task_text);
	const isSummary = Boolean(found && data && data.kind === 'summary');
	const tooltip = isSummary ? TOOLTIP_SUMMARY : TOOLTIP_QUERY;
	const moved = Boolean(data && data.moved && data.created_in_folder);
	const floating = open || (hover && !open);

	useEffect(() => {
		if (!floating || !found) {
			setAnchor(null);
			return undefined;
		}
		const refresh = () => {
			const node = wrapRef.current;
			if (!node) return;
			setAnchor(placeNear(node));
		};
		refresh();
		window.addEventListener('scroll', refresh, true);
		window.addEventListener('resize', refresh);
		return () => {
			window.removeEventListener('scroll', refresh, true);
			window.removeEventListener('resize', refresh);
		};
	}, [floating, found, open]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			const inWrap = wrapRef.current && wrapRef.current.contains(event.target);
			const inPopover = popoverRef.current && popoverRef.current.contains(event.target);
			if (!inWrap && !inPopover) setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const copyQuery = async () => {
		const text = (data && data.task_text) || '';
		if (!text) return;
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const area = document.createElement('textarea');
				area.value = text;
				area.style.position = 'fixed';
				area.style.opacity = '0';
				document.body.appendChild(area);
				area.select();
				document.execCommand('copy');
				area.remove();
			}
			message.success('Запрос скопирован');
		} catch (e) {
			message.error('Не удалось скопировать запрос');
		}
	};

	const canPortal = typeof document !== 'undefined';

	return (
		<span
			className={styles.wrap}
			ref={wrapRef}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			<button
				type='button'
				className={[
					styles.button,
					variant === 'pill' ? styles.pill : styles.icon,
					found ? '' : styles.hidden,
				]
					.filter(Boolean)
					.join(' ')}
				aria-label={tooltip}
				aria-hidden={found ? undefined : 'true'}
				tabIndex={found ? 0 : -1}
				onClick={event => {
					event.stopPropagation();
					setOpen(value => !value);
				}}
			>
				<InfoGlyph />
				{variant === 'pill' && <span className={styles.pillLabel}>запрос</span>}
			</button>

			{canPortal &&
				found &&
				hover &&
				!open &&
				anchor &&
				createPortal(
					<span
						className={styles.tooltip}
						style={{
							left: anchor.tooltip.left,
							width: anchor.tooltip.width,
							bottom: anchor.tooltip.bottom,
						}}
					>
						<span className={styles.tooltipTitle}>{tooltip}</span>
						<span className={styles.tooltipText}>{data.task_text}</span>
					</span>,
					document.body,
				)}

			{canPortal &&
				found &&
				open &&
				anchor &&
				createPortal(
					<div
						ref={popoverRef}
						className={styles.popover}
						style={{
							left: anchor.popover.left,
							width: anchor.popover.width,
							maxHeight: anchor.popover.maxHeight,
							...(anchor.popover.flip
								? { bottom: anchor.popover.bottom }
								: { top: anchor.popover.top }),
						}}
						onClick={event => event.stopPropagation()}
						role='dialog'
						aria-label={tooltip}
					>
						<div className={styles.popoverHead}>
							<span className={styles.popoverTitle}>
								{isSummary ? 'Происхождение файла' : 'Запрос, по которому появился файл'}
							</span>
							<button
								type='button'
								className={styles.close}
								onClick={() => setOpen(false)}
								aria-label='Закрыть'
							>
								×
							</button>
						</div>

						<div className={styles.fileName} title={file}>
							{file}
						</div>

						<div className={styles.body}>
							<p className={styles.text}>{data.task_text}</p>

							<div className={styles.meta}>
								{data.report_title && (
									<span>
										<b>Отчёт:</b> {data.report_title}
									</span>
								)}
								{data.period_label && (
									<span>
										<b>Период:</b> {data.period_label}
									</span>
								)}
								{!isSummary && data.created_at && (
									<span>
										<b>Когда:</b> {fmtStamp(data.created_at)}
									</span>
								)}
								{!isSummary && data.model && (
									<span>
										<b>Модель:</b> {data.model}
									</span>
								)}
								{!isSummary && data.status && (
									<span>
										<b>Статус:</b> {statusLabel(data.status)}
									</span>
								)}
								{!isSummary && data.run_id && (
									<span>
										<b>Запуск:</b> {data.run_id}
									</span>
								)}
							</div>

							{moved && (
								<div className={styles.moved}>
									Файл создан в папке «{data.created_in_folder}», сейчас лежит в «{folder}».
								</div>
							)}

							{data.matched_by && (
								<div className={styles.source}>Найдено по: {data.matched_by}</div>
							)}

							{!isSummary && (
								<div className={styles.actions}>
									<button type='button' className={styles.copy} onClick={copyQuery}>
										копировать запрос
									</button>
								</div>
							)}
						</div>
					</div>,
					document.body,
				)}
		</span>
	);
};

export default FileOrigin;
