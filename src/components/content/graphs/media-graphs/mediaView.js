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

	return points.slice(0, maxPerSide);
};

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
	const volume = days.map(([x, slot]) => [x, slot.n]);
	const average = days.map(([x, slot]) => [
		x,
		Math.round(slot.sum / Math.max(slot.n, 1)),
	]);
	let running = 0;
	const cumulative = days.map(([x, slot]) => {
		running += slot.n;
		return [x, running];
	});

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
		volume,
		average,
		cumulative,
		trails,
		timeRange:
			times.length > 0 ? { min: tMin - pad, max: tMax + pad } : null,
	};
}
