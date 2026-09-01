import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, useRef } from 'react';

import { funksInformationGraph } from '@/utils/editData';

import { formatTime, toMs } from '../spreadUtils';

const ScatterChart = ({ data }) => {
	const chartComponent = useRef(null);

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
				zoomType: 'xy',
				panning: { enabled: true, type: 'xy' },
				panKey: 'shift',
				backgroundColor: 'transparent',
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
			legend: { enabled: true },
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
		[series],
	);

	return (
		<HighchartsReact
			ref={chartComponent}
			highcharts={Highcharts}
			options={options}
			containerProps={{ style: { width: '100%', height: '100%' } }}
		/>
	);
};

export default ScatterChart;
