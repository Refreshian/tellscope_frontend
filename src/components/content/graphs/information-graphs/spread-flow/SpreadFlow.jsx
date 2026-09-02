import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Slider from 'rc-slider';
import { useSelector } from 'react-redux';

import {
	buildSpreadGraph,
	formatTime,
	layoutSpreadGraph,
} from '../spreadUtils';

import styles from './SpreadFlow.module.scss';

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 14;

const escapeRe = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightSummary = (text, query) => {
	if (!text) return null;
	const wrapped = text.replace(/\[\[(.+?)\]\]/g, '$1');
	const tokens = [
		...new Set(
			String(query || '')
				.split(/[,]+/)
				.map(item => item.replace(/~\d+$/, '').trim())
				.filter(item => item.length > 1),
		),
	];
	if (!tokens.length) return wrapped;
	const re = new RegExp(`(${tokens.map(escapeRe).join('|')})`, 'gi');
	const parts = wrapped.split(re);
	const lower = tokens.map(item => item.toLowerCase());
	return parts.map((part, index) =>
		lower.includes(part.toLowerCase()) ? (
			<mark key={`${part}-${index}`}>{part}</mark>
		) : (
			<span key={`${part}-${index}`}>{part}</span>
		),
	);
};

const localSummary = (text, query) => {
	const source = String(text || '').replace(/\s+/g, ' ').trim();
	if (!source) return '';
	const sentences = source.split(/(?<=[.!?…])\s+/);
	const needle = String(query || '')
		.split(/[,]+/)[0]
		.replace(/~\d+$/, '')
		.trim()
		.toLowerCase();
	const hit = needle
		? sentences.find(item => item.toLowerCase().includes(needle))
		: null;
	return (hit || sentences[0] || source).slice(0, 420);
};

const ruCount = (n, one, few, many) => {
	const abs = Math.abs(Number(n) || 0) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return many;
	if (last === 1) return one;
	if (last >= 2 && last <= 4) return few;
	return many;
};

const formatCount = value => (Number(value) || 0).toLocaleString('ru-RU');

const easeOut = t => 1 - (1 - t) * (1 - t);

