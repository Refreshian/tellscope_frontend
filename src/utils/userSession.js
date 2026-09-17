// utils/userSession.js
import Cookies from 'js-cookie';

import { REFRESH_TOKEN, TOKEN, USER_ID } from '../app.constants';

/**
 * Данные, привязанные к конкретной учётной записи и переживающие выход из системы.
 *
 * Cookie `user_id` не чистилась ни при входе, ни при выходе: после смены пользователя в
 * браузере оставался id предыдущего, и запросы уходили на чужой id — сервер справедливо
 * отвечал 403 («Не удалось загрузить список отчётов — GET /reports/32 → HTTP 403»).
 */
export const USER_SCOPED_COOKIES = [USER_ID, TOKEN, REFRESH_TOKEN];

/** Содержимое localStorage, которое принадлежит пользователю, а не браузеру. */
export const USER_SCOPED_STORAGE_KEYS = ['aiChatHistory', 'mosinform_last_job'];

/** Локальное содержимое прошлого пользователя: история чата с ИИ и id последнего расчёта. */
export const clearUserScopedStorage = () => {
	USER_SCOPED_STORAGE_KEYS.forEach(key => {
		try {
			window.localStorage.removeItem(key);
		} catch {
			/* приватный режим или запрет хранилища — чистить нечего */
		}
	});
};

/**
 * Полная очистка сессии перед сменой учётной записи.
 *
 * Вызывается при успешном входе, при выходе и при разлогине по истёкшему токену: без неё
 * cookie предыдущего пользователя доживает до следующего входа и подменяет текущего.
 */
export const clearUserSession = () => {
	USER_SCOPED_COOKIES.forEach(name => {
		if (name) Cookies.remove(name);
	});
	clearUserScopedStorage();
};
