import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '../../../hooks/useActions';
import { useCheckAuth } from '../../../hooks/useCheckAuth';
import {
    useGetUserFoldersQuery,
    useGetUserIdQuery,
} from '../../../services/other.service';
import DataSet from '../../content/data-set/DataSet';
import DataInFolder from '../../content/data-set/folder/data-in-folder/DataInFolder';
import PopupDelete from '../../popups/popup-delete/PopupDelete';
import PopupInFolder from '../../popups/popup-in-folder/PopupInFolder';
import NotFound from '../not-found/NotFound';

import styles from './DataSetPage.module.scss';

const FileProgressBar = ({ progress, status, filename, details }) => {
    const navigate = useNavigate();

    const handleUploadComplete = (fileData) => {
        navigate('/ai-bot', {
            state: {
                fileName: filename,
                fileId: details?.taskId,
                collectionName: details?.collection_name || details?.index_name
            }
        });
    };

    useEffect(() => {
        if (status === 'completed' || status === 'success') {
            handleUploadComplete(details);
        }
    }, [status, details]);

    const safeProgress = Math.max(0, Math.min(100, parseFloat(progress) || 0));

    return (
        <div className={styles.fileProgressContainer}>
            <div className={styles.fileHeader}>
                <div className={styles.fileName}>{filename}</div>
                <div className={styles.fileStatus}>
                    {status === 'pending' && 'Подготовка...'}
                    {status === 'processing' && `${Math.round(safeProgress)}%`}
                    {status === 'completed' && 'Готово!'}
                    {status === 'failed' && 'Ошибка'}
                </div>
            </div>
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{
                        width: `${safeProgress}%`,
                        backgroundColor: status === 'failed' ? '#ff4d4f' :
                            status === 'completed' ? '#52c41a' : '#1890ff',
                        transition: 'width 0.3s ease-in-out'
                    }}
                />
            </div>
            {details && (
                <div className={styles.progressDetails}>
                    {typeof details === 'string' ? details : details?.stage_details || ''}
                </div>
            )}
        </div>
    );
};

function extractFilenameFromContentDisposition(header) {
    if (!header) return null;
    // filename= or filename*=; с кавычками или без
    const matches = /filename\*?=(?:UTF-8'')?["']?([^"';\n\r]+)["']?/i.exec(header);
    if (matches && matches[1]) {
        try {
            // Декодируем percent-encoded (для filename*=)
            return decodeURIComponent(matches[1]);
        } catch {
            return matches[1];
        }
    }
    return null;
}

