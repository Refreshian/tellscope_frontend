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


    // --- Brand Analytics import (P1 UI) ---
    const folderSeg =
        pathname.startsWith('/data-set/') && pathname !== '/data-set'
            ? decodeURIComponent(pathname.split('/')[2] || '')
            : '';
    const isInsideFolder = Boolean(folderSeg) && folderSeg !== 'processed';

    const [baOpen, setBaOpen] = useState(false);
    const [baThemes, setBaThemes] = useState([]);
    const [baTheme, setBaTheme] = useState('');
    const [baFrom, setBaFrom] = useState('');
    const [baTo, setBaTo] = useState('');
    const [baErr, setBaErr] = useState('');
    const [baStatus, setBaStatus] = useState(null);
    const baLoadedRef = useRef(false);
    const baPollRef = useRef(null);
    const [myShared, setMyShared] = useState([]);

    const getToken = () => {
        const m = document.cookie.split('; ').find(x => x.startsWith('token='));
        return m ? decodeURIComponent(m.slice('token='.length)) : '';
    };
    const authHeaders = (json = false) => {
        const h = json ? { 'Content-Type': 'application/json' } : {};
        const t2 = getToken();
        if (t2) h.Authorization = 'Bearer ' + t2;
        return h;
    };

    const [baLogin, setBaLogin] = useState('');
    const [baPass, setBaPass] = useState('');
    const [baAccMsg, setBaAccMsg] = useState('');
    const [baAccErr, setBaAccErr] = useState('');

    const loadBaThemes = uid => {
        fetch('/api/ba/themes' + (uid ? '?user_id=' + uid : ''), { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setBaThemes(d.themes || []))
            .catch(() => {});
    };

    const baSaveAccount = async () => {
        if (!baLogin.trim()) {
            setBaAccErr('Введите логин Brand Analytics');
            return;
        }
        setBaAccErr('');
        setBaAccMsg('Сохраняю…');
        try {
            const r = await fetch('/api/ba/account', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    user_id: String(data_getUserId || '1'),
                    login: baLogin.trim(),
                    password: baPass,
                    create_folders: true,
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                setBaAccMsg('');
                setBaAccErr(d.detail || 'Ошибка сохранения');
                return;
            }
            setBaAccMsg('Сохранено. Папки по темам созданы.');
            setBaPass('');
            loadBaThemes(data_getUserId);
            refetch();
        } catch (e) {
            setBaAccMsg('');
            setBaAccErr(String((e && e.message) || e));
        }
    };


    useEffect(() => {
        if (!baLoadedRef.current) {
            baLoadedRef.current = true;
            loadBaThemes(data_getUserId);
        }
        return () => {
            if (baPollRef.current) clearInterval(baPollRef.current);
        };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const h = { 'Content-Type': 'application/json' };
                const tok = getToken();
                if (tok) h.Authorization = 'Bearer ' + tok;
                const r = await fetch('/api/my-datasets', { headers: h });
                if (r.ok) {
                    const d = await r.json();
                    setMyShared(d.shared || []);
                }
            } catch (e) {}
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const baRun = async () => {
        if (!baTheme || !baFrom || !baTo) {
            setBaErr('Выберите тему Brand Analytics и период');
            return;
        }
        const fromSec = Math.floor(new Date(baFrom + 'T00:00:00').getTime() / 1000);
        const toSec = Math.floor(new Date(baTo + 'T23:59:59').getTime() / 1000);
        setBaErr('');
        setBaStatus({ status: 'queued', message: 'Экспорт данных', progress: '0' });
        try {
            const r = await fetch('/api/ba/import', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    theme_id: baTheme,
                    folder: folderSeg,
                    date_from: String(fromSec),
                    date_to: String(toSec),
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                setBaStatus(null);
                setBaErr(d.detail || 'Ошибка запуска импорта');
                return;
            }
            const jobId = d.job_id;
            const poll = async () => {
                try {
                    const rr = await fetch('/api/ba/jobs/' + jobId, { headers: authHeaders() });
                    const dd = await rr.json();
                    setBaStatus(dd);
                    if (dd.status === 'done' || dd.status === 'error') {
                        if (baPollRef.current) clearInterval(baPollRef.current);
                        baPollRef.current = null;
                        if (dd.status === 'done') {
                            refetch();
                            setBaOpen(false);
                        }
                    }
                } catch (e) {}
            };
            poll();
            baPollRef.current = setInterval(poll, 2500);
        } catch (e) {
            setBaErr(String((e && e.message) || e));
        }
    };

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

                    </div>
                </div>
                {isInsideFolder && (
                    <div style={{ fontSize: 13, color: '#667085', margin: '2px 0 0' }}>
                        Текущая папка: <b style={{ color: '#101828' }}>{folderSeg}</b>
                    </div>
                )}
                {pathname === '/data-set' && (
                    <details style={{ width: '100%', margin: '6px 0', fontSize: 12 }}>
                        <summary style={{ cursor: 'pointer', color: '#667085' }}>
                            Brand Analytics: {baThemes.length > 0 ? 'доступно тем: ' + baThemes.length : '…'}
                        </summary>
                        <div style={{ padding: '6px 10px', border: '1px solid rgba(16,24,40,.08)', borderRadius: 8, marginTop: 6, background: '#fbfcfe' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ваш аккаунт Brand Analytics</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                <input placeholder='Логин BA (email)' autoComplete='off' value={baLogin} onChange={e => setBaLogin(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2', minWidth: 220 }} />
                                <input type='password' placeholder='Пароль BA' autoComplete='new-password' value={baPass} onChange={e => setBaPass(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }} />
                                <button type='button' className={styles.button__title} onClick={baSaveAccount}>
                                    Сохранить и создать папки
                                </button>
                            </div>
                            {baAccMsg && <div style={{ color: '#047857', marginTop: 4 }}>{baAccMsg}</div>}
                            {baAccErr && <div style={{ color: '#c53030', marginTop: 4 }}>{baAccErr}</div>}
                            {baThemes.map(th => {
                                const li = th.last_import;
                                return (
                                    <div key={th.theme_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px dashed #e6eaf0' }}>
                                        <span>{th.title}</span>
                                        <span style={{ color: '#98a2b3', fontSize: 11 }}>
                                            {li ? 'импорт: ' + (li.file || '') : 'нет импорта'}
                                        </span>
                                    </div>
                                );
                            })}
                            <p style={{ color: '#98a2b3', margin: '6px 0 0' }}>
                                Откройте папку темы — наверху появится кнопка «Загрузить из Brand Analytics».
                            </p>
                        </div>
                    </details>

                )}
 
                {pathname === '/data-set' && myShared.length > 0 && (
                    <div style={{ width: '100%', margin: '6px 0', padding: '10px 14px', border: '1px solid rgba(3,152,85,.3)', borderRadius: 10, background: '#f2fbf6', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Доступные мне (по решению администратора)</div>
                        {myShared.map((s, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', borderBottom: '1px dashed #cdeedc' }}>
                                <span>владелец #{s.owner_user_id} · папка «{s.folder}»</span>
                                <span style={{ color: '#067647' }}>{s.access === 'read' ? 'только чтение' : 'чтение и запись'}</span>
                            </div>
                        ))}
                    </div>
                )}



                {isInsideFolder && (
                    <div style={{ border: '1px solid rgba(16,24,40,.12)', borderRadius: 10, padding: '12px 14px', margin: '8px 0 4px', background: '#fff', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 14 }}>Загрузка данных в папку «{folderSeg}»</b>
                            <button
                                type='button'
                                className={`${styles.button__title} ${styles.download}`}
                                style={{ marginLeft: 'auto' }}
                                onClick={() => setBaOpen(v => !v)}
                            >
                                Загрузить из Brand Analytics
                            </button>
                        </div>
                        {baOpen && (
                            <div style={{ marginTop: 10, padding: 12, border: '1px solid rgba(23,96,232,.25)', borderRadius: 10, background: '#f6f9ff', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                                <label style={{ fontSize: 12, color: '#344054' }}>
                                    Тема Brand Analytics
                                    <select style={{ display: 'block', marginTop: 4, minWidth: 220, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }} value={baTheme} onChange={e => setBaTheme(e.target.value)}>
                                        <option value=''>— выберите тему —</option>
                                        {baThemes.map(th => (
                                            <option key={th.theme_id} value={th.theme_id}>{th.title}</option>
                                        ))}
                                    </select>
                                </label>
                                <label style={{ fontSize: 12, color: '#344054' }}>
                                    С даты
                                    <input type='date' style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }} value={baFrom} onChange={e => setBaFrom(e.target.value)} />
                                </label>
                                <label style={{ fontSize: 12, color: '#344054' }}>
                                    По дату
                                    <input type='date' style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }} value={baTo} onChange={e => setBaTo(e.target.value)} />
                                </label>
                                <button type='button' className={styles.button__title} onClick={baRun}>
                                    Получить данные
                                </button>
                                {baStatus && (
                                    <div style={{ fontSize: 13, color: baStatus.status === 'error' ? '#c53030' : '#1760e8' }}>
                                        {baStatus.message || ''}
                                        {baStatus.progress ? ` — ${baStatus.progress}%` : ''}
                                    </div>
                                )}
                                {baErr && <div style={{ fontSize: 13, color: '#c53030' }}>{baErr}</div>}
                            </div>
                        )}
                    </div>
                )}

                {pathname === '/data-set' ? <DataSet /> : <DataInFolder />}
                {isPopupDelete && <PopupDelete />}
            </Content>
        </Layout>
    );
};

export default DataSetPage;