import { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
import { useAddBaseAndDate } from '../../../../../hooks/useAddBaseAndDate';

import styles from './AnalysisOfThemesPage.module.scss';
import { actions } from '@/store/data-users/dataUsers.slice';


const AnalysisOfThemesPage = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const dispatch = useDispatch();

    // Пытаемся взять из url, если redux пустой
    const indexFromUrl = params.get('index');
    const fileFromUrl = params.get('file');
    const folderFromUrl = params.get('folder');

    useEffect(() => {
        // если store пустой и url содержит параметры -- инициализируй через экшены
        if ((!dataForRequest || !dataForRequest.index) && indexFromUrl && fileFromUrl && folderFromUrl) {
            addIndex(Number(indexFromUrl));
            // addNameIndexFile/т.д. -- если требуется
            // ... можно сделать другие нужные dispatch'и
        }
    }, []);

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

    const { data: data_getUserId, isSuccess: isSuccess_getUserId } = useGetUserIdQuery();
    const {
        data,
        isError,
        error,
        isLoading: isFetchingUserFolders,
        isSuccess,
        refetch: refetchUserFolders
    } = useGetUserFoldersQuery(data_getUserId, { skip: !data_getUserId });


    // Добавить useEffect для автоматического обновления при получении данных пользователя
    useEffect(() => {
        if (isSuccess_getUserId) refetchUserFolders();
    }, [data_getUserId, isSuccess_getUserId, refetchUserFolders]);
 
    const {
        addMinDate,
        addMaxDate,
        toggleBarStart,
        toggleFinalStatus,
        setIsOpenSaveData,
        addData,
        addIndex,
        addNameIndexFile, // Добавьте если отсутствует
    } = useActions();

    // Добавить хук для обновления данных в Redux store
    useAddBaseAndDate(
        dataUser,
        data,
        isSuccess,
        dataForRequest.index,
        addData,
        addMinDate,
        addMaxDate,
        addIndex,
    );

    useEffect(() => {
        if (isSuccess && data) {
            addData(data);
        }
    }, [isSuccess, data, addData]);

    //HELP: Функция для обновления min/max даты
    const updateDates = useCallback(
        targetData => {
            if (targetData && targetData.length > 0) {
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

    const dataRequest = {
        user_id: data_getUserId,
        folder_name: dataForRequest.folder_name_html_file_request,
        file_name: dataForRequest.name_index_file || dataForRequest.first_html_file_request || '',
    };

    const file_name = Object.values(arrayData)
        .flat()
        .find(
            file =>
                dataForRequest.index === file.index_number &&
                (file['html-file'] === dataForRequest.name_index_file || 
                file['model-file'] === dataForRequest.name_index_file),
        );

    const dataRequestRepeat = {
        user_id: data_getUserId,
        folder_name: findKeyById(dataForRequest.index, dataUser),
        file_name: file_name?.['html-file'] || file_name?.['model-file'] || '',
    };

    

    useEffect(() => {
        console.log('Current dataForRequest:', dataForRequest);
        console.log('Current file_name:', file_name);
    }, [dataForRequest, file_name]);


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
        nav('/ai-analytics');  // Изменено с '/' на '/ai-analytics'
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

    // При успешном запросе сохраняй данные
    const handleShowResults = () => {
        const stateToSave = {
            index: dataForRequest.index,
            file: dataForRequest.first_html_file_request,
            folder: dataForRequest.folder_name_html_file_request
        };
        
        localStorage.setItem('analysisState', JSON.stringify(stateToSave));
        setIsOpenSaveData(true);
        nav(`/ai-analytics/analysis-of-themes?index=${dataForRequest.index}&file=${dataForRequest.first_html_file_request}&folder=${dataForRequest.folder_name_html_file_request}`);
    };

    // --- ФУНКЦИЯ УДАЛЕНИЯ ---
    const handleDeleteTheme = async (file_name, folder_path) => {
        if (!window.confirm("Удалить ИИ-анализ?")) return;
        
        try {
            console.log('Deleting with params:', {
                user_id: data_getUserId,
                folder_name: folder_path,
                file_name: file_name
            });

            const res = await axios.delete('/api/delete-theme-files', {
                params: {
                    user_id: data_getUserId,
                    folder_name: folder_path,  // это родительская папка, не папка темы
                    file_name: file_name
                }
            });

            console.log('Deletion result:', res.data);

            // Принудительно обновляем данные с сервера
            await refetchUserFolders();
            
            alert('Файлы успешно удалены');
            
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при удалении';
            alert(errorMessage);
        }
    };

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
                style={{
                    ...(isSuccess_llm ? {} : { alignItems: 'start', justifyContent: 'start' }),
                    position: 'relative',
                    zIndex: 1
                }}
                >
                <div className={styles.block__pageName} style={{ height: 'auto' }}>
                    <h3 className={styles.pageName__title}>Анализ тем</h3>
                </div>
                <div className={styles.block__configureSearch}>
                    <div className={styles.searchAndButtonsContainer}>
                            <DataForSearch
                            directory='bertopic'
                            style={{ 
                                maxWidth: '50vw', 
                                minWidth: 340, 
                                width: '100%',
                                position: 'relative' // Добавьте это
                            }}
                            className="analysisThemesSelector"
                            dropdownStatic={true}
                            showHtmlFiles={true}
                            onDeleteFile={handleDeleteTheme}
                            />
                        <div className={styles.buttonsContainer}>
                            <Button 
                                onClick={refetchUserFolders} 
                                disabled={isFetchingUserFolders}
                                style={isFetchingUserFolders ? { opacity: 0.7 } : {}}
                            >
                                {isFetchingUserFolders ? "Обновляем..." : "Обновить данные"}
                            </Button>
                            <Button
                                style={{
                                    flex: '1 1 180px',
                                    minWidth: 160,
                                    height: 56,
                                }}
                                onClick={repeatData}
                            >
                                Запуск
                            </Button>
                        </div>
                    </div>
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
                                ? 'Выберите вверху нужный файл и нажмите запуск, при необходимости (если не видите файл) обновите данные'
                                : <>
                                    Вы можете покинуть страницу, расчет продожится в фоновом режиме, результаты анализа будут доступны на странице{' '}
                                    <a
                                    href="https://tellscope40.headsmade.com/ai-analytics/analysis-of-themes"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#3578D1", textDecoration: "underline"}}
                                    >
                                    Анализ тем
                                    </a>
                                </>
                            }
                            </p>
                            <ProgressBar />
                            {/* {finalStatus && (
                            <button
                                className={styles.button__toResult}
                                onClick={handleShowResults}
                            >
                                Анализ завершен, перейти к результатам
                            </button>
                            )} */}
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
