import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useMemo, useRef, useState } from 'react';

import { funksInformationGraph } from '@/utils/editData';

import { formatTime, toMs } from '../spreadUtils';

import styles from './ScatterChart.module.scss';

const ScatterChart = ({ data }) => {
	const wrapRef = useRef(null);
	const [chartHeight, setChartHeight] = useState(0);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return undefined;
		const apply = () => setChartHeight(el.clientHeight);
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const series = useMemo(() => {
		const origins = [];
		const spreads = [];
		(data?.values || []).forEach(item => {
			const origin = item.author || {};
			origins.push({
				x: toMs(origin.timeCreate),
				y: Number(origin.audienceCount) || 0,
				url: origin.url,
				name: origin.fullname,
				hub: origin.hub || funksInformationGraph.getDomainFromUrl(origin.url || ''),
				kind: 'Оригинал',
			});
			(item.reposts || []).forEach(repost => {
				spreads.push({
					x: toMs(repost.timeCreate),
					y: Number(repost.audienceCount) || 0,
					url: repost.url,
					name: repost.fullname,
					hub: repost.hub || funksInformationGraph.getDomainFromUrl(repost.url || ''),
					kind: 'Распространение',
				});
			});
		});
		return [
			{
				name: 'Оригинальные публикации',
				color: '#1760e8',
				data: origins.filter(point => point.x > 0),
			},
			{
				name: 'Повторные публикации',
				color: '#3dcc6d',
				data: spreads.filter(point => point.x > 0),
			},
		];
	}, [data]);

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			credits: { enabled: false },
			chart: {
				type: 'scatter',
				height: chartHeight || null,
				zoomType: 'xy',
				panning: { enabled: true, type: 'xy' },
				panKey: 'shift',
				backgroundColor: 'transparent',
				spacing: [12, 12, 8, 8],
			},
			title: { text: null },
			xAxis: {
				type: 'datetime',
				title: { text: 'Дата / время' },
				startOnTick: false,
				endOnTick: false,
			},
			yAxis: {
				title: { text: 'Аудитория' },
				min: 0,
			},
			legend: {
				enabled: true,
				itemStyle: { fontSize: '11px', fontWeight: '400' },
			},
			plotOptions: {
				series: {
					turboThreshold: 0,
					animation: false,
					cursor: 'pointer',
					point: {
						events: {
							click() {
								if (this.options.url) {
									window.open(this.options.url, '_blank', 'noopener,noreferrer');
								}
							},
						},
					},
				},
				scatter: {
					marker: {
						radius: 5,
						symbol: 'circle',
						states: {
							hover: { enabled: true, lineColor: '#1e1e1e' },
						},
					},
				},
			},
			tooltip: {
				useHTML: true,
				formatter() {
					const point = this.point.options;
					const source = point.hub || funksInformationGraph.getDomainFromUrl(point.url || '');
					return `<b>${point.kind}</b><br/>Автор: ${point.name || '—'}<br/>Источник: ${source}<br/>Аудитория: ${Highcharts.numberFormat(this.y, 0, ',', ' ')}<br/>${formatTime(this.x)}<br/><span style="color:#1760e8">Клик — открыть сообщение</span>`;
				},
			},
			series,
		}),
		[series, chartHeight],
	);

	if (!series.some(item => item.data.length)) {
		return (
			<div className={styles.wrap}>
				<p className={styles.empty}>Нет точек для выбранных фильтров</p>
			</div>
		);
	}

	return (
		<div className={styles.wrap}>
			<p className={styles.hint}>
				Каждая точка — сообщение. Клик открывает пост. Выделите область
				мышью, чтобы приблизить; Shift + перетаскивание — сдвиг.
			</p>
			<div className={styles.chart} ref={wrapRef}>
				<HighchartsReact
					highcharts={Highcharts}
					options={options}
					containerProps={{ style: { width: '100%', height: '100%' } }}
				/>
			</div>
		</div>
	);
};

export default ScatterChart;
