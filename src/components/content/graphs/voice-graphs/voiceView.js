const n = value => {
	const num = Number(value);
	return Number.isFinite(num) ? num : 0;
};

export const TONE_COLORS = {
	Позитив: '#039855',
	Негатив: '#D92D20',
	Нейтрал: '#667085',
};

export const TYPE_COLORS = {
	Пост: '#2E90FA',
	Комментарий: '#FD853A',
	Репост: '#7A5AF8',
	'Репост с дополнением': '#EE46BC',
	other: '#98A2B3',
};

export const emptyVoiceFilters = () => ({
	search: '',
	type: '',
	hub: '',
	tonality: '',
	author_type: '',
});

export const flattenRows = values => {
	const rows = [];
	(values || []).forEach(group => {
		(group.sunkey_data || []).forEach(row => {
			rows.push({
				...row,
				search: row.search || group.name || 'Все сообщения',
				count: n(row.count) || 1,
			});
		});
	});
	return rows;
};

export const mentionCount = values =>
	flattenRows(values).reduce((sum, row) => sum + n(row.count), 0);

const rowMatch = (row, filters = {}) => {
	if (filters.search && row.search !== filters.search) return false;
	if (filters.type && row.type !== filters.type) return false;
	if (filters.hub && row.hub !== filters.hub) return false;
	if (filters.tonality && row.tonality !== filters.tonality) return false;
	if (filters.author_type && row.author_type !== filters.author_type) return false;
	return true;
};

export const applyVoiceFilters = (values, filters, ranges) => {
	if (!values) return [];
	return values
		.map(group => ({
			...group,
			sunkey_data: (group.sunkey_data || []).filter(row => {
				if (!rowMatch({ ...row, search: row.search || group.name }, filters)) {
					return false;
				}
				if (!ranges) return true;
				return (
					n(row.audienceCount) >= ranges.audience[0] &&
					n(row.audienceCount) <= ranges.audience[1] &&
					n(row.commentsCount) >= ranges.comments[0] &&
					n(row.commentsCount) <= ranges.comments[1] &&
					n(row.viewsCount) >= ranges.views[0] &&
					n(row.viewsCount) <= ranges.views[1] &&
					n(row.repostsCount) >= ranges.reposts[0] &&
					n(row.repostsCount) <= ranges.reposts[1] &&
					n(row.likesCount) >= (ranges.likes?.[0] ?? 0) &&
					n(row.likesCount) <= (ranges.likes?.[1] ?? Number.MAX_SAFE_INTEGER)
				);
			}),
		}))
		.filter(group => (filters.search ? group.name === filters.search : true));
};

const uniqSorted = (items, getValue) => {
	const counts = new Map();
	items.forEach(item => {
		const key = getValue(item);
		if (!key) return;
		counts.set(key, (counts.get(key) || 0) + n(item.count));
	});
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([name, count]) => ({ name, count }));
};

export const voiceFacets = values => {
	const rows = flattenRows(values);
	return {
		searches: uniqSorted(rows, row => row.search),
		types: uniqSorted(rows, row => row.type),
		hubs: uniqSorted(rows, row => row.hub),
		tonalities: uniqSorted(rows, row => row.tonality),
		authorTypes: uniqSorted(rows, row => row.author_type),
	};
};

export const sliderBounds = values => {
	const rows = flattenRows(values);
	const maxOf = key => Math.max(1, ...rows.map(row => n(row[key])), 1);
	return {
		audience: maxOf('audienceCount'),
		comments: maxOf('commentsCount'),
		views: maxOf('viewsCount'),
		reposts: maxOf('repostsCount'),
		likes: maxOf('likesCount'),
	};
};

export const parseNodeId = id => {
	const raw = String(id || '');
	const sep = raw.indexOf('::');
	if (sep < 0) return null;
	return { dim: raw.slice(0, sep), value: raw.slice(sep + 2) };
};

const nodeId = (dim, value) => `${dim}::${value}`;

const addLink = (map, from, to, weight) => {
	const key = `${from}\t${to}`;
	map.set(key, (map.get(key) || 0) + weight);
};

export const buildSankey = (values, maxHubs = 14) => {
	const rows = flattenRows(values);
	if (!rows.length) return { nodes: [], links: [], columns: [] };

	const hubTotals = new Map();
	rows.forEach(row => {
		hubTotals.set(row.hub, (hubTotals.get(row.hub) || 0) + n(row.count));
	});
	const topHubs = new Set(
		[...hubTotals.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, maxHubs)
			.map(([name]) => name),
	);

	const nodes = new Map();
	const links = new Map();
	const ensure = (dim, value, color) => {
		const id = nodeId(dim, value);
		if (!nodes.has(id)) {
			nodes.set(id, { id, name: value, column: dim, color });
		}
		return id;
	};

	rows.forEach(row => {
		const hubName = topHubs.has(row.hub) ? row.hub : `Прочие (${hubTotals.size - topHubs.size})`;
		const q = ensure('q', row.search, '#2E90FA');
		const t = ensure('t', row.type, TYPE_COLORS[row.type] || '#98A2B3');
		const h = ensure('h', hubName, '#12B76A');
		const s = ensure('s', row.tonality, TONE_COLORS[row.tonality] || '#667085');
		const w = n(row.count);
		addLink(links, q, t, w);
		addLink(links, t, h, w);
		addLink(links, h, s, w);
	});

	return {
		nodes: [...nodes.values()],
		links: [...links.entries()].map(([key, weight]) => {
			const [from, to] = key.split('\t');
			return [from, to, weight];
		}),
		columns: [
			{ id: 'q', title: 'Запрос' },
			{ id: 't', title: 'Тип сообщения' },
			{ id: 'h', title: 'Источник' },
			{ id: 's', title: 'Тональность' },
		],
	};
};

export const connectedIds = (links, seedId) => {
	if (!seedId) return null;
	const ids = new Set([seedId]);
	let grew = true;
	while (grew) {
		grew = false;
		links.forEach(([from, to]) => {
			if (ids.has(from) && !ids.has(to)) {
				ids.add(to);
				grew = true;
			}
			if (ids.has(to) && !ids.has(from)) {
				ids.add(from);
				grew = true;
			}
		});
	}
	return ids;
};
