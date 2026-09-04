const hubTotal = hubs =>
	(hubs || []).reduce((sum, hub) => sum + (Number(hub.values) || 0), 0);

const authorTotal = bucket =>
	(bucket || []).reduce(
		(sum, group) =>
			sum +
			(group.author_data || []).reduce(
				(inner, author) =>
					inner + (Number(author.count_texts) || (author.texts || []).length || 0),
				0,
			),
		0,
	);

const filterAuthors = (bucket, predicate) =>
	(bucket || [])
		.map(group => ({
			...group,
			author_data: (group.author_data || []).filter(predicate),
		}))
		.filter(group => (group.author_data || []).length);

export const recountTonality = data => {
	if (!data) return data;
	const posHubs = data.tonality_hubs_values?.positive_hubs || [];
	const negHubs = data.tonality_hubs_values?.negative_hubs || [];
	return {
		...data,
		tonality_values: {
			...(data.tonality_values || {}),
			positive_count: hubTotal(posHubs),
			negative_count: hubTotal(negHubs),
		},
	};
};

export const mentionCount = data =>
	(Number(data?.tonality_values?.positive_count) || 0) +
	(Number(data?.tonality_values?.negative_count) || 0);

export const visibleAuthorSlice = (points, rootId) => {
	const list = points || [];
	const root = rootId || 'root';
	if (!root || root === 'root') {
		return { type: 'authors', rootId: 'root', side: 'both' };
	}
	if (root === 'negative' || root === 'positive') {
		return {
			type: 'authors',
			rootId: root,
			side: root,
		};
	}
	const ids = new Set([root]);
	let grew = true;
	while (grew) {
		grew = false;
		list.forEach(point => {
			if (point.parent && ids.has(point.parent) && !ids.has(point.id)) {
				ids.add(point.id);
				grew = true;
			}
		});
	}
	const nodes = list.filter(point => ids.has(point.id));
	const side =
		root === 'positive' || String(root).startsWith('positive.')
			? 'positive'
			: root === 'negative' || String(root).startsWith('negative.')
				? 'negative'
				: 'both';
	return {
		type: 'authors',
		rootId: root,
		side,
		hubNames: nodes.filter(point => point.role === 'hub').map(point => point.name),
		authors: nodes
			.filter(point => point.role === 'author')
			.map(point => ({
				name: point.name,
				hub: point.hub,
				side: String(point.id).startsWith('positive') ? 'positive' : 'negative',
				messages: point.messages || [],
			})),
	};
};

export const applyGraphSlice = (data, slice) => {
	if (!data) return null;
	if (!slice || (slice.type === 'authors' && (!slice.rootId || slice.rootId === 'root'))) {
		return recountTonality(data);
	}

	const next = {
		...data,
		tonality_hubs_values: {
			positive_hubs: [...(data.tonality_hubs_values?.positive_hubs || [])],
			negative_hubs: [...(data.tonality_hubs_values?.negative_hubs || [])],
		},
		positive_authors_values: data.positive_authors_values,
		negative_authors_values: data.negative_authors_values,
		tonality_values: { ...(data.tonality_values || {}) },
	};

	if (slice.type === 'authors') {
		if (slice.side === 'positive') {
			next.tonality_hubs_values.negative_hubs = [];
			next.negative_authors_values = [];
		}
		if (slice.side === 'negative') {
			next.tonality_hubs_values.positive_hubs = [];
			next.positive_authors_values = [];
		}
		if (slice.hubNames?.length) {
			const allow = new Set(slice.hubNames);
			next.tonality_hubs_values.positive_hubs =
				next.tonality_hubs_values.positive_hubs.filter(hub => allow.has(hub.name));
			next.tonality_hubs_values.negative_hubs =
				next.tonality_hubs_values.negative_hubs.filter(hub => allow.has(hub.name));
		}
		if (slice.authors?.length) {
			const names = new Set(slice.authors.map(author => author.name));
			const hubs = new Set(slice.authors.map(author => author.hub).filter(Boolean));
			if (hubs.size) {
				next.tonality_hubs_values.positive_hubs =
					next.tonality_hubs_values.positive_hubs.filter(hub => hubs.has(hub.name));
				next.tonality_hubs_values.negative_hubs =
					next.tonality_hubs_values.negative_hubs.filter(hub => hubs.has(hub.name));
			}
			const match = (author, side) => {
				if (!names.has(author.fullname)) return false;
				if (slice.side !== 'both' && slice.side !== side) return false;
				if (!hubs.size) return true;
				return (author.texts || []).some(text => hubs.has(text.hub));
			};
			next.positive_authors_values = filterAuthors(next.positive_authors_values, author =>
				match(author, 'positive'),
			);
			next.negative_authors_values = filterAuthors(next.negative_authors_values, author =>
				match(author, 'negative'),
			);
		}
		const authorLevel = String(slice.rootId || '').split('.').length >= 3;
		next.tonality_values.positive_count = authorLevel
			? authorTotal(next.positive_authors_values)
			: hubTotal(next.tonality_hubs_values.positive_hubs);
		next.tonality_values.negative_count = authorLevel
			? authorTotal(next.negative_authors_values)
			: hubTotal(next.tonality_hubs_values.negative_hubs);
		return next;
	}

	if (slice.type === 'mentions') {
		const allow = new Set(slice.hubNames || []);
		const filterHubs = hubs => hubs.filter(hub => allow.has(hub.name));
		if (String(slice.side || '').startsWith('Позитив')) {
			next.tonality_hubs_values.positive_hubs = filterHubs(next.tonality_hubs_values.positive_hubs);
		} else {
			next.tonality_hubs_values.negative_hubs = filterHubs(next.tonality_hubs_values.negative_hubs);
		}
		const keepHubs = new Set([
			...next.tonality_hubs_values.positive_hubs.map(hub => hub.name),
			...next.tonality_hubs_values.negative_hubs.map(hub => hub.name),
		]);
		const onHub = author =>
			(author.texts || []).some(text => keepHubs.has(text.hub)) || keepHubs.has(author.fullname);
		if (String(slice.side || '').startsWith('Позитив')) {
			next.positive_authors_values = filterAuthors(next.positive_authors_values, onHub);
		} else {
			next.negative_authors_values = filterAuthors(next.negative_authors_values, onHub);
		}
		next.tonality_values.positive_count = hubTotal(next.tonality_hubs_values.positive_hubs);
		next.tonality_values.negative_count = hubTotal(next.tonality_hubs_values.negative_hubs);
		return next;
	}

	return recountTonality(data);
};
