import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { useCurrentUser } from '@/hooks/useCurrentUser';

import styles from './CurrentUser.module.scss';

// На страницах входа подпись с учётной записью не нужна
const AUTH_PATHS = ['/', '/auth', '/login'];

const roleTitle = user => (user.is_superuser ? 'администратор' : 'пользователь');

const tooltipOf = user =>
	[
		user.email || user.username || '',
		`username: ${user.username || '—'}`,
		`роль: ${roleTitle(user)}${user.role_id != null ? ` (role_id ${user.role_id})` : ''}`,
		`id: ${user.id}`,
	].join('\n');

// Подпись «под какой учётной записью работаем»: мелкая серая строка внизу левого меню
// (на узких экранах меню уезжает в шторку, поэтому там подпись встаёт у кнопки-бургера).
const CurrentUser = () => {
	const { pathname } = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);
	const user = useCurrentUser();

	if (!user || AUTH_PATHS.includes(pathname)) return null;

	const expanded = Boolean(active_menu) && pathname !== '/home';

	return (
		<div
			className={`${styles.currentUser}${expanded ? ` ${styles.currentUserExpanded}` : ''}`}
			data-tooltip={tooltipOf(user)}
		>
			<span className={styles.email}>{user.email || user.username}</span>
			{user.is_superuser && <span className={styles.role}>администратор</span>}
		</div>
	);
};

export default CurrentUser;
