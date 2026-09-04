import { domainFromUrl, toMs } from './spreadUtils';

const metric = value => {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : 0;
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

export const toPost = (message, kind) => {
	const url = message?.url || '';
	return {
		kind,
		name: message?.fullname || 'Без имени',
		url,
		hub: message?.hub || domainFromUrl(url) || 'источник',
		audience: metric(message?.audienceCount),
		views: metric(message?.viewsCount),
		comments: metric(message?.commentsCount),
		likes: metric(message?.likesCount),
		time: toMs(message?.timeCreate),
		text: message?.text || '',
	};
};

export const localSummary = (text, query) => {
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

const escapeRe = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const highlightSummary = (text, query) => {
	if (!text) return null;
	const wrapped = String(text).replace(/\[\[(.+?)\]\]/g, '$1');
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
	return { parts, lower };
};

export function themeFileName(folders, themeIndex) {
	if (!folders || themeIndex == null) return '';
	for (const files of Object.values(folders)) {
		const hit = (files || []).find(
			item => Number(item.index_number) === Number(themeIndex),
		);
		if (hit) return hit.file || '';
	}
	return '';
}

export function buildChains(
	values,
	{ minLen = 2, maxChains = 120, maxSingles = 500 } = {},
) {
	const prepared = (values || [])
		.map((item, index) => {
			const origin = toPost(item.author, 'origin');
			const posts = [
				origin,
				...(item.reposts || []).map(repost => toPost(repost, 'spread')),
			]
				.filter(post => post.time > 0)
				.sort((a, b) => a.time - b.time);
			const audience = posts.reduce((sum, post) => sum + post.audience, 0);
			return {
				id: index,
				origin: posts.find(post => post.kind === 'origin') || posts[0],
				posts,
				audience,
			};
		})
		.filter(chain => chain.posts.length >= 1);

	const linked = prepared
		.filter(chain => chain.posts.length >= minLen)
		.sort(
			(a, b) =>
				b.audience - a.audience || b.posts.length - a.posts.length,
		);
	const isolated = prepared
		.filter(chain => chain.posts.length === 1)
		.sort(
			(a, b) =>
				b.audience - a.audience ||
				(a.origin?.time || 0) - (b.origin?.time || 0),
		);

	return {
		chains: linked.slice(0, maxChains),
		all: linked,
		truncated: Math.max(0, linked.length - maxChains),
		singles: isolated.slice(0, maxSingles),
		singlesTotal: isolated.length,
		truncatedSingles: Math.max(0, isolated.length - maxSingles),
	};
}

export function cumulativePoints(chain) {
	let sum = 0;
	return chain.posts.map((post, index) => {
		sum += post.audience;
		return {
			x: post.time,
			y: sum,
			chainId: chain.id,
			index,
			name: post.name,
			hub: post.hub,
			url: post.url,
			kind: post.kind,
			audience: post.audience,
		};
	});
}

export async function fetchChainSummary({ text, query, theme, signal }) {
	const fallback = localSummary(text, query);
	if (!text) return fallback;
	const response = await fetch('/api/information-graph/chain-summary', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text, query, theme }),
		signal,
	});
	if (!response.ok) throw new Error('summary failed');
	const payload = await response.json();
	return payload.summary || fallback;
}
