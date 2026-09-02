import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatTime, hubColor } from '../spreadUtils';
import { buildChains, cumulativePoints } from '../chainView';
import ChainPanel from '../chain-panel/ChainPanel';

import styles from './BarInformation.module.scss';

const TOP_CHAINS = 18;
const openUrl = url => {
	if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

const BarInformation = ({ data }) => {
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
		() => buildChains(data?.values || [], { minLen: 2, maxChains: TOP_CHAINS }),
		[data],
	);
	const chainById = useMemo(
		() => new Map(chains.map(chain => [chain.id, chain])),
		[chains],
	);
	const selected = selectedId == null ? null : chainById.get(selectedId) || null;

	useEffect(() => {
		setSelectedId(null);
	}, [data]);

	const series = useMemo(
		() =>
			chains.map(chain => {
				const active = selectedId == null || selectedId === chain.id;
				const base = hubColor(chain.origin?.hub);
				return {
					type: 'spline',
					name: `${chain.origin?.name || 'Цепочка'} · ${chain.posts.length}`,
					color: active
						? base
						: Highcharts.color(base).setOpacity(0.18).get(),
					lineWidth: selectedId === chain.id ? 3.4 : 2,
					marker: {
						enabled: true,
						radius: selectedId === chain.id ? 5 : 3.2,
					},
					data: cumulativePoints(chain),
					turboThreshold: 0,
					zIndex: selectedId === chain.id ? 5 : 2,
				};
			}),
		[chains, selectedId],
	);

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			chart: {
				backgroundColor: 'transparent',
				height: chartSize.h || null,
				zoomType: 'x',
				panning: { enabled: true, type: 'x' },
				panKey: 'shift',
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
			credits: { enabled: false },
			legend: {
				enabled: true,
				itemStyle: { fontSize: '11px', fontWeight: '400' },
				maxHeight: 64,
			},
			xAxis: {
				type: 'datetime',
				title: { text: 'Время появления' },
				crosshair: true,
			},
			yAxis: {
				title: { text: 'Накопленная аудитория цепочки' },
				min: 0,
			},
			tooltip: {
				useHTML: true,
				formatter() {
					const point = this.point.options;
					const chain = chainById.get(point.chainId);
					return (
						`<b>${point.name || this.series.name}</b><br/>` +
						`${point.hub || ''}<br/>` +
						`${formatTime(this.x)}<br/>` +
						`Аудитория сообщения: ${Highcharts.numberFormat(point.audience || 0, 0, ',', ' ')}<br/>` +
						`Накоплено в цепочке: <b>${Highcharts.numberFormat(this.y, 0, ',', ' ')}</b>` +
						(chain
							? `<br/>Цепочка: ${chain.posts.length} сообщ.`
							: '') +
						`<br/><span style="color:#1760e8">Клик — выбрать цепочку · двойной клик — открыть</span>`
					);
				},
			},
			plotOptions: {
				spline: {
					states: { hover: { lineWidthPlus: 1 } },
				},
				series: {
					animation: false,
					cursor: 'pointer',
					stickyTracking: false,
					events: {
						legendItemClick() {
							skipClearRef.current = true;
							const chainId = this.userOptions?.data?.[0]?.chainId;
							if (chainById.has(chainId)) setSelectedId(chainId);
							return false;
						},
					},
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
			},
			series,
		}),
		[series, chartSize.h, chainById],
	);

	if (!chains.length) {
		return (
			<div className={styles.wrapper_bar}>
				<p className={styles.empty}>Нет цепочек из двух и более сообщений</p>
			</div>
		);
	}

	return (
		<div className={styles.wrapper_bar}>
			<p className={styles.hint}>
				Каждая линия — как росла аудитория одной цепочки. Клик выбирает её и
				открывает краткое содержание; двойной клик открывает сообщение.
				{truncated > 0
					? ` Показаны ${TOP_CHAINS} крупнейших, скрыто: ${truncated}.`
					: ''}
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
				<ChainPanel chain={selected} yLabel="Накопленная аудитория" />
			</div>
		</div>
	);
};

export default BarInformation;
