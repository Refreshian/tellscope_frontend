import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { $axios } from '@/api';
import { useJobsScope } from '@/hooks/useJobsScope';

import JobsScopeSwitch from './JobsScopeSwitch';
import styles from './MosinformArchive.module.scss';

const PRODUCT_LABEL = {
	mosinform: 'Мосинформ.Рейтинг',
	'llm-run': 'ИИ анализ',
	'smart-agent': 'Smart-agent',
	upload: 'Загрузка файла',
};

const STATUS_LABEL = {
	queued: 'В очереди',
	pending: 'В очереди',
	running: 'Считается',
	in_progress: 'Считается',
	llm_processing: 'Считается',
	initializing: 'Старт',
	done: 'Готово',
	completed: 'Готово',
	success: 'Готово',
	error: 'Ошибка',
	failed: 'Ошибка',
	unknown: 'Неизвестно',
};

const formatWhen = iso => {
	if (!iso || String(iso).startsWith('2020-01-01')) return '—';
	const date = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleString('ru-RU');
};

// «Скрыто» = задачи других пользователей + старые записи без автора: их бэкенд не отдаёт.
const hiddenNote = hidden =>
	`Скрыто записей: ${hidden} — это задачи других пользователей и старые записи без автора.`;

const MlopsQueue = ({ filterText = '' }) => {
	const [jobs, setJobs] = useState([]);
	const [busy, setBusy] = useState([]);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);
	const [hidden, setHidden] = useState(0);
	const { isSuperuser, ready: scopeReady, showAll, setShowAll } = useJobsScope();

	const load = useCallback(async () => {
		try {
			const [{ data: all }, { data: live }] = await Promise.all([
				$axios.get('/mlops/jobs', showAll ? { params: { all: 1 } } : undefined),
				$axios.get('/mlops/busy'),
			]);
			setJobs(Array.isArray(all?.jobs) ? all.jobs : []);
			setHidden(Number(all?.hidden) || 0);
			setBusy(Array.isArray(live?.jobs) ? live.jobs : []);
			setError('');
		} catch (e) {
			setError(e.response?.data?.detail || e.message || 'Не удалось загрузить очередь');
		} finally {
			setLoading(false);
		}
	}, [showAll]);

	useEffect(() => {
		// Права выясняем до первого запроса, иначе список мигнул бы «только свои» → «все».
		if (!scopeReady) return;
		load();
		const timer = setInterval(load, 4000);
		return () => clearInterval(timer);
	}, [load, scopeReady]);

	const visible = useMemo(() => {
		const query = filterText.trim().toLowerCase();
		if (!query) return jobs;
		return jobs.filter(job =>
			[job.product, job.status, job.message, job.files, job.job_id, job.route]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
				.includes(query),
		);
	}, [jobs, filterText]);

	if (loading) {
		return <p className={styles.hint}>Загружаем очередь расчётов…</p>;
	}
	if (error && !jobs.length) {
		return <p className={styles.errorBox}>{error}</p>;
	}

	const scopeHint = isSuperuser
		? showAll
			? 'Показаны все задачи тенанта, включая задачи других пользователей.'
			: `Показаны только ваши задачи.${hidden ? ` ${hiddenNote(hidden)}` : ''} Включите «Показать все задачи», чтобы увидеть журнал тенанта.`
		: `Видны только ваши задачи.${hidden ? ` ${hiddenNote(hidden)}` : ''}`;

	return (
		<div className={styles.list}>
			<div className={styles.head}>
				<p className={styles.lead}>
					Общий журнал GPU-задач: Мосинформ, ИИ-анализ, smart-agent, загрузка файлов.
					Пока одна из них живая, вторая тяжёлая задача на Qwen не стартует.
				</p>
				<Link className={styles.link} to="/mosinform-rating">
					Новый рейтинг
				</Link>
			</div>
			{isSuperuser ? (
				<JobsScopeSwitch checked={showAll} onChange={setShowAll} hint={scopeHint} />
			) : (
				<p className={styles.lead}>{scopeHint}</p>
			)}
			{busy.length > 0 && (
				<p className={styles.lead}>
					Сейчас на GPU:{' '}
					{busy
						.map(job =>
							`${PRODUCT_LABEL[job.product] || job.product}${
								job.foreign
									? ' — задача другого пользователя'
									: job.job_id
										? ` (${job.job_id})`
										: ''
							}`,
						)
						.join(', ')}
				</p>
			)}
			{!visible.length && (
				<div className={styles.empty}>
					<p>Пока нет записей в журнале.</p>
					{hidden > 0 && <p className={styles.meta}>{hiddenNote(hidden)}</p>}
				</div>
			)}
			{visible.map(job => (
				<article key={`${job.product}-${job.job_id}`} className={styles.card}>
					<div className={styles.row}>
						<span className={`${styles.badge} ${styles[job.status] || ''}`}>
							{STATUS_LABEL[job.status] || job.status}
						</span>
						<strong>{PRODUCT_LABEL[job.product] || job.product || 'задача'}</strong>
						{job.author_unknown && <span className={styles.flag}>без автора</span>}
					</div>
					<p>
						<span>Что:</span> {job.message || job.files || job.route || '—'}
					</p>
					<p className={styles.meta}>
						{job.job_id}
						{job.model_id ? ` · ${job.model_id}` : ''}
						{job.updated_at ? ` · ${formatWhen(job.updated_at)}` : ''}
					</p>
				</article>
			))}
		</div>
	);
};

export default MlopsQueue;
