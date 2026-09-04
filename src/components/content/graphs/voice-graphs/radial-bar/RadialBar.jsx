import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsMore from 'highcharts/highcharts-more';
import HighchartsSolidGauge from 'highcharts/modules/solid-gauge';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { colors } from '@/app.constants';
import { funksVoice } from '@/utils/editData';
import { TONE_COLORS } from '../voiceView';

import styles from './RadialBar.module.scss';

HighchartsMore(Highcharts);
HighchartsSolidGauge(Highcharts);

const RadialBar = ({ voiceData = [], onHubFilter }) => {
	const [indexData, setIndexData] = useState(-1);
	const chartComponentRef = useRef(null);
	const containerRef = useRef(null);

	const resultData = useMemo(
		() =>
			indexData === -1
				? funksVoice.concatData(voiceData)
				: voiceData[indexData]?.sunkey_data || [],
		[indexData, voiceData],
	);

	const hubs = useMemo(
		() => [...new Set(resultData.map(item => item.hub).filter(Boolean))],
		[resultData],
	);

	const seriesData = useMemo(() => {
		const series = funksVoice.getSeriesData(resultData);
		series.forEach(serie => {
			serie.color = TONE_COLORS[serie.name.trim()] || colors.grey_graph;
		});
		return series;
	}, [resultData]);

	const maxValue = useMemo(() => {
		let max = 1;
		seriesData.forEach(serie => {
			(serie.data || []).forEach(value => {
				max = Math.max(max, Number(value) || 0);
			});
		});
		return max;
	}, [seriesData]);

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			credits: { enabled: false },
			title: { text: null },
			chart: {
				type: 'column',
				inverted: true,
				polar: true,
				backgroundColor: 'transparent',
				spacing: [8, 8, 16, 8],
				animation: false,
			},
			tooltip: {
				outside: true,
				formatter() {
					return `<b>${this.series.name}</b><br/>${this.x}: ${Highcharts.numberFormat(this.y, 0, ',', ' ')}`;
				},
			},
			pane: {
				size: '92%',
				innerSize: '8%',
				endAngle: 270,
			},
			xAxis: {
				tickInterval: 1,
				labels: {
					align: 'right',
					allowOverlap: false,
					step: 1,
					y: 3,
					style: { fontSize: '11px', color: '#344054' },
				},
				lineWidth: 0,
				gridLineWidth: 0,
				categories: hubs,
			},
			yAxis: {
				min: 0,
				max: Math.ceil(maxValue * 1.05) || 1,
				tickAmount: 5,
				reversedStacks: false,
				endOnTick: true,
				showLastLabel: true,
				lineWidth: 0,
				gridLineWidth: 0,
				labels: {
					style: { fontSize: '10px', color: '#98A2B3' },
				},
			},
			legend: {
				align: 'right',
				verticalAlign: 'top',
				layout: 'vertical',
				itemStyle: { fontSize: '12px' },
			},
			plotOptions: {
				column: {
					stacking: 'normal',
					borderWidth: 0,
					pointPadding: 0,
					groupPadding: 0.12,
					cursor: 'pointer',
					point: {
						events: {
							click() {
								const hub = String(this.category || this.x || '').trim();
								if (hub) onHubFilter?.(hub);
							},
						},
					},
				},
			},
			series: seriesData,
		}),
		[hubs, seriesData, maxValue, onHubFilter],
	);

	useEffect(() => {
		const el = containerRef.current;
		const chart = chartComponentRef.current?.chart;
		if (!el || !chart) return undefined;
		const ro = new ResizeObserver(() => chart.reflow());
		ro.observe(el);
		chart.reflow();
		return () => ro.disconnect();
	}, [hubs, seriesData]);

	const handleButtonClick = useCallback(index => {
		setIndexData(index);
	}, []);

	return (
		<div className={styles.wrapper_graf} ref={containerRef}>
			<div className={styles.block__categories}>
				<button
					type="button"
					className={indexData === -1 ? styles.name_active : styles.name}
					onClick={() => handleButtonClick(-1)}
				>
					Все
				</button>
				{funksVoice.getCategoriesName(voiceData).map((name, index) => (
					<button
						type="button"
						key={`${name}-${index}`}
						className={indexData === index ? styles.name_active : styles.name}
						onClick={() => handleButtonClick(index)}
					>
						{name}
					</button>
				))}
			</div>
			<div className={styles.chartFill}>
				<HighchartsReact
					highcharts={Highcharts}
					options={options}
					ref={chartComponentRef}
					containerProps={{ style: { width: '100%', height: '100%' } }}
				/>
			</div>
		</div>
	);
};

export default RadialBar;
