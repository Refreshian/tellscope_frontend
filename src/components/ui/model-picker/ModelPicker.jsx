import { useEffect, useRef, useState } from 'react';

import styles from './ModelPicker.module.scss';

/**
 * Выбор модели для задачи.
 *
 * Свой список, а не системный `<select>`: у каждой модели есть цвет по её месту в шкале
 * стоимости (зелёный — дешевле всего, красный — дороже всего), а цвета пунктов браузерные
 * `<option>` задавать не дают. Цвета приходят с сервера вместе со списком моделей.
 */
const Chevron = ({ open }) => (
	<svg className={styles.chevron} data-open={open ? '1' : '0'} width='10' height='10' viewBox='0 0 10 10' aria-hidden='true'>
		<path d='M2.5 3.5 5 6.5l2.5-3' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
	</svg>
);

const ModelPicker = ({ models = [], value, onChange, disabled = false, title = 'Модель ассистента' }) => {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);

	const list = Array.isArray(models) ? models : [];
	const current = list.find(item => item.id === value) || list[0] || null;

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

	useEffect(() => {
		setOpen(false);
	}, [disabled]);

	if (!current) return null;

	return (
		<div className={styles.wrap} ref={wrapRef}>
			<button
				type='button'
				className={styles.button}
				onClick={() => setOpen(state => !state)}
				disabled={disabled}
				title={title}
				aria-haspopup='listbox'
				aria-expanded={open}
				style={{ borderColor: current.accent, background: current.accent_soft }}
			>
				<span className={styles.dot} style={{ background: current.accent }} />
				<span className={styles.name}>{current.title}</span>
				<span className={styles.price} style={{ color: current.accent }}>
					{current.price_short}
				</span>
				<Chevron open={open} />
			</button>

			{open && (
				<div className={styles.menu} role='listbox' aria-label={title}>
					{list.map(item => (
						<button
							key={item.id}
							type='button'
							role='option'
							aria-selected={item.id === current.id}
							className={`${styles.option} ${item.id === current.id ? styles.optionActive : ''}`}
							style={{ background: item.accent_soft }}
							onClick={() => {
								onChange?.(item.id);
								setOpen(false);
							}}
						>
							<span className={styles.optionHead}>
								<span className={styles.dot} style={{ background: item.accent }} />
								<span className={styles.optionName}>{item.title}</span>
								{item.cost_cheapest ? <span className={styles.cheapMark}>дешевле всего</span> : null}
								<span className={styles.optionPrice} style={{ color: item.accent }}>
									{item.price_short}
								</span>
							</span>
							{item.note ? <span className={styles.optionNote}>{item.note}</span> : null}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default ModelPicker;
