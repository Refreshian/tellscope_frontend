import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { $axios } from '../../../../api';
import { useActions } from '../../../../hooks/useActions';
import {
	useLazyGetStatusRequestQuery,
} from '../../../../services/tables.service';

import styles from './AiAnalytics.module.scss';
import AiTable from './ai-tables/AiTable';
import AiTablePost from './ai-tables/AiTablePost';

const AiAnalytics = () => {
	const navigate = useNavigate();
	const { post, idProgressBar, viewTable, stateLoad } = useSelector(
		state => state.aiData,
	);
	const { infoAboutPost } = useSelector(state => state.dataForRequest);

	const { toggleFinalStatus } = useActions();

	const [ 
		trigger_getStatusRequest,
		{
			data: data_getStatusRequest,
			isLoading: isLoading_getStatusRequest,
			isSuccess: isSuccess_getStatusRequest,
		},
	] = useLazyGetStatusRequestQuery();

	const test1 = async () => {
		const response = await $axios.get(`/progress/llm_task_18/`);
		console.log(response);
	};

	// Отслеживание завершения анализа и переход на страницу результатов
	useEffect(() => {
		if (stateLoad === '100') {
			console.log('Analysis completed! Redirecting...'); // Добавим лог
			
			// Устанавливаем финальный статус
			toggleFinalStatus(true);
			
			// Переходим на страницу анализа тем через небольшую задержку
			const timer = setTimeout(() => {
				console.log('Navigating to analysis-of-themes'); // Добавим лог
				navigate('/analysis-of-themes');
			}, 2000); // Увеличим задержку до 2 секунд

			return () => clearTimeout(timer);
		}
	}, [stateLoad, navigate, toggleFinalStatus]);

	// Исправленная логика для интервала
	useEffect(() => {
		if (idProgressBar !== null) {
			console.log('Starting progress tracking for ID:', idProgressBar);
			
			// Первый запрос сразу
			trigger_getStatusRequest(idProgressBar);
			
			// Устанавливаем интервал только если анализ еще не завершен
			const intervalId = setInterval(() => {
				console.log('Checking progress... Current state:', stateLoad);
				
				// Проверяем статус перед запросом
				if (stateLoad !== '100') {
					trigger_getStatusRequest(idProgressBar);
				} else {
					console.log('Analysis completed, clearing interval');
					clearInterval(intervalId);
				}
			}, 3000);
			
			return () => {
				console.log('Cleaning up interval');
				clearInterval(intervalId);
			};
		}
	}, [idProgressBar, trigger_getStatusRequest]); // Убрал stateLoad из зависимостей

	// Тестовая функция для получения ID прогресс-бара (если нужна)
	const startProgressTest = () => {
		// Здесь должна быть логика получения ID, например:
		// trigger_getIdProgressBar() - если такой эндпоинт существует
		console.log('Starting progress test...');
	};

	return (
		<div className={styles.block__table}>
			<button onClick={startProgressTest}>test</button>
			<button onClick={() => test1(idProgressBar)}>test</button>
			
			{/* Показываем уведомление о завершении перед переходом */}
			{stateLoad === '100' && (
				<div className={styles.block__completion}>
					<h4 className={styles.title__completion}>
						Анализ завершен! Переход к результатам...
					</h4>
				</div>
			)}
			
			{/* Добавим отладочную информацию */}
			<div style={{ padding: '10px', backgroundColor: '#f0f0f0', margin: '10px 0' }}>
				<p>ID Progress Bar: {idProgressBar}</p>
				<p>State Load: {stateLoad}</p>
				<p>View Table: {viewTable}</p>
				<p>Status Request Loading: {isLoading_getStatusRequest ? 'Yes' : 'No'}</p>
			</div>
			
			{viewTable !== null && viewTable === 'get' && idProgressBar === null ? (
				<AiTable />
			) : (
				<AiTablePost /> 
			)}
		</div> 
	);
}; 

export default AiAnalytics;