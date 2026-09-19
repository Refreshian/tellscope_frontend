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
                }, 6000);
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
        const maxSize = 10 * 1024 * 1024 * 1024; // единый лимит для всех пользователей (бэкенд: 10 ГБ)

        const validFiles = files.filter(file => file.size <= maxSize);
        if (validFiles.length !== files.length) {
            alert(`Некоторые файлы превышают максимальный размер (10 ГБ)`);
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
    const [baRefreshing, setBaRefreshing] = useState(false);
    const [baSaving, setBaSaving] = useState(false);
    const [baThemes, setBaThemes] = useState([]);
    const [baThemesLoading, setBaThemesLoading] = useState(false);
    const [baConfigured, setBaConfigured] = useState(false);
    const [baAccount, setBaAccount] = useState(null);
    const [baTheme, setBaTheme] = useState('');
    const [baFrom, setBaFrom] = useState('');
    const [baTo, setBaTo] = useState('');
    const [baErr, setBaErr] = useState('');
    const [baStatus, setBaStatus] = useState(null);
    const baLoadedRef = useRef(false);
    const baPollRef = useRef(null);
    const baThemesPollRef = useRef(0);
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
    const [baHint, setBaHint] = useState('');

    // Статус своего подключения Brand Analytics: none | unverified | verified | error
    const baStatusInfo = () => {
        const st = (baAccount && baAccount.status) || (baConfigured ? 'unverified' : 'none');
        if (!baConfigured || st === 'none') {
            return { label: 'Не подключён', color: '#667085', bg: '#f2f4f7', border: '#e4e7ec' };
        }
        if (st === 'verified') {
            return { label: 'Подключено и проверено', color: '#067647', bg: '#ecfdf3', border: '#abefc6' };
        }
        if (st === 'error') {
            return { label: 'Ошибка подключения', color: '#b42318', bg: '#fef3f2', border: '#fecdca' };
        }
        return { label: 'Подключено, не проверено', color: '#b54708', bg: '#fffaeb', border: '#fedf89' };
    };

    const baStopThemesPoll = () => {
        if (baThemesPollRef.current) {
            clearInterval(baThemesPollRef.current);
            baThemesPollRef.current = 0;
        }
    };

    const baApplyPayload = d => {
        if (!d || typeof d !== 'object') return;
        if (Array.isArray(d.themes)) setBaThemes(d.themes);
        setBaConfigured(Boolean(d.account_configured));
        setBaHint(d.hint || '');
        setBaAccount({
            configured: Boolean(d.account_configured),
            login_masked: d.login_masked || '',
            status: d.account_status || (d.account_configured ? 'unverified' : 'none'),
            error: d.account_error || '',
            verified_at: d.verified_at || '',
        });
        // Подключение есть, а тем ещё нет: сервер сам пошёл за ними в Brand Analytics
        // (фоновый вход занимает до минуты). Показываем «загружаю темы» и тихо опрашиваем,
        // пока снапшот не появится — иначе пользователь видел пустой список без объяснения.
        const loading = Boolean(d.themes_loading);
        setBaThemesLoading(loading);
        if (loading && !baThemesPollRef.current) {
            let left = 24;
            baThemesPollRef.current = setInterval(() => {
                left -= 1;
                if (left <= 0 || !data_getUserId) {
                    baStopThemesPoll();
                    setBaThemesLoading(false);
                    return;
                }
                loadBaThemes(data_getUserId);
            }, 5000);
        } else if (!loading) {
            baStopThemesPoll();
        }
    };

    const loadBaThemes = uid => {
        // Запрос без user_id не отправляем: сервер отдал бы данные владельца по умолчанию,
        // и новый пользователь увидел бы чужие темы Brand Analytics.
        if (!uid) return;
        fetch('/api/ba/themes?user_id=' + encodeURIComponent(uid), { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { baApplyPayload(d); })
            .catch(() => {});
    };

    const loadBaAccount = uid => {
        if (!uid) return;
        fetch('/api/ba/account?user_id=' + encodeURIComponent(uid), { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (!d || typeof d !== 'object') return;
                setBaConfigured(Boolean(d.configured));
                setBaAccount({
                    configured: Boolean(d.configured),
                    login_masked: d.login_masked || '',
                    status: d.status || 'none',
                    error: d.error || '',
                    verified_at: d.verified_at || '',
                });
            })
            .catch(() => {});
    };

    const refreshBaThemes = async () => {
        if (!data_getUserId) return;
        setBaRefreshing(true);
        setBaAccErr('');
        try {
            const r = await fetch('/api/ba/themes?user_id=' + encodeURIComponent(data_getUserId) + '&refresh=1', { headers: authHeaders() });
            const d = await r.json();
            baApplyPayload(d);
            if (d && d.refresh_error) {
                setBaAccErr('Не удалось обновить темы: ' + d.refresh_error);
            } else if (d && Array.isArray(d.themes)) {
                setBaAccMsg(d.themes.length ? ('Темы обновлены из вашего аккаунта: ' + d.themes.length) : '');
            }
        } catch (e) {
            setBaAccErr('Не удалось обновить темы: ' + String((e && e.message) || e));
        } finally {
            setBaRefreshing(false);
        }
    };

    const baSaveAccount = async () => {
        if (!baLogin.trim()) {
            setBaAccErr('Введите логин Brand Analytics');
            return;
        }
        if (!baPass) {
            setBaAccErr('Введите пароль Brand Analytics');
            return;
        }
        setBaAccErr('');
        setBaSaving(true);
        setBaAccMsg('Проверяю подключение в Brand Analytics… это занимает до минуты');
        try {
            const r = await fetch('/api/ba/account', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    user_id: String(data_getUserId),
                    login: baLogin.trim(),
                    password: baPass,
                    create_folders: true,
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                setBaAccMsg('');
                setBaAccErr(d.detail || 'Ошибка сохранения');
                loadBaAccount(data_getUserId);
                return;
            }
            if (d.account) setBaAccount(d.account);
            setBaConfigured(true);
            setBaPass('');
            setBaAccMsg((d.message || 'Аккаунт проверен и сохранён') + '. Папки по темам созданы.');
            loadBaThemes(data_getUserId);
            refetch();
        } catch (e) {
            setBaAccMsg('');
            setBaAccErr(String((e && e.message) || e));
        } finally {
            setBaSaving(false);
        }
    };

    const baDisconnect = async () => {
        if (!data_getUserId) return;
        if (!window.confirm('Отключить аккаунт Brand Analytics? Подключение и список тем будут удалены. Загруженные датасеты останутся.')) return;
        setBaAccErr('');
        setBaAccMsg('Отключаю аккаунт…');
        try {
            const r = await fetch('/api/ba/account/disconnect?user_id=' + encodeURIComponent(String(data_getUserId)), {
                method: 'POST',
                headers: authHeaders(),
            });
            const d = await r.json();
            if (!r.ok) {
                setBaAccMsg('');
                setBaAccErr(d.detail || 'Не удалось отключить аккаунт');
                return;
            }
            setBaThemes([]);
            setBaConfigured(false);
            setBaAccount({ configured: false, login_masked: '', status: 'none', error: '', verified_at: '' });
            setBaLogin('');
            setBaPass('');
            setBaHint((d && d.hint) || '');
            setBaAccMsg('Аккаунт отключён. Подключите свой аккаунт Brand Analytics, чтобы снова видеть темы и выгружать данные.');
        } catch (e) {
            setBaAccMsg('');
            setBaAccErr(String((e && e.message) || e));
        }
    };


    useEffect(() => {
        if (!baLoadedRef.current && data_getUserId) {
            baLoadedRef.current = true;
            loadBaAccount(data_getUserId);
            loadBaThemes(data_getUserId);
        }
        return () => {
            if (baPollRef.current) clearInterval(baPollRef.current);
            if (baThemesPollRef.current) clearInterval(baThemesPollRef.current);
        };
    }, [data_getUserId]);

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


    // --- Проверка тональности: двухпроходная разметка локальными моделями vLLM ---
    const [tcDatasets, setTcDatasets] = useState([]);
    const [tcLoadingDs, setTcLoadingDs] = useState(false);
    const [tcIndex, setTcIndex] = useState('');
    const [tcMode, setTcMode] = useState('sample');
    const [tcSize, setTcSize] = useState(1000);
    const [tcJob, setTcJob] = useState(null);
    const [tcErr, setTcErr] = useState('');
    const [tcStarting, setTcStarting] = useState(false);
    const tcPollRef = useRef(null);
    const tcLoadedRef = useRef(false);

    const tcStopPoll = () => {
        if (tcPollRef.current) {
            clearInterval(tcPollRef.current);
            tcPollRef.current = null;
        }
    };

    const tcPoll = async jobId => {
        try {
            const r = await fetch('/api/tone-check/' + jobId, { headers: authHeaders() });
            const d = await r.json();
            if (!r.ok) {
                setTcErr(d.detail || 'Не удалось получить статус проверки');
                return;
            }
            setTcJob(d);
            if (d.status === 'done' || d.status === 'cancelled' || d.status === 'error') {
                tcStopPoll();
            }
        } catch (e) {}
    };

    const tcLoadDatasets = () => {
        setTcLoadingDs(true);
        fetch('/api/tone-check/datasets', { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                // Датасет по умолчанию не выбираем: запуск только осознанным нажатием,
                // чтобы случайно не поставить «полностью» на индекс в миллионы сообщений.
                setTcDatasets((d && d.datasets) || []);
            })
            .catch(() => {})
            .finally(() => setTcLoadingDs(false));
    };

    // Автозапуска нет: показываем только уже существующую задачу, чтобы прогресс
    // не терялся после закрытия браузера.
    useEffect(() => {
        if (tcLoadedRef.current || !data_getUserId) return;
        tcLoadedRef.current = true;
        tcLoadDatasets();
        fetch('/api/tone-check/jobs', { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                const list = (d && d.jobs) || [];
                if (!list.length) return;
                const active = list.find(j => j.status === 'running' || j.status === 'queued');
                const shown = active || list[0];
                setTcJob(shown);
                if (active) {
                    tcStopPoll();
                    tcPollRef.current = setInterval(() => tcPoll(active.job_id), 2500);
                }
            })
            .catch(() => {});
        return () => tcStopPoll();
    }, [data_getUserId]);

    const tcStart = async () => {
        if (!tcIndex) {
            setTcErr('Выберите датасет');
            return;
        }
        setTcErr('');
        setTcStarting(true);
        try {
            const r = await fetch('/api/tone-check', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    index: tcIndex,
                    mode: tcMode,
                    sample_size: tcMode === 'full' ? 1000 : Number(tcSize) || 1000,
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                setTcErr(d.detail || 'Не удалось запустить проверку');
                return;
            }
            setTcJob({
                job_id: d.job_id,
                status: 'queued',
                stage: 'preparing',
                stage_label: 'подготовка',
                percent: 0,
                processed: 0,
                total: 0,
            });
            tcStopPoll();
            tcPollRef.current = setInterval(() => tcPoll(d.job_id), 2500);
            tcPoll(d.job_id);
        } catch (e) {
            setTcErr(String((e && e.message) || e));
        } finally {
            setTcStarting(false);
        }
    };

    const tcCancel = async () => {
        if (!tcJob || !tcJob.job_id) return;
        try {
            await fetch('/api/tone-check/' + tcJob.job_id + '/cancel', {
                method: 'POST',
                headers: authHeaders(),
            });
            tcPoll(tcJob.job_id);
        } catch (e) {}
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span>Brand Analytics:</span>
                                <span
                                    style={{
                                        color: baStatusInfo().color,
                                        background: baStatusInfo().bg,
                                        border: '1px solid ' + baStatusInfo().border,
                                        borderRadius: 999,
                                        padding: '1px 9px',
                                        fontSize: 11,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {baStatusInfo().label}
                                </span>
                                <span title={baHint} style={{ color: '#101828' }}>
                                    {baConfigured
                                        ? ('ваш аккаунт' + (baAccount && baAccount.login_masked ? ' ' + baAccount.login_masked : '') + ' · доступно тем: ' + baThemes.length)
                                        : 'аккаунт не подключён'}
                                </span>
                                <button
                                    type='button'
                                    title='Обновить список тем из Brand Analytics'
                                    onClick={e => {
                                        e.preventDefault();
                                        refreshBaThemes();
                                    }}
                                    style={{ background: 'none', border: '1px solid #d0d7e2', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 13, lineHeight: 1.2, color: '#1760e8' }}
                                >
                                    {baRefreshing ? 'обновляю…' : '⟳ Обновить'}
                                </button>
                            </span>
                        </summary>
                        <div style={{ padding: '8px 10px', border: '1px solid rgba(16,24,40,.08)', borderRadius: 8, marginTop: 6, background: '#fbfcfe' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ваш аккаунт Brand Analytics</div>

                            {baConfigured && baAccount && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '2px 0 8px' }}>
                                    <span style={{ color: '#344054' }}>
                                        Логин: <b>{baAccount.login_masked || '—'}</b>
                                    </span>
                                    <span
                                        style={{
                                            color: baStatusInfo().color,
                                            background: baStatusInfo().bg,
                                            border: '1px solid ' + baStatusInfo().border,
                                            borderRadius: 6,
                                            padding: '1px 8px',
                                        }}
                                    >
                                        {baStatusInfo().label}
                                    </span>
                                    {baAccount.verified_at && (
                                        <span style={{ color: '#667085' }}>
                                            проверено: {String(baAccount.verified_at).replace('T', ' ').slice(0, 16)}
                                        </span>
                                    )}
                                    <button
                                        type='button'
                                        onClick={baDisconnect}
                                        style={{ background: 'none', border: '1px solid #fecdca', color: '#b42318', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', fontSize: 12 }}
                                    >
                                        Отключить аккаунт
                                    </button>
                                </div>
                            )}

                            {baConfigured && baAccount && baAccount.status === 'error' && baAccount.error && (
                                <div style={{ color: '#b42318', margin: '0 0 6px' }}>Ошибка: {baAccount.error}</div>
                            )}
                            {baConfigured && baAccount && baAccount.status !== 'verified' && baAccount.status !== 'error' && (
                                <div style={{ color: '#b54708', margin: '0 0 6px' }}>
                                    Подключение ещё не проверялось. Нажмите «Обновить» — Tellscope войдёт в Brand Analytics и подтвердит доступ.
                                </div>
                            )}

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                <input placeholder='Логин BA (email)' autoComplete='off' value={baLogin} onChange={e => setBaLogin(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2', minWidth: 220 }} />
                                <input type='password' placeholder='Пароль BA' autoComplete='new-password' value={baPass} onChange={e => setBaPass(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }} />
                                <button type='button' className={styles.button__title} onClick={baSaveAccount} disabled={baSaving} style={baSaving ? { opacity: 0.6, cursor: 'wait' } : undefined}>
                                    {baSaving ? 'Проверяю…' : (baConfigured ? 'Проверить и сохранить' : 'Подключить аккаунт')}
                                </button>
                            </div>
                            <div style={{ color: '#98a2b3', marginTop: 4 }}>
                                Логин и пароль проверяются реальным входом в Brand Analytics — неподтверждённое подключение не сохраняется.
                            </div>
                            {baAccMsg && <div style={{ color: '#047857', marginTop: 4 }}>{baAccMsg}</div>}
                            {baAccErr && <div style={{ color: '#c53030', marginTop: 4 }}>{baAccErr}</div>}
                            {baThemes.length === 0 ? (
                                <div style={{ color: baThemesLoading ? '#1760e8' : '#98a2b3', padding: '4px 0', fontSize: 12 }}>
                                    {baConfigured
                                        ? (baThemesLoading
                                            ? 'Загружаю список тем из вашего аккаунта Brand Analytics — это занимает до минуты, список появится здесь сам.'
                                            : (baHint || 'Темы не найдены — нажмите «Обновить».'))
                                        : 'Подключите свой аккаунт Brand Analytics, чтобы получить темы и данные: папки и файлы появятся здесь после первой выгрузки. До подключения папки и отчёты других пользователей не показываются.'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 2px' }}>
                                    {baThemes.map(th => (
                                        <span key={th.theme_id} title={th.title} style={{ border: '1px solid #c7d7fe', background: '#eef2ff', color: '#1760e8', borderRadius: 999, padding: '3px 11px', fontSize: 12, lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                                            {th.title}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <p style={{ color: '#98a2b3', margin: '4px 0 0', fontSize: 12 }}>
                                Для скачивания откройте папку темы — внутри будет кнопка «Загрузить из Brand Analytics».
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
                                {baThemes.length === 0 && (
                                    <div style={{ flexBasis: '100%', fontSize: 12, color: '#98a2b3' }}>
                                        {baConfigured
                                            ? (baThemesLoading
                                                ? 'Загружаю список тем из вашего аккаунта Brand Analytics — список появится здесь сам через несколько десятков секунд.'
                                                : 'Список тем пуст — обновите его в блоке Brand Analytics выше.')
                                            : 'Сначала подключите свой аккаунт Brand Analytics (блок «Brand Analytics» выше) — без него темы и выгрузка недоступны.'}
                                    </div>
                                )}
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

                {pathname === '/data-set' && (
                    <div
                        style={{
                            width: '100%',
                            margin: '6px 0',
                            padding: '10px 14px',
                            border: '1px solid rgba(23,96,232,.25)',
                            borderRadius: 10,
                            background: '#f6f9ff',
                            fontSize: 13,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 14 }}>Проверка тональности</b>
                            <span style={{ color: '#667085' }}>
                                Локальные модели vLLM: быстрая 4B размечает выборку, спорные случаи
                                перепроверяет 32B. Разметка источника не меняется — результат в полях
                                tone_llm, tone_llm_conf, tone_llm_by.
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginTop: 8 }}>
                            <label style={{ fontSize: 12, color: '#344054' }}>
                                Датасет
                                <select
                                    style={{ display: 'block', marginTop: 4, minWidth: 280, maxWidth: 420, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }}
                                    value={tcIndex}
                                    onChange={e => setTcIndex(e.target.value)}
                                    disabled={tcLoadingDs}
                                >
                                    <option value=''>{tcLoadingDs ? '— загружаю список —' : '— выберите датасет —'}</option>
                                    {tcDatasets.map(ds => (
                                        <option
                                            key={String(ds.index != null ? ds.index : ds.name)}
                                            value={String(ds.index != null ? ds.index : ds.name)}
                                        >
                                            {ds.label || ds.name} · {ds.docs} сообщ.{ds.labeled ? ' · размечено ' + ds.labeled : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ fontSize: 12, color: '#344054', display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 8, flexWrap: 'wrap' }}>
                                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                    <input
                                        type='radio'
                                        name='tcMode'
                                        checked={tcMode === 'sample' && Number(tcSize) === 500}
                                        onChange={() => {
                                            setTcMode('sample');
                                            setTcSize(500);
                                        }}
                                    />
                                    выборка 500
                                </span>
                                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                    <input
                                        type='radio'
                                        name='tcMode'
                                        checked={tcMode === 'sample' && Number(tcSize) === 1000}
                                        onChange={() => {
                                            setTcMode('sample');
                                            setTcSize(1000);
                                        }}
                                    />
                                    выборка 1000
                                </span>
                                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                    <input type='radio' name='tcMode' checked={tcMode === 'full'} onChange={() => setTcMode('full')} />
                                    полностью
                                </span>
                            </label>

                            <button
                                type='button'
                                className={styles.button__title}
                                onClick={tcStart}
                                disabled={tcStarting || (tcJob && (tcJob.status === 'running' || tcJob.status === 'queued'))}
                                style={tcStarting ? { opacity: 0.6, cursor: 'wait' } : undefined}
                            >
                                {tcStarting ? 'Запускаю…' : 'Проверить тональность'}
                            </button>
                            {tcJob && tcJob.job_id && (
                                <span style={{ color: '#98a2b3', paddingBottom: 8 }}>задача {tcJob.job_id}</span>
                            )}
                        </div>

                        {tcErr && <div style={{ color: '#c53030', marginTop: 8 }}>{tcErr}</div>}

                        {tcJob && tcJob.job_id && (
                            <div className={styles.progressContainer} style={{ margin: '10px 0 0' }}>
                                <div className={styles.progressLabel} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <b>{tcJob.dataset_label || tcJob.index_name || ''}</b>
                                    <span style={{ color: tcJob.status === 'error' ? '#c53030' : '#1760e8' }}>
                                        {tcJob.stage_label || tcJob.status}
                                    </span>
                                    <span style={{ color: '#667085' }}>
                                        {tcJob.processed}
                                        {tcJob.total ? ' / ' + tcJob.total + ' сообщений' : ''}
                                        {tcJob.pass2_total ? ' · спорных на 32B: ' + tcJob.pass2_done + '/' + tcJob.pass2_total : ''}
                                    </span>
                                    <span style={{ marginLeft: 'auto' }}>{tcJob.percent}%</span>
                                    {(tcJob.status === 'running' || tcJob.status === 'queued') && (
                                        <button
                                            type='button'
                                            onClick={tcCancel}
                                            style={{ background: 'none', border: '1px solid #fecdca', color: '#b42318', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', fontSize: 12 }}
                                        >
                                            Отменить
                                        </button>
                                    )}
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: Math.max(1, Math.min(100, tcJob.percent || 0)) + '%',
                                            background: tcJob.status === 'error' ? '#D92D20' : tcJob.status === 'cancelled' ? '#F79009' : '#1760e8',
                                        }}
                                    />
                                </div>

                                {tcJob.status === 'done' && tcJob.summary && (
                                    <div style={{ marginTop: 8, color: '#101828' }}>
                                        <div>
                                            Согласие с источником: <b>{Math.round((tcJob.summary.agreement || 0) * 1000) / 10}%</b>
                                            {' · '}каппа Коэна: <b>{Math.round((tcJob.summary.kappa || 0) * 100) / 100}</b>
                                            {' · '}расхождений: <b>{tcJob.summary.mismatches}</b>
                                            {tcJob.summary.pass2_share != null ? ' · решала 32B: ' + Math.round((tcJob.summary.pass2_share || 0) * 100) + '%' : ''}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                                            <a
                                                href={'/api/tone-check/' + tcJob.job_id + '/report/file?fmt=docx'}
                                                target='_blank'
                                                rel='noreferrer'
                                                style={{ color: '#1760e8', fontWeight: 600 }}
                                            >
                                                Скачать отчёт DOCX
                                            </a>
                                            <a
                                                href={'/api/tone-check/' + tcJob.job_id + '/report/file?fmt=pdf'}
                                                target='_blank'
                                                rel='noreferrer'
                                                style={{ color: '#1760e8', fontWeight: 600 }}
                                            >
                                                Скачать отчёт PDF
                                            </a>
                                            <a
                                                href={'/api/tone-check/' + tcJob.job_id + '/report'}
                                                target='_blank'
                                                rel='noreferrer'
                                                style={{ color: '#667085' }}
                                            >
                                                Отчёт в JSON
                                            </a>
                                        </div>
                                        {Array.isArray(tcJob.conclusions) && tcJob.conclusions.length > 0 && (
                                            <ul style={{ margin: '6px 0 0 18px', color: '#344054' }}>
                                                {tcJob.conclusions.slice(0, 4).map((line, i) => (
                                                    <li key={i}>{line}</li>
                                                ))}
                                            </ul>
                                        )}
                                        {tcJob.recommendation && (
                                            <div style={{ marginTop: 6, fontWeight: 600 }}>{tcJob.recommendation}</div>
                                        )}
                                    </div>
                                )}

                                {tcJob.status === 'cancelled' && (
                                    <div style={{ marginTop: 8, color: '#b54708' }}>
                                        Проверка остановлена. По уже размеченным сообщениям отчёт собран.
                                    </div>
                                )}
                                {tcJob.status === 'error' && (
                                    <div style={{ marginTop: 8, color: '#c53030' }}>Ошибка: {tcJob.error || 'неизвестная'}</div>
                                )}
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