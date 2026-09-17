// hooks/useCurrentUser.js
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

import { TOKEN, USER_ID } from '../app.constants';

// Текущий пользователь нужен сразу в нескольких местах каркаса (меню, выбор раздела,
// подпись с учётной записью). Чтобы не слать /api/me на каждый компонент, ответ
// кэшируется по токену, а параллельные вызовы ждут один и тот же запрос.
const ME_URL = '/api/me';

let cache = { token: null, user: null };
let pending = { token: null, promise: null };
let listeners = new Set();

const notify = () => {
	listeners.forEach(listener => {
		try {
			listener();
		} catch {
			/* один сломанный подписчик не должен мешать остальным */
		}
	});
};

export const currentUserToken = () => Cookies.get(TOKEN) || '';

/** Идентификатор из ответа /me в виде строки (`''`, если сервер его не отдал). */
export const userIdOf = user => {
	const id = user && (user.id ?? user.user_id);
	return id === undefined || id === null || id === '' ? '' : String(id);
};

/**
 * Cookie `user_id` — только быстрый кэш поверх серверной истины.
 *
 * Пишем её исключительно из ответа `/api/me`, поэтому значение от предыдущего входа не
 * может подменить текущего пользователя: при расхождении cookie перезаписывается
 * серверным id. Раньше компоненты читали cookie как источник истины, и после входа под
 * другой учётной записью запрос уходил на чужой id (`GET /reports/32` токеном id 1 → 403).
 */
export const writeUserIdCookie = user => {
	const value = userIdOf(user);
	if (value && String(Cookies.get(USER_ID) || '') !== value) {
		Cookies.set(USER_ID, value);
	}
	return value;
};

/** id уже загруженного пользователя для текущего токена — без обращения к сети. */
export const cachedUserId = () => {
	const token = currentUserToken();
	if (!token || cache.token !== token || !cache.user) return '';
	return userIdOf(cache.user);
};

export const loadCurrentUser = () => {
	const token = currentUserToken();

	if (!token) {
		cache = { token: null, user: null };
		return Promise.resolve(null);
	}

	if (cache.token === token) {
		writeUserIdCookie(cache.user);
		return Promise.resolve(cache.user);
	}
	if (pending.token === token) return pending.promise;

	const promise = fetch(ME_URL, { headers: { Authorization: `Bearer ${token}` } })
		.then(response => (response.ok ? response.json() : null))
		.catch(() => null)
		.then(user => {
			cache = { token, user };
			// Источник истины — сервер: cookie получает именно его значение
			writeUserIdCookie(user);
			if (pending.token === token) {
				pending = { token: null, promise: null };
			}
			return user;
		});

	pending = { token, promise };
	return promise;
};

/**
 * Идентификатор текущего пользователя из `/api/me` — единственный источник истины для
 * запросов «за себя»: `/reports/{id}`, `/user-folders/{id}`, `/reports/download/{id}/…`.
 */
export const resolveCurrentUserId = () =>
	loadCurrentUser().then(user => {
		const id = userIdOf(user);
		if (!id) throw new Error('/api/me не вернул идентификатор пользователя');
		return id;
	});

/**
 * Сброс кэша после смены учётной записи.
 *
 * Cookie чистит `clearUserSession()` из `utils/userSession`; здесь — только память модуля
 * и оповещение подписчиков, чтобы уже смонтированные компоненты перечитали `/api/me`.
 */
export const invalidateCurrentUser = () => {
	cache = { token: null, user: null };
	pending = { token: null, promise: null };
	notify();
};

const subscribeCurrentUser = listener => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useCurrentUser = () => {
	const [user, setUser] = useState(() =>
		cache.token && cache.token === currentUserToken() ? cache.user : null,
	);

	useEffect(() => {
		let mounted = true;

		const sync = () => {
			loadCurrentUser().then(data => {
				if (mounted) setUser(data);
			});
		};

		sync();
		const unsubscribe = subscribeCurrentUser(sync);

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, []);

	return user;
};

/** Готовый id текущего пользователя для компонентов (`''`, пока /me не ответил). */
export const useCurrentUserId = () => userIdOf(useCurrentUser());
