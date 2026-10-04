// Разделы интерфейса и доступ к ним: единая точка для меню, выбора раздела и маршрутов.
//
// Сервер (/api/me) отдаёт:
//   allowed_sections — список слагов, которые выданы пользователю, либо ['*'];
//   all_sections     — true, если доступны все разделы;
//   sections_catalog — каталог разделов: слаг, название, путь интерфейса.
//
// Пока ответ не пришёл, доступ считаем полным: интерфейс не должен «мигать» закрытыми
// разделами при загрузке. Решение сервера остаётся главным — он всё равно вернёт 403.
import { menuPageData } from '../data/menuPage.data';

export const ALL_SECTIONS = '*';

const catalogOf = me => (me && Array.isArray(me.sections_catalog) ? me.sections_catalog : []);

/** Все пути, которые являются разделами: каталог сервера плюс само меню. */
const sectionPaths = me => {
	const paths = catalogOf(me).map(section => section.path);
	// Берём все пункты меню, включая те, что живут только в боковом списке (ОИВ рейтинг,
	// PR-кампании): иначе такой путь не считался разделом, и по прямой ссылке он открывался
	// даже без выдачи.
	menuPageData.forEach(item => {
		if (item.path) paths.push(item.path);
	});
	return paths.filter(Boolean);
};

/** Доступны ли пользователю все разделы (или ответ ещё не получен). */
export const hasAllSections = me => {
	if (!me) return true;
	if (me.all_sections) return true;
	const allowed = me.allowed_sections;
	if (!Array.isArray(allowed) || allowed.length === 0) return true;
	return allowed.includes(ALL_SECTIONS);
};

/** Пути разделов, которые выданы пользователю. */
export const allowedSectionPaths = me => {
	if (hasAllSections(me)) return null; // null — ограничений нет
	const allowed = me.allowed_sections || [];
	return catalogOf(me)
		.filter(section => allowed.includes(section.slug))
		.map(section => section.path);
};

const sameOrChild = (path, base) => {
	if (!base || !path) return false;
	if (path === base) return true;
	return path.startsWith(base.endsWith('/') ? base : base + '/');
};

/** Можно ли открыть путь интерфейса. Пути вне разделов (главная, служебные) не ограничиваем. */
export const canOpenPath = (me, path) => {
	if (!path) return true;
	const allowedPaths = allowedSectionPaths(me);
	if (!allowedPaths) return true;
	// Путь считается разделом, если он есть в каталоге сервера или в самом меню:
	// так ограничение работает, даже если каталог пришёл неполным.
	const inCatalog = sectionPaths(me).some(base => sameOrChild(path, base));
	if (!inCatalog) return true;
	return allowedPaths.some(base => sameOrChild(path, base));
};

/** Является ли путь разделом сервиса: по списку меню — до ответа /me другого источника нет. */
export const isSectionPath = path => {
	if (!path) return false;
	const menuPaths = menuPageData.map(item => item.path).filter(Boolean);
	return menuPaths.some(base => sameOrChild(path, base));
};

/**
 * Строгая проверка для списков (плитки главной, пункты меню).
 *
 * Отличие от `canOpenPath`: пока ответ /me не пришёл, разделы **не показываются**. Иначе на
 * перезагрузке страницы пользователь мельком видит плитки и пункты, которые ему не выданы
 * (у demo@demo.ru так мелькали «Конструктор Dify» и ещё один раздел администратора).
 * Пункты без раздела (свернуть меню, выйти) видны сразу.
 */
export const canOpenPathKnown = (me, path) => {
	if (!me) return !isSectionPath(path);
	return canOpenPath(me, path);
};

/** Название раздела по пути — для сообщения «нет доступа». */
export const sectionTitleForPath = (me, path) => {
	const found = catalogOf(me).find(section => sameOrChild(path, section.path));
	return (found && found.title) || '';
};
