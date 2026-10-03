import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';

import { $axios } from '@/api';
import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';

import styles from './Docs.module.scss';

const WIKI_URL = 'https://wiki.tellscope40.headsmade.com';

// Документация внутри Tellscope: те же страницы, что и в вики, но содержание строится по
// выданным разделам — пользователь видит только своё. Полная вики остаётся отдельным сайтом
// и доступна администратору.
const Docs = () => {
	useCheckAuth();

	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const { active_menu } = useSelector(store => store.booleanValues);
	const me = useCurrentUser();

	const [pages, setPages] = useState([]);
	const [groups, setGroups] = useState([]);
	const [current, setCurrent] = useState('');
	const [page, setPage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const requested = useMemo(() => new URLSearchParams(search).get('page') || '', [search]);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const { data } = await $axios.get('/docs/pages');
				if (!alive) return;
				const items = data.pages || [];
				setPages(items);
				setGroups(data.groups || []);
				const wanted = items.find(item => item.path === requested) || items[0];
				if (wanted) setCurrent(wanted.path);
			} catch (e) {
				if (alive) setError('Не удалось загрузить содержание документации');
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
		// requested читаем один раз при открытии: дальше страницу выбирает пользователь
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!current) return undefined;
		let alive = true;
		setPage(null);
		(async () => {
			try {
				const { data } = await $axios.get('/docs/page', { params: { path: current } });
				if (alive) {
					setPage(data);
					setError('');
				}
			} catch (e) {
				if (alive) setError('Эта страница вам недоступна');
			}
		})();
		return () => {
			alive = false;
		};
	}, [current]);

	const open = path => {
		setCurrent(path);
		navigate('/docs?page=' + encodeURIComponent(path), { replace: true });
	};

	const byGroup = useMemo(
		() =>
			groups
				.map(group => ({ group, items: pages.filter(item => item.group === group) }))
				.filter(group => group.items.length > 0),
		[groups, pages],
	);

	return (
		<Layout>
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content alignStart>
				<div className={styles.page}>
					<div className={styles.head}>
						<h2 className={styles.title}>Документация</h2>
						{me && me.is_superuser && (
							<a
								className={styles.wikiLink}
								href={WIKI_URL}
								target='_blank'
								rel='noopener noreferrer'
							>
								полный справочник (wiki)
							</a>
						)}
					</div>

					<div className={styles.body}>
						<nav className={styles.nav}>
							{byGroup.map(group => (
								<div key={group.group} className={styles.navGroup}>
									<div className={styles.navGroupTitle}>{group.group}</div>
									{group.items.map(item => (
										<button
											key={item.path}
											type='button'
											title={item.description || item.title}
											className={
												item.path === current ? styles.navItemActive : styles.navItem
											}
											onClick={() => open(item.path)}
										>
											{item.title}
										</button>
									))}
								</div>
							))}
							{!loading && pages.length === 0 && !error && (
								<div className={styles.empty}>
									Пока не выдан ни один раздел с документацией — запросите доступ у
									администратора.
								</div>
							)}
						</nav>

						<article className={styles.doc}>
							{loading && <div className={styles.empty}>Загружаю…</div>}
							{error && <div className={styles.error}>{error}</div>}
							{page && !loading && (
								<>
									<h1 className={styles.docTitle}>{page.title}</h1>
									<div className={styles.markdown}>
										<ReactMarkdown>{page.markdown}</ReactMarkdown>
									</div>
								</>
							)}
						</article>
					</div>
				</div>
			</Content>
		</Layout>
	);
};

export default Docs;
