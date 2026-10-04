import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/button/Button';
import FileUploader from '@/components/ui/file-uploader/FileUploader';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { $axios } from '@/api';
import { API_URL, TOKEN } from '@/app.constants';
import { useCheckAuth } from '@/hooks/useCheckAuth';

import styles from './MosinformRating.module.scss';

const LAST_JOB_KEY = 'mosinform_last_job';

// Имена скачиваемых файлов: пилотная презентация и итоговый отчёт «Мосинформ.Индекс».
const FILE_NAMES = {
	pptx: 'mosinform_rating.pptx',
	xlsx: 'mosinform_rating.xlsx',
	'index-pptx': 'Мосинформ_Индекс_отчёт.pptx',
	'index-pdf': 'Мосинформ_Индекс_отчёт.pdf',
	'index-xlsx': 'Мосинформ_Индекс_расчёт.xlsx',
};

const _fileSize = bytes => {
	if (!bytes) return '0 КБ';
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} КБ`;
	return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};

// Компактный рейтинг: место, объект, индекс, ключевые цифры.
const RatingTable = ({ title, rows }) => {
	if (!rows || !rows.length) return null;
	return (
		<div className={styles.rating}>
			<div className={styles.ratingTitle}>{title}</div>
			<table className={styles.ratingTable}>
				<tbody>
					{rows.map(row => (
						<tr key={row.id}>
							<td className={styles.ratingPlace}>{row.place}</td>
							<td className={styles.ratingName}>{row.name}</td>
							<td className={styles.ratingIndex}>
								{Number(row.index).toFixed(1).replace('.', ',')}
							</td>
							<td className={styles.ratingMeta}>
								{row.messages} сообщ. · позитив{' '}
								{Number(row.positive_share).toFixed(0)}% · повестка Мэра{' '}
								{Number(row.mayor_agenda).toFixed(0)}%
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

const MosinformRating = () => {
	useCheckAuth();
	const { active_menu } = useSelector(store => store.booleanValues);

	const [files, setFiles] = useState([]);
	const [period, setPeriod] = useState('');
	const [jobId, setJobId] = useState(null);
	const [status, setStatus] = useState(null);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const timer = useRef(null);

	const poll = useCallback(async id => {
		try {
			const { data } = await $axios.get(`/mosinform/jobs/${id}`);
			setStatus(data);
			if (data.status === 'done' || data.status === 'error') {
				setBusy(false);
				if (timer.current) clearInterval(timer.current);
			} else {
				setBusy(true);
			}
		} catch (e) {
			setError(e.response?.data?.detail || e.message);
			setBusy(false);
		}
	}, []);

	useEffect(() => {
		const saved = localStorage.getItem(LAST_JOB_KEY);
		if (saved) {
			setJobId(saved);
			poll(saved);
			timer.current = setInterval(() => poll(saved), 2500);
		}
		return () => {
			if (timer.current) clearInterval(timer.current);
		};
	}, [poll]);

	const start = async () => {
		if (!files.length) {
			setError('Загрузите Word/Excel Медиалогии или zip');
			return;
		}
		setError('');
		setBusy(true);
		setStatus(null);
		const form = new FormData();
		form.append('period', period);
		files.forEach(f => form.append('files', f));
		try {
			const token = Cookies.get(TOKEN);
			const res = await fetch(`${API_URL}/mosinform/jobs`, {
				method: 'POST',
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				body: form,
			});
			if (!res.ok) {
				const detail = await res.text();
				throw new Error(detail || res.statusText);
			}
			const data = await res.json();
			setJobId(data.job_id);
			localStorage.setItem(LAST_JOB_KEY, data.job_id);
			if (timer.current) clearInterval(timer.current);
			timer.current = setInterval(() => poll(data.job_id), 2500);
			poll(data.job_id);
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	const download = kind => {
		if (!jobId) return;
		const token = Cookies.get(TOKEN);
		fetch(`${API_URL}/mosinform/jobs/${jobId}/${kind}`, {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		})
			.then(r => r.blob())
			.then(blob => {
				const a = document.createElement('a');
				a.href = URL.createObjectURL(blob);
				a.download = FILE_NAMES[kind] || `mosinform_rating_${kind}`;
				a.click();
			});
	};

	return (
		<Layout>
			{active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>
				<div className={styles.page}>
					<h1 className={styles.title}>Мосинформ.Индекс</h1>
					<p className={styles.lead}>
						Загрузите выгрузки Медиалогии (docx, xlsx или zip). Система разберёт тексты,
						разметит объекты локальной моделью и соберёт два файла: пилотную презентацию
						по 13 параметрам и итоговый отчёт «Мосинформ.Индекс» (PPTX и PDF, 33 слайда —
						ключевые выводы, метрики по департаментам и проектам, персоны, инфоповоды,
						методология расчёта индекса). Результат сохраняется на сервере — его можно
						открыть позже во вкладке{' '}
						<Link to="/data-set?tab=mosinform">Наборы данных → Мосинформ.Рейтинг</Link>.
					</p>
					<label className={styles.label}>Период на слайдах</label>
					<input
						className={styles.input}
						placeholder="Июль 2026"
						value={period}
						onChange={e => setPeriod(e.target.value)}
						disabled={busy}
					/>
					<FileUploader
						acceptedTypes=".docx,.xlsx,.xls,.zip"
						onFileUpload={next => setFiles(prev => [...prev, ...next])}
					/>
					{files.length > 0 && (
						<ul className={styles.files}>
							{files.map(f => (
								<li key={f.name}>
									{f.name} · {_fileSize(f.size)}
								</li>
							))}
						</ul>
					)}
					<div className={styles.actions}>
						<Button onClick={start} disabled={busy}>
							{busy ? 'Считаем…' : 'Собрать отчёт'}
						</Button>
						{files.length > 0 && !busy && (
							<button className={styles.clear} type="button" onClick={() => setFiles([])}>
								Очистить файлы
							</button>
						)}
					</div>
					{error && <div className={styles.error}>{error}</div>}
					{status && (
						<div className={styles.status}>
							<div>
								<strong>{status.status}</strong> — {status.message}
							</div>
							{status.summary?.messages != null && (
								<p>
									Текстов: {status.summary.messages}, объектов:{' '}
									{status.summary.objects}, без объекта: {status.summary.untagged}
								</p>
							)}
							{(status.has_index_pptx || status.has_index_pdf) && (
								<div className={styles.indexBlock}>
									<h2 className={styles.indexTitle}>Итоговый отчёт «Мосинформ.Индекс»</h2>
									<p className={styles.indexNote}>
										{status.summary?.index?.period
											? `Период: ${status.summary.index.period}. `
											: ''}
										Показатели в расчёте:{' '}
										{(status.summary?.index?.used_metrics || []).length}{' '}
										{(status.summary?.index?.missing_metrics || []).length > 0
											? '· часть показателей в поставке отсутствует'
											: ''}
									</p>
									<div className={styles.actions}>
										{status.has_index_pptx && (
											<Button onClick={() => download('index-pptx')}>
												Скачать отчёт PPTX
											</Button>
										)}
										{status.has_index_pdf && (
											<Button onClick={() => download('index-pdf')}>
												Скачать отчёт PDF
											</Button>
										)}
										{status.has_index_xlsx && (
											<Button onClick={() => download('index-xlsx')}>
												Расчёт индекса
											</Button>
										)}
									</div>
									<RatingTable
										title="Департаменты"
										rows={status.summary?.index?.departments}
									/>
									<RatingTable
										title="Проекты"
										rows={status.summary?.index?.projects}
									/>
								</div>
							)}
							{status.has_pptx && (
								<div className={styles.actions}>
									<Button onClick={() => download('pptx')}>
										Скачать пилотную презентацию
									</Button>
									{status.has_xlsx && (
										<Button onClick={() => download('xlsx')}>Скачать Excel</Button>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</Content>
		</Layout>
	);
};

export default MosinformRating;
