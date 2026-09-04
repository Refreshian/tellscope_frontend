import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsSankey from 'highcharts/modules/sankey';
import { useEffect, useMemo, useRef } from 'react';

import { colors as colorsConstant } from '@/app.constants';
import { buildSankey, connectedIds, parseNodeId } from '../voiceView';

import styles from './Sankey.module.scss';

HighchartsSankey(Highcharts);

const DIM_LABEL = {
	q: 'Запрос',
	t: 'Тип',
	h: 'Источник',
	s: 'Тональность',
};

const Sankey = ({ filteredData = [], onNodeFilter, highlightId }) => {
	const wrapRef = useRef(null);
	const chartRef = useRef(null);

	const { nodes, links, columns } = useMemo(
		() => buildSankey(filteredData, 12),
		[filteredData],
	);

	const activeIds = useMemo(
		() => connectedIds(links, highlightId),
		[links, highlightId],
	);

	const coloredNodes = useMemo(
		() =>
			nodes.map(node => ({
				id: node.id,
				name: node.name,
				color: node.color,
				column: ['q', 't', 'h', 's'].indexOf(node.column),
				opacity: !activeIds || activeIds.has(node.id) ? 1 : 0.18,
			})),
		[nodes, activeIds],
	);

	const seriesLinks = useMemo(
		() =>
			links.map(([from, to, weight]) => ({
				from,
				to,
				weight,
				opacity:
					!activeIds || (activeIds.has(from) && activeIds.has(to)) ? 0.7 : 0.08,
			})),
		[links, activeIds],
	);

	const options = useMemo(
		() => ({
			title: { text: null },
			credits: { enabled: false },
			chart: {
				backgroundColor: 'transparent',
				spacing: [8, 8, 8, 8],
				animation: false,
			},
			accessibility: { enabled: false },
			tooltip: {
				headerFormat: '',
				pointFormatter() {
					if (this.isNode) {
						const parsed = parseNodeId(this.id);
						const kind = DIM_LABEL[parsed?.dim] || 'Узел';
						return `<b>${kind}: ${this.name}</b><br>${Highcharts.numberFormat(this.sum, 0, ',', ' ')} сообщ.`;
					}
					return `${this.fromNode?.name || ''} → ${this.toNode?.name || ''}: <b>${Highcharts.numberFormat(this.weight, 0, ',', ' ')}</b>`;
				},
			},
			plotOptions: {
				sankey: {
					cursor: 'pointer',
					nodePadding: 14,
					nodeWidth: 18,
					linkOpacity: 0.55,
					dataLabels: {
						enabled: true,
						style: {
							color: colorsConstant.color_full_black,
							textOutline: 'none',
							fontSize: '11px',
							fontWeight: '500',
						},
						backgroundColor: 'rgba(255,255,255,.86)',
						borderRadius: 3,
						padding: 3,
					},
					point: {
						events: {
							click() {
								const id = this.isNode ? this.id : this.from;
								const parsed = parseNodeId(id);
								if (parsed) onNodeFilter?.(parsed);
							},
						},
					},
				},
			},
			series: [
				{
					type: 'sankey',
					nodes: coloredNodes,
					data: seriesLinks,
				},
			],
		}),
		[coloredNodes, seriesLinks, onNodeFilter],
	);

	useEffect(() => {
		const el = wrapRef.current;
		const chart = chartRef.current?.chart;
		if (!el || !chart) return undefined;
		const ro = new ResizeObserver(() => chart.reflow());
		ro.observe(el);
		chart.reflow();
		return () => ro.disconnect();
	}, [coloredNodes, seriesLinks]);

	if (!links.length) {
		return <p className={styles.empty}>Нет данных для выбранного среза</p>;
	}

	return (
		<div ref={wrapRef} className={styles.wrap}>
			<div className={styles.columns}>
				{columns.map(col => (
					<span key={col.id}>{col.title}</span>
				))}
			</div>
			<div className={styles.chart}>
				<HighchartsReact
					ref={chartRef}
					highcharts={Highcharts}
					options={options}
					containerProps={{ style: { width: '100%', height: '100%' } }}
				/>
			</div>
			<p className={styles.hint}>
				Нажмите узел, чтобы провести срез по всей цепочке: запрос → тип → источник → тональность
			</p>
		</div>
	);
};

export default Sankey;
