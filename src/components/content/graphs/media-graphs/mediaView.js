export const toMs = value => {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return n < 1e12 ? n * 1000 : n;
};

export const formatTime = value => {
	const ms = toMs(value);
	if (!ms) return '—';
	return new Date(ms).toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export const formatCount = value => (Number(value) || 0).toLocaleString('ru-RU');

export const ruCount = (n, one, few, many) => {
	const abs = Math.abs(Number(n) || 0) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return many;
	if (last === 1) return one;
	if (last >= 2 && last <= 4) return few;
	return many;
};

export const esc = value =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

export const hostFromUrl = url => {
	if (!url) return '';
	try {
		const withProto = url.includes('://') ? url : `https://${url}`;
		return new URL(withProto).hostname.replace(/^www\./, '');
	} catch {
		return String(url).replace(/^https?:\/\//, '').split('/')[0];
	}
};

export const openUrl = url => {
	if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

export const sortMessages = messages =>
	[...(messages || [])]
		.filter(item => item?.url)
		.sort(
			(a, b) =>
				Math.abs(b.index || 0) - Math.abs(a.index || 0) ||
				(b.time || 0) - (a.time || 0),
		);

export function groupMessagesBySource(secondGraph) {
	const map = new Map();
	(secondGraph || []).forEach(item => {
		const name = item.name || 'Источник';
		const list = map.get(name) || [];
		list.push({
			url: item.url || '',
			time: toMs(item.time),
			index: Number(item.index) || 0,
			name,
		});
		map.set(name, list);
	});
	map.forEach(list =>
		list.sort(
			(a, b) =>
				Math.abs(b.index || 0) - Math.abs(a.index || 0) ||
				(b.time || 0) - (a.time || 0),
		),
	);
	return map;
}

const toSplitPoints = (items, sign, bySource, maxPerSide) => {
	const points = (items || [])
		.map(item => {
			const messages = sortMessages(bySource.get(item.name) || []);
			const index = Number(item.index) || 0;
			const messageCount =
				Number(item.message_count) || messages.length || 1;
			return {
				name: item.name || 'Источник',
				value: Math.abs(index) || messageCount,
				index,
				message_count: messageCount,
				sign,
				messages,
				url: messages[0]?.url || '',
				firstTime: messages[messages.length - 1]?.time || 0,
				lastTime: messages[0]?.time || 0,
			};
		})
		.sort(
			(a, b) =>
				b.value - a.value || b.message_count - a.message_count,
		);

	return Number.isFinite(maxPerSide)
		? points.slice(0, maxPerSide)
		: points;
};

export const SPLIT_PAGE_SIZE = 24;

export function rankSplitSources(positive, negative, secondGraph) {
	const bySource = groupMessagesBySource(secondGraph);
	return {
		positive: toSplitPoints(positive, 'positive', bySource),
		negative: toSplitPoints(negative, 'negative', bySource),
	};
}

const indexSpan = points => {
	const values = (points || [])
		.map(point => Number(point.value) || 0)
		.filter(value => value > 0);
	if (!values.length) return { min: 0, max: 0 };
	return { min: Math.min(...values), max: Math.max(...values) };
};

export function sliceSplitLevel(
	ranked,
	level,
	pageSize = SPLIT_PAGE_SIZE,
) {
	const total = Math.max(
		ranked.positive.length,
		ranked.negative.length,
	);
	const levels = Math.max(1, Math.ceil(total / pageSize) || 1);
	const safe = Math.min(Math.max(0, Number(level) || 0), levels - 1);
	const start = safe * pageSize;
	const positive = ranked.positive.slice(start, start + pageSize);
	const negative = ranked.negative.slice(start, start + pageSize);
	const posSpan = indexSpan(positive);
	const negSpan = indexSpan(negative);
	const shown = [...positive, ...negative];
	const allSpan = indexSpan(shown);
	return {
		positive,
		negative,
		level: safe,
		levels,
		from: total ? start + 1 : 0,
		to: Math.min(start + pageSize, total),
		total,
		indexMin: allSpan.min,
		indexMax: allSpan.max,
		positiveSpan: posSpan,
		negativeSpan: negSpan,
		later: Math.max(
			0,
			ranked.positive.length - start - positive.length,
			ranked.negative.length - start - negative.length,
		),
	};
}

export function buildSplitSeries(
	positive,
	negative,
	secondGraph,
	maxPerSide = 36,
) {
	const bySource = groupMessagesBySource(secondGraph);
	return [
		{
			name: 'Позитив',
			color: '#039855',
			data: toSplitPoints(positive, 'positive', bySource, maxPerSide),
		},
		{
			name: 'Негатив',
			color: '#D92D20',
			data: toSplitPoints(negative, 'negative', bySource, maxPerSide),
		},
	];
}

export const mediaCategory = item => {
	const raw = item?.categoryName ?? item?.category_name ?? item?.category ?? '';
	const text = String(raw || '').trim();
	return text || 'Без категории';
};

export const mediaDuplicates = item => {
	const n = Number(item?.duplicateCount ?? item?.duplicate_count ?? 1);
	if (!Number.isFinite(n) || n < 1) return 1;
	return Math.round(n);
};

export function collectMediaFacets(rows) {
	const counts = new Map();
	let minDup = Infinity;
	let maxDup = 1;
	(rows || []).forEach(item => {
		const cat = mediaCategory(item);
		counts.set(cat, (counts.get(cat) || 0) + 1);
		const dup = mediaDuplicates(item);
		minDup = Math.min(minDup, dup);
		maxDup = Math.max(maxDup, dup);
	});
	if (!Number.isFinite(minDup)) minDup = 1;
	return {
		categories: [...counts.entries()].sort(
			(a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'),
		),
		minDup,
		maxDup,
	};
}

export function filterDynamicsRows(rows, selectedCategories, dupRange) {
	const cats = selectedCategories instanceof Set ? selectedCategories : null;
	const minDup = Array.isArray(dupRange) ? Number(dupRange[0]) : null;
	const maxDup = Array.isArray(dupRange) ? Number(dupRange[1]) : null;
	return (rows || []).filter(item => {
	if (cats) {
		if (!cats.size) return false;
		if (!cats.has(mediaCategory(item))) return false;
	}
		if (minDup != null && maxDup != null) {
			const dup = mediaDuplicates(item);
			if (dup < minDup || dup > maxDup) return false;
		}
		return true;
	});
}

const nodeRadius = node =>
	Math.max(3, Number(node?.marker?.radius || node?.radius || 8) || 8);

const setNodePos = (node, x, y) => {
	node.plotX = x;
	node.plotY = y;
	node.prevX = x;
	node.prevY = y;
	node.dispX = 0;
	node.dispY = 0;
};

const pointIndexValue = node => {
	const raw =
		node?.options?.value ??
		node?.value ??
		node?.options?.index ??
		node?.index ??
		0;
	const n = Math.abs(Number(raw) || 0);
	return n;
};

export function applyIndexRadii(nodes, maxR) {
	const list = (nodes || []).filter(node => node && !node.isParentNode);
	if (!list.length) return;
	const values = list.map(pointIndexValue);
	const logs = values.map(value => Math.log10(Math.max(value, 1)));
	const minL = Math.min(...logs);
	const maxL = Math.max(...logs);
	const span = Math.max(maxL - minL, 0.001);
	const minR = Math.max(5, maxR * 0.07);
	const maxBubbleR = Math.max(minR + 12, maxR * 0.5);
	list.forEach((node, i) => {
		const t = (logs[i] - minL) / span;
		const r = minR + (maxBubbleR - minR) * t;
		node.radius = r;
		node.marker = {
			...(node.marker || {}),
			radius: r,
			width: r * 2,
			height: r * 2,
		};
	});
}

export function packNodesInCircle(nodes, cx, cy, maxR) {
	const list = [...(nodes || [])].sort((a, b) => nodeRadius(b) - nodeRadius(a));
	if (!list.length) return 0;

	const gap = 4;
	const radius = node => nodeRadius(node);

	list.forEach((node, i) => {
		const r = radius(node);
		if (i === 0) {
			node._x = 0;
			node._y = 0;
			return;
		}
		if (i === 1) {
			node._x = radius(list[0]) + r + gap;
			node._y = 0;
			return;
		}

		const placed = list.slice(0, i);
		let best = null;
		let bestScore = Infinity;
		for (let a = 0; a < placed.length; a += 1) {
			for (let b = a + 1; b < placed.length; b += 1) {
				const c1 = placed[a];
				const c2 = placed[b];
				const d = Math.hypot(c2._x - c1._x, c2._y - c1._y);
				const r1 = radius(c1) + r + gap;
				const r2 = radius(c2) + r + gap;
				if (d < 0.01 || d > r1 + r2 || d < Math.abs(r1 - r2)) continue;
				const along = (d * d + r1 * r1 - r2 * r2) / (2 * d);
				const height = Math.sqrt(Math.max(0, r1 * r1 - along * along));
				const ux = (c2._x - c1._x) / d;
				const uy = (c2._y - c1._y) / d;
				const candidates = [
					{
						x: c1._x + along * ux - height * uy,
						y: c1._y + along * uy + height * ux,
					},
					{
						x: c1._x + along * ux + height * uy,
						y: c1._y + along * uy - height * ux,
					},
				];
				candidates.forEach(pos => {
					const overlaps = placed.some(item => {
						const need = radius(item) + r + gap;
						return Math.hypot(pos.x - item._x, pos.y - item._y) + 0.05 < need;
					});
					if (overlaps) return;
					const score = pos.x * pos.x + pos.y * pos.y;
					if (score < bestScore) {
						bestScore = score;
						best = pos;
					}
				});
			}
		}

		if (!best) {
			const last = placed[placed.length - 1];
			const dist = radius(last) + r + gap;
			const ang = Math.atan2(last._y, last._x || 1) + 0.7;
			best = {
				x: last._x + dist * Math.cos(ang),
				y: last._y + dist * Math.sin(ang),
			};
		}
		node._x = best.x;
		node._y = best.y;
	});

	let bound = 0;
	list.forEach(node => {
		bound = Math.max(bound, Math.hypot(node._x, node._y) + radius(node));
	});
	const scale = bound > maxR && bound > 0 ? maxR / bound : 1;
	list.forEach(node => {
		const r = radius(node) * scale;
		node.radius = r;
		node.marker = {
			...(node.marker || {}),
			radius: r,
			width: r * 2,
			height: r * 2,
		};
		setNodePos(node, cx + node._x * scale, cy + node._y * scale);
		delete node._x;
		delete node._y;
	});

	return bound * scale;
}

const groupOrder = name => {
	if (name === 'Негатив') return 0;
	if (name === 'Позитив') return 1;
	return 2;
};

export function placeSplitPackedNodes(layout) {
	const box = layout?.box || {};
	const width = Number(box.width) || 0;
	const height = Number(box.height) || 0;
	if (width < 40 || height < 40) return;

	const groups = new Map();
	(layout.nodes || []).forEach(node => {
		if (!node || node.isParentNode) return;
		const name = node.series?.name || node.series?.options?.name || '';
		const list = groups.get(name) || [];
		list.push(node);
		groups.set(name, list);
	});

	const names = [...groups.keys()].sort(
		(a, b) => groupOrder(a) - groupOrder(b) || a.localeCompare(b),
	);
	if (!names.length) return;

	names.forEach((name, i) => {
		const nodes = groups.get(name) || [];
		const cx =
			names.length <= 1
				? width / 2
				: width * (0.26 + (0.48 * i) / Math.max(names.length - 1, 1));
		const cy = height * 0.5;
		const maxR = Math.min(width * 0.34, height * 0.4);
		const packR = maxR * 0.78;
		applyIndexRadii(nodes, packR);
		const packedR = packNodesInCircle(nodes, cx, cy, packR);
		const parent = nodes[0]?.series?.parentNode;
		if (parent) {
			setNodePos(parent, cx, cy);
			const parentR = Math.max(packedR + 10, 36);
			parent.radius = parentR;
			if (parent.marker) parent.marker.radius = parentR;
			const series = nodes[0].series;
			if (series) series.parentNodeRadius = parentR;
		}
	});
}

const moveGraphic = (graphic, x, y, r) => {
	if (!graphic || !r) return;
	graphic.attr({
		x: x - r,
		y: y - r,
		width: r * 2,
		height: r * 2,
	});
};

export function syncSplitPackedChart(chart, { repack = false } = {}) {
	if (!chart || chart._mediaPacking) return;
	chart._mediaPacking = true;
	try {
		if (repack) {
			const layout = chart.series?.find(
				series => series.type === 'packedbubble',
			)?.layout;
			if (layout) placeSplitPackedNodes(layout);
		}

		(chart.series || []).forEach(series => {
			if (series.type !== 'packedbubble' || !series.visible) return;
			const parent = series.parentNode;
			const children = (series.points || []).filter(
				point => !point.isParentNode,
			);
			if (!parent || !children.length) return;

			let sx = 0;
			let sy = 0;
			children.forEach(point => {
				sx += Number(point.plotX) || 0;
				sy += Number(point.plotY) || 0;
			});
			const cx = sx / children.length;
			const cy = sy / children.length;
			if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

			setNodePos(parent, cx, cy);
			let packedR = 0;
			children.forEach(point => {
				packedR = Math.max(
					packedR,
					Math.hypot(point.plotX - cx, point.plotY - cy) +
						nodeRadius(point),
				);
				moveGraphic(
					point.graphic,
					point.plotX,
					point.plotY,
					nodeRadius(point),
				);
			});

			const parentR = Math.max(packedR + 10, 36);
			series.parentNodeRadius = parentR;
			parent.radius = parentR;
			if (parent.marker) parent.marker.radius = parentR;
			moveGraphic(parent.graphic || series.graph, cx, cy, parentR);
		});
	} finally {
		chart._mediaPacking = false;
	}
}

const DAY = 86400000;

export function buildDynamics(secondGraph, maxBubbles = 320) {
	const all = (secondGraph || [])
		.map(item => {
			const x = toMs(item.time);
			const y = Number(item.index) || 0;
			return {
				x,
				y,
				z: Math.max(3.5, Math.min(22, Math.sqrt(Math.abs(y) || 1))),
				name: item.name || 'Источник',
				source: item.name || 'Источник',
				url: item.url || '',
				sign: y >= 0 ? 'positive' : 'negative',
				categoryName: mediaCategory(item),
				duplicateCount: mediaDuplicates(item),
			};
		})
		.filter(point => point.x > 1e11)
		.sort((a, b) => a.x - b.x);

	const bySource = new Map();
	all.forEach(point => {
		const list = bySource.get(point.source) || [];
		list.push(point);
		bySource.set(point.source, list);
	});
	all.forEach(point => {
		point.sourceCount = bySource.get(point.source)?.length || 1;
	});

	const byDay = new Map();
	all.forEach(point => {
		const day = Math.floor(point.x / DAY) * DAY;
		const slot = byDay.get(day) || { n: 0, sum: 0 };
		slot.n += 1;
		slot.sum += point.y;
		byDay.set(day, slot);
	});
	const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]);
	const average = days.map(([x, slot]) => [
		x,
		Math.round(slot.sum / Math.max(slot.n, 1)),
	]);

	const ranked = [...all].sort(
		(a, b) => Math.abs(b.y) - Math.abs(a.y) || b.z - a.z,
	);
	const notable = new Set(ranked.slice(0, 12).map(point => `${point.x}-${point.url}`));
	const bubbles = ranked.slice(0, maxBubbles).map(point => ({
		...point,
		notable: notable.has(`${point.x}-${point.url}`),
	}));
	const positive = bubbles.filter(point => point.sign === 'positive');
	const negative = bubbles.filter(point => point.sign === 'negative');

	const trails = [...bySource.entries()]
		.filter(([, points]) => points.length >= 3)
		.sort((a, b) => b[1].length - a[1].length)
		.slice(0, 5)
		.map(([source, points]) => ({
			type: 'line',
			name: source,
			data: points.map(point => ({ x: point.x, y: point.y, source })),
			color: 'rgba(23,96,232,0.28)',
			lineWidth: 1.2,
			marker: { enabled: false },
			enableMouseTracking: false,
			showInLegend: false,
			zIndex: 2,
			turboThreshold: 0,
		}));

	const times = all.map(point => point.x);
	const tMin = times.length ? Math.min(...times) : 0;
	const tMax = times.length ? Math.max(...times) : 1;
	const pad = Math.max((tMax - tMin) * 0.04, 36e5);

	return {
		allCount: all.length,
		shownCount: bubbles.length,
		truncated: Math.max(0, all.length - bubbles.length),
		positive,
		negative,
		average,
		trails,
		timeRange:
			times.length > 0 ? { min: tMin - pad, max: tMax + pad } : null,
	};
}
