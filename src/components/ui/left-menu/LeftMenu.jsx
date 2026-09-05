import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useActions } from '@/hooks/useActions';
import { useLogout } from '@/hooks/useLogout';
import { useAuth } from '@/hooks/useAuth';

import styles from './LeftMenu.module.scss';
import { menuPageData, menuSettings } from '@/data/menuPage.data';

const LeftMenu = () => {
	const { pathname } = useLocation();
	const { toggleActiveMenu } = useActions();
	const navigate = useNavigate();
	const logoutHandler = useLogout();
	const { user } = useAuth();
	const [me, setMe] = useState(null);

	useEffect(() => {
		let on = true;
		(async () => {
			try {
				const m = document.cookie.split('; ').find(x => x.startsWith('token='));
				const tok = m ? decodeURIComponent(m.slice('token='.length)) : '';
				if (!tok) return;
				const r = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + tok } });
				if (r.ok && on) setMe(await r.json());
			} catch (e) {}
		})();
		return () => { on = false; };
	}, []);

	const [hoveredItem, setHoveredItem] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);

	const isAdmin = user?.email === 'test@test.ru';

	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	const handleMouseEnter = id => {
		setHoveredItem(id);
	};

	const handleMouseLeave = () => {
		setHoveredItem(null);
	};

	const aiTestMenuItem = {
		id: 1,
		title: 'AI Test',
		path: '/ai-test',
		src: '/images/icons/ai.svg',
		src_active: '/images/icons/ai.svg',
	};

	const labelOf = item => item.title || item.text || '';

	const closeMobile = () => setMobileOpen(false);

	return (
		<>
			<button
				type='button'
				className={`${styles.burger} ${mobileOpen ? styles.burgerHidden : ''}`}
				aria-label='Открыть меню'
				onClick={() => setMobileOpen(true)}
			>
				<span />
				<span />
				<span />
			</button>
			{mobileOpen && (
				<div className={styles.backdrop} onClick={closeMobile} aria-hidden />
			)}
			<div className={`${styles.wrapper_menu} ${mobileOpen ? styles.open : ''}`}>
				<div className={styles.drawerHead}>
					<Link to='/home' onClick={closeMobile}>
						<img className={styles.logo} src='/images/logo.svg' alt='logo' />
					</Link>
					<button
						type='button'
						className={styles.close}
						aria-label='Закрыть меню'
						onClick={closeMobile}
					>
						×
					</button>
				</div>
				{pathname === '/home' ? (
					<nav className={styles.menu}>
						<ul className={styles.menu__list}>
							{menuSettings.map(itemMenu => {
								if (itemMenu.id === 1) {
									return (
										<li
											key={itemMenu.id}
											className={`${styles.menu__item} ${styles.hideOnMobile}`}
											onClick={() => toggleActiveMenu('')}
										>
											<img src={itemMenu.src} alt={itemMenu.title} />
											<span className={styles.menu__label}>
												{labelOf(itemMenu)}
											</span>
										</li>
									);
								}
								if (itemMenu.path) {
									return (
										<li
											key={itemMenu.id}
											className={styles.menu__item}
											onClick={() => {
												closeMobile();
												if (itemMenu.title === 'FAQ') {
													window.open(
														itemMenu.path,
														'_blank',
														'noopener,noreferrer',
													);
												} else {
													navigate(itemMenu.path);
												}
											}}
										>
											<img src={itemMenu.src} alt={itemMenu.title} />
											<span className={styles.menu__label}>
												{labelOf(itemMenu)}
											</span>
										</li>
									);
								}
								return (
									<li
										key={itemMenu.id}
										className={styles.menu__item}
										onClick={() => {
											closeMobile();
											if (itemMenu.id === 2) logoutHandler();
										}}
									>
										<img src={itemMenu.src} alt={itemMenu.title} />
										<span className={styles.menu__label}>
											{labelOf(itemMenu)}
										</span>
									</li>
								);
							})}
							</ul>
							</nav>
						) : (
						<>
							<nav className={styles.menu}>
								<ul className={styles.menu__list}>
								{menuPageData.map(itemMenu => {
									const isDisabled = itemMenu.path === '/none';
									const isActive = pathname === itemMenu.path;
									return (
										<li
											disabled={isDisabled}
											key={itemMenu.id}
											className={
												isActive ? styles.menu__item_active : styles.menu__item
											}
											onClick={() => {
												if (isDisabled || !itemMenu.path) return;
												closeMobile();
												navigate(itemMenu.path);
											}}
											onMouseEnter={() => handleMouseEnter(itemMenu.id)}
											onMouseLeave={handleMouseLeave}
										>
											<img
												src={isActive ? itemMenu.src_active : itemMenu.src}
												alt={itemMenu.title}
											/>
											<span className={styles.menu__label}>
												{labelOf(itemMenu)}
											</span>
											{isDisabled &&
												itemMenu.path &&
												hoveredItem === itemMenu.id && (
													<p className={styles.not_ready}>В разработке</p>
												)}
										</li>
									);
								})}

								{isAdmin && (
									<li
										key={aiTestMenuItem.id}
										className={
											pathname === aiTestMenuItem.path
												? styles.menu__item_active
												: styles.menu__item
										}
										onClick={() => {
											closeMobile();
											navigate(aiTestMenuItem.path);
										}}
										title={aiTestMenuItem.title}
									>
										<img
											src={
												pathname === aiTestMenuItem.path
													? aiTestMenuItem.src_active
													: aiTestMenuItem.src
											}
											alt={aiTestMenuItem.title}
										/>
										<span className={styles.menu__label}>
											{aiTestMenuItem.title}
										</span>
									</li>
								)}
								{me && me.is_superuser && (
									<li
										key='admin-console'
										className={pathname === '/admin' ? styles.menu__item_active : styles.menu__item}
										onClick={() => {
											closeMobile();
											navigate('/admin');
										}}
										title='Администрирование'
									>
										<img src='/images/icons/settings_for_download_graph.svg' alt='Администрирование' />
										<span className={styles.menu__label}>Администрирование</span>
									</li>
								)}
</ul>
						</nav>
						<nav className={styles.menu}>
							<ul className={styles.menu__list}>
								{menuSettings.map(itemMenu => {
									return (
										<li
											key={itemMenu.id}
											className={`${styles.menu__item} ${itemMenu.id === 1 ? styles.hideOnMobile : ''}`}
											onClick={() => {
												if (itemMenu.id === 1) toggleActiveMenu('');
												if (itemMenu.id === 2) {
													closeMobile();
													logoutHandler();
												}

												if (itemMenu.title === 'FAQ') {
													closeMobile();
													window.open(
														itemMenu.path,
														'_blank',
														'noopener,noreferrer',
													);
												}

												if (
													!(itemMenu.path === '/none') &&
													itemMenu.path &&
													itemMenu.title !== 'FAQ' &&
													itemMenu.id !== 1
												) {
													closeMobile();
													navigate(itemMenu.path);
												}
											}}
										>
											<img src={itemMenu.src} alt={itemMenu.title} />
											<span className={styles.menu__label}>
												{labelOf(itemMenu)}
											</span>
										</li>
									);
								})}
							</ul>
						</nav>
					</>
				)}
			</div>
		</>
	);
};

export default LeftMenu;
