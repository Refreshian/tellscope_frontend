import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsMore from 'highcharts/highcharts-more';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MessagePicker from '../message-picker/MessagePicker';
import {
	buildDynamics,
	esc,
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

	const rows = Array.isArray(filteredData?.filtered_second_graph)
		? filteredData.filtered_second_graph
		: [];

	useEffect(() => {
		const el = chartRef.current;
		if (!el) return undefined;
		const apply = () => setChartSize({ w: el.clientWidth, h: el.clientHeight });
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const model = useMemo(() => buildDynamics(rows), [rows]);

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

	const series = useMemo(() => {
		const next = [
			{
				type: 'column',
				name: 'Публикаций за день',
				yAxis: 1,
				data: model.volume,
				color: 'rgba(23,96,232,0.16)',
				borderWidth: 0,
				zIndex: 1,
				turboThreshold: 0,
				tooltip: {
					pointFormatter() {
						return `Публикаций за день: <b>${this.y}</b><br/>`;
					},
				},
			},
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
			{
				type: 'spline',
				name: 'Накоплено сообщений',
				yAxis: 1,
				data: model.cumulative,
				color: '#8B5CF6',
				dashStyle: 'ShortDash',
				lineWidth: 1.6,
				marker: { enabled: false },
				zIndex: 2,
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
		];
		return next;
	}, [model]);

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
			yAxis: [
				{
					title: { text: 'Индекс СМИ' },
					startOnTick: false,
					endOnTick: false,
					gridLineColor: 'rgba(0,0,0,0.06)',
				},
				{
					title: { text: 'Число публикаций' },
					opposite: true,
					min: 0,
					gridLineWidth: 0,
				},
			],
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
				column: {
					maxPointWidth: 18,
					pointPadding: 0.08,
					groupPadding: 0.12,
				},
				spline: {
					states: { hover: { lineWidthPlus: 1 } },
				},
			},
			series,
		}),
		[series, chartSize.h, model.timeRange],
	);

	if (!model.allCount) {
		return (
			<div className={styles.wrap}>
				<p className={styles.empty}>Нет публикаций в выбранном диапазоне</p>
			</div>
		);
	}

	return (
		<div className={styles.wrap} ref={rootRef}>
			<p className={styles.hint}>
				Кружки — отдельные публикации (размер по индексу). Столбики — сколько
				вышло за день, линия — средний индекс, пунктир — накопленный объём.
				Тонкие нити связывают источники с несколькими выходами. Двойной клик
				открывает сообщение.
				{model.truncated > 0
					? ` Показаны ${model.shownCount} самых заметных кружков, скрыто: ${model.truncated}.`
					: ''}
			</p>
			<div className={styles.chart} ref={chartRef}>
				<HighchartsReact
					highcharts={Highcharts}
					options={options}
					containerProps={{ style: { width: '100%', height: '100%' } }}
				/>
			</div>
			<MessagePicker
				title={picker?.title}
				messages={picker?.messages}
				onClose={() => setPicker(null)}
			/>
		</div>
	);
};

export default BubbleChart;
