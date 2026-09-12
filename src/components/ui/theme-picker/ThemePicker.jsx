import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { $axios } from '@/api';
import { fmtDay } from '@/utils/fileMeta';
import { truncateDescription } from '@/utils/editText';

import styles from './ThemePicker.module.scss';

/**
 * Компактный выбор темы (датасета) для страницы задач:
 * аккуратная кнопка-чип и выпадающий список с папками, названиями и периодом.
 */
const ThemePicker = ({ dataUser, currentIndex, onPick, label, period, loading, failed }) => {
	const [open, setOpen] = useState(false);
	const [labels, setLabels] = useState({});
	const wrapperRef = useRef(null);

	// человеческие подписи тем приходят из Tellscope (как в выпадающем списке Dify)
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const { data } = await $axios.get('/agent/datasets');
				if (!alive) return;
				const map = {};
				(data.datasets || []).forEach(item => {
					if (!item?.name) return;
					map[item.name] = item.period ? `${item.label} · ${item.period}` : item.label || item.name;
				});
				setLabels(map);
			} catch (err) {
				/* не критично: покажем техническое имя датасета */
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	const titleOf = useCallback(
		file => labels[file?.file] || truncateDescription(file?.file || '', 36),
		[labels]
	);

	const folders = useMemo(() => {
		const entries = Object.entries(dataUser || {});
		return entries
			.map(([folder, files]) => ({
				folder,
				files: (files || []).filter(file => file && !file['html-file']),
			}))
			.filter(group => group.files.length > 0);
	}, [dataUser]);

	const total = folders.reduce((sum, group) => sum + group.files.length, 0);

	const close = () => setOpen(false);

	return (
		<div
			className={styles.wrapper}
			ref={wrapperRef}
			onBlur={event => {
				if (!wrapperRef.current?.contains(event.relatedTarget)) close();
			}}
		>
			<button
				type='button'
				className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
				onClick={() => setOpen(value => !value)}
				title='Выбрать тему (набор данных)'
			>
				<span className={styles.triggerLabel}>Тема</span>
				<span className={styles.triggerValue}>
					{label || (loading ? 'загружаю список…' : failed ? 'список недоступен' : 'выберите тему')}
				</span>
				{label && period ? <span className={styles.triggerPeriod}>{period}</span> : null}
				<span className={styles.arrow}>{open ? '▴' : '▾'}</span>
			</button>

			{open && (
				<div className={styles.menu} role='listbox'>
					{!total && (
						<div className={styles.empty}>
							{loading ? 'загружаю список тем…' : 'Список тем пуст — данные ещё не загружены'}
						</div>
					)}
					{folders.map(group => (
						<div key={group.folder || 'root'} className={styles.group}>
							<div className={styles.groupTitle}>{group.folder || 'без папки'}</div>
							{group.files.map(file => {
								const active = file.index_number === currentIndex;
								const meta =
									file.min_data && file.max_data
										? `${fmtDay(file.min_data)} — ${fmtDay(file.max_data)}`
										: `#${file.index_number}`;
								return (
									<button
										key={`${group.folder}-${file.index_number}`}
										type='button'
										className={`${styles.option} ${active ? styles.optionActive : ''}`}
										onClick={() => {
											onPick(file);
											close();
										}}
									>
										<span className={styles.optionName}>{titleOf(file)}</span>
										<span className={styles.optionMeta}>{meta}</span>
									</button>
								);
							})}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ThemePicker;