const DataSetPage = () => {
    useCheckAuth();
    const navigate = useNavigate();

    const { addText_PopupInFolder, toggle_PopupInFolder } = useActions();
    const { pathname } = useLocation();
    const { active_menu } = useSelector(store => store.booleanValues);
    const { isPopupInFolder } = useSelector(state => state.popupInFolder);

    const { data } = useSelector(state => state.folderTarget);
    const { isPopupDelete, buttonTarget } = useSelector(
        state => state.popupDelete,
    );

    // В DataSetPage.jsx, найдите этот блок и измените его:
    const {
        data: data_getUserId,
        isError: isError_getUserId,
        error: error_getUserId,
        isLoading: isLoading_getUserId,
    } = useGetUserIdQuery();

    const { 
        refetch, 
        isError, 
        error, 
        isLoading, 
        isSuccess 
    } = useGetUserFoldersQuery(data_getUserId, {
        skip: !data_getUserId  // Добавьте эту опцию
    });

    const [fileName, setFileName] = useState('');
    const [convertFile, setConvertFile] = useState(null);
    const [convertLoading, setConvertLoading] = useState(false);
    const [convertResult, setConvertResult] = useState(null);
    const [convertError, setConvertError] = useState('');
    const convertInputRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);

    const progressIntervalRef = useRef(null);
    const [fileUploads, setFileUploads] = useState([]);

    // --- PROGRESS BAR LOGIC ---

    const checkUploadProgress = async (taskId, fileIndex) => {
        try {
            const response = await fetch(`/api/check-task-status/${taskId}`);
            const data = await response.json();

            setFileUploads(prev => prev.map((item, idx) => {
                if (idx === fileIndex) {
                    return {
                        ...item,
                        progress: parseInt(data.progress) || 0,
                        status: data.status || 'processing',
                        details: {
                            ...(item.details || {}),
                            stage_details: data.stage_details || '',
                            index_name: data.index_name || item.details?.index_name,
                            taskId: taskId
                        }
                    };
                }
                return item;
            }));

            if (data.status === 'completed' || data.status === 'failed') {
                setTimeout(() => {
                    setFileUploads(prev => prev.filter((_, idx) => idx !== fileIndex));
                    refetch();
                }, 3000);
            } else {
                setTimeout(() => checkUploadProgress(taskId, fileIndex), 1000);
            }
        } catch (error) {
            setTimeout(() => checkUploadProgress(taskId, fileIndex), 2000);
        }
    };

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        let folderName = data;
        if (typeof data === 'object' && data !== null) {
            folderName = data.folderName || data.name || data.folder_name || Object.values(data)[0];
        }
        if (!folderName || typeof folderName !== 'string') {
            alert('Не выбрана папка для загрузки или некорректное имя папки');
            return;
        }

        const isAdmin = ['1', '13'].includes(data_getUserId);
        const maxSize = isAdmin ? 10 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;

        const validFiles = files.filter(file => file.size <= maxSize);
        if (validFiles.length !== files.length) {
            alert(`Некоторые файлы превышают максимальный размер (${isAdmin ? '10 ГБ' : '100 МБ'})`);
        }
        const newUploads = files.map(file => ({
            filename: file.name,
            progress: 0,
            status: 'pending',
            details: {
                stage_details: 'Подготовка к загрузке...'
            }
        }));
        setFileUploads(prev => [...prev, ...newUploads]);
        for (let i = 0; i < files.length; i++) {
            const fileIndex = fileUploads.length + i;

            try {
                setFileUploads(prev => prev.map((item, idx) =>
                    idx === fileIndex ? {...item, status: 'uploading'} : item
                ));

                const formData = new FormData();
                formData.append('uploaded_file', files[i]);
                const response = await fetch(`/api/add-file/${data_getUserId}/${encodeURIComponent(folderName)}`, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.task_id) {
                    setFileUploads(prev => prev.map((item, idx) =>
                        idx === fileIndex ? {
                            ...item,
                            status: 'processing',
                            details: {
                                ...item.details,
                                taskId: result.task_id,
                                stage_details: 'Обработка файла...'
                            }
                        } : item
                    ));
                    checkUploadProgress(result.task_id, fileIndex);
                } else {
                    throw new Error(result.message || 'Неизвестная ошибка');
                }
            } catch (error) {
                setFileUploads(prev => prev.map((item, idx) =>
                    idx === fileIndex ? {
                        ...item,
                        status: 'failed',
                        details: {
                            ...item.details,
                            stage_details: `Ошибка: ${error.message}`
                        }
                    } : item
                ));
            }
        }
    };


    const onClick = () => {
        addText_PopupInFolder({
            title: 'Новая папка',
            name_file: isPopupInFolder.name_file,
        });
        toggle_PopupInFolder('');
    };

    const onClickConvertBtn = () => {
        convertInputRef.current.click();
    };

    const handleConvertFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setConvertLoading(true);
        setConvertError('');
        setConvertResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch('/api/convert-file-mlg', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const contentLength = response.headers.get('Content-Length');
            if (contentLength && parseInt(contentLength) < 10) {
                throw new Error('Сервер вернул пустой файл. Проверьте формат исходного файла.');
            }

            const blob = await response.blob();
            // ДОСТАЕМ ИМЯ ФАЙЛА ИЗ Content-Disposition
            const cd = response.headers.get('Content-Disposition');
            let filename = extractFilenameFromContentDisposition(cd);

            // fallback если сервер не дал правильный Content-Disposition
            if (!filename) {
                filename = 'converted_' + selectedFile.name.replace(/\.[^/.]+$/, '') + '.json';
            }

            // Проверяем содержимое
            const text = await blob.text();
            if (text.trim() === '[]') {
                throw new Error('Конвертированный файл пуст. Возможно, исходный файл имеет неподдерживаемый формат.');
            }

            // Скачиваем файл с корректным именем
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();

            setConvertResult('Файл успешно cконвертирован, теперь его можно загрузить в сервис!');
        } catch (err) {
            setConvertError(err.message || 'Ошибка при конвертации файла');
        } finally {
            setConvertLoading(false);
        }
    };

    useEffect(() => {
        if (data_getUserId) {
            refetch();
        }
    }, [pathname, data_getUserId, refetch]); // Добавьте refetch в зависимости

    return (
        <Layout>
            {isPopupInFolder && <PopupInFolder />}

            {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

            <Content style={{ height: '95%' }}>
                {fileUploads.length > 0 && (
                    <div className={styles.uploadsContainer}>
                        <h4>Загружаю файл:</h4>
                        {fileUploads.map((file, index) => (
                            <FileProgressBar
                                key={file.details?.taskId || file.filename}
                                progress={file.progress}
                                status={file.status}
                                filename={file.filename}
                                details={file.details?.stage_details}
                            />
                        ))}
                    </div>
                )}

                <div className={styles.block__pageName}>
                    <h3 className={styles.pageName__title}>Наборы данных</h3>
                    <div className={styles.pageName__actions}>
                        {pathname === '/data-set' && buttonTarget === 'Файлы данных' && (
                            <button className={styles.button__title} onClick={onClick}>
                                Создать папку
                            </button>
                        )}
                        <button className={`${styles.button__title} ${styles.download}`}>
                            <input
                                type='file'
                                className={styles.file}
                                onChange={handleFileUpload}
                                multiple
                            />
                            <img
                                src='/images/icons/upload_white.svg'
                                alt='upload'
                                className={styles.upload}
                            />
                            Загрузить файл
                        </button>

                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                                className={`${styles.button__title} ${styles.download}`}
                                type="button"
                                style={{ marginLeft: 12 }}
                                onClick={onClickConvertBtn}
                                disabled={convertLoading}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: "none" }}
                                    ref={convertInputRef}
                                    onChange={handleConvertFileChange}
                                    disabled={convertLoading}
                                />
                                <img
                                    src='/images/icons/upload_white.svg'
                                    alt='convert'
                                    className={styles.upload}
                                />
                                Конвертировать данные
                                {convertLoading && (
                                    <span style={{ marginLeft: 5, fontSize: '14px' }}>…</span>
                                )}
                            </button>
                            {showTooltip && (
                                <div className={`${styles.tooltip} ${showTooltip ? styles.visible : ''}`}>
                                    Конвертация XLSX/XLS файлов из Медиалогии для загрузки в сервис
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {convertError && <div className={styles.error} style={{ color: 'red', marginTop: 10 }}>{convertError}</div>}
                {convertResult && <div className={styles.success} style={{ color: 'green', marginTop: 10 }}>{convertResult}</div>}

                {pathname === '/data-set' ? <DataSet /> : <DataInFolder />}
                {isPopupDelete && <PopupDelete />}
            </Content>
        </Layout>
    );
};

export default DataSetPage;