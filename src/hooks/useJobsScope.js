import { useCallback, useEffect, useState } from 'react';

import { $axios } from '@/api';

const STORAGE_KEY = 'tellscope.jobsShowAll';

const readShowAll = () => {
	try {
		return window.localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
};

const writeShowAll = value => {
	try {
		window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
	} catch {
		/* приватный режим — не критично */
	}
};

/**
 * Права на общие журналы задач («Очередь ML», «Мосинформ.Рейтинг»).
 *
 * `isSuperuser` берётся из `/me` (`is_superuser`). `showAll` доступен только
 * суперпользователю: по умолчанию выключен, выбор запоминается в localStorage и общий
 * для обеих вкладок. Обычному пользователю `showAll` всегда false — бэкенд отдаёт ему
 * только его задачи и отвечает 403 на `?all=1`.
 *
 * `ready` сообщает, что права уже известны: до этого запросы к журналу не отправляются,
 * иначе список успел бы мигнуть «только свои» → «все задачи тенанта».
 */
export const useJobsScope = () => {
	const [isSuperuser, setIsSuperuser] = useState(false);
	const [ready, setReady] = useState(false);
	const [showAll, setShowAllState] = useState(readShowAll);

	useEffect(() => {
		let on = true;
		(async () => {
			try {
				const { data } = await $axios.get('/me');
				if (on) setIsSuperuser(Boolean(data?.is_superuser));
			} catch {
				if (on) setIsSuperuser(false);
			} finally {
				if (on) setReady(true);
			}
		})();
		return () => {
			on = false;
		};
	}, []);

	const setShowAll = useCallback(value => {
		const next = Boolean(value);
		setShowAllState(next);
		writeShowAll(next);
	}, []);

	return {
		isSuperuser,
		ready,
		showAll: isSuperuser && showAll,
		setShowAll,
	};
};
