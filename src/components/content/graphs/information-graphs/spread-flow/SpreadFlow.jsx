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

const SpreadFlow = ({ data }) => {
	const canvasRef = useRef(null);
	const svgRef = useRef(null);
	const dragRef = useRef(null);
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

	useEffect(() => {
		setView({ x: 0, y: 0, w: layout.svgWidth, h: layout.svgHeight });
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
			return {
				w: nextW,
				h: nextH,
				x: cx - px * nextW,
				y: cy - py * nextH,
			};
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
			setView(prev => ({
				...prev,
				x: drag.vx - (event.clientX - drag.sx) * drag.scaleX,
				y: drag.vy - (event.clientY - drag.sy) * drag.scaleY,
			}));
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

	const activeId = hoverId || focusId;
	const activeNode = activeId ? layout.byId.get(activeId) : null;
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

	const openUrl = url => {
		if (url) window.open(url, '_blank', 'noopener,noreferrer');
	};

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
					Дорожки — источники, слева направо — время. Клик открывает
					сообщение. Колёсико масштабирует вокруг курсора, перетаскивание
					сдвигает карту.
				</div>
				<div className={styles.tools}>
					<button type="button" onClick={() => zoomCenter(1 / 1.2)} aria-label="Отдалить">
						−
					</button>
					<button type="button" onClick={() => zoomCenter(1.2)} aria-label="Приблизить">
						+
					</button>
					<button
						type="button"
						onClick={() =>
							setView({ x: 0, y: 0, w: layout.svgWidth, h: layout.svgHeight })
						}
					>
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
										data-node="1"
										transform={`translate(${node.x}, ${node.y})`}
										className={`${styles.node} ${hidden ? styles.faded : ''} ${on ? styles.nodeOn : ''}`}
										onMouseEnter={() => setHoverId(node.id)}
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
							Наведите на точку, чтобы увидеть цепочку. Клик открывает пост
							на источнике.
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
