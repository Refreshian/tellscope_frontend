// import { useAddBaseAndDate } from '../../../../../hooks/useAddBaseAndDate';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '../../../../../hooks/useActions';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../../../services/other.service';
import { useLazyLlmAnalyzeQuery } from '../../../../../services/tables.service';
import { findKeyById } from '../../../../../utils/searchInData';
import AnalysisOfThemes from '../../../../content/tables/analysis-of-themes/AnalysisOfThemes';
import NoDataRequest from '../../../../no-data-request/NoDataRequest';
import Button from '../../../../ui/button/Button';
import DataForSearch from '../../../../ui/data-for-search/DataForSearch';
import ProgressBar from '../../../../ui/progress-bar/ProgressBar';

import styles from './AnalysisOfThemesPage.module.scss';

const AnalysisOfThemesPage = () => {

	const { pathname } = useLocation();
	const nav = useNavigate();
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { active_menu } = useSelector(store => store.booleanValues);
	const { statusBarStart, finalStatus, index_doc, isOpenSaveData } =
		useSelector(state => state.aiData);
	const { bertopic_files_directory: dataUser } = useSelector(
		store => store.dataUsersSlice,
	);
	const [
		trigger,
		{
			data: data_llm,
			isLoading: isLoading_llm,
			isSuccess: isSuccess_llm,
			isError: isError_llm,
		},
	] = useLazyLlmAnalyzeQuery();

	const { data: data_getUserId } = useGetUserIdQuery();
	const { data, isError, error, isLoading, isSuccess } =
		useGetUserFoldersQuery(data_getUserId);

	const {
		addMinDate,
		addMaxDate,
		toggleBarStart,
		toggleFinalStatus,
		setIsOpenSaveData,
	} = useActions();

	//HELP: Функция для обновления min/max даты
	const updateDates = useCallback(
		targetData => {
			if (targetData && targetData.length > 0) {
				console.log('dsdf', targetData);
				addMinDate(targetData.min_data);
				addMaxDate(targetData.max_data);
			}
		},
		[addMinDate, addMaxDate],
	);

	////////////////////HELP:добавление дат на данной странице по индексу документа
	const arrayData =
		dataUser && Object.keys(dataUser).length > 0 ? dataUser : {};

	const foundArray = Object.values(arrayData)
		.flat()
		.find(el => el.index_number === index_doc);

	useEffect(() => {
		if (foundArray) {
			updateDates(foundArray);
		}
	}, [dataUser]);
	///////////////////

	const file_name = Object.values(arrayData)
		.flat()
		.find(
			file =>
				dataForRequest.index === file.index_number &&
				file['model-file'] === dataForRequest.name_index_file,
		);

	const dataRequest = {
		user_id: data_getUserId,
		folder_name: dataForRequest.folder_name_html_file_request,
		file_name: dataForRequest.first_html_file_request || '',
	};

	const dataRequestRepeat = {
		user_id: data_getUserId,
		folder_name: findKeyById(dataForRequest.index, dataUser),
		file_name: file_name?.['html-file'] || '',
	};

	const onClick = () => {
		trigger(dataRequest);
	};

	const repeatData = () => {
		trigger(dataRequestRepeat);
		setIsOpenSaveData(false);
	};

	const handleClickBack = () => {
		toggleBarStart(false);
		toggleFinalStatus(false);
		nav('/');
	};

	const [isNoData, setIsNoData] = useState(false);
	useEffect(() => {
		if (isError_llm) {
			setIsNoData(true);
			setIsOpenSaveData(true);
			const timer = setTimeout(() => setIsNoData(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [isError_llm]);

	return (
		<Layout>
			{isLoading_llm && (
				<>
					<BackgroundLoader />
					<Loader />
				</>
			)}
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content
				style={
					isSuccess_llm ? {} : { alignItems: 'start', justifyContent: 'start' }
				}
			>
				<div className={styles.block__pageName} style={{ height: 'auto' }}>
					<h3 className={styles.pageName__title}>Анализ тем</h3>
				</div>
				<div className={styles.block__configureSearch}>
					{(isSuccess_llm || isOpenSaveData) && (
						<DataForSearch
							directory='bertopic'
							style={{
								width: '100%',
							}}
						/>
					)}
					{(isSuccess_llm || isOpenSaveData) && (
						<Button
							style={{
								width: 'calc(220/1440*100vw)',
								height: 'calc(56/1440*100vw)',
							}}
							onClick={repeatData}
						>
							Запуск
						</Button>
					)}
				</div>

				{statusBarStart && !isSuccess_llm && (
					<>
						<button className={styles.button__back} onClick={handleClickBack}>
							<img src='/images/icons/arrow_in_folder_left.svg' alt='arrow' />
							Назад
						</button>
						<div className={styles.block__calculation}>
							<h3 className={styles.title__calculation}>
								{finalStatus
									? 'Расчет данных завершен'
									: 'Расчет данных запущен'}
							</h3>
							<p className={styles.description__calculation}>
								{finalStatus
									? 'Результат анализа доступен по нажатию на кнопку'
									: ' Вы можете покинуть страницу и вернуться к ней в любое время без потери прогресса.  Результат анализа доступен в разделе Анализ тем'}
							</p>
							<ProgressBar />
							{finalStatus && (
								<button onClick={onClick} className={styles.button}>
									Показать данные
								</button>
							)}
						</div>
					</>
				)}
				{isNoData && (
					<NoDataRequest
						style={{
							position: 'absolute',
							top: '55%',
							left: '50%',
							transform: 'translateX(-50%)',
						}}
					/>
				)}
				{isSuccess_llm && <AnalysisOfThemes data_llm={data_llm} />}
			</Content>
		</Layout>
	);
};

export default AnalysisOfThemesPage;
