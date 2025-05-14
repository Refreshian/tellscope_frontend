import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useGetUserIdQuery } from '../services/other.service';
import {
	useLazyGetStatusRequestQuery,
	useLazyStartDataAiQuery,
	useLazyStartTestingQuery,
} from '../services/tables.service';
import { findKeyById } from '../utils/searchInData';

import { useActions } from './useActions';

export const useStartAiRequests = () => {
	const nav = useNavigate();
	const { post } = useSelector(state => state.aiData);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { json_files_directory: dataUser } = useSelector(
		store => store.dataUsersSlice,
	);
	const {
		toggleBarStart,
		toggleIsViewPromptPopup,
		toggleFinalStatus,
		addFirstHtmlFileRequest,
	} = useActions();

	const [isLoadingTest, setIsLoadingTest] = useState(false); //HELP: Состояние для управления лоадером
	const [isSuccessTest, setIsSuccessTest] = useState(false);
	const [isSuccessAi, setIsSuccessAi] = useState(false);

	const { data: data_getUserId } = useGetUserIdQuery();
	const [trigger, { data, isError, isLoading, isSuccess }] =
		useLazyStartTestingQuery();
	const [
		trigger_status,
		{
			data: data_status,
			isError: isError_status,
			isLoading: isLoading_status,
			isSuccess: isSuccess_status,
		},
	] = useLazyGetStatusRequestQuery();
	const [triger_data, { data_ai }] = useLazyStartDataAiQuery();

	const getText = () => dataForRequest.texts.map(el => el.text);

	const dataForRequestTesting = {
		user_id: data_getUserId,
		texts: [
			// ...dataForRequest.texts,
			...getText(),
		],
		system_prompt: post.system_prompt,
		prompt_question: post.text_prompt,
	};

	const dataForRequestAi = {
		user_id: data_getUserId,
		folder_name: findKeyById(dataForRequest.index, dataUser),
		index: dataForRequest.index,
		min_date: dataForRequest.min_range_date,
		max_date: dataForRequest.max_range_date,
		query_str: dataForRequest.query_str,
		system_prompt: post.system_prompt,
		promt_question: post.text_prompt,
	};

	const onStartDataAi = async () => {
		setIsSuccessAi(false);
		toggleIsViewPromptPopup(false);
		nav('/ai-analytics/analysis-of-themes');
		try {
			toggleBarStart(true);
			// Cookies.set(STATUSBARSTART, 'true');
			setIsLoadingTest(true);
			const startResponse = await triger_data(dataForRequestAi);

			if (!startResponse.data?.task_id) {
				setIsLoadingTest(false);
				toggleBarStart(false);
				// Cookies.remove(STATUSBARSTART);
				return;
			}

			const taskId = startResponse.data.task_id;
			// const MAX_CHECKS = 100;
			// let checksCount = 0;
			let currentStage = 'progress'; // Текущий этап обработки: progress → embedding → final

			const checkStatus = async () => {
				try {
					const statusResponse = await trigger_status(taskId);

					console.log(
						'statusResponse',
						currentStage,
						statusResponse?.data.final_status === 'done',
					);

					if (statusResponse.error) {
						console.error('Status check failed:', statusResponse.error);
						setIsLoadingTest(false);
						// Cookies.remove(PROGRESSBAR);
						return false;
					}

					// Обновляем текущий этап в зависимости от прогресса
					switch (currentStage) {
						case 'progress':
							if (statusResponse.data?.progress === 100) {
								currentStage = 'embedding';
							}
							break;

						case 'embedding':
							if (statusResponse.data?.embedding_progress === 100) {
								currentStage = 'final';
							}
							break;
					}

					// Проверяем финальный статус
					if (
						currentStage === 'final' &&
						statusResponse.data?.final_status === 'done'
					) {
						setIsLoadingTest(false);
						setIsSuccessAi(true);
						// Cookies.remove(PROGRESSBAR);
						console.log('Task fully completed!', statusResponse.data);
						addFirstHtmlFileRequest({
							file_name: statusResponse.data?.['html-file'],
							folder_name: statusResponse.data?.folder_name,
						});
						toggleFinalStatus(true);
						return true;
					}

					return false;
				} catch (e) {
					setIsLoadingTest(false);
					setIsSuccessAi(false);
					console.error('Error during status check:', e);
					return false;
				}
			};

			// Первая проверка статуса
			const isCompleted = await checkStatus();
			if (isCompleted) return;

			// Запускаем периодические проверки
			const intervalId = setInterval(async () => {
				// if (checksCount++ >= MAX_CHECKS) {
				// 	clearInterval(intervalId);
				// 	setIsLoadingTest(false);
				// 	setIsSuccessAi(false);
				// 	Cookies.remove(STATUSBARSTART);
				// 	Cookies.remove(PROGRESSBAR);
				// 	console.error('Maximum checks reached');
				// 	return;
				// }

				const isCompleted = await checkStatus();
				if (isCompleted) {
					clearInterval(intervalId);
					// toggleBarStart(false);
				}
			}, 3000);

			return () => clearInterval(intervalId);
		} catch (error) {
			console.error('Testing failed:', error);
			setIsLoadingTest(false);
			setIsSuccessAi(false);
			// toggleBarStart(false);
		}
	};

	const onStartTesting = async () => {
		setIsSuccessTest(false);
		try {
			setIsLoadingTest(true); // Включаем лоадер перед началом запроса
			const startResponse = await trigger(dataForRequestTesting);
			console.log('startResponse', startResponse);
			if (!startResponse.data?.task_id) {
				setIsLoadingTest(false); // Выключаем лоадер, если task_id отсутствует
				return;
			}

			const taskId = startResponse.data.task_id;
			const MAX_CHECKS = 100; //HELP: Максимальное количество проверок
			let checksCount = 0;

			//HELP: Функция для проверки статуса задачи
			const checkStatus = async () => {
				try {
					const statusResponse = await trigger_status(taskId);

					if (statusResponse.error) {
						console.error('Status check failed:', statusResponse.error);
						setIsLoadingTest(false); // Выключаем лоадер при ошибке
						return false;
					}

					if (statusResponse.data?.status === 'done') {
						setIsLoadingTest(false); // Выключаем лоадер при завершении задачи
						setIsSuccessTest(true);
						console.log(
							'Task completed!',
							statusResponse.data,
							// JSON.parse(statusResponse.data.result),
							statusResponse.data.result,
						);
						return true; // Задача завершена
					}

					return false; // Задача еще не завершена
				} catch (e) {
					setIsLoadingTest(false); // Выключаем лоадер при ошибке
					setIsSuccessTest(false);
					console.error('Error during status check:', e);
					return false;
				}
			};

			//HELP: Первый запрос выполняется сразу
			const isCompleted = await checkStatus();
			if (isCompleted) return;

			//HELP: Запускаем интервал для последующих проверок
			const intervalId = setInterval(async () => {
				if (checksCount++ >= MAX_CHECKS) {
					clearInterval(intervalId);
					setIsLoadingTest(false); // Выключаем лоадер при достижении максимального количества проверок
					setIsSuccessTest(false);
					console.error('Status check timeout: Maximum checks reached');
					return;
				}

				const isCompleted = await checkStatus();
				if (isCompleted) {
					clearInterval(intervalId); // Останавливаем интервал при завершении задачи
					setIsSuccessTest(true);
				}
			}, 3000);

			//HELP: Очистка интервала при размонтировании
			return () => clearInterval(intervalId);
		} catch (e) {
			console.error('Testing failed:', e);
			setIsLoadingTest(false); // Выключаем лоадер при ошибке
			setIsSuccessTest(false);
		}
	};

	return {
		onStartTesting,
		isLoadingTest,
		isSuccessTest,
		data,
		onStartDataAi,
		isSuccessAi,
		setIsSuccessAi,
	};
};
