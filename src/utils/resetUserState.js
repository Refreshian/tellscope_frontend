// Сброс данных, которые фронтенд собрал для прошлой учётной записи.
//
// Cookie и кэш /me чистились при смене пользователя, а кэш Redux Toolkit Query и срез
// dataUsers — нет. Из-за этого после входа под новым пользователем страница «Наборы данных»
// показывала папки предыдущего: запрос /me брался из кэша (чужой id), а по чужому id в кэше
// лежал готовый ответ /user-folders. Сервер при этом отвечает правильно — подводит браузер.
import { store } from '../store/store';
import { actions as dataUsersActions } from '../store/data-users/dataUsers.slice';
import { dataUsersService } from '../services/other.service';
import { dataSetService } from '../services/dataSet.service';
import { getGraphService } from '../services/getGraph.service';
import { tablesService } from '../services/tables.service';

const resetApi = api => {
	try {
		if (api && api.util && typeof api.util.resetApiState === 'function') {
			store.dispatch(api.util.resetApiState());
		}
	} catch {
		/* до создания store сбрасывать нечего */
	}
};

/** Полный сброс пользовательских данных в браузере: кэш запросов и срез с папками. */
export const resetUserScopedState = () => {
	resetApi(dataUsersService);
	resetApi(dataSetService);
	resetApi(getGraphService);
	resetApi(tablesService);
	try {
		store.dispatch(dataUsersActions.clearData());
	} catch {
		/* срез может быть ещё не подключён */
	}
};
