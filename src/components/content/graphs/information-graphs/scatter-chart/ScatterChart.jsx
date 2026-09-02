import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatTime } from '../spreadUtils';
import { buildChains, formatCount } from '../chainView';
import ChainPanel from '../chain-panel/ChainPanel';

import styles from './ScatterChart.module.scss';

const MAX_CHAIN_LINES = 48;
const openUrl = url => {
	if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

const ScatterChart = ({ data }) => {
	const wrapRef = useRef(null);
	const skipClearRef = useRef(false);
	const lastClickRef = useRef({ t: 0, key: '' });
	const [chartSize, setChartSize] = useState({ w: 0, h: 0 });
	const [selectedId, setSelectedId] = useState(null);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return undefined;
		const apply = () => setChartSize({ w: el.clientWidth, h: el.clientHeight });
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const { chains, truncated } = useMemo(
		() => buildChains(data?.values || [], { minLen: 2, maxChains: 80 }),
		[data],
	);
	const chainById = useMemo(() => new Map(chains.map(chain => [chain.id, chain])), [chains]);
	const selected = selectedId == null ? null : chainById.get(selectedId) || null;

	useEffect(() => {
		setSelectedId(null);
	}, [data]);

	const timeRange = useMemo(() => {
		const times = chains.flatMap(chain =>
			chain.posts.map(post => post.time).filter(time => time > 1e11),
		);
		if (!times.length) return null;
		const min = Math.min(...times);
		const max = Math.max(...times);
		const pad = Math.max((max - min) * 0.04, 36e5);
		return { min: min - pad, max: max + pad };
	}, [chains]);

	const series = useMemo(() => {
		const origins = [];
		const spreads = [];
		chains.forEach(chain => {
			chain.posts.forEach(post => {
				const dimmed = selectedId != null && selectedId !== chain.id;
				const point = {
					x: post.time,
					y: post.audience,
					chainId: chain.id,
					name: post.name,
					hub: post.hub,
					url: post.url,
					kind: post.kind === 'origin' ? 'Оригинал' : 'Распространение',
					marker: {
						radius: selectedId === chain.id ? 7 : 5,
						fillColor: dimmed
							? 'rgba(150,156,166,0.28)'
							: undefined,
					},
				};
				if (post.kind === 'origin') origins.push(point);
				else spreads.push(point);
			});
		});
		const next = chains.slice(0, MAX_CHAIN_LINES).map(chain => ({
			type: 'line',
			name: `chain-${chain.id}`,
			data: chain.posts.map(post => ({
				x: post.time,
				y: post.audience,
				chainId: chain.id,
				name: post.name,
				hub: post.hub,
				url: post.url,
				kind: post.kind === 'origin' ? 'Оригинал' : 'Распространение',
			})),
			color:
				selectedId != null && selectedId !== chain.id
					? 'rgba(150,156,166,0.18)'
					: 'rgba(23,96,232,0.35)',
			lineWidth: selectedId === chain.id ? 2.4 : 1.4,
			marker: { enabled: false },
			enableMouseTracking: true,
			stickyTracking: false,
			showInLegend: false,
			zIndex: 1,
			turboThreshold: 0,
		}));
		if (selected) {
			next.push({
				type: 'line',
				name: 'Выбранная цепочка',
				data: selected.posts.map(post => ({
					x: post.time,
					y: post.audience,
					chainId: selected.id,
					name: post.name,
					hub: post.hub,
					url: post.url,
					kind: post.kind === 'origin' ? 'Оригинал' : 'Распространение',
				})),
				color: '#1760e8',
				lineWidth: 2.8,
				marker: { enabled: true, radius: 6, fillColor: '#1760e8' },
				showInLegend: false,
				zIndex: 4,
				turboThreshold: 0,
				states: { hover: { lineWidth: 3.2 } },
			});
		}
		next.push(
			{
				type: 'scatter',
				name: 'Оригинальные публикации',
				color: '#1760e8',
				data: origins,
				zIndex: 3,
				turboThreshold: 0,
			},
			{
				type: 'scatter',
				name: 'Повторные публикации',
				color: '#3dcc6d',
				data: spreads,
				zIndex: 3,
				turboThreshold: 0,
			},
		);
		return next;
	}, [chains, selected, selectedId]);

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
				spacing: [12, 12, 8, 8],
				events: {
					click() {
						window.setTimeout(() => {
							if (!skipClearRef.current) setSelectedId(null);
							skipClearRef.current = false;
						}, 0);
					},
				},
			},
			title: { text: null },
			xAxis: {
				type: 'datetime',
				title: { text: 'Дата / время' },
				startOnTick: false,
				endOnTick: false,
				min: timeRange?.min,
				max: timeRange?.max,
			},
			yAxis: {
				title: { text: 'Аудитория автора' },
				min: 0,
			},
			legend: {
				enabled: true,
				itemStyle: { fontSize: '11px', fontWeight: '400' },
			},
			plotOptions: {
				series: {
					animation: false,
					cursor: 'pointer',
					stickyTracking: false,
					point: {
						events: {
							click() {
								skipClearRef.current = true;
								const chainId = this.options.chainId;
								const key = `${chainId}-${this.options.url || this.x}`;
								const now = Date.now();
								if (
									now - lastClickRef.current.t < 280 &&
									lastClickRef.current.key === key &&
									this.options.url
								) {
									openUrl(this.options.url);
									lastClickRef.current = { t: 0, key: '' };
									return;
								}
								lastClickRef.current = { t: now, key };
								if (chainById.has(chainId)) setSelectedId(chainId);
							},
						},
					},
				},
				scatter: {
					marker: {
						symbol: 'circle',
						states: { hover: { enabled: true, lineColor: '#1e1e1e' } },
					},
				},
				line: {
					enableMouseTracking: true,
				},
			},
			tooltip: {
				useHTML: true,
				formatter() {
					const point = this.point.options;
					const chain = chainById.get(point.chainId);
					const extra = chain
						? `<br/>Цепочка: ${chain.posts.length} сообщ., ${formatCount(chain.audience)} аудитория`
						: '';
					return `<b>${point.kind || 'Сообщение'}</b><br/>Автор: ${point.name || '—'}<br/>Источник: ${point.hub || '—'}<br/>Аудитория: ${Highcharts.numberFormat(this.y, 0, ',', ' ')}<br/>${formatTime(this.x)}${extra}<br/><span style="color:#1760e8">Клик — выбрать цепочку · двойной клик — открыть</span>`;
				},
			},
			series,
		}),
		[series, chartSize.h, chainById, timeRange],
	);

	if (!chains.length) {
		return (
			<div className={styles.wrap}>
				<p className={styles.empty}>
					Нет цепочек из двух и более связанных сообщений
				</p>
			</div>
		);
	}

	return (
		<div className={styles.wrap}>
			<p className={styles.hint}>
				Линии соединяют сообщения одной цепочки. Клик выбирает цепочку и
				показывает, как менялись авторы и о чём речь; двойной клик открывает
				пост.
				{truncated > 0 ? ` Показаны 80 крупнейших, скрыто: ${truncated}.` : ''}
			</p>
			<div className={styles.stage}>
				<div className={styles.chart} ref={wrapRef}>
					{chartSize.h > 40 && (
						<HighchartsReact
							highcharts={Highcharts}
							options={options}
							containerProps={{ style: { width: '100%', height: '100%' } }}
						/>
					)}
				</div>
				<ChainPanel chain={selected} yLabel="Суммарная аудитория" />
			</div>
		</div>
	);
};

export default ScatterChart;
