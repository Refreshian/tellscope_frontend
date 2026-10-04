import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './ModelPicker.module.scss';

/**
 * Выбор модели для задачи.
 *
 * Свой список, а не системный `<select>`: у каждой модели есть цвет по её месту в шкале
 * стоимости (зелёный — дешевле всего, красный — дороже всего), а цвета пунктов браузерные
 * `<option>` задавать не дают. Цвета приходят с сервера вместе со списком моделей.
 *
 * Список рисуется порталом в `document.body` и позиционируется от кнопки: раньше он всегда
 * раскрывался вверх и обрезался контейнером (в «Центре ИИ-задач» строка выбора стоит внизу
 * страницы). Теперь сначала смотрим, где больше места — снизу или сверху, — и при нехватке
 * высоты список прокручивается.
 */
const GAP = 6;
const EDGE = 12;
const NEEDED_HEIGHT = 300;
const MAX_HEIGHT = 360;

const Chevron = ({ open }) => (
	<svg className={styles.chevron} data-open={open ? '1' : '0'} width='10' height='10' viewBox='0 0 10 10' aria-hidden='true'>
		<path d='M2.5 3.5 5 6.5l2.5-3' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
	</svg>
);

const ModelPicker = ({ models = [], value, onChange, disabled = false, title = 'Модель ассистента' }) => {
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState(null);
	const wrapRef = useRef(null);
	const menuRef = useRef(null);

	const list = Array.isArray(models) ? models : [];
	const current = list.find(item => item.id === value) || list[0] || null;

	// Где показать список: снизу, если там есть место, иначе сверху. Высота ограничена
	// свободным местом, поэтому длинный список прокручивается, а не уезжает за экран.
	const place = useCallback(() => {
		const node = wrapRef.current;
		if (!node) return;
		const rect = node.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const width = Math.min(420, Math.max(330, rect.width));
		const spaceBelow = viewportHeight - rect.bottom - EDGE - GAP;
		const spaceAbove = rect.top - EDGE - GAP;
		const flip = spaceBelow < NEEDED_HEIGHT && spaceAbove > spaceBelow;
		const maxHeight = Math.max(180, Math.min(MAX_HEIGHT, flip ? spaceAbove : spaceBelow));
		setAnchor({
			flip,
			width,
			maxHeight,
			left: Math.min(Math.max(EDGE, rect.right - width), Math.max(EDGE, viewportWidth - width - EDGE)),
			...(flip ? { bottom: viewportHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
		});
	}, []);

	useEffect(() => {
		if (!open) {
			setAnchor(null);
			return undefined;
		}
		place();
		const refresh = () => place();
		window.addEventListener('scroll', refresh, true);
		window.addEventListener('resize', refresh);
		return () => {
			window.removeEventListener('scroll', refresh, true);
			window.removeEventListener('resize', refresh);
		};
	}, [open, place]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			const inWrap = wrapRef.current && wrapRef.current.contains(event.target);
			const inMenu = menuRef.current && menuRef.current.contains(event.target);
			if (!inWrap && !inMenu) setOpen(false);
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

	const canPortal = typeof document !== 'undefined';

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

			{canPortal &&
				open &&
				anchor &&
				createPortal(
					<div
						ref={menuRef}
						className={styles.menu}
						role='listbox'
						aria-label={title}
						data-flip={anchor.flip ? '1' : '0'}
						style={{
							left: anchor.left,
							width: anchor.width,
							maxHeight: anchor.maxHeight,
							...(anchor.flip ? { bottom: anchor.bottom } : { top: anchor.top }),
						}}
					>
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
					</div>,
					document.body,
				)}
		</div>
	);
};

export default ModelPicker;
