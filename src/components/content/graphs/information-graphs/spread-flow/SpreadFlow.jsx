import { useEffect, useMemo, useRef, useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import {
	buildSpreadGraph,
	formatTime,
	layoutSpreadGraph,
} from '../spreadUtils';

import styles from './SpreadFlow.module.scss';

const SpreadFlow = ({ data }) => {
	const hostRef = useRef(null);
	const [size, setSize] = useState({ w: 1100, h: 560 });
	const [hoverId, setHoverId] = useState(null);
	const [focusId, setFocusId] = useState(null);
	const [playMs, setPlayMs] = useState(null);
	const [playing, setPlaying] = useState(false);

	const graph = useMemo(
		() => buildSpreadGraph(data?.values || []),
		[data],
	);

	useEffect(() => {
		const el = hostRef.current;
		if (!el) return undefined;
		const apply = () =>
			setSize({
				w: Math.max(640, el.clientWidth),
				h: Math.max(420, el.clientHeight),
			});
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		setPlayMs(graph.tMax);
		setPlaying(false);
		setHoverId(null);
		setFocusId(null);
	}, [graph.tMax, data]);

	useEffect(() => {
		if (!playing) return undefined;
		const span = graph.tMax - graph.tMin;
		const tick = Math.max(span / 180, 60 * 1000);
		const id = setInterval(() => {
			setPlayMs(prev => {
				const next = (prev || graph.tMin) + tick;
				if (next >= graph.tMax) {
					setPlaying(false);
					return graph.tMax;
				}
				return next;
			});
		}, 80);
		return () => clearInterval(id);
	}, [playing, graph.tMin, graph.tMax]);

	const layout = useMemo(
		() => layoutSpreadGraph(graph, size.w - 300, size.h),
		[graph, size],
	);

	const activeId = hoverId || focusId;
	const activeNode = activeId ? layout.byId.get(activeId) : null;
	const chainId = activeNode?.chainId;
	const chainNodes = useMemo(() => {
		if (chainId == null) return [];
		return layout.nodes
			.filter(node => node.chainId === chainId)
			.sort((a, b) => a.time - b.time);
	}, [layout.nodes, chainId]);

	const openUrl = url => {
		if (url) window.open(url, '_blank', 'noopener,noreferrer');
	};

	if (!graph.nodes.length) {
		return (
			<div className={styles.empty}>
				Нет цепочек распространения для выбранных фильтров
			</div>
		);
	}

	const now = playMs ?? graph.tMax;

	return (
		<div className={styles.wrap} ref={hostRef}>
			<TransformWrapper
				minScale={0.35}
				maxScale={8}
				limitToBounds={false}
				centerOnInit
				wheel={{ step: 0.14 }}
				doubleClick={{ disabled: true }}
				wrapperClass={styles.zoomRoot}
			>
				{({ zoomIn, zoomOut, resetTransform }) => (
					<>
						<div className={styles.toolbar}>
							<div className={styles.hint}>
								Слева направо — время, дорожки — источники. Клик по точке
								открывает сообщение. Колёсико — масштаб, перетаскивание — сдвиг.
							</div>
							<div className={styles.tools}>
								<button type="button" onClick={() => zoomOut()} aria-label="Отдалить">
									−
								</button>
								<button type="button" onClick={() => zoomIn()} aria-label="Приблизить">
									+
								</button>
								<button type="button" onClick={() => resetTransform()}>
									Сброс
								</button>
							</div>
						</div>
						<div className={styles.stage}>
							<TransformComponent
								wrapperClass={styles.panWrap}
								contentClass={styles.panContent}
							>
								<svg
									className={styles.svg}
									width={layout.svgWidth}
									height={layout.svgHeight}
									onMouseLeave={() => setHoverId(null)}
								>
									{layout.axis.map(tick => (
										<g key={tick.t}>
											<line
												x1={tick.x}
												x2={tick.x}
												y1={layout.pad.top - 8}
												y2={layout.svgHeight - layout.pad.bottom + 6}
												className={styles.grid}
											/>
											<text
												x={tick.x}
												y={layout.svgHeight - 8}
												className={styles.axisLabel}
												textAnchor="middle"
											>
												{tick.label}
											</text>
										</g>
									))}
									{layout.hubs.map((hub, index) => (
										<text
											key={hub.hub}
											x={12}
											y={layout.pad.top + (index + 0.5) * layout.lane + 4}
											className={styles.hubLabel}
										>
											{hub.hub}
										</text>
									))}
									{layout.links.map(link => {
										const on =
											chainId != null && link.chainId === chainId;
										const target = layout.byId.get(link.target);
										const faded = target && target.time > now;
										return (
											<path
												key={`${link.source}-${link.target}`}
												d={link.d}
												className={`${styles.link} ${on ? styles.linkOn : ''} ${faded ? styles.faded : ''}`}
											/>
										);
									})}
									{layout.nodes.map(node => {
										const hidden = node.time > now;
										const on = chainId != null && node.chainId === chainId;
										return (
											<g
												key={node.id}
												transform={`translate(${node.x}, ${node.y})`}
												className={`${styles.node} ${hidden ? styles.faded : ''} ${on ? styles.nodeOn : ''}`}
												onMouseEnter={() => setHoverId(node.id)}
												onMouseDown={event => event.stopPropagation()}
												onClick={event => {
													event.stopPropagation();
													setFocusId(node.id);
													openUrl(node.url);
												}}
											>
												{node.kind === 'origin' && (
													<circle r={node.r + 4} className={styles.originHalo} />
												)}
												<circle
													r={node.r}
													fill={node.color}
													stroke={node.kind === 'origin' ? '#1e1e1e' : '#fff'}
													strokeWidth={node.kind === 'origin' ? 2 : 1.2}
												/>
											</g>
										);
									})}
								</svg>
							</TransformComponent>
							<aside className={styles.panel}>
								<div className={styles.legend}>
									<span>
										<i className={styles.dotOrigin} /> оригинал
									</span>
									<span>
										<i className={styles.dotSpread} /> распространение
									</span>
									<span>размер — аудитория</span>
								</div>
								{activeNode ? (
									<>
										<p className={styles.kicker}>
											{activeNode.kind === 'origin'
												? 'Исходное сообщение'
												: 'Повторная публикация'}
										</p>
										<h4>{activeNode.name}</h4>
										<p className={styles.meta}>
											{activeNode.hub}
											<br />
											{formatTime(activeNode.time)}
											<br />
											Аудитория: {activeNode.audience.toLocaleString('ru-RU')}
										</p>
										<button
											type="button"
											className={styles.openBtn}
											onClick={() => openUrl(activeNode.url)}
											disabled={!activeNode.url}
										>
											Открыть на источнике
										</button>
										<p className={styles.chainTitle}>
											Цепочка · {chainNodes.length} сообщ.
										</p>
										<ul className={styles.chain}>
											{chainNodes.map(node => (
												<li key={node.id}>
													<button
														type="button"
														onClick={() => {
															setFocusId(node.id);
															openUrl(node.url);
														}}
													>
														<span>{formatTime(node.time)}</span>
														<strong>{node.name}</strong>
														<em>{node.hub}</em>
													</button>
												</li>
											))}
										</ul>
									</>
								) : (
									<p className={styles.placeholder}>
										Наведите на точку, чтобы увидеть цепочку: откуда сообщение
										пошло и куда разошлось. Клик открывает пост.
									</p>
								)}
								{graph.truncated > 0 && (
									<p className={styles.note}>
										Показаны крупнейшие цепочки, скрыто узлов:{' '}
										{graph.truncated}
									</p>
								)}
							</aside>
						</div>
						<div className={styles.playback}>
							<button
								type="button"
								className={styles.play}
								onClick={() => {
									if (playMs >= graph.tMax) setPlayMs(graph.tMin);
									setPlaying(v => !v);
								}}
							>
								{playing ? '❚❚' : '▶'}
							</button>
							<input
								type="range"
								min={graph.tMin}
								max={graph.tMax}
								value={now}
								onChange={event => {
									setPlaying(false);
									setPlayMs(Number(event.target.value));
								}}
							/>
							<span>{formatTime(now)}</span>
						</div>
					</>
				)}
			</TransformWrapper>
		</div>
	);
};

export default SpreadFlow;
