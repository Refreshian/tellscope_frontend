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

export const hubColor = hub => {
	const text = String(hub || 'источник');
	let hash = 0;
	for (let i = 0; i < text.length; i += 1) {
		hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
	}
	return `hsl(${hash % 360}, 58%, 46%)`;
};

export const domainFromUrl = url => {
	if (!url) return '';
	try {
		const withProto = url.includes('://') ? url : `https://${url}`;
		return new URL(withProto).hostname.replace(/^www\./, '');
	} catch {
		return String(url).replace(/^https?:\/\//, '').split('/')[0];
	}
};

const messageNode = (message, chainId, kind, index) => {
	const url = message?.url || '';
	return {
		id: `${kind}-${chainId}-${index}-${message?.es_id || url || message?.fullname || index}`,
		chainId,
		kind,
		name: message?.fullname || 'Без имени',
		url,
		hub: message?.hub || domainFromUrl(url) || 'источник',
		audience: Number(message?.audienceCount) || 0,
		views: Number(message?.viewsCount) || 0,
		er: Number(message?.er) || 0,
		time: toMs(message?.timeCreate),
		text: message?.text || '',
	};
};

export function buildSpreadGraph(values, maxNodes = 720) {
	if (!Array.isArray(values) || !values.length) {
		return { nodes: [], links: [], hubs: [], tMin: 0, tMax: 1, truncated: 0 };
	}

	const chains = values
		.map((item, chainId) => {
			const origin = messageNode(item.author, chainId, 'origin', 'o');
			const spreads = (item.reposts || []).map((repost, index) =>
				messageNode(repost, chainId, 'spread', index),
			);
			const audience =
				origin.audience + spreads.reduce((sum, node) => sum + node.audience, 0);
			return { origin, spreads, audience };
		})
		.sort((a, b) => b.audience - a.audience || a.origin.time - b.origin.time);

	const nodes = [];
	const links = [];
	let truncated = 0;

	chains.forEach(chain => {
		if (nodes.length >= maxNodes) {
			truncated += 1 + chain.spreads.length;
			return;
		}
		nodes.push(chain.origin);
		chain.spreads.forEach(spread => {
			if (nodes.length >= maxNodes) {
				truncated += 1;
				return;
			}
			nodes.push(spread);
			links.push({
				source: chain.origin.id,
				target: spread.id,
				chainId: chain.origin.chainId,
			});
		});
	});

	const times = nodes.map(node => node.time).filter(Boolean);
	const tMin = times.length ? Math.min(...times) : 0;
	const tMax = times.length ? Math.max(...times) : 1;
	const hubStats = new Map();
	nodes.forEach(node => {
		const prev = hubStats.get(node.hub) || { hub: node.hub, count: 0, audience: 0, first: node.time };
		prev.count += 1;
		prev.audience += node.audience;
		prev.first = Math.min(prev.first || node.time, node.time);
		hubStats.set(node.hub, prev);
	});
	const hubs = [...hubStats.values()].sort(
		(a, b) => a.first - b.first || b.audience - a.audience,
	);

	return { nodes, links, hubs, tMin, tMax: tMax === tMin ? tMin + 1 : tMax, truncated };
}

export function layoutSpreadGraph(graph, width, height) {
	const { nodes, hubs, tMin, tMax } = graph;
	const pad = { left: 148, right: 28, top: 28, bottom: 36 };
	const lane = Math.max(42, (height - pad.top - pad.bottom) / Math.max(hubs.length, 1));
	const svgHeight = Math.max(height, pad.top + pad.bottom + hubs.length * lane);
	const svgWidth = Math.max(width, 1);
	const innerW = svgWidth - pad.left - pad.right;
	const hubIndex = new Map(hubs.map((hub, index) => [hub.hub, index]));
	const maxAudience = Math.max(1, ...nodes.map(node => node.audience));

	const placed = nodes.map(node => {
		const x =
			pad.left +
			((node.time - tMin) / (tMax - tMin || 1)) * innerW;
		const y = pad.top + ((hubIndex.get(node.hub) ?? 0) + 0.5) * lane;
		const r = 5 + Math.sqrt(node.audience / maxAudience) * 13;
		return { ...node, x, y, r, color: hubColor(node.hub) };
	});

	const byId = new Map(placed.map(node => [node.id, node]));
	const placedLinks = graph.links
		.map(link => {
			const source = byId.get(link.source);
			const target = byId.get(link.target);
			if (!source || !target) return null;
			const mx = (source.x + target.x) / 2;
			return {
				...link,
				d: `M ${source.x} ${source.y} C ${mx} ${source.y}, ${mx} ${target.y}, ${target.x} ${target.y}`,
			};
		})
		.filter(Boolean);

	const ticks = 6;
	const axis = Array.from({ length: ticks }, (_, index) => {
		const t = tMin + ((tMax - tMin) * index) / (ticks - 1 || 1);
		return {
			t,
			x: pad.left + (innerW * index) / (ticks - 1 || 1),
			label: formatTime(t),
		};
	});

	return {
		nodes: placed,
		links: placedLinks,
		hubs,
		pad,
		lane,
		svgWidth,
		svgHeight,
		axis,
		byId,
	};
}
