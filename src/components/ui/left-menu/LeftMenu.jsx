import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useActions } from '@/hooks/useActions';
import { useLogout } from '@/hooks/useLogout';

import styles from './LeftMenu.module.scss';
import { menuPageData, menuSettings } from '@/data/menuPage.data';

const LeftMenu = () => {
	const { pathname } = useLocation();
	const { toggleActiveMenu } = useActions();
	const navigate = useNavigate();
	const logoutHandler = useLogout();

	const [hoveredItem, setHoveredItem] = useState(null);

	const handleMouseEnter = id => {
		setHoveredItem(id);
	};

	const handleMouseLeave = () => {
		setHoveredItem(null);
	};

	return (
		<>
			{pathname === '/home' ? (
				<div className={styles.wrapper_menu}>
					<Link to='/home'>
						<img className={styles.logo} src='/images/logo.svg' alt='logo' />
					</Link>
					<nav className={styles.menu}>
						<ul className={styles.menu__list}>
							{menuSettings.map(itemMenu => {
								if (itemMenu.path) {
									return (
										<li
											key={itemMenu.id}
											className={styles.menu__item}
											onClick={() => {
												if (itemMenu.id === 1) toggleActiveMenu('');
												// itemMenu.path ? navigate(itemMenu.path) : undefined;

												if (itemMenu.path && itemMenu.title !== 'FAQ') {
													navigate(itemMenu.path);
												} else if (itemMenu.path && itemMenu.title === 'FAQ') {
													window.open(
														itemMenu.path,
														'_blank',
														'noopener,noreferrer',
													);
												}
											}}
										>
											<img src={itemMenu.src} alt='change_menu' />
										</li>
									);
								} else {
									return (
										<li
											key={itemMenu.id}
											className={styles.menu__item}
											onClick={() => {
												if (itemMenu.id === 1) toggleActiveMenu('');
												if (itemMenu.id === 2) logoutHandler();
											}}
										>
											<img src={itemMenu.src} alt='change_menu' />
										</li>
									);
								}
							})}
						</ul>
					</nav>
				</div>
			) : (
				<div className={styles.wrapper_menu}>
					<Link to='/home'>
						<img className={styles.logo} src='/images/logo.svg' alt='logo' />
					</Link>
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
										onClick={() =>
											!isDisabled && itemMenu.path && navigate(itemMenu.path)
										}
										onMouseEnter={() => handleMouseEnter(itemMenu.id)}
										onMouseLeave={handleMouseLeave}
									>
										<img
											src={isActive ? itemMenu.src_active : itemMenu.src}
											alt={itemMenu.title}
										/>
										{isDisabled &&
											itemMenu.path &&
											hoveredItem === itemMenu.id && (
												<p className={styles.not_ready}>В разработке</p>
											)}
									</li>
								);
							})}
						</ul>
					</nav>
					<nav className={styles.menu}>
						<ul className={styles.menu__list}>
							{menuSettings.map(itemMenu => {
								return (
									<li
										key={itemMenu.id}
										className={styles.menu__item}
										onClick={() => {
											if (itemMenu.id === 1) toggleActiveMenu('');
											if (itemMenu.id === 2) logoutHandler();

											if (itemMenu.title === 'FAQ') {
												window.open(
													itemMenu.path,
													'_blank',
													'noopener,noreferrer',
												);
											}

											if (
												!(itemMenu.path === '/none') &&
												itemMenu.path &&
												itemMenu.title !== 'FAQ'
											) {
												navigate(itemMenu.path);
											}
										}}
									>
										<img src={itemMenu.src} alt={itemMenu.title} />
									</li>
								);
							})}
						</ul>
					</nav>
				</div>
			)}
		</>
	);
};

export default LeftMenu;
