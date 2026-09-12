import { useCallback, useEffect, useRef, useState } from 'react';
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

const shorten = (text, limit) =>
	text && text.length > limit ? `${text.slice(0, limit)}…` : text;

/**
 * Компактная кнопка «ⓘ запрос»: по какому запросу (задаче) появился файл.
 * Запрос к API ленивый — только при наведении или открытии.
 */
const FileOrigin = ({ userId, folder = '', file = '', variant = 'icon' }) => {
	const [open, setOpen] = useState(false);
	const [hover, setHover] = useState(false);
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState(null);
	const [error, setError] = useState('');

	const wrapRef = useRef(null);
	const loadingRef = useRef(false);
	const loadedKeyRef = useRef('');

	const key = `${folder}|${file}`;

	const load = useCallback(async () => {
		if (!file) return;
		if (loadedKeyRef.current === key) return;
		if (loadingRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		setError('');
		try {
			const uid = userId || Cookies.get(USER_ID);
			if (!uid) throw new Error('no user id');
			const params = new URLSearchParams({
				user_id: String(uid),
				folder: folder || '',
				file: file || '',
			});
			const response = await fetch(`${API_URL}/file-origin?${params.toString()}`, {
				headers: { Authorization: `Bearer ${Cookies.get(TOKEN) || ''}` },
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const payload = await response.json();
			setData(payload);
			loadedKeyRef.current = key;
		} catch (e) {
			setError('не удалось получить запрос');
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [file, folder, key, userId]);

	useEffect(() => {
		// при смене файла сбрасываем кэш компонента
		loadedKeyRef.current = '';
		setData(null);
		setError('');
		setOpen(false);
	}, [key]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
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

	const found = Boolean(data && data.found && data.task_text);
	const tooltip = loading
		? 'загружаю запрос…'
		: error
			? error
			: data
				? found
					? shorten(data.task_text, 180)
					: 'запрос не найден (файл создан раньше)'
				: '';

	return (
		<span
			className={styles.wrap}
			ref={wrapRef}
			onMouseEnter={() => {
				setHover(true);
				load();
			}}
			onMouseLeave={() => setHover(false)}
		>
			<button
				type='button'
				className={`${styles.button} ${variant === 'pill' ? styles.pill : styles.icon}`}
				title='По какому запросу появился файл'
				aria-label='По какому запросу появился файл'
				onClick={event => {
					event.stopPropagation();
					setOpen(value => !value);
					load();
				}}
			>
				{variant === 'pill' ? 'ⓘ запрос' : 'ⓘ'}
			</button>

			{hover && !open && tooltip && (
				<span className={styles.tooltip}>
					<span className={styles.tooltipTitle}>Запрос, по которому создан файл</span>
					{tooltip}
				</span>
			)}

			{open && (
				<div
					className={styles.popover}
					onClick={event => event.stopPropagation()}
					role='dialog'
					aria-label='Запрос, по которому появился файл'
				>
					<div className={styles.popoverHead}>
						<span className={styles.popoverTitle}>Запрос, по которому появился файл</span>
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

					{loading && <div className={styles.state}>Загружаю запрос…</div>}

					{!loading && error && <div className={styles.error}>{error}</div>}

					{!loading && !error && found && (
						<>
							<p className={styles.text}>{data.task_text}</p>
							<div className={styles.meta}>
								{data.created_at && (
									<span>
										<b>Когда:</b> {fmtStamp(data.created_at)}
									</span>
								)}
								{data.model && (
									<span>
										<b>Модель:</b> {data.model}
									</span>
								)}
								{data.status && (
									<span>
										<b>Статус:</b> {statusLabel(data.status)}
									</span>
								)}
								{data.run_id && (
									<span>
										<b>Запуск:</b> {data.run_id}
									</span>
								)}
							</div>
							<div className={styles.actions}>
								<button type='button' className={styles.copy} onClick={copyQuery}>
									копировать запрос
								</button>
							</div>
						</>
					)}

					{!loading && !error && !found && (
						<div className={styles.state}>
							{data && data.reason ? data.reason : 'запрос не найден (файл создан раньше)'}
						</div>
					)}
				</div>
			)}
		</span>
	);
};

export default FileOrigin;
