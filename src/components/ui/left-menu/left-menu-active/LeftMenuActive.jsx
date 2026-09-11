import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useActions } from '@/hooks/useActions';
import { useLogout } from '@/hooks/useLogout';

import styles from './LeftMenuActive.module.scss';
import { menuPageData, menuSettings, agentMenuData } from '@/data/menuPage.data';

const LeftMenuActive = () => {
	const { pathname } = useLocation();
	const { toggleActiveMenu } = useActions();
	const logoutHandler = useLogout();

	const [hoveredItem, setHoveredItem] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	const handleMouseEnter = id => {
		setHoveredItem(id);
	};

	const handleMouseLeave = () => {
		setHoveredItem(null);
	};

	const closeMobile = () => setMobileOpen(false);
	const labelOf = item => item.title || item.text || '';

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
						<img
							className={styles.logo}
							src='/images/full_logo.svg'
							alt='logo'
						/>
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
						<ul className={styles.menu__list_settings}>
							{menuSettings.map(itemMenu => {
								if (itemMenu.id === 1) {
									return (
										<li
											key={itemMenu.id}
											className={`${styles.menu__item} ${styles.hideOnMobile}`}
											onClick={() => toggleActiveMenu('')}
										>
											<img
												src='/images/icons/menu/change_menu_exit.svg'
												alt={itemMenu.title}
											/>
											{labelOf(itemMenu)}
										</li>
									);
								}
								if (itemMenu.path) {
									return (
										<Link
											to={itemMenu.path}
											key={itemMenu.id}
											className={styles.menu__item}
											onClick={closeMobile}
										>
											<img src={itemMenu.src} alt={itemMenu.title} />
											{labelOf(itemMenu)}
										</Link>
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
										{labelOf(itemMenu)}
									</li>
								);
							})}
						</ul>
					</nav>
				) : (
					<>
						<nav className={styles.menu}>
							<ul className={styles.menu__list}>
								{agentMenuData.length > 0 && (
									<li className={styles.menu__groupTitle}>ИИ-автоматизация</li>
								)}
								{agentMenuData.map(itemMenu => (
									<Link
										key={itemMenu.id}
										to={itemMenu.path}
										className={`${styles.menu__item} ${styles.menu__item_agent} ${pathname === itemMenu.path ? styles.menu__item_agentActive : ''}`}
										onClick={closeMobile}
									>
										<img src={pathname === itemMenu.path ? itemMenu.src_active : itemMenu.src} alt={itemMenu.title} />
										{itemMenu.title}
										<span className={styles.menu__badge}>AI</span>
									</Link>
								))}
								{menuPageData.filter(item => !item.accent).map(itemMenu => {
									const isDisabled = itemMenu.path === '/none';

									return (
										<Link
											disabled={isDisabled}
											key={itemMenu.id}
											to={itemMenu.path}
											className={
												pathname === itemMenu.path
													? styles.menu__item_active
													: styles.menu__item
											}
											onClick={closeMobile}
											onMouseEnter={() => handleMouseEnter(itemMenu.id)}
											onMouseLeave={handleMouseLeave}
										>
											<img
												src={
													pathname === itemMenu.path
														? itemMenu.src_active
														: itemMenu.src
												}
												alt={itemMenu.title}
											/>
											{labelOf(itemMenu)}
											{isDisabled &&
												itemMenu.path &&
												hoveredItem === itemMenu.id && (
													<p className={styles.not_ready}>В разработке</p>
												)}
										</Link>
									);
								})}
							</ul>
						</nav>
						<nav className={styles.menu}>
							<ul className={styles.menu__list_settings}>
								{menuSettings.map(itemMenu => {
									if (itemMenu.id === 1) {
										return (
											<li
												key={itemMenu.id}
												className={`${styles.menu__item} ${styles.hideOnMobile}`}
												onClick={() => toggleActiveMenu('')}
											>
												<img
													src='/images/icons/menu/change_menu_exit.svg'
													alt={itemMenu.title}
												/>
												{labelOf(itemMenu)}
											</li>
										);
									}
									if (itemMenu.path) {
										return (
											<Link
												to={itemMenu.path}
												key={itemMenu.id}
												className={
													pathname === itemMenu.path
														? styles.menu__item_active
														: styles.menu__item
												}
												onClick={closeMobile}
											>
												<img
													src={
														pathname === itemMenu.path
															? itemMenu.src_active
															: itemMenu.src
													}
													alt={itemMenu.title}
												/>
												{labelOf(itemMenu)}
											</Link>
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
											{labelOf(itemMenu)}
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

export default LeftMenuActive;
