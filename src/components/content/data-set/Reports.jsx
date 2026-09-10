import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';

import { API_URL, TOKEN, USER_ID } from '@/app.constants';

import styles from './Reports.module.scss';

const fmtSize = bytes => {
	const b = Number(bytes) || 0;
	if (b < 1024) return `${b} Б`;
	if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} КБ`;
	return `${(b / (1024 * 1024)).toFixed(2)} МБ`;
};

const fmtDate = iso => {
	try {
		return new Date(iso).toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch (e) {
		return '';
	}
};

const iconFor = name => {
	const low = (name || '').toLowerCase();
	if (low.endsWith('.pdf')) return '📕';
	if (low.endsWith('.docx')) return '📘';
	if (low.endsWith('.png')) return '🖼️';
	if (low.endsWith('.html')) return '🌐';
	if (low.endsWith('.md')) return '📝';
	return '📄';
};

const Reports = ({ filterText = '' }) => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState('');

	const userId = Cookies.get(USER_ID);

	const resolveUserId = async () => {
		let uid = Cookies.get(USER_ID);
		if (uid) return uid;
		try {
			const r = await fetch(`${API_URL}/user-id`, {
				headers: { Authorization: `Bearer ${Cookies.get(TOKEN)}` },
			});
			if (!r.ok) return null;
			const d = await r.json();
			if (d && typeof d === 'object') return d.user_id || d.id || d.userId || null;
			return d;
		} catch (e) {
			return null;
		}
	};

	const load = async () => {
		setLoading(true);
		setError('');
		try {
			const uid = userId || (await resolveUserId());
			if (!uid) throw new Error('no user id');
			const r = await fetch(`${API_URL}/reports/${uid}`, {
				headers: { Authorization: `Bearer ${Cookies.get(TOKEN)}` },
			});
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const d = await r.json();
			setData(d?.values || []);
		} catch (e) {
			setError('Не удалось загрузить список отчётов');
			setData([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const download = async (folder, file) => {
		const key = `${folder}/${file.name}`;
		setBusy(key);
		try {
			const uid = userId || (await resolveUserId());
			const r = await fetch(
				`${API_URL}/reports/download/${uid}/${encodeURIComponent(folder)}/${encodeURIComponent(file.name)}`,
				{ headers: { Authorization: `Bearer ${Cookies.get(TOKEN)}` } },
			);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const blob = await r.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = file.name;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 4000);
		} catch (e) {
			setError(`Не удалось скачать ${file.name}`);
		} finally {
			setBusy('');
		}
	};

	const groups = useMemo(() => {
		const q = (filterText || '').trim().toLowerCase();
		return (data || [])
			.map(g => ({
				...g,
				files: (g.files || []).filter(f => !q || f.name.toLowerCase().includes(q)),
			}))
			.filter(g => g.files.length > 0);
	}, [data, filterText]);

	if (loading) {
		return <div className={styles.state}>Загрузка отчётов…</div>;
	}

	if (error && groups.length === 0) {
		return (
			<div className={styles.state}>
				{error}
				<button type='button' className={styles.retry} onClick={load}>
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
			{error && <div className={styles.warn}>{error}</div>}
			{groups.map(group => (
				<div key={group.folder} className={styles.group}>
					<div className={styles.groupHead}>
						<span className={styles.groupIcon}>🗂️</span>
						<h3 className={styles.groupTitle}>{group.folder}</h3>
						<span className={styles.groupCount}>{group.files.length} файл(ов)</span>
					</div>
					<div className={styles.files}>
						{group.files.map(file => {
							const key = `${group.folder}/${file.name}`;
							return (
								<div key={key} className={styles.fileRow}>
									<span className={styles.fileIcon}>{iconFor(file.name)}</span>
									<div className={styles.fileInfo}>
										<span className={styles.fileName}>{file.name}</span>
										<span className={styles.fileMeta}>
											{fmtSize(file.size)} · {fmtDate(file.modified)}
										</span>
									</div>
									<button
										type='button'
										className={styles.downloadBtn}
										disabled={busy === key}
										onClick={() => download(group.folder, file)}
									>
										{busy === key ? 'Скачивание…' : 'Скачать'}
									</button>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
};

export default Reports;