const SpreadFlow = ({ data }) => {
	const canvasRef = useRef(null);
	const svgRef = useRef(null);
	const dragRef = useRef(null);
	const clickTimerRef = useRef(null);
	const viewRef = useRef({ x: 0, y: 0, w: 900, h: 520 });
	const layoutRef = useRef(null);
	const viewAnimRef = useRef(0);
	const [size, setSize] = useState({ w: 900, h: 520 });
	const [hoverId, setHoverId] = useState(null);
	const [focusId, setFocusId] = useState(null);
	const [playMs, setPlayMs] = useState(null);
	const [playing, setPlaying] = useState(false);
	const [panning, setPanning] = useState(false);
	const [view, setView] = useState({ x: 0, y: 0, w: 900, h: 520 });
	const [contRange, setContRange] = useState([0, 0]);
	const [summary, setSummary] = useState({ loading: false, text: '' });

	const query = useSelector(state => state.dataForRequest?.query_str) || '';
	const themeIndex = useSelector(state => state.dataForRequest?.index);
	const folders = useSelector(
		state => state.dataUsersSlice?.json_files_directory,
	);
	const themeName = useMemo(() => {
		if (!folders || themeIndex == null) return '';
		for (const files of Object.values(folders)) {
			const hit = (files || []).find(
				item => Number(item.index_number) === Number(themeIndex),
			);
			if (hit) return hit.file || '';
		}
		return '';
	}, [folders, themeIndex]);

	const values = data?.values || [];
	const maxCont = useMemo(
		() =>
			values.reduce(
				(max, item) => Math.max(max, (item.reposts || []).length),
				0,
			),
		[values],
	);

	useEffect(() => {
		setContRange([0, maxCont]);
	}, [maxCont, data]);

	const filteredValues = useMemo(
		() =>
			values.filter(item => {
				const n = (item.reposts || []).length;
				return n >= contRange[0] && n <= contRange[1];
			}),
		[values, contRange],
	);

	const graph = useMemo(
		() => buildSpreadGraph(filteredValues),
		[filteredValues],
	);

	useEffect(() => {
		const el = canvasRef.current;
		if (!el) return undefined;
		const apply = () =>
			setSize({
				w: Math.max(320, el.clientWidth),
				h: Math.max(280, el.clientHeight),
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
	}, [graph.tMax, filteredValues]);

	const layout = useMemo(
		() => layoutSpreadGraph(graph, size.w, size.h),
		[graph, size],
	);
	layoutRef.current = layout;

	useEffect(() => {
		const next = { x: 0, y: 0, w: layout.svgWidth, h: layout.svgHeight };
		viewRef.current = next;
		setView(next);
	}, [layout.svgWidth, layout.svgHeight]);

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

	const zoomAt = useCallback((factor, cx, cy) => {
		setView(prev => {
			const nextW = Math.min(
				layout.svgWidth * (1 / MIN_ZOOM),
				Math.max(layout.svgWidth / MAX_ZOOM, prev.w / factor),
			);
			const ratio = prev.h / (prev.w || 1);
			const nextH = nextW * ratio;
			const px = prev.w ? (cx - prev.x) / prev.w : 0.5;
			const py = prev.h ? (cy - prev.y) / prev.h : 0.5;
			const next = {
				w: nextW,
				h: nextH,
				x: cx - px * nextW,
				y: cy - py * nextH,
			};
			viewRef.current = next;
			return next;
		});
	}, [layout.svgWidth]);

	const clientToWorld = useCallback((clientX, clientY) => {
		const svg = svgRef.current;
		if (!svg) return { x: 0, y: 0 };
		const rect = svg.getBoundingClientRect();
		const x = view.x + ((clientX - rect.left) / rect.width) * view.w;
		const y = view.y + ((clientY - rect.top) / rect.height) * view.h;
		return { x, y };
	}, [view]);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg) return undefined;
		const onWheel = event => {
			event.preventDefault();
			const world = clientToWorld(event.clientX, event.clientY);
			zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, world.x, world.y);
		};
		svg.addEventListener('wheel', onWheel, { passive: false });
		return () => svg.removeEventListener('wheel', onWheel);
	}, [clientToWorld, zoomAt]);

	const onCanvasDown = event => {
		if (event.button !== 0) return;
		if (event.target.closest('[data-node="1"]')) return;
		const svg = svgRef.current;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		dragRef.current = {
			sx: event.clientX,
			sy: event.clientY,
			vx: view.x,
			vy: view.y,
			scaleX: view.w / (rect.width || 1),
			scaleY: view.h / (rect.height || 1),
		};
		setPanning(true);
	};

	useEffect(() => {
		if (!panning) return undefined;
		const move = event => {
			const drag = dragRef.current;
			if (!drag) return;
			setView(prev => {
				const next = {
					...prev,
					x: drag.vx - (event.clientX - drag.sx) * drag.scaleX,
					y: drag.vy - (event.clientY - drag.sy) * drag.scaleY,
				};
				viewRef.current = next;
				return next;
			});
		};
		const up = () => {
			dragRef.current = null;
			setPanning(false);
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', up);
		return () => {
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', up);
		};
	}, [panning]);

	const zoomCenter = factor => {
		zoomAt(factor, view.x + view.w / 2, view.y + view.h / 2);
	};

	const resetView = () => {
		viewAnimRef.current += 1;
		const next = { x: 0, y: 0, w: layout.svgWidth, h: layout.svgHeight };
		viewRef.current = next;
		setView(next);
		setFocusId(null);
	};

	const animateView = useCallback(next => {
		const from = viewRef.current;
		const id = (viewAnimRef.current += 1);
		const started = performance.now();
		const duration = 320;
		const step = now => {
			if (viewAnimRef.current !== id) return;
			const t = Math.min(1, (now - started) / duration);
			const e = easeOut(t);
			const frame = {
				x: from.x + (next.x - from.x) * e,
				y: from.y + (next.y - from.y) * e,
				w: from.w + (next.w - from.w) * e,
				h: from.h + (next.h - from.h) * e,
			};
			viewRef.current = frame;
			setView(frame);
			if (t < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}, []);

	const fitChain = useCallback(
		chainKey => {
			const lay = layoutRef.current;
			if (!lay) return;
			const nodes = lay.nodes.filter(node => node.chainId === chainKey);
			if (!nodes.length) return;
			const padX = 88;
			const padY = 64;
			const minX = Math.min(...nodes.map(node => node.x)) - padX;
			const maxX = Math.max(...nodes.map(node => node.x)) + padX;
			const minY = Math.min(...nodes.map(node => node.y)) - padY;
			const maxY = Math.max(...nodes.map(node => node.y)) + padY;
			let w = Math.max(maxX - minX, 140);
			let h = Math.max(maxY - minY, 110);
			const aspect = (size.w || lay.svgWidth) / (size.h || lay.svgHeight || 1);
			if (w / h > aspect) h = w / aspect;
			else w = h * aspect;
			w = Math.max(w, lay.svgWidth * 0.3);
			h = w / aspect;
			const cx = (minX + maxX) / 2;
			const cy = (minY + maxY) / 2;
			animateView({ x: cx - w / 2, y: cy - h / 2, w, h });
		},
		[animateView, size.w, size.h],
	);

	const selectNode = useCallback(
		(node, shouldFit = true) => {
			if (!node) return;
			const current = layoutRef.current?.byId.get(focusId);
			const sameChain = current && current.chainId === node.chainId;
			setFocusId(node.id);
			if (shouldFit && !sameChain) fitChain(node.chainId);
		},
		[fitChain, focusId],
	);

	const openUrl = url => {
		if (url) window.open(url, '_blank', 'noopener,noreferrer');
	};

	const onNodeClick = (event, node) => {
		event.stopPropagation();
		if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
		clickTimerRef.current = setTimeout(() => {
			clickTimerRef.current = null;
			selectNode(node, true);
		}, 220);
	};

	const onNodeDblClick = (event, node) => {
		event.stopPropagation();
		event.preventDefault();
		if (clickTimerRef.current) {
			clearTimeout(clickTimerRef.current);
			clickTimerRef.current = null;
		}
		openUrl(node.url);
	};

	const activeId = hoverId || focusId;
	const activeNode = activeId ? layout.byId.get(activeId) : null;
	const focusedChainId = focusId ? layout.byId.get(focusId)?.chainId : null;
	const chainId = activeNode?.chainId;
	const chainNodes = useMemo(() => {
		if (chainId == null) return [];
		return layout.nodes
			.filter(node => node.chainId === chainId)
			.sort((a, b) => a.time - b.time);
	}, [layout.nodes, chainId]);

	useEffect(() => {
		if (chainNodes.length <= 3) {
			setSummary({ loading: false, text: '' });
			return undefined;
		}
		const origin =
			chainNodes.find(node => node.kind === 'origin') || chainNodes[0];
		const sourceText = origin?.text || '';
		if (!sourceText) {
			setSummary({ loading: false, text: '' });
			return undefined;
		}
		let cancelled = false;
		setSummary({ loading: true, text: '' });
		fetch('/api/information-graph/chain-summary', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				text: sourceText,
				query,
				theme: themeName,
			}),
		})
			.then(async response => {
				if (!response.ok) throw new Error('summary failed');
				return response.json();
			})
			.then(payload => {
				if (cancelled) return;
				setSummary({
					loading: false,
					text: payload.summary || localSummary(sourceText, query),
				});
			})
			.catch(() => {
				if (cancelled) return;
				setSummary({
					loading: false,
					text: localSummary(sourceText, query),
				});
			});
		return () => {
			cancelled = true;
		};
	}, [chainId, chainNodes.length, chainNodes[0]?.text, query, themeName]);

	if (!values.length) {
		return (
			<div className={styles.empty}>
				Нет цепочек распространения для выбранных фильтров
			</div>
		);
	}

	const now = playMs ?? graph.tMax;

	return (
		<div className={styles.wrap}>
			<div className={styles.toolbar}>
				<div className={styles.hint}>
					Размер — аудитория, оранжевое кольцо — комментарии, красная
					точка — лайки. Клик выделяет и приближает цепочку, двойной
					клик открывает сообщение.
				</div>
				<div className={styles.tools}>
					<button type="button" onClick={() => zoomCenter(1 / 1.2)} aria-label="Отдалить">
						−
					</button>
					<button type="button" onClick={() => zoomCenter(1.2)} aria-label="Приблизить">
						+
					</button>
					<button type="button" onClick={resetView}>
						Сброс
					</button>
				</div>
			</div>
			<div className={styles.lengthFilter}>
				<label>
					Длина цепочки, продолжений: {contRange[0]}–{contRange[1]} из {maxCont}
				</label>
				<Slider
					range
					min={0}
					max={Math.max(0, maxCont)}
					value={contRange}
					onChange={value => setContRange(value)}
				/>
			</div>
			<div className={styles.stage}>
				<div
					ref={canvasRef}
					className={`${styles.canvas} ${panning ? styles.panning : ''}`}
				>
					{graph.nodes.length ? (
						<svg
							ref={svgRef}
							className={styles.svg}
							viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
							preserveAspectRatio="xMidYMid meet"
							onMouseDown={onCanvasDown}
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
								const on = chainId != null && link.chainId === chainId;
								const dimmed =
									focusedChainId != null && link.chainId !== focusedChainId;
								const target = layout.byId.get(link.target);
								const faded = target && target.time > now;
								return (
									<path
										key={`${link.source}-${link.target}`}
										d={link.d}
										className={`${styles.link} ${on ? styles.linkOn : ''} ${dimmed ? styles.dimmed : ''} ${faded ? styles.faded : ''}`}
									/>
								);
							})}
							{layout.nodes.map(node => {
								const hidden = node.time > now;
								const on = chainId != null && node.chainId === chainId;
								const selected = node.id === focusId;
								const dimmed =
									focusedChainId != null && node.chainId !== focusedChainId;
								return (
									<g
										key={node.id}
										data-node="1"
										transform={`translate(${node.x}, ${node.y})`}
										className={`${styles.node} ${hidden ? styles.faded : ''} ${on ? styles.nodeOn : ''} ${selected ? styles.nodeSelected : ''} ${dimmed ? styles.dimmed : ''}`}
										onMouseEnter={() => setHoverId(node.id)}
										onClick={event => onNodeClick(event, node)}
										onDoubleClick={event => onNodeDblClick(event, node)}
									>
										{node.kind === 'origin' && (
											<circle r={node.r + 4} className={styles.originHalo} />
										)}
										{node.comments > 0 && (
											<circle
												r={node.r + 3 + node.commentRing * 0.4}
												className={styles.commentRing}
												strokeWidth={node.commentRing}
											/>
										)}
										<circle
											r={node.r}
											fill={node.color}
											stroke={node.kind === 'origin' ? '#1e1e1e' : '#fff'}
											strokeWidth={node.kind === 'origin' ? 2 : 1.2}
										/>
										{node.likes > 0 && (
											<circle
												className={styles.likeDot}
												r={Math.max(2, Math.min(3.4, node.r * 0.28))}
												cx={node.r * 0.55}
												cy={-node.r * 0.55}
											/>
										)}
										{on && node.comments > 0 && (
											<text
												className={styles.badge}
												y={-node.r - 7}
												textAnchor="middle"
											>
												{formatCount(node.comments)}
											</text>
										)}
									</g>
								);
							})}
						</svg>
					) : (
						<div className={styles.empty}>
							Нет цепочек с выбранной длиной
						</div>
					)}
				</div>
				<aside className={styles.panel}>
					<div className={styles.legend}>
						<span>
							<i className={styles.dotOrigin} /> оригинал
						</span>
						<span>
							<i className={styles.dotSpread} /> распространение
						</span>
						<span>размер — аудитория</span>
						<span>
							<i className={styles.legendRing} /> комментарии
						</span>
						<span>
							<i className={styles.legendLike} /> лайки
						</span>
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
								{activeNode.authorType ? ` · ${activeNode.authorType}` : ''}
								<br />
								{formatTime(activeNode.time)}
							</p>
							<ul className={styles.stats}>
								<li>
									Аудитория
									<strong>{formatCount(activeNode.audience)}</strong>
								</li>
								<li>
									Просмотры
									<strong>{formatCount(activeNode.views)}</strong>
								</li>
								<li>
									Комментарии
									<strong>{formatCount(activeNode.comments)}</strong>
								</li>
								<li>
									Лайки
									<strong>{formatCount(activeNode.likes)}</strong>
								</li>
								{activeNode.er > 0 && (
									<li>
										ER
										<strong>{formatCount(activeNode.er)}</strong>
									</li>
								)}
							</ul>
							{chainNodes.length > 3 && (
								<div className={styles.summary}>
									<p className={styles.chainTitle}>Краткое содержание</p>
									{summary.loading ? (
										<p className={styles.meta}>Собираем пересказ…</p>
									) : (
										<p className={styles.summaryText}>
											{highlightSummary(summary.text, query)}
										</p>
									)}
								</div>
							)}
							<button
								type="button"
								className={styles.openBtn}
								onClick={() => openUrl(activeNode.url)}
								disabled={!activeNode.url}
							>
								Открыть на источнике
							</button>
							<p className={styles.chainTitle}>
								Цепочка · {chainNodes.length}{' '}
								{ruCount(chainNodes.length, 'сообщение', 'сообщения', 'сообщений')}
							</p>
							<ul className={styles.chain}>
								{chainNodes.map(node => (
									<li key={node.id}>
										<button
											type="button"
											className={node.id === focusId ? styles.chainActive : undefined}
											onClick={() => selectNode(node, false)}
											onDoubleClick={() => openUrl(node.url)}
										>
											<span>{formatTime(node.time)}</span>
											<strong>{node.name}</strong>
											<em>
												{node.hub}
												{node.comments
													? ` · ${formatCount(node.comments)} комм.`
													: ''}
												{node.likes
													? ` · ${formatCount(node.likes)} лайк.`
													: ''}
											</em>
										</button>
									</li>
								))}
							</ul>
						</>
					) : (
						<p className={styles.placeholder}>
							Клик по точке выделяет цепочку и приближает её. Двойной
							клик открывает пост на источнике.
						</p>
					)}
					{graph.truncated > 0 && (
						<p className={styles.note}>
							Показаны крупнейшие цепочки, скрыто узлов: {graph.truncated}
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
						setPlaying(value => !value);
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
		</div>
	);
};

export default SpreadFlow;
