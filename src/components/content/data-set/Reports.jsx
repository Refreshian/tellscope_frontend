import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { Modal, message } from 'antd';

import { API_URL, TOKEN } from '@/app.constants';

import styles from './Reports.module.scss';
import FileOrigin from '@/components/ui/file-origin/FileOrigin';
import FileSortSwitch from '@/components/ui/file-sort/FileSortSwitch';
import { useFileSort } from '@/hooks/useFileSort';
import { resolveCurrentUserId, useCurrentUserId } from '@/hooks/useCurrentUser';
import { sortByMode, sortGroupsByMode } from '@/utils/fileSort';

/* ------------------------------------------------------------------ утилиты */

const fmtSize = bytes => {
	const b = Number(bytes) || 0;
	if (b < 1024) return `${b} Б`;
	if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} КБ`;
	return `${(b / (1024 * 1024)).toFixed(2)} МБ`;
};

const fmtDate = iso => {
	if (!iso) return '—';
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return '—';
	return parsed.toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const plural = (n, one, few, many) => {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return one;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
	return many;
};

/* Тип файла — по расширению. Цвет иконки зависит от типа, как в системном проводнике. */
const FILE_KINDS = {
	doc: { color: '#2563eb', title: 'Документ Word' },
	sheet: { color: '#16a34a', title: 'Таблица' },
	pdf: { color: '#dc2626', title: 'Документ PDF' },
	json: { color: '#6b7280', title: 'Данные JSON' },
	html: { color: '#7c3aed', title: 'Веб-страница' },
	image: { color: '#0891b2', title: 'Изображение' },
	text: { color: '#6b7280', title: 'Текст' },
	other: { color: '#6b7280', title: 'Файл' },
};

const EXT_KINDS = {
	docx: 'doc',
	doc: 'doc',
	rtf: 'doc',
	pdf: 'pdf',
	xlsx: 'sheet',
	xls: 'sheet',
	csv: 'sheet',
	tsv: 'sheet',
	json: 'json',
	html: 'html',
	htm: 'html',
	png: 'image',
	jpg: 'image',
	jpeg: 'image',
	gif: 'image',
	webp: 'image',
	svg: 'image',
	md: 'text',
	txt: 'text',
	log: 'text',
};

const kindOf = name => {
	const dot = String(name || '').lastIndexOf('.');
	if (dot < 0) return 'other';
	return EXT_KINDS[String(name).slice(dot + 1).toLowerCase()] || 'other';
};

/* ------------------------------------------------------------------ иконки */

const FolderIcon = () => (
	<svg className={styles.glyph} width='16' height='16' viewBox='0 0 16 16' aria-hidden='true'>
		<path
			d='M1.6 4.1c0-.8.65-1.45 1.45-1.45h2.5c.4 0 .78.16 1.06.44l.72.72c.28.28.66.44 1.06.44h3.55c.8 0 1.45.65 1.45 1.45v6.2c0 .8-.65 1.45-1.45 1.45H3.05c-.8 0-1.45-.65-1.45-1.45V4.1Z'
			fill='#d9a441'
		/>
		<path d='M1.6 5.6h12.8' stroke='#c08f2c' strokeWidth='1' strokeLinecap='round' />
	</svg>
);

const FileIcon = ({ kind }) => {
	const meta = FILE_KINDS[kind] || FILE_KINDS.other;
	return (
		<svg
			className={styles.glyph}
			width='16'
			height='16'
			viewBox='0 0 16 16'
			aria-hidden='true'
		>
			<title>{meta.title}</title>
			<path
				d='M3.9 1.6h4.9L12.1 5v9.4H3.9V1.6Z'
				fill={meta.color}
				fillOpacity='0.12'
				stroke={meta.color}
				strokeWidth='1.15'
				strokeLinejoin='round'
			/>
			<path
				d='M8.8 1.6V5h3.3'
				fill='none'
				stroke={meta.color}
				strokeWidth='1.15'
				strokeLinejoin='round'
			/>
			<path
				d='M6 9.1h4M6 11.3h4'
				fill='none'
				stroke={meta.color}
				strokeWidth='1.15'
				strokeLinecap='round'
			/>
		</svg>
	);
};

const TrashIcon = () => (
	<svg
		className={styles.glyph}
		width='15'
		height='15'
		viewBox='0 0 16 16'
		aria-hidden='true'
		fill='none'
		stroke='currentColor'
		strokeWidth='1.2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<path d='M3.2 4.5h9.6' />
		<path d='M6.4 4.5V3.2h3.2v1.3' />
		<path d='M4.7 4.5l.55 8.3h5.5l.55-8.3' />
		<path d='M6.7 6.7v4.3M9.3 6.7v4.3' />
	</svg>
);

/* ------------------------------------------------------------------ ошибки */

const describeError = (response, payload) => {
	const detail = payload && payload.detail;
	if (typeof detail === 'string' && detail) return `HTTP ${response.status}: ${detail}`;
	if (detail && typeof detail === 'object') {
		const parts = [detail.message || `HTTP ${response.status}`];
		if (detail.count) parts.push(`файлов: ${detail.count}`);
		return parts.join(', ');
	}
	return `HTTP ${response.status}`;
};

const readJson = async response => {
	try {
		return await response.json();
	} catch (e) {
		return null;
	}
};

/* ------------------------------------------------------------------ компонент */

const Reports = ({ filterText = '' }) => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState('');
	const [deleting, setDeleting] = useState('');
	const [selected, setSelected] = useState('');
	// id текущего пользователя приходит из /me (см. resolveUserId), а не из cookie
	const [userId, setUserId] = useState('');
	// Серверный id текущего пользователя: пока /me не ответил — пустая строка
	const currentUserId = useCurrentUserId();

	// Порядок файлов. По умолчанию — «сначала новые»: свежий отчёт виден сразу, без поиска
	// глазами (API отдаёт файлы по алфавиту, а не по дате). Выбор запоминается в localStorage.
	const [sortMode, setSortMode] = useFileSort();

	const userIdRef = useRef('');
	const resourceRef = useRef('');

	const headers = () => ({ Authorization: `Bearer ${Cookies.get(TOKEN) || ''}` });

	/**
	 * Идентификатор пользователя.
	 *
	 * Источник истины — `/api/me` (общий кэширующий хук `useCurrentUser`). Cookie `user_id`
	 * для чтения больше не используется: она переживала выход, и после входа под другой
	 * учётной записью список отчётов запрашивался по чужому id — сервер отвечал
	 * «403: Нет доступа» (`GET /reports/32` токеном пользователя с id 1).
	 */
	const resolveUserId = useCallback(async () => {
		const id = await resolveCurrentUserId();
		userIdRef.current = id;
		setUserId(id);
		return id;
	}, []);

	const load = useCallback(
		async ({ silent = false } = {}) => {
			if (!silent) setLoading(true);
			setError('');
			try {
				const uid = await resolveUserId();
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 30000);
				let response;
				try {
					response = await fetch(`${API_URL}/reports/${uid}`, {
						headers: headers(),
						signal: controller.signal,
					});
				} finally {
					clearTimeout(timer);
				}

				if (!response.ok) {
					const payload = await readJson(response);
					const detail = payload && payload.detail ? `: ${payload.detail}` : '';
					const failure = new Error(
						`GET /reports/${uid} → HTTP ${response.status}${detail}`,
					);
					failure.status = response.status;
					throw failure;
				}

				const payload = await readJson(response);
				const values = Array.isArray(payload && payload.values) ? payload.values : [];
				setData(values);
				resourceRef.current = `${uid}/reports`;
			} catch (e) {
				// Технические детали — только в консоль: пользователь не должен видеть
				// «GET /reports/32 → HTTP 403: Нет доступа» вместо понятного сообщения.
				console.error('[Отчёты] не удалось загрузить список', e);
				const aborted = e && e.name === 'AbortError';
				const status = e && e.status;
				if (aborted) {
					setError(
						'Не удалось загрузить отчёты: истекло время ожидания. Обновите страницу или войдите заново.',
					);
				} else if (status === 401 || status === 403) {
					setError('Не удалось загрузить отчёты. Обновите страницу или войдите заново.');
				} else {
					setError('Не удалось загрузить отчёты. Попробуйте ещё раз или обновите страницу.');
				}
				if (!silent) setData([]);
			} finally {
				if (!silent) setLoading(false);
			}
		},
		[resolveUserId],
	);

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Смена пользователя без перезагрузки страницы (вход после выхода в другой вкладке):
	// перечитываем список уже под серверным id, чтобы на экране не остались данные прошлой
	// учётной записи. Первый ответ /me здесь пропускаем — загрузку уже начал эффект выше,
	// иначе один и тот же список запрашивался бы дважды.
	useEffect(() => {
		if (!currentUserId) return;
		if (!userIdRef.current) {
			userIdRef.current = currentUserId;
			return;
		}
		if (userIdRef.current === currentUserId) return;
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUserId]);

	/* --------------------------------------------------------------- скачивание */

	const download = async (folder, file) => {
		const key = `${folder}/${file.name}`;
		setBusy(key);
		try {
			const uid = await resolveUserId();
			const response = await fetch(
				`${API_URL}/reports/download/${encodeURIComponent(uid)}/${encodeURIComponent(folder)}/${encodeURIComponent(file.name)}`,
				{ headers: headers() },
			);
			if (!response.ok) {
				const failure = new Error(`HTTP ${response.status}`);
				failure.status = response.status;
				throw failure;
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = file.name;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 4000);
		} catch (e) {
			console.error('[Отчёты] не удалось скачать файл', file.name, e);
			const status = e && e.status;
			message.error(
				status === 401 || status === 403
					? `Не удалось скачать «${file.name}». Обновите страницу или войдите заново.`
					: `Не удалось скачать «${file.name}». Попробуйте ещё раз.`,
			);
		} finally {
			setBusy('');
		}
	};

	/* ----------------------------------------------------------------- удаление */

	const deleteRequest = async path => {
		const uid = await resolveUserId();
		const response = await fetch(
			`${API_URL}/reports/${path.replace('{uid}', encodeURIComponent(uid))}`,
			{ method: 'DELETE', headers: headers() },
		);
		return { response, payload: await readJson(response) };
	};

	const askDeleteFile = (folder, file) => {
		Modal.confirm({
			title: 'Удалить файл?',
			icon: null,
			width: 460,
			content: (
				<div className={styles.confirmBody}>
					<div className={styles.confirmName}>{file.name}</div>
					<div className={styles.confirmHint}>
						Папка: {folder}. Файл будет удалён с диска без возможности восстановления.
					</div>
				</div>
			),
			okText: 'Удалить',
			okButtonProps: { danger: true },
			cancelText: 'Отмена',
			onOk: async () => {
				const key = `${folder}/${file.name}`;
				setDeleting(key);
				try {
					const { response, payload } = await deleteRequest(
						`file/{uid}/${encodeURIComponent(folder)}/${encodeURIComponent(file.name)}`,
					);
					if (!response.ok) throw new Error(describeError(response, payload));
					message.success(`Файл «${file.name}» удалён`);
					setSelected('');
					await load({ silent: true });
				} catch (e) {
					console.error('[Отчёты] не удалось удалить файл', file.name, e);
					message.error(`Не удалось удалить «${file.name}»: ${(e && e.message) || 'ошибка'}`);
				} finally {
					setDeleting('');
				}
			},
		});
	};

	const removeFolder = async (folder, { force = false } = {}) => {
		setDeleting(`folder:${folder}`);
		try {
			const { response, payload } = await deleteRequest(
				`folder/{uid}/${encodeURIComponent(folder)}${force ? '?force=true' : ''}`,
			);

			// Папка не пуста: сервер отвечает 409 и списком файлов — уточняем у пользователя.
			if (response.status === 409 && payload && payload.detail) {
				const detail = payload.detail;
				const files = Array.isArray(detail.files) ? detail.files : [];
				const count = Number(detail.count) || files.length;
				setDeleting('');
				Modal.confirm({
					title: 'Папка не пуста',
					icon: null,
					width: 460,
					content: (
						<div className={styles.confirmBody}>
							<div className={styles.confirmName}>{folder}</div>
							<div className={styles.confirmHint}>
								В папке {count} {plural(count, 'файл', 'файла', 'файлов')}. Удалить папку
								вместе со всем содержимым?
							</div>
							{files.length > 0 && (
								<ul className={styles.confirmList}>
									{files.slice(0, 5).map(name => (
										<li key={name}>{name}</li>
									))}
									{count > files.length && <li>…и ещё {count - files.length}</li>}
								</ul>
							)}
						</div>
					),
					okText: 'Удалить папку с файлами',
					okButtonProps: { danger: true },
					cancelText: 'Отмена',
					onOk: () => removeFolder(folder, { force: true }),
				});
				return;
			}

			if (!response.ok) throw new Error(describeError(response, payload));
			const removed = Number(payload && payload.removed_files) || 0;
			message.success(
				removed > 0
					? `Папка «${folder}» удалена вместе с ${removed} ${plural(removed, 'файлом', 'файлами', 'файлами')}`
					: `Папка «${folder}» удалена`,
			);
			setSelected('');
			await load({ silent: true });
		} catch (e) {
			console.error('[Отчёты] не удалось удалить папку', folder, e);
			message.error(`Не удалось удалить папку «${folder}»: ${(e && e.message) || 'ошибка'}`);
		} finally {
			setDeleting('');
		}
	};

	const askDeleteFolder = (folder, count) => {
		Modal.confirm({
			title: 'Удалить папку?',
			icon: null,
			width: 460,
			content: (
				<div className={styles.confirmBody}>
					<div className={styles.confirmName}>{folder}</div>
					<div className={styles.confirmHint}>
						{count > 0
							? `В папке ${count} ${plural(count, 'файл', 'файла', 'файлов')}. Папка будет удалена без возможности восстановления.`
							: 'Папка пуста. Она будет удалена без возможности восстановления.'}
					</div>
				</div>
			),
			okText: 'Удалить',
			okButtonProps: { danger: true },
			cancelText: 'Отмена',
			onOk: () => removeFolder(folder),
		});
	};

	/* ------------------------------------------------------------------- вывод */

	const groups = useMemo(() => {
		const q = (filterText || '').trim().toLowerCase();

		// Поиск по названию и сортировка работают вместе: сначала отбираем по подстроке,
		// затем упорядочиваем — и файлы внутри папки, и сами папки.
		const matching = (data || [])
			.map(group => ({
				...group,
				files: (group.files || []).filter(f => !q || f.name.toLowerCase().includes(q)),
			}))
			.filter(group => group.files.length > 0);

		const sorted = matching.map(group => ({
			...group,
			// Дата берётся из поля `modified` (ISO-строка из API), а не из имени файла:
			// `2024-08_summary.json` новее `2024-05_summary.json`, хотя по алфавиту идёт ниже.
			files: sortByMode(
				group.files,
				sortMode,
				file => file.modified,
				file => file.name,
			),
		}));

		return sortGroupsByMode(
			sorted,
			sortMode,
			group => group.files,
			group => group.folder,
			file => file.modified,
		);
	}, [data, filterText, sortMode]);

	const totalFiles = groups.reduce((sum, group) => sum + group.files.length, 0);

	if (loading) {
		return <div className={styles.state}>Загрузка отчётов…</div>;
	}

	if (error && groups.length === 0) {
		return (
			<div className={styles.state}>
				<span className={styles.stateError}>{error}</span>
				<button type='button' className={styles.retry} onClick={() => load()}>
					Повторить
				</button>
			</div>
		);
	}

	if (groups.length === 0) {
		return (
			<div className={styles.state}>
				Отчётов пока нет. Они появятся здесь после формирования выгрузок по датасету.
			</div>
		);
	}

	return (
		<div className={styles.wrapper}>
			{error && (
				<div className={styles.warn}>
					<span className={styles.warnText}>{error}</span>
					<button type='button' className={styles.warnRetry} onClick={() => load()}>
						Повторить
					</button>
				</div>
			)}

			<div className={styles.toolbar}>
				<span className={styles.toolbarLabel}>Сортировка</span>
				<FileSortSwitch value={sortMode} onChange={setSortMode} />
				<span className={styles.toolbarMeta}>
					{totalFiles} {plural(totalFiles, 'файл', 'файла', 'файлов')} в{' '}
					{groups.length} {plural(groups.length, 'папке', 'папках', 'папках')}
				</span>
			</div>

			<div className={styles.list}>
				{groups.map(group => {
					const folderKey = `folder:${group.folder}`;
					return (
						<section key={group.folder} className={styles.group}>
							<header className={styles.groupHead}>
								<FolderIcon />
								<h3 className={styles.groupTitle} title={group.folder}>
									{group.folder}
								</h3>
								<span className={styles.groupCount}>
									{group.files.length}{' '}
									{plural(group.files.length, 'файл', 'файла', 'файлов')}
								</span>
								<button
									type='button'
									className={styles.iconBtn}
									title={`Удалить папку «${group.folder}»`}
									aria-label={`Удалить папку ${group.folder}`}
									disabled={deleting === folderKey}
									onClick={() => askDeleteFolder(group.folder, group.files.length)}
								>
									{deleting === folderKey ? (
										<span className={styles.spinner} />
									) : (
										<TrashIcon />
									)}
								</button>
							</header>

							<div className={styles.columns}>
								<span className={styles.colName}>Имя</span>
								<span className={styles.colSize}>Размер</span>
								<span className={styles.colDate}>Дата</span>
								<span className={styles.colActions} />
							</div>

							<div className={styles.rows}>
								{group.files.map(file => {
									const key = `${group.folder}/${file.name}`;
									const isBusy = busy === key || deleting === key;
									return (
										<div
											key={key}
											className={`${styles.row} ${
												selected === key ? styles.rowSelected : ''
											}`}
											onClick={() => setSelected(key)}
										>
											<span className={styles.cellName}>
												<FileIcon kind={kindOf(file.name)} />
												<span className={styles.fileName} title={file.name}>
													{file.name}
												</span>
											</span>

											<span className={styles.cellSize}>{fmtSize(file.size)}</span>

											<span className={styles.cellDate}>{fmtDate(file.modified)}</span>

											<span className={styles.cellActions}>
												<button
													type='button'
													className={styles.downloadBtn}
													disabled={isBusy}
													onClick={event => {
														event.stopPropagation();
														download(group.folder, file);
													}}
												>
													{busy === key ? 'Скачивание…' : 'Скачать'}
												</button>
												<FileOrigin
													userId={userId}
													folder={group.folder}
													file={file.name}
													variant='pill'
												/>
												<button
													type='button'
													className={styles.deleteBtn}
													title={`Удалить файл «${file.name}»`}
													aria-label={`Удалить файл ${file.name}`}
													disabled={isBusy}
													onClick={event => {
														event.stopPropagation();
														askDeleteFile(group.folder, file);
													}}
												>
													{deleting === key ? (
														<span className={styles.spinner} />
													) : (
														<TrashIcon />
													)}
												</button>
											</span>
										</div>
									);
								})}
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
};

export default Reports;
