import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { $axios } from '../../../../api';
import {
	useLazyGetIdProgressBarQuery,
	useLazyGetStateProgressBarQuery,
} from '../../../../services/tables.service';

import styles from './AiAnalytics.module.scss';
import AiTable from './ai-tables/AiTable';
import AiTablePost from './ai-tables/AiTablePost';

const AiAnalytics = () => {
	const { post, idProgressBar, viewTable, stateLoad } = useSelector(
		state => state.aiData,
	);
	const { infoAboutPost } = useSelector(state => state.dataForRequest);

	// const [stateLoad, setStateLoad] = useState('100');

	const [
		trigger_getIdProgressBar,
		{
			data: data_getIdProgressBar,
			isLoading: isLoading_getIdProgressBar,
			isSuccess: isSuccess_getIdProgressBar,
		},
	] = useLazyGetIdProgressBarQuery();
	const [
		trigger_getStateProgressBar,
		{
			data: data_getStateProgressBar,
			isLoading: isLoading_getStateProgressBar,
			isSuccess: isSuccess_getStateProgressBar,
		},
	] = useLazyGetStateProgressBarQuery();

	const test1 = async () => {
		const response = await $axios.get(`/progress/llm_task_18/`);
		console.log(response);
	};

	useEffect(() => {
		if (idProgressBar !== null && stateLoad !== '100') {
			trigger_getStateProgressBar(idProgressBar);
			// test1();
			const intervalId = setInterval(() => {
				trigger_getStateProgressBar(idProgressBar);
				// test1();
				console.log('est');
			}, 3000);
			return () => clearInterval(intervalId);
		}
	}, [idProgressBar]);

	return (
		<div className={styles.block__table}>
			<button onClick={() => trigger_getIdProgressBar()}>test</button>
			<button onClick={() => test1(idProgressBar)}>test</button>
			{/* {stateLoad !== null && (
				<div className={styles.block__stateLoad}>
					<h4 className={styles.title__info}>
						{stateLoad === '100'
							? 'Обработка запроса завершена'
							: 'ИИ анализ запущен'}
					</h4>
					<p className={styles.description__info}>
						{stateLoad === '100'
							? 'Результат анализа будет доступен после его завершения в разделе Анализ тематик. Вы можете покинуть страницу и вернуться к ней в любое время без потери прогресса.'
							: 'Результат анализа доступен в разделе Анализ тематик'}
					</p>
					<ProgressBar stateLoad={stateLoad} />
				</div>
			)} */}
			{viewTable !== null && viewTable === 'get' && idProgressBar === null ? (
				<AiTable />
			) : (
				<AiTablePost />
			)}
		</div>
	);
};

export default AiAnalytics;
