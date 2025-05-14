import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useActions } from '@/hooks/useActions';
import { useLogout } from '@/hooks/useLogout';

import styles from './LeftMenuActive.module.scss';
import { menuPageData, menuSettings } from '@/data/menuPage.data';

const LeftMenuActive = () => {
	const { pathname } = useLocation();
	const { toggleActiveMenu } = useActions();
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
				<div
					className={styles.wrapper_menu}
					style={{ position: 'absolute', left: '-5%', zIndex: '5' }}
				>
					<Link to='/'>
						<img
							className={styles.logo}
							src='/images/full_logo.svg'
							alt='logo'
						/>
					</Link>
					<nav className={styles.menu}>
						<ul className={styles.menu__list_settings}>
							{menuSettings.map(itemMenu => {
								if (itemMenu.path) {
									return (
										<Link
											to={itemMenu.path}
											key={itemMenu.id}
											className={styles.menu__item}
										>
											<img
												src={
													itemMenu.id === 1
														? '/images/icons/menu/change_menu_exit.svg'
														: itemMenu.src
												}
												alt={itemMenu.title}
											/>
											{itemMenu.title}
										</Link>
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
											<img
												src={
													itemMenu.id === 1
														? '/images/icons/menu/change_menu_exit.svg'
														: itemMenu.src
												}
												alt={itemMenu.title}
											/>
											{itemMenu.title}
										</li>
									);
								}
							})}
						</ul>
					</nav>
				</div>
			) : (
				<div
					className={styles.wrapper_menu}
					style={{ position: 'absolute', left: '-5%', zIndex: '5' }}
				>
					<Link to='/'>
						<img
							className={styles.logo}
							src='/images/full_logo.svg'
							alt='logo'
						/>
					</Link>
					<nav className={styles.menu}>
						<ul className={styles.menu__list}>
							{menuPageData.map(itemMenu => {
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
										{itemMenu.title}
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
										>
											<img
												src={
													pathname === itemMenu.path
														? itemMenu.src_active
														: itemMenu.src
												}
												alt={itemMenu.title}
											/>
											{itemMenu.title}
										</Link>
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
											<img
												src={
													itemMenu.id === 1
														? '/images/icons/menu/change_menu_exit.svg'
														: itemMenu.src
												}
												alt={itemMenu.title}
											/>
											{itemMenu.title}
										</li>
									);
								}
							})}
						</ul>
					</nav>
				</div>
			)}
		</>
	);
};

export default LeftMenuActive;
