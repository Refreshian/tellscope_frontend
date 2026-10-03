import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { useCurrentUser } from '@/hooks/useCurrentUser';

import styles from './CurrentUser.module.scss';

// На страницах входа подпись с учётной записью не нужна
const AUTH_PATHS = ['/', '/auth', '/login'];

const roleTitle = user => (user.is_superuser ? 'администратор' : 'пользователь');

// Подсказка об учётной записи: только логин, имя пользователя и роль.
// Идентификаторы (user_id, role_id) не показываем — в подсказке они никому не нужны.
const tooltipOf = user =>
	[
		user.email ? `login: ${user.email}` : '',
		user.username ? `username: ${user.username}` : '',
		`роль: ${roleTitle(user)}`,
	]
		.filter(Boolean)
		.join('\n');

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
