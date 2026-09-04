import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { formatTime } from '../spreadUtils';
import {
	fetchChainSummary,
	formatCount,
	highlightSummary,
	localSummary,
	ruCount,
	themeFileName,
} from '../chainView';

import styles from './ChainPanel.module.scss';

const openUrl = url => {
	if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

const SummaryText = ({ text, query }) => {
	const marked = highlightSummary(text, query);
	if (!marked) return null;
	if (typeof marked === 'string') return marked;
	return marked.parts.map((part, index) =>
		marked.lower.includes(part.toLowerCase()) ? (
			<mark key={`${part}-${index}`}>{part}</mark>
		) : (
			<span key={`${part}-${index}`}>{part}</span>
		),
	);
};

const ChainPanel = ({ chain, yLabel = 'Аудитория цепочки' }) => {
	const query = useSelector(state => state.dataForRequest?.query_str) || '';
	const themeIndex = useSelector(state => state.dataForRequest?.index);
	const folders = useSelector(
		state => state.dataUsersSlice?.json_files_directory,
	);
	const themeName = useMemo(
		() => themeFileName(folders, themeIndex),
		[folders, themeIndex],
	);
	const [summary, setSummary] = useState({ loading: false, text: '' });

	const origin = chain?.origin || chain?.posts?.[0];
	const sourceText = origin?.text || '';
	const longEnough = (chain?.posts?.length || 0) > 3;

	useEffect(() => {
		if (!chain) return undefined;
		if (!sourceText) {
			setSummary({ loading: false, text: '' });
			return undefined;
		}
		const local = localSummary(sourceText, query);
		if (!longEnough) {
			setSummary({ loading: false, text: local });
			return undefined;
		}
		let cancelled = false;
		const controller = new AbortController();
		setSummary({ loading: true, text: local });
		fetchChainSummary({
			text: sourceText,
			query,
			theme: themeName,
			signal: controller.signal,
		})
			.then(text => {
				if (!cancelled) setSummary({ loading: false, text });
			})
			.catch(() => {
				if (!cancelled) {
					setSummary({
						loading: false,
						text: localSummary(sourceText, query),
					});
				}
			});
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [chain?.id, sourceText, longEnough, query, themeName]);

	if (!chain) {
		return (
			<aside className={styles.panel}>
				<p className={styles.placeholder}>
					Кликните цепочку или одиночную публикацию — справа появится, как
					она росла и о чём речь. Двойной клик открывает пост.
				</p>
			</aside>
		);
	}

	const totalAudience = chain.audience;
	const first = chain.posts[0];
	const last = chain.posts[chain.posts.length - 1];

	return (
		<aside className={styles.panel}>
			<p className={styles.kicker}>
				{(chain.posts?.length || 0) > 1
					? 'Цепочка распространения'
					: 'Одиночная публикация'}
			</p>
			<h4>{origin?.name || 'Без имени'}</h4>
			<p className={styles.meta}>
				{origin?.hub}
				<br />
				{formatTime(first?.time)} → {formatTime(last?.time)}
			</p>
			<ul className={styles.stats}>
				<li>
					Сообщений
					<strong>{chain.posts.length}</strong>
				</li>
				<li>
					{yLabel}
					<strong>{formatCount(totalAudience)}</strong>
				</li>
			</ul>
			<div className={styles.summary}>
				<p className={styles.chainTitle}>Краткое содержание</p>
				{summary.loading && !summary.text ? (
					<p className={styles.meta}>Собираем пересказ…</p>
				) : summary.text ? (
					<>
						<p className={styles.summaryText}>
							<SummaryText text={summary.text} query={query} />
						</p>
						{summary.loading && (
							<p className={styles.meta}>Уточняем пересказ…</p>
						)}
					</>
				) : (
					<p className={styles.meta}>
						Текст исходного сообщения недоступен — содержание не из чего
						собрать.
					</p>
				)}
			</div>
			<button
				type="button"
				className={styles.openBtn}
				onClick={() => openUrl(origin?.url)}
				disabled={!origin?.url}
			>
				Открыть исходное сообщение
			</button>
			<p className={styles.chainTitle}>
				Авторы · {chain.posts.length}{' '}
				{ruCount(chain.posts.length, 'сообщение', 'сообщения', 'сообщений')}
			</p>
			<ul className={styles.list}>
				{chain.posts.map((post, index) => (
					<li key={`${post.url}-${index}`}>
						<button type="button" onDoubleClick={() => openUrl(post.url)}>
							<span>{formatTime(post.time)}</span>
							<strong>{post.name}</strong>
							<em>
								{post.hub}
								{post.audience
									? ` · ${formatCount(post.audience)} аудитория`
									: ''}
							</em>
						</button>
					</li>
				))}
			</ul>
		</aside>
	);
};

export default ChainPanel;
