export const TOP_PIE_SLICES = 36;
export const TOP_AUTHORS_PER_HUB = 0;
export const TOP_HUBS_PER_SIDE = 28;
export const TOP_BUBBLES = 70;
export const TOP_SCATTER = 400;

export function topNWithOther(
	items,
	n,
	getValue = d => d.value,
	otherName = 'Прочее',
) {
	if (!Array.isArray(items) || items.length <= n) return items || [];
	const sorted = [...items].sort(
		(a, b) => (getValue(b) || 0) - (getValue(a) || 0),
	);
	const head = sorted.slice(0, n);
	const rest = sorted.slice(n);
	const otherValue = rest.reduce((sum, item) => sum + (getValue(item) || 0), 0);
	if (otherValue <= 0) return head;
	return [
		...head,
		{
			name: `${otherName} (${rest.length})`,
			value: otherValue,
			color: '#b0b8c4',
			isOther: true,
		},
	];
}

function syncSunburstParentValues(points) {
	const parents = new Set(points.map(p => p.parent).filter(Boolean));
	return points.map(point => {
		if (!parents.has(point.id) || point.value == null) return point;
		const next = { ...point };
		delete next.value;
		return next;
	});
}

export function capSunburstPoints(
	points,
	maxHubs = TOP_HUBS_PER_SIDE,
	maxAuthors = TOP_AUTHORS_PER_HUB,
) {
	if (!Array.isArray(points) || !points.length) return points || [];

	let result = points;

	if (points.length >= 80) {
		const keep = new Set(['root', 'negative', 'positive']);
		const extra = [];

		['negative', 'positive'].forEach(side => {
			const hubs = points
				.filter(p => p.parent === side)
				.sort((a, b) => (b.value || 0) - (a.value || 0));
			const head = hubs.slice(0, maxHubs);
			const rest = hubs.slice(maxHubs);
			head.forEach(h => keep.add(h.id));

			if (rest.length) {
				const otherId = `${side}.other`;
				keep.add(otherId);
				extra.push({
					id: otherId,
					parent: side,
					name: `Ещё источников (${rest.length})`,
					value: rest.reduce((s, h) => s + (h.value || 0), 0),
				});
			}

			head.forEach(hub => {
				const authors = points
					.filter(p => p.parent === hub.id)
					.sort((a, b) => (b.value || 0) - (a.value || 0));
				const limit =
					maxAuthors > 0 && authors.length > maxAuthors
						? maxAuthors
						: authors.length;
				const aHead = authors.slice(0, limit);
				const aRest = authors.slice(limit);
				aHead.forEach(a => keep.add(a.id));
				if (aRest.length) {
					extra.push({
						id: `${hub.id}.other`,
						parent: hub.id,
						name: `Ещё авторов (${aRest.length})`,
						value: aRest.reduce((s, a) => s + (a.value || 0), 0),
					});
				}
			});
		});

		result = points.filter(p => keep.has(p.id)).concat(extra);
	}

	return syncSunburstParentValues(result);
}
