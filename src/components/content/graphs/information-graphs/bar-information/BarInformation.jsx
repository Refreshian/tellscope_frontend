import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { funksInformationGraph } from '@/utils/editData';

import { formatTime, hubColor, toMs } from '../spreadUtils';

import styles from './BarInformation.module.scss';

const BarInformation = () => {
	const { dynamicdata_audience } = useSelector(
		state => state.informationGraphData,
	);

	const series = useMemo(() => {
		const formatted =
			funksInformationGraph.convertInformationDataFormat(
				dynamicdata_audience || {},
			) || {};
		return Object.entries(formatted)
			.map(([hub, points]) => ({
				name: hub,
				type: 'spline',
				color: hubColor(hub),
				marker: { enabled: false, radius: 3 },
				data: (points || [])
					.map(point => [toMs(point.year), Number(point.value) || 0])
					.filter(item => item[0] > 0)
					.sort((a, b) => a[0] - b[0]),
			}))
			.filter(item => item.data.length)
			.sort(
				(a, b) =>
					(b.data[b.data.length - 1]?.[1] || 0) -
					(a.data[a.data.length - 1]?.[1] || 0),
			);
	}, [dynamicdata_audience]);

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			chart: {
				backgroundColor: 'transparent',
				zoomType: 'x',
				panning: { enabled: true, type: 'x' },
				panKey: 'shift',
				spacing: [12, 12, 8, 8],
			},
			title: { text: null },
			credits: { enabled: false },
			legend: {
				enabled: true,
				itemStyle: { fontSize: '11px', fontWeight: '400' },
				maxHeight: 72,
			},
			xAxis: {
				type: 'datetime',
				title: { text: 'Время появления' },
				crosshair: true,
			},
			yAxis: {
				title: { text: 'Накопленная аудитория' },
				min: 0,
			},
			tooltip: {
				shared: true,
				useHTML: true,
				formatter() {
					const rows = this.points
						?.slice()
						.sort((a, b) => b.y - a.y)
						.slice(0, 12)
						.map(
							point =>
								`<div><span style="color:${point.color}">●</span> ${point.series.name}: <b>${Highcharts.numberFormat(point.y, 0, ',', ' ')}</b></div>`,
						)
						.join('');
					return `<b>${formatTime(this.x)}</b>${rows}`;
				},
			},
			plotOptions: {
				spline: {
					lineWidth: 2,
					states: { hover: { lineWidth: 3 } },
				},
				series: {
					animation: false,
					turboThreshold: 0,
				},
			},
			series,
		}),
		[series],
	);

	if (!series.length) {
		return (
			<div className={styles.wrapper_bar}>
				<p className={styles.empty}>Нет данных динамики по источникам</p>
			</div>
		);
	}

	return (
		<div className={styles.wrapper_bar}>
			<p className={styles.hint}>
				Как аудитория набиралась по площадкам со временем. Выделите участок
				мышью, чтобы приблизить; Shift + перетаскивание — сдвиг.
			</p>
			<div className={styles.chart}>
				<HighchartsReact
					highcharts={Highcharts}
					options={options}
					containerProps={{ style: { width: '100%', height: '100%' } }}
				/>
			</div>
		</div>
	);
};

export default BarInformation;
