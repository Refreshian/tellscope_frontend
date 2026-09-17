// hooks/useCurrentUser.js
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

import { TOKEN } from '../app.constants';

// Текущий пользователь нужен сразу в нескольких местах каркаса (меню, выбор раздела,
// подпись с учётной записью). Чтобы не слать /api/me на каждый компонент, ответ
// кэшируется по токену, а параллельные вызовы ждут один и тот же запрос.
const ME_URL = '/api/me';

let cache = { token: null, user: null };
let pending = { token: null, promise: null };

export const currentUserToken = () => Cookies.get(TOKEN) || '';

export const loadCurrentUser = () => {
	const token = currentUserToken();

	if (!token) {
		cache = { token: null, user: null };
		return Promise.resolve(null);
	}

	if (cache.token === token) return Promise.resolve(cache.user);
	if (pending.token === token) return pending.promise;

	const promise = fetch(ME_URL, { headers: { Authorization: `Bearer ${token}` } })
		.then(response => (response.ok ? response.json() : null))
		.catch(() => null)
		.then(user => {
			cache = { token, user };
			if (pending.token === token) {
				pending = { token: null, promise: null };
			}
			return user;
		});

	pending = { token, promise };
	return promise;
};

export const useCurrentUser = () => {
	const [user, setUser] = useState(() =>
		cache.token && cache.token === currentUserToken() ? cache.user : null,
	);

	useEffect(() => {
		let mounted = true;

		loadCurrentUser().then(data => {
			if (mounted) setUser(data);
		});

		return () => {
			mounted = false;
		};
	}, []);

	return user;
};
