import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import packedbubble from 'highcharts/highcharts-more';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MessagePicker from '../message-picker/MessagePicker';
import {
	SPLIT_PAGE_SIZE,
	esc,
	formatCount,
	formatTime,
	openUrl,
	placeSplitPackedNodes,
	rankSplitSources,
	ruCount,
	sliceSplitLevel,
	sortMessages,
	syncSplitPackedChart,
} from '../mediaView';

import styles from './SplitBubble.module.scss';

if (typeof Highcharts === 'object') {
	packedbubble(Highcharts);
}

const SplitBubble = ({ filteredData }) => {
	const rootRef = useRef(null);
	const chartRef = useRef(null);
	const hoverRef = useRef(null);
	const [chartSize, setChartSize] = useState({ w: 0, h: 0 });
	const [picker, setPicker] = useState(null);
	const [level, setLevel] = useState(0);

	const positive = filteredData?.filtered_first_graph?.positive_smi ?? [];
	const negative = filteredData?.filtered_first_graph?.negative_smi ?? [];
	const secondGraph = filteredData?.filtered_second_graph ?? [];

	useEffect(() => {
		const el = chartRef.current;
		if (!el) return undefined;
		const apply = () => setChartSize({ w: el.clientWidth, h: el.clientHeight });
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const ranked = useMemo(
		() => rankSplitSources(positive, negative, secondGraph),
		[positive, negative, secondGraph],
	);
	const page = useMemo(
		() => sliceSplitLevel(ranked, level, SPLIT_PAGE_SIZE),
		[ranked, level],
	);

	useEffect(() => {
		setLevel(0);
		setPicker(null);
	}, [filteredData]);

	useEffect(() => {
		if (level > page.levels - 1) setLevel(Math.max(0, page.levels - 1));
	}, [level, page.levels]);

	const seriesData = useMemo(
		() =>
			[
				{
					name: 'Позитив',
					color: '#039855',
					data: page.positive,
				},
				{
					name: 'Негатив',
					color: '#D92D20',
					data: page.negative,
				},
			].filter(series => series.data.length),
		[page.positive, page.negative],
	);
	const pointCount = seriesData.reduce(
		(sum, series) => sum + (series.data?.length || 0),
		0,
	);
	const zMax = Math.max(
		1,
		...seriesData.flatMap(series =>
			(series.data || []).map(point => Number(point.value) || 0),
		),
	);

	const openPoint = useCallback(point => {
		if (!point || point.isParentNode || point.options?.isOther) return;
		const messages = sortMessages(point.options?.messages);
		if (messages.length === 1) {
			openUrl(messages[0].url);
			return;
		}
		if (messages.length > 1) {
			setPicker({
				title: point.name,
				meta:
					point.options.sign === 'negative'
						? 'Негатив'
						: 'Позитив',
				messages,
			});
			return;
		}
		openUrl(point.options?.url);
	}, []);

	useEffect(() => {
		const el = rootRef.current;
		if (!el) return undefined;
		const onDblClick = event => {
			event.preventDefault();
			const point = hoverRef.current;
			if (point) openPoint(point);
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
	}, [level]);

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			credits: { enabled: false },
			chart: {
				type: 'packedbubble',
				height: chartSize.h || null,
				backgroundColor: 'transparent',
				animation: false,
				spacing: [8, 8, 8, 8],
				events: {
					load() {
						const chart = this;
						syncSplitPackedChart(chart, { repack: true });
						window.setTimeout(
							() => syncSplitPackedChart(chart, { repack: true }),
							0,
						);
					},
					redraw() {
						syncSplitPackedChart(this, { repack: true });
					},
				},
			},
			title: { text: null },
			legend: {
				itemStyle: { fontSize: '12px', fontWeight: '400' },
			},
			tooltip: {
				useHTML: true,
				formatter() {
					if (this.point.isParentNode) {
						const kids = this.series.points.filter(point => !point.isParentNode);
						const messages = kids.reduce(
							(sum, point) => sum + (Number(point.options.message_count) || 0),
							0,
						);
						return (
							`<b>${esc(this.series.name)}</b><br/>` +
							`Источников: <b>${kids.length}</b><br/>` +
							`Сообщений: <b>${formatCount(messages)}</b>`
						);
					}
					const opts = this.point.options || {};
					if (opts.isOther) {
						return `<b>${esc(this.point.name)}</b><br/>Скрыты мелкие источники, чтобы график не тормозил.`;
					}
					const n = Number(opts.message_count) || 0;
					const hint =
						n > 1
							? '<br/><span style="color:#1760e8">Двойной клик — выбрать сообщение</span>'
							: n === 1
								? '<br/><span style="color:#1760e8">Двойной клик — открыть сообщение</span>'
								: '';
					const period =
						opts.firstTime && opts.lastTime && opts.firstTime !== opts.lastTime
							? `<br/>Период: ${formatTime(opts.firstTime)} → ${formatTime(opts.lastTime)}`
							: opts.lastTime
								? `<br/>Дата: ${formatTime(opts.lastTime)}`
								: '';
					return (
						`<b>${esc(this.point.name)}</b><br/>` +
						`Тональность: <b>${opts.sign === 'negative' ? 'негатив' : 'позитив'}</b><br/>` +
						`Индекс: <b>${formatCount(opts.index)}</b><br/>` +
						`Сообщений: <b>${formatCount(n)}</b> ` +
						`(${ruCount(n, 'публикация', 'публикации', 'публикаций')})` +
						period +
						hint
					);
				},
			},
			plotOptions: {
				packedbubble: {
					minSize: '5%',
					maxSize: '12%',
					zMin: 0,
					zMax,
					animation: false,
					draggable: false,
					useSimulation: true,
					layoutAlgorithm: {
						enableSimulation: false,
						maxIterations: 0,
						splitSeries: true,
						seriesInteraction: false,
						dragBetweenSeries: false,
						parentNodeLimit: true,
						bubblePadding: 2,
						initialPositions() {
							placeSplitPackedNodes(this);
						},
						parentNodeOptions: {
							enableSimulation: false,
							maxIterations: 0,
						},
					},
					dataLabels: {
						enabled: true,
						format: '{point.name}',
						filter: {
							property: 'y',
							operator: '>',
							value: Math.max(40, zMax * 0.18),
						},
						style: {
							color: '#1e1e1e',
							textOutline: 'none',
							fontWeight: '400',
							fontSize: '10px',
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
			},
			series: seriesData.length ? seriesData : [{ name: '', data: [] }],
		}),
		[seriesData, chartSize.h, zMax],
	);

	if (!pointCount) {
		return (
			<div className={styles.wrap}>
				<p className={styles.empty}>Нет источников в выбранном диапазоне индекса</p>
			</div>
		);
	}

	const rangeHint = page.indexMax
		? ` Индекс на уровне: ${formatCount(page.indexMin)}–${formatCount(page.indexMax)}.`
		: '';

	return (
		<div className={styles.wrap} ref={rootRef}>
			<div className={styles.toolbar}>
				<p className={styles.hint}>
					Два облака — позитив и негатив. Размер кружка — индекс источника.
					Переключайте уровень, чтобы увидеть следующие по индексу СМИ.
					{page.levels > 1
						? ` Уровень ${page.level + 1} из ${page.levels}: источники ${page.from}–${page.to} из ${page.total}.${rangeHint}`
						: rangeHint}
				</p>
				{page.levels > 1 ? (
					<div className={styles.pager}>
						<button
							type="button"
							className={styles.pagerBtn}
							disabled={page.level <= 0}
							onClick={() => setLevel(page.level - 1)}
							aria-label="Более крупные источники"
						>
							‹
						</button>
						{page.levels <= 8
							? Array.from({ length: page.levels }, (_, index) => (
									<button
										key={index}
										type="button"
										className={`${styles.pagerStep} ${
											index === page.level ? styles.pagerActive : ''
										}`}
										onClick={() => setLevel(index)}
									>
										{index + 1}
									</button>
								))
							: (
									<span className={styles.pagerLabel}>
										{page.level + 1} / {page.levels}
									</span>
								)}
						<button
							type="button"
							className={styles.pagerBtn}
							disabled={page.level >= page.levels - 1}
							onClick={() => setLevel(page.level + 1)}
							aria-label="Следующие по индексу источники"
						>
							›
						</button>
					</div>
				) : null}
			</div>
			<div className={styles.chart} ref={chartRef}>
				<HighchartsReact
					highcharts={Highcharts}
					options={options}
					immutable
					key={`split-level-${page.level}-${pointCount}`}
					containerProps={{ style: { width: '100%', height: '100%' } }}
				/>
			</div>
			<MessagePicker
				title={picker?.title}
				meta={picker?.meta}
				messages={picker?.messages}
				onClose={() => setPicker(null)}
			/>
		</div>
	);
};

export default SplitBubble;
