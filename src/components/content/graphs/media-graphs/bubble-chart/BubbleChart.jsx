import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsMore from 'highcharts/highcharts-more';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MessagePicker from '../message-picker/MessagePicker';
import {
	DYNAMICS_PAGE_SIZE,
	buildDynamics,
	collectMediaFacets,
	esc,
	filterDynamicsRows,
	formatCount,
	formatTime,
	openUrl,
	ruCount,
	sortMessages,
} from '../mediaView';

import styles from './BubbleChart.module.scss';

if (typeof Highcharts === 'object') {
	highchartsMore(Highcharts);
}

const BubbleChart = ({ filteredData }) => {
	const rootRef = useRef(null);
	const chartRef = useRef(null);
	const hoverRef = useRef(null);
	const [chartSize, setChartSize] = useState({ w: 0, h: 0 });
	const [picker, setPicker] = useState(null);
	const [selectedCats, setSelectedCats] = useState(null);
	const [sliderDup, setSliderDup] = useState(null);
	const [appliedDup, setAppliedDup] = useState(null);
	const [level, setLevel] = useState(0);

	const rows = Array.isArray(filteredData?.filtered_second_graph)
		? filteredData.filtered_second_graph
		: [];

	const facets = useMemo(() => collectMediaFacets(rows), [rows]);
	const hasCategories =
		facets.categories.length > 1 ||
		(facets.categories.length === 1 && facets.categories[0][0] !== 'Без категории');
	const hasDuplicates = facets.maxDup > facets.minDup;

	useEffect(() => {
		setSelectedCats(new Set(facets.categories.map(([name]) => name)));
		setSliderDup([facets.minDup, facets.maxDup]);
		setAppliedDup([facets.minDup, facets.maxDup]);
	}, [rows, facets.minDup, facets.maxDup, facets.categories]);

	const visibleRows = useMemo(
		() => filterDynamicsRows(rows, selectedCats, appliedDup),
		[rows, selectedCats, appliedDup],
	);

	useEffect(() => {
		setLevel(0);
		setPicker(null);
	}, [visibleRows]);

	useEffect(() => {
		const el = chartRef.current;
		if (!el) return undefined;
		const apply = () => {
			const w = el.clientWidth;
			const h = el.clientHeight;
			setChartSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
		};
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const model = useMemo(
		() => buildDynamics(visibleRows, DYNAMICS_PAGE_SIZE, level),
		[visibleRows, level],
	);

	useEffect(() => {
		if (level > model.levels - 1) setLevel(Math.max(0, model.levels - 1));
	}, [level, model.levels]);

	const openPoint = useCallback(point => {
		const opts = point?.options || {};
		if (opts.url) {
			openUrl(opts.url);
			return;
		}
		const messages = sortMessages(opts.messages);
		if (messages.length === 1) openUrl(messages[0].url);
		else if (messages.length > 1) {
			setPicker({ title: opts.source || point.name, messages });
		}
	}, []);

	useEffect(() => {
		const el = rootRef.current;
		if (!el) return undefined;
		const onDblClick = event => {
			event.preventDefault();
			const point = hoverRef.current;
			if (point && point.series?.type === 'bubble') openPoint(point);
		};
		el.addEventListener('dblclick', onDblClick);
		return () => el.removeEventListener('dblclick', onDblClick);
	}, [openPoint]);

	useEffect(() => {
		if (!picker) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') setPicker(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [picker]);

	useEffect(() => {
		setPicker(null);
	}, [rows]);

	const series = useMemo(
		() => [
			{
				type: 'spline',
				name: 'Средний индекс',
				data: model.average,
				color: '#1760e8',
				lineWidth: 2.2,
				marker: { enabled: false },
				zIndex: 3,
				turboThreshold: 0,
			},
			...model.trails,
			{
				type: 'bubble',
				name: 'Позитив',
				data: model.positive,
				color: '#039855',
				zIndex: 5,
				turboThreshold: 0,
				minSize: 6,
				maxSize: 22,
			},
			{
				type: 'bubble',
				name: 'Негатив',
				data: model.negative,
				color: '#D92D20',
				zIndex: 5,
				turboThreshold: 0,
				minSize: 6,
				maxSize: 22,
			},
		],
		[model],
	);

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			credits: { enabled: false },
			chart: {
				height: chartSize.h || null,
				zoomType: 'xy',
				panning: { enabled: true, type: 'xy' },
				panKey: 'shift',
				backgroundColor: 'transparent',
				animation: false,
				spacing: [12, 12, 8, 8],
			},
			title: { text: null },
			legend: {
				itemStyle: { fontSize: '11px', fontWeight: '400' },
			},
			xAxis: {
				type: 'datetime',
				title: { text: 'Дата публикации' },
				min: model.timeRange?.min,
				max: model.timeRange?.max,
				crosshair: true,
			},
			yAxis: {
				title: { text: 'Индекс СМИ' },
				startOnTick: false,
				endOnTick: false,
				min: 0,
				gridLineColor: 'rgba(0,0,0,0.06)',
			},
			tooltip: {
				useHTML: true,
				shared: false,
				formatter() {
					if (this.series.type !== 'bubble') {
						return `<b>${formatTime(this.x)}</b><br/>${this.series.name}: <b>${formatCount(this.y)}</b>`;
					}
					const opts = this.point.options || {};
					const extra =
						opts.sourceCount > 1
							? `<br/>У источника ещё ${formatCount(opts.sourceCount - 1)} ${ruCount(
									opts.sourceCount - 1,
									'сообщение',
									'сообщения',
									'сообщений',
								)} в периоде`
							: '';
					return (
						`<b>${esc(opts.source || this.point.name)}</b><br/>` +
						`Тональность: <b>${opts.sign === 'negative' ? 'негатив' : 'позитив'}</b><br/>` +
						`Индекс: <b>${formatCount(opts.y ?? this.y)}</b><br/>` +
						`Категория СМИ: <b>${esc(opts.categoryName || '—')}</b><br/>` +
						`Число дубликатов: <b>${formatCount(opts.duplicateCount || 1)}</b><br/>` +
						`Время: ${formatTime(this.x)}` +
						extra +
						`<br/><span style="color:#1760e8">Двойной клик — открыть сообщение</span>`
					);
				},
			},
			plotOptions: {
				series: {
					animation: false,
					cursor: 'pointer',
					stickyTracking: false,
				},
				bubble: {
					dataLabels: {
						enabled: true,
						formatter() {
							return this.point.notable
								? String(this.point.source || '').slice(0, 18)
								: null;
						},
						style: {
							fontSize: '9px',
							fontWeight: '400',
							textOutline: 'none',
							color: '#1e1e1e',
						},
					},
					point: {
						events: {
							mouseOver() {
								hoverRef.current = this;
							},
							mouseOut() {
								if (hoverRef.current === this) hoverRef.current = null;
							},
						},
					},
				},
				spline: {
					states: { hover: { lineWidthPlus: 1 } },
				},
			},
			series,
		}),
		[series, chartSize.h, model.timeRange],
	);

	if (!rows.length) {
		return (
			<div className={styles.wrap}>
				<p className={styles.empty}>Нет публикаций в выбранном диапазоне</p>
			</div>
		);
	}

	const allSelected =
		selectedCats instanceof Set &&
		selectedCats.size === facets.categories.length;
	const toggleCat = name => {
		setSelectedCats(prev => {
			const next = new Set(prev || []);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	};

	return (
		<div className={styles.wrap} ref={rootRef}>
			{(hasCategories || hasDuplicates) && (
				<div className={styles.filters}>
					{hasCategories && (
						<div className={styles.filterBlock}>
							<div className={styles.filterHead}>
								<span>Категория СМИ</span>
								<button
									type="button"
									className={styles.filterReset}
									onClick={() =>
										setSelectedCats(
											allSelected
												? new Set()
												: new Set(facets.categories.map(([name]) => name)),
										)
									}
								>
									{allSelected ? 'Снять все' : 'Все'}
								</button>
							</div>
							<div className={styles.chips}>
								{facets.categories.map(([name, count]) => {
									const on = selectedCats?.has(name);
									return (
										<button
											key={name}
											type="button"
											className={`${styles.chip} ${on ? styles.chipOn : ''}`}
											onClick={() => toggleCat(name)}
										>
											{name}
											<em>{formatCount(count)}</em>
										</button>
									);
								})}
							</div>
						</div>
					)}
					{hasDuplicates && sliderDup && (
						<div className={styles.filterBlock}>
							<div className={styles.filterHead}>
								<span>Число дубликатов</span>
								<strong>
									{formatCount(sliderDup[0])} — {formatCount(sliderDup[1])}
								</strong>
							</div>
							<Slider
								range
								min={facets.minDup}
								max={facets.maxDup}
								value={sliderDup}
								onChange={value => setSliderDup(value)}
								onChangeComplete={value => setAppliedDup(value)}
								onAfterChange={value => setAppliedDup(value)}
								trackStyle={[{ backgroundColor: '#6ED2FF', height: 4 }]}
								handleStyle={[
									{
										borderColor: '#fff',
										backgroundColor: '#3E8DF6',
										width: 14,
										height: 14,
									},
									{
										borderColor: '#fff',
										backgroundColor: '#3E8DF6',
										width: 14,
										height: 14,
									},
								]}
								railStyle={{ backgroundColor: '#E8F4FB', height: 4 }}
							/>
						</div>
					)}
				</div>
			)}
			{!model.allCount ? (
				<p className={styles.empty}>Нет публикаций по выбранным фильтрам</p>
			) : (
				<div className={styles.chart} ref={chartRef}>
					<HighchartsReact
						highcharts={Highcharts}
						options={options}
						allowChartUpdate={false}
						key={`dyn-level-${model.level}-${model.shownCount}-${chartSize.h || 0}-${visibleRows.length}`}
						containerProps={{ style: { width: '100%', height: '100%' } }}
					/>
				</div>
			)}
			{model.levels > 1 ? (
				<div className={styles.pagerBar}>
					<div className={styles.pager}>
						<button
							type="button"
							className={styles.pagerBtn}
							disabled={model.level <= 0}
							onClick={() => setLevel(model.level - 1)}
							aria-label="Более крупные публикации"
						>
							‹
						</button>
						<span className={styles.pagerLabel}>
							Уровень {model.level + 1} из {model.levels}
						</span>
						<button
							type="button"
							className={styles.pagerBtn}
							disabled={model.level >= model.levels - 1}
							onClick={() => setLevel(model.level + 1)}
							aria-label="Следующие по индексу публикации"
						>
							›
						</button>
					</div>
				</div>
			) : null}
			<MessagePicker
				title={picker?.title}
				messages={picker?.messages}
				onClose={() => setPicker(null)}
			/>
		</div>
	);
};

export default memo(BubbleChart);
