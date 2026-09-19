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

// Прогресс проверки тональности.
// Полоса — по ТЕКУЩЕМУ этапу, поэтому подпись «N / M сообщений» и процент всегда совпадают.
// Общий процент идёт отдельной строкой как взвешенная сумма двух проходов. «Обновлено N с
// назад» тикает локально каждую секунду (свой таймер, без перерисовки всей страницы), а
// оценка остатка считается по средней скорости — вместе это отличает «идёт медленно» от «висит».
const ToneProgressCard = ({ job, onCancel, cancelling }) => {
    const [, setTick] = useState(0);
    const seenRef = useRef(0);
    const updatedRef = useRef(null);
    const updated = job ? job.updated : null;

    useEffect(() => {
        if (updated && updatedRef.current !== updated) {
            updatedRef.current = updated;
            seenRef.current = Date.now();
        }
    }, [updated]);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    if (!job || !job.job_id) return null;

    const status = job.status || '';
    const running = status === 'running' || status === 'queued';
    const stageDone = job.stage_done != null ? job.stage_done : job.processed || 0;
    const stageTotal = job.stage_total || job.total || 0;
    const stagePercent = job.stage_percent != null ? job.stage_percent : job.percent || 0;
    const pass1Done = job.pass1_done != null ? job.pass1_done : job.processed || 0;
    const pass1Total = job.pass1_total || job.total || 0;
    const pass1Percent = job.pass1_percent != null ? job.pass1_percent : 0;
    const pass2Done = job.pass2_done || 0;
    const pass2Total = job.pass2_total || 0;
    const pass2Percent = job.pass2_percent || 0;

    // Прошедшее время считаем от ответа сервера, а не от разбора его ISO-строки: так подпись
    // не зависит от часового пояса браузера.
    const agoSec =
        job.updated_ago_sec != null && seenRef.current
            ? Math.max(0, Math.round(job.updated_ago_sec + (Date.now() - seenRef.current) / 1000))
            : null;
    const agoText =
        agoSec == null
            ? ''
            : agoSec < 5
              ? 'только что'
              : agoSec < 60
                ? agoSec + ' с назад'
                : Math.floor(agoSec / 60) + ' мин назад';

    const stale = Boolean(job.stalled) || (running && agoSec != null && agoSec > 120);
    // «Останавливаю»: сразу после нажатия кнопки и до подтверждения сервера.
    const stopping = Boolean(cancelling) || Boolean(job.cancelling);
    // У остановленной задачи берём общий процент, а не процент последнего этапа: иначе
    // карточка показывала «96 %» при 200 размеченных сообщениях из 1500.
    const shownPercent =
        status === 'cancelled' ? (job.percent != null ? job.percent : stagePercent) : stagePercent;
    const color =
        status === 'error'
            ? '#D92D20'
            : status === 'cancelled' || stale
              ? '#F79009'
              : status === 'done'
                ? '#12B76A'
                : '#1760e8';
    const rate = Number(job.rate_per_min || 0);

    return (
        <div className={styles.progressContainer} style={{ margin: '10px 0 0' }}>
            <div
                className={styles.progressLabel}
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}
            >
                <b>{job.dataset_label || job.index_name || ''}</b>
                <span style={{ color: status === 'error' ? '#c53030' : '#1760e8' }}>
                    {job.stage_label || status}
                </span>
                <span style={{ color: '#667085' }}>
                    {stageTotal ? 'обработано ' + stageDone + ' из ' + stageTotal : 'обработано ' + stageDone}
                </span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color }}>{shownPercent}%</span>
                {running && onCancel && (
                    <button
                        type='button'
                        onClick={onCancel}
                        disabled={stopping}
                        title={
                            stopping
                                ? 'Команда отправлена — проход завершает текущую пачку сообщений'
                                : 'Остановить проверку'
                        }
                        style={{
                            background: 'none',
                            border: '1px solid #fecdca',
                            color: stopping ? '#b54708' : '#b42318',
                            borderRadius: 6,
                            cursor: stopping ? 'default' : 'pointer',
                            padding: '3px 10px',
                            fontSize: 12,
                            opacity: stopping ? 0.75 : 1,
                        }}
                    >
                        {stopping ? 'Останавливаю…' : 'Отменить'}
                    </button>
                )}
            </div>
            {stopping && (
                <div style={{ marginTop: 4, color: '#b54708', fontSize: 12 }}>
                    Команда принята: проход завершает текущую пачку сообщений и сохраняет уже
                    размеченное. Обычно это занимает меньше минуты, повторно нажимать не нужно.
                </div>
            )}
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{
                        width: Math.max(1, Math.min(100, shownPercent)) + '%',
                        background: color,
                        transition: 'width 0.4s ease',
                    }}
                />
            </div>
            <div style={{ marginTop: 6, color: '#344054', fontSize: 13, lineHeight: 1.5 }}>
                <div>
                    <b>определяю тональность</b>: {pass1Done} из {pass1Total} — {pass1Percent}%
                    {pass2Total > 0 && (
                        <>
                            {' · '}
                            <b>перепроверяю спорные случаи</b>: {pass2Done} из {pass2Total} — {pass2Percent}%
                        </>
                    )}
                </div>
                <div style={{ color: '#667085' }}>
                    {/* Общий процент заведомо меньше процента первого этапа: он взвешен с учётом
                        перепроверки спорных, поэтому подписан явно, а не просто «всего». */}
                    выполнено {job.percent || 0}%
                    {agoText ? ' · обновлено ' + agoText : ''}
                    {running && job.eta_text ? ' · осталось ≈ ' + job.eta_text : ''}
                    {rate > 0 ? ' · ' + Math.round(rate) + ' сообщений в минуту' : ''}
                </div>
                {job.note && <div style={{ color: stale || stopping ? '#B54708' : '#667085' }}>{job.note}</div>}
            </div>
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
    // Размер выборки: 500 или вся выборка целиком — промежуточный вариант убран.
    const [tcSize, setTcSize] = useState(500);
    const [tcDsOpen, setTcDsOpen] = useState(false);
    const [tcDeleting, setTcDeleting] = useState('');
    const [tcDsErr, setTcDsErr] = useState('');
    // Настройки области проверки скрыты: блок должен занимать пару строк, а не пол-экрана.
    const [tcSettingsOpen, setTcSettingsOpen] = useState(false);
    // Сама панель проверки тональности тоже скрыта: открывается оранжевой кнопкой справа.
    const [tcOpen, setTcOpen] = useState(false);
    // Переключатель «считать по обновлённой разметке»: состояние режима для выбранного набора.
    const [tcToneMode, setTcToneMode] = useState(null);
    const [tcToneModeBusy, setTcToneModeBusy] = useState(false);
    const tcToneModeTimer = useRef(null);
    const tcDsBoxRef = useRef(null);
    const [tcJob, setTcJob] = useState(null);
    const [tcErr, setTcErr] = useState('');
    const [tcStarting, setTcStarting] = useState(false);
    // Остановка кооперативная: проход доводит текущую пачку сообщений, поэтому признак
    // «останавливаю» держим сразу после нажатия, не дожидаясь ответа сервера.
    const [tcCancelling, setTcCancelling] = useState(false);
    const tcPollRef = useRef(null);
    const tcLoadedRef = useRef(false);

    // Внутри папки набор этой папки подставляется сам: пользователь работает с её данными.
    useEffect(() => {
        if (!isInsideFolder || tcIndex || !tcDatasets.length) return;
        const hit = tcDatasets.find(ds => String(ds.folder || '') === String(folderSeg));
        if (hit) setTcIndex(String(hit.index != null ? hit.index : hit.name));
    }, [isInsideFolder, folderSeg, tcIndex, tcDatasets]);

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
                setTcCancelling(false);
                tcStopPoll();
            }
        } catch (e) {}
    };

    const tcLoadToneMode = async indexKey => {
        if (!indexKey) {
            setTcToneMode(null);
            return;
        }
        try {
            const r = await fetch('/api/tone-check/tone-mode?index=' + encodeURIComponent(indexKey), { headers: authHeaders() });
            const d = await r.json();
            if (!r.ok) {
                setTcToneMode(null);
                return;
            }
            setTcToneMode(d);
            if (d.status === 'running') tcWatchToneMode(indexKey);
        } catch (e) {
            setTcToneMode(null);
        }
    };

    // Пока Elasticsearch переносит разметку, показываем прогресс: работа идёт на сервере.
    const tcWatchToneMode = indexKey => {
        if (tcToneModeTimer.current) clearInterval(tcToneModeTimer.current);
        tcToneModeTimer.current = setInterval(async () => {
            try {
                const r = await fetch('/api/tone-check/tone-mode?index=' + encodeURIComponent(indexKey), { headers: authHeaders() });
                const d = await r.json();
                if (!r.ok) return;
                setTcToneMode(d);
                if (d.status !== 'running' && tcToneModeTimer.current) {
                    clearInterval(tcToneModeTimer.current);
                    tcToneModeTimer.current = null;
                }
            } catch (e) {}
        }, 3000);
    };

    const tcSetToneMode = async on => {
        if (!tcIndex) return;
        setTcToneModeBusy(true);
        setTcErr('');
        try {
            const r = await fetch('/api/tone-check/tone-mode', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({ index: tcIndex, mode: on ? 'relabeled' : 'source' }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                setTcErr(d.detail || 'Не удалось переключить режим тональности');
                return;
            }
            await tcLoadToneMode(tcIndex);
        } catch (e) {
            setTcErr('Не удалось переключить режим тональности: нет связи с сервером');
        } finally {
            setTcToneModeBusy(false);
        }
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
        tcLoadPresets();
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

    // --- Область проверки: объект, инфоповод, период, площадка, автор ---
    const [tcLabelMode, setTcLabelMode] = useState('message');
    const [tcObjectInput, setTcObjectInput] = useState('');
    const [tcObjects, setTcObjects] = useState([]);
    const [tcTheme, setTcTheme] = useState('');
    const [tcHub, setTcHub] = useState('');
    const [tcAuthor, setTcAuthor] = useState('');
    const [tcFrom, setTcFrom] = useState('');
    const [tcTo, setTcTo] = useState('');
    const [tcOptions, setTcOptions] = useState({ themes: [], objects: [], hubs: [], authors: [] });
    const [tcOptionsLoading, setTcOptionsLoading] = useState(false);
    const [tcScope, setTcScope] = useState(null);
    const [tcScopeLoading, setTcScopeLoading] = useState(false);
    const [tcPresets, setTcPresets] = useState([]);
    const [tcPresetName, setTcPresetName] = useState('');
    const [tcPresetMsg, setTcPresetMsg] = useState('');
    const tcScopeTimer = useRef(null);

    const tcDayStart = value => (value ? Math.floor(new Date(value + 'T00:00:00').getTime() / 1000) : null);
    const tcDayEnd = value => (value ? Math.floor(new Date(value + 'T23:59:59').getTime() / 1000) : null);

    // Область проверки в виде параметров запроса: используется и для объёма, и для запуска.
    const tcQuery = () => {
        const params = new URLSearchParams();
        if (tcIndex) params.set('index', tcIndex);
        if (tcObjects.length) params.set('objects', tcObjects.join(', '));
        if (tcTheme) params.set('theme', tcTheme);
        if (tcHub) params.set('hub', tcHub);
        if (tcAuthor.trim()) params.set('author', tcAuthor.trim());
        if (tcFrom) params.set('min_date', String(tcDayStart(tcFrom)));
        if (tcTo) params.set('max_date', String(tcDayEnd(tcTo)));
        params.set('label_mode', tcLabelMode);
        return params;
    };

    const tcPresetFields = () => ({
        index: tcIndex,
        label_mode: tcLabelMode,
        mode: tcMode,
        sample_size: tcMode === 'full' ? 500 : Number(tcSize) || 500,
        min_date: tcDayStart(tcFrom),
        max_date: tcDayEnd(tcTo),
        objects: tcObjects,
        theme: tcTheme,
        hub: tcHub,
        author: tcAuthor.trim(),
    });

    const tcLoadOptions = idx => {
        if (!idx) return;
        setTcOptionsLoading(true);
        fetch('/api/tone-check/scope-options?index=' + encodeURIComponent(idx), { headers: authHeaders() })
            .then(r => r.json())
            .then(d =>
                setTcOptions({
                    themes: (d && d.themes) || [],
                    objects: (d && d.objects) || [],
                    hubs: (d && d.hubs) || [],
                    authors: (d && d.authors) || [],
                }),
            )
            .catch(() => {})
            .finally(() => setTcOptionsLoading(false));
    };

    const tcLoadPresets = () => {
        fetch('/api/tone-check/presets', { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setTcPresets((d && d.presets) || []))
            .catch(() => {});
    };

    // Подсказки (темы датасета, частые термины, площадки, авторы) — по выбранному датасету.
    useEffect(() => {
        tcLoadOptions(tcIndex);
        tcLoadToneMode(tcIndex);
    }, [tcIndex]);

    // Убираем опрос состояния переключателя при уходе со страницы.
    useEffect(() => () => {
        if (tcToneModeTimer.current) clearInterval(tcToneModeTimer.current);
    }, []);

    // Объём под областью: пересчитывается по мере правки фильтров, ДО запуска.
    useEffect(() => {
        if (!tcIndex) {
            setTcScope(null);
            return undefined;
        }
        if (tcScopeTimer.current) clearTimeout(tcScopeTimer.current);
        tcScopeTimer.current = setTimeout(() => {
            setTcScopeLoading(true);
            fetch('/api/tone-check/scope?' + tcQuery().toString(), { headers: authHeaders() })
                .then(r => r.json())
                .then(d => {
                    if (d && d.count !== undefined) setTcScope(d);
                })
                .catch(() => {})
                .finally(() => setTcScopeLoading(false));
        }, 450);
        return () => {
            if (tcScopeTimer.current) clearTimeout(tcScopeTimer.current);
        };
    }, [tcIndex, tcObjects.join('|'), tcTheme, tcHub, tcAuthor, tcFrom, tcTo, tcLabelMode]);

    const tcAddObject = name => {
        const text = String(name || '').trim();
        if (!text) return;
        setTcObjects(prev =>
            prev.some(x => x.toLowerCase() === text.toLowerCase()) || prev.length >= 6 ? prev : [...prev, text],
        );
        setTcObjectInput('');
    };
    const tcRemoveObject = name => setTcObjects(prev => prev.filter(x => x !== name));

    const tcApplyPreset = item => {
        if (!item) return;
        setTcIndex(item.index != null ? String(item.index) : '');
        setTcLabelMode(item.label_mode || 'message');
        setTcMode(item.mode || 'sample');
        // Размер выборки теперь только один — 500; старые пресеты с другим числом приводим к нему.
        setTcSize(500);
        setTcObjects(Array.isArray(item.objects) ? item.objects : []);
        setTcTheme(item.theme || '');
        setTcHub(item.hub || '');
        setTcAuthor(item.author || '');
        setTcFrom(item.min_date ? new Date(item.min_date * 1000).toISOString().slice(0, 10) : '');
        setTcTo(item.max_date ? new Date(item.max_date * 1000).toISOString().slice(0, 10) : '');
        setTcPresetName(item.name || '');
        if (item.index != null) tcLoadOptions(String(item.index));
    };

    const tcSavePreset = async () => {
        const name = tcPresetName.trim();
        if (!name) {
            setTcPresetMsg('Введите имя шаблона');
            return;
        }
        if (!tcIndex) {
            setTcPresetMsg('Выберите набор данных');
            return;
        }
        // Шаблон без объектов нельзя будет запустить (проверка по объектам требует хотя бы один),
        // поэтому не сохраняем его молча — иначе кнопка «Запустить» потом ничего не делает.
        if (tcLabelMode === 'aspect' && !tcObjects.filter(Boolean).length) {
            setTcPresetMsg('Проверка по объектам: сначала добавьте объект кнопкой «Добавить», иначе шаблон нельзя будет запустить');
            return;
        }
        setTcPresetMsg('');
        try {
            const r = await fetch('/api/tone-check/presets', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({ name, ...tcPresetFields() }),
            });
            const d = await r.json();
            if (!r.ok) {
                setTcPresetMsg(d.detail || 'Не удалось сохранить настройки проверки');
                return;
            }
            setTcPresets((d && d.presets) || []);
            setTcPresetMsg('Настройки проверки сохранены');
        } catch (e) {
            setTcPresetMsg(String((e && e.message) || e));
        }
    };

    const tcDeletePreset = async name => {
        try {
            const r = await fetch('/api/tone-check/presets/' + encodeURIComponent(name), {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const d = await r.json();
            if (r.ok) setTcPresets((d && d.presets) || []);
        } catch (e) {}
    };

    const tcStart = async override => {
        const payload = override || { ...tcPresetFields(), preset: tcPresetName.trim() };
        if (!payload.index) {
            setTcErr('Выберите набор данных');
            return;
        }
        if (payload.label_mode === 'aspect' && !(payload.objects || []).length) {
            setTcErr('Для проверки по объектам добавьте хотя бы один объект');
            return;
        }
        setTcErr('');
        setTcStarting(true);
        try {
            const r = await fetch('/api/tone-check', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify(payload),
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
            setTcCancelling(false);
            tcStopPoll();
            tcPollRef.current = setInterval(() => tcPoll(d.job_id), 2500);
            tcPoll(d.job_id);
        } catch (e) {
            setTcErr(String((e && e.message) || e));
        } finally {
            setTcStarting(false);
        }
    };

    // Что именно запустит шаблон и что мешает запуску: раньше подпись была одна на всех
    // («по объектам»), и по ней нельзя было понять ни набор, ни объекты, ни период.
    const tcPresetInfo = item => {
        if (!item) return { text: '', bad: '' };
        const ds = tcDatasets.find(d => String(d.index) === String(item.index));
        const objects = (Array.isArray(item.objects) ? item.objects : []).filter(Boolean);
        const parts = [ds ? (ds.label || ds.name) : 'набор данных не найден'];
        if ((item.label_mode || 'message') === 'aspect') {
            parts.push(objects.length ? 'объекты: ' + objects.map(o => '«' + o + '»').join(', ') : 'объекты не указаны');
        } else {
            parts.push('тональность сообщения целиком');
        }
        if (item.theme) parts.push('тема: «' + item.theme + '»');
        if (item.hub) parts.push('площадка: ' + item.hub);
        if (item.author) parts.push('автор: ' + item.author);
        const day = sec => (sec ? new Date(sec * 1000).toLocaleDateString('ru-RU') : null);
        if (item.min_date || item.max_date) {
            parts.push((day(item.min_date) || 'с начала') + ' — ' + (day(item.max_date) || 'по конец'));
        } else {
            parts.push('весь период');
        }
        parts.push(item.mode === 'full' ? 'все сообщения набора' : 'выборка 500 сообщений');
        let bad = '';
        if ((item.label_mode || 'message') === 'aspect' && !objects.length) {
            bad = 'В шаблоне не указаны объекты — нажмите «Заполнить», добавьте объект и сохраните шаблон заново.';
        } else if (!ds) {
            bad = 'Набор данных этого шаблона удалён — выберите набор и сохраните шаблон заново.';
        }
        return { text: parts.join(' · '), bad };
    };

    const tcRunPreset = async item => {
        const info = tcPresetInfo(item);
        if (info.bad) {
            // Раньше кнопка в этом случае молча ничего не делала.
            setTcPresetMsg(info.bad);
            setTcErr(info.bad);
            tcApplyPreset(item);
            return;
        }
        setTcPresetMsg('');
        tcApplyPreset(item);
        await tcStart({
            index: item.index != null ? String(item.index) : '',
            mode: item.mode || 'sample',
            sample_size: 500,
            min_date: item.min_date || null,
            max_date: item.max_date || null,
            label_mode: item.label_mode || 'message',
            objects: Array.isArray(item.objects) ? item.objects : [],
            theme: item.theme || '',
            hub: item.hub || '',
            author: item.author || '',
            preset: item.name || '',
        });
    };

    const tcCancel = async () => {
        if (!tcJob || !tcJob.job_id) return;
        // Сразу показываем, что команда принята: сервер останавливает проход не мгновенно —
        // он доводит текущую пачку сообщений, а затем сохраняет уже размеченное.
        setTcErr('');
        setTcCancelling(true);
        try {
            const r = await fetch('/api/tone-check/' + tcJob.job_id + '/cancel', {
                method: 'POST',
                headers: authHeaders(),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                setTcCancelling(false);
                setTcErr(d.detail || 'Не удалось остановить проверку');
                return;
            }
            tcPoll(tcJob.job_id);
        } catch (e) {
            setTcCancelling(false);
            setTcErr('Не удалось остановить проверку: нет связи с сервером');
        }
    };

    // Закрываем выпадающий список наборов по клику вне его и по Escape.
    useEffect(() => {
        if (!tcDsOpen) return undefined;
        const onDown = e => {
            if (tcDsBoxRef.current && !tcDsBoxRef.current.contains(e.target)) setTcDsOpen(false);
        };
        const onKey = e => {
            if (e.key === 'Escape') setTcDsOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [tcDsOpen]);

    const tcDatasetValue = ds => String(ds && ds.index != null ? ds.index : ds && ds.name);

    const tcDeleteDataset = async ds => {
        if (!ds) return;
        const value = tcDatasetValue(ds);
        const label = ds.label || ds.name;
        const ok = window.confirm(
            'Удалить набор данных «' + label + '» — ' + ds.docs + ' сообщ.' +
                (ds.labeled ? ', из них размечено ' + ds.labeled : '') +
                '?\n\nСообщения набора и результаты разметки удаляются безвозвратно. ' +
                'Отчёты, уже сохранённые в папке «Отчёты», останутся.',
        );
        if (!ok) return;
        setTcDeleting(value);
        setTcDsErr('');
        setTcErr('');
        setTcDsOpen(true);
        try {
            const r = await fetch('/api/tone-check/datasets/' + encodeURIComponent(value), {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                // Ошибку показываем прямо в списке наборов, а не только в блоке выше.
                setTcDsErr(d.detail || 'Не удалось удалить набор данных (код ' + r.status + ')');
                return;
            }
            setTcDatasets(list => list.filter(item => tcDatasetValue(item) !== value));
            if (tcIndex === value) setTcIndex('');
            if (d && d.note) setTcDsErr(d.note);
        } catch (e) {
            setTcDsErr('Не удалось удалить набор данных: нет связи с сервером');
        } finally {
            setTcDeleting('');
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
                    <div style={{ border: '1px solid rgba(16,24,40,.12)', borderRadius: 10, padding: '10px 14px', margin: '8px 0 4px auto', background: '#fff', fontSize: 13, width: '100%', maxWidth: 560 }}>
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

                {(pathname === '/data-set' || isInsideFolder) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 2px', width: '100%' }}>
                        <button
                            type='button'
                            onClick={() => setTcOpen(v => !v)}
                            title={tcOpen ? 'Свернуть панель проверки тональности' : 'Открыть проверку тональности'}
                            style={{
                                background: '#F79009',
                                border: '1px solid #F79009',
                                color: '#fff',
                                borderRadius: 8,
                                cursor: 'pointer',
                                padding: '7px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {tcOpen ? 'Свернуть панель' : 'Проверка тональности'}
                        </button>
                    </div>
                )}

                {(pathname === '/data-set' || isInsideFolder) && (tcOpen || (tcJob && tcJob.job_id)) && (
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 820,
                            margin: '0 auto 8px',
                            padding: '8px 12px',
                            border: '1px solid rgba(23,96,232,.25)',
                            borderRadius: 10,
                            background: '#f6f9ff',
                            fontSize: 12,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 13 }}>Проверка тональности</b>
                            <span style={{ color: '#667085' }}>
                                Модели сами определят тональность и отношение к объекту. Разметку источника
                                сохраняем отдельно — её всегда видно в отчёте и можно вернуть переключателем.
                            </span>
                            <button
                                type='button'
                                onClick={() => setTcSettingsOpen(v => !v)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'none',
                                    border: '1px solid #c7d7fe',
                                    color: '#1760e8',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    padding: '3px 10px',
                                    fontSize: 12,
                                }}
                            >
                                {tcSettingsOpen ? 'Свернуть настройки' : 'Настроить область'}
                            </button>
                        </div>

                        {tcSettingsOpen && (
                        <>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginTop: 8 }}>
                            <label style={{ fontSize: 12, color: '#344054' }}>
                                Что определяем
                                <select
                                    style={{ display: 'block', marginTop: 4, minWidth: 250, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }}
                                    value={tcLabelMode}
                                    onChange={e => setTcLabelMode(e.target.value)}
                                >
                                    <option value='message'>тональность сообщения целиком</option>
                                    <option value='aspect'>отношение к объекту</option>
                                </select>
                            </label>

                            <label style={{ fontSize: 12, color: '#344054' }}>
                                {tcLabelMode === 'aspect' ? 'Объекты: бренд, продукт, конкурент' : 'Объект: отобрать сообщения про него'}
                                <span style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <input
                                        list='tcObjectHints'
                                        placeholder="например Rostic's, KFC, крылышки"
                                        value={tcObjectInput}
                                        onChange={e => setTcObjectInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                tcAddObject(tcObjectInput);
                                            }
                                        }}
                                        style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2', minWidth: 240 }}
                                    />
                                    <button
                                        type='button'
                                        onClick={() => tcAddObject(tcObjectInput)}
                                        style={{ background: 'none', border: '1px solid #c7d7fe', color: '#1760e8', borderRadius: 8, cursor: 'pointer', padding: '6px 10px' }}
                                    >
                                        Добавить
                                    </button>
                                    <datalist id='tcObjectHints'>
                                        {(tcOptions.objects || []).slice(0, 40).map(o => (
                                            <option key={o.term} value={o.term} />
                                        ))}
                                    </datalist>
                                </span>
                                {tcObjectInput.trim() !== '' && (
                                    <span style={{ display: 'block', marginTop: 2, color: '#b54708' }}>
                                        «{tcObjectInput.trim()}» ещё не добавлен — нажмите «Добавить» или Enter,
                                        иначе он не попадёт в проверку
                                    </span>
                                )}
                            </label>

                            <label style={{ fontSize: 12, color: '#344054' }}>
                                Инфоповод / тема
                                <select
                                    style={{ display: 'block', marginTop: 4, minWidth: 220, maxWidth: 320, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }}
                                    value={tcTheme}
                                    onChange={e => setTcTheme(e.target.value)}
                                >
                                    <option value=''>{tcOptionsLoading ? '— загружаю темы —' : '— без темы —'}</option>
                                    {(tcOptions.themes || []).map(t => (
                                        <option key={(t.name || '') + '|' + (t.period || '')} value={t.name}>
                                            {t.name}
                                            {t.period ? ' · ' + t.period : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ fontSize: 12, color: '#344054' }}>
                                С даты
                                <input
                                    type='date'
                                    style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }}
                                    value={tcFrom}
                                    onChange={e => setTcFrom(e.target.value)}
                                />
                            </label>
                            <label style={{ fontSize: 12, color: '#344054' }}>
                                По дату
                                <input
                                    type='date'
                                    style={{ display: 'block', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }}
                                    value={tcTo}
                                    onChange={e => setTcTo(e.target.value)}
                                />
                            </label>

                            <label style={{ fontSize: 12, color: '#344054' }}>
                                Площадка
                                <select
                                    style={{ display: 'block', marginTop: 4, minWidth: 160, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2' }}
                                    value={tcHub}
                                    onChange={e => setTcHub(e.target.value)}
                                >
                                    <option value=''>— все площадки —</option>
                                    {(tcOptions.hubs || []).map(h => (
                                        <option key={h.key} value={h.key}>
                                            {h.key} ({h.count})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ fontSize: 12, color: '#344054' }}>
                                Автор
                                <span style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <input
                                        list='tcAuthorHints'
                                        placeholder='имя автора'
                                        value={tcAuthor}
                                        onChange={e => setTcAuthor(e.target.value)}
                                        style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d7e2', minWidth: 180 }}
                                    />
                                    <datalist id='tcAuthorHints'>
                                        {(tcOptions.authors || []).map(a => (
                                            <option key={a.name} value={a.name} />
                                        ))}
                                    </datalist>
                                </span>
                            </label>
                        </div>
                        </>
                        )}

                        <div style={{ marginTop: 8, padding: '8px 10px', border: '1px solid rgba(16,24,40,.08)', borderRadius: 8, background: '#fff' }}>
                            {tcObjects.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ color: '#667085' }}>
                                        {tcLabelMode === 'aspect' ? 'Оцениваю отношение к:' : 'В выборке есть упоминания:'}
                                    </span>
                                    {tcObjects.map(name => (
                                        <span
                                            key={name}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #c7d7fe', background: '#eef2ff', color: '#1760e8', borderRadius: 999, padding: '2px 10px' }}
                                        >
                                            {name}
                                            <button
                                                type='button'
                                                onClick={() => tcRemoveObject(name)}
                                                style={{ background: 'none', border: 'none', color: '#1760e8', cursor: 'pointer', padding: 0 }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div style={{ color: '#101828' }}>
                                <b>Проверяю:</b>{' '}
                                {tcScope ? tcScope.scope_text : tcIndex ? 'считаю объём…' : 'выберите набор данных'}
                                {tcScope && (
                                    <span style={{ color: '#1760e8' }}>
                                        {' — '}попадёт <b>{tcScope.count}</b> сообщ.
                                        {tcScope.labeled ? ', уже размечено ' + tcScope.labeled : ''}
                                        {tcScopeLoading ? ' (обновляю…)' : ''}
                                    </span>
                                )}
                            </div>

                            {tcIndex && tcToneMode && (
                                <div style={{ marginTop: 6 }}>
                                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#344054' }}>
                                        <input
                                            type='checkbox'
                                            checked={tcToneMode.mode === 'relabeled'}
                                            disabled={tcToneModeBusy || !Number(tcToneMode.stats && tcToneMode.stats.labeled)}
                                            onChange={e => tcSetToneMode(e.target.checked)}
                                            style={{ marginTop: 2 }}
                                        />
                                        <span>
                                            <b>Считать по обновлённой разметке</b>
                                            {Number(tcToneMode.stats && tcToneMode.stats.labeled) > 0 ? (
                                                <>
                                                    {' — наша разметка есть у '}
                                                    <b>{tcToneMode.stats.labeled}</b>
                                                    {' из '}
                                                    {tcToneMode.stats.docs}
                                                    {' сообщений ('}
                                                    {Math.round((tcToneMode.coverage || 0) * 100)}
                                                    {'%). У этих сообщений она станет тональностью во всех разделах: '}
                                                    таблицы, графики, аналитика, конструктор отчётов. У остальных останется
                                                    разметка источника.
                                                </>
                                            ) : (
                                                ' — пока нечего переносить: сначала выполните проверку тональности по этому набору.'
                                            )}
                                            {tcToneMode.mode === 'relabeled' && (
                                                <span style={{ color: '#067647' }}>
                                                    {' '}Включено: разделы считают по нашей разметке. Разметка источника
                                                    сохранена — при выключении всё вернётся.
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                    {tcToneModeBusy && <div style={{ color: '#1760e8', marginTop: 2 }}>Переключаю…</div>}
                                    {!tcToneModeBusy && tcToneMode.status === 'running' && tcToneMode.progress && tcToneMode.progress.total > 0 && (
                                        <div style={{ color: '#1760e8', marginTop: 2 }}>
                                            {tcToneMode.mode === 'relabeled' ? 'Переношу разметку: ' : 'Возвращаю разметку источника: '}
                                            {tcToneMode.progress.done} из {tcToneMode.progress.total}
                                            {' '}({Math.round((tcToneMode.progress.done / Math.max(1, tcToneMode.progress.total)) * 100)}%)
                                        </div>
                                    )}
                                </div>
                            )}
                            {tcSettingsOpen && (
                            <>
                            {tcScope && Array.isArray(tcScope.by_hub) && tcScope.by_hub.length > 0 && (
                                <div style={{ color: '#98a2b3', marginTop: 2 }}>
                                    площадки в области:{' '}
                                    {tcScope.by_hub
                                        .slice(0, 5)
                                        .map(h => h.key + ' ' + h.count)
                                        .join(' · ')}
                                </div>
                            )}

                            <div style={{ color: '#98a2b3', marginTop: 8 }}>
                                Шаблон хранит настройки проверки — набор данных, объекты, период, площадку и
                                режим. В списке «Набор данных» шаблоны не появляются: там сами сообщения.
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 }}>
                                <input
                                    placeholder="имя шаблона, например «Rostic's, качество еды, лето 2026»"
                                    value={tcPresetName}
                                    onChange={e => setTcPresetName(e.target.value)}
                                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d7e2', minWidth: 280 }}
                                />
                                <button
                                    type='button'
                                    onClick={tcSavePreset}
                                    style={{ background: 'none', border: '1px solid #c7d7fe', color: '#1760e8', borderRadius: 8, cursor: 'pointer', padding: '6px 10px' }}
                                >
                                    Сохранить настройки проверки
                                </button>
                                {tcPresetMsg && <span style={{ color: '#667085' }}>{tcPresetMsg}</span>}
                            </div>

                            {tcPresets.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ color: '#667085' }}>Сохранённые настройки проверки (шаблоны):</div>
                                    {tcPresets.map(item => {
                                        const info = tcPresetInfo(item);
                                        return (
                                            <div
                                                key={item.name}
                                                style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '3px 0', borderBottom: '1px dashed #e4e7ec' }}
                                            >
                                                <b>{item.name}</b>
                                                <span style={{ color: '#667085' }}>{info.text}</span>
                                                {info.bad && (
                                                    <span style={{ color: '#b54708', width: '100%' }}>{info.bad}</span>
                                                )}
                                                <button
                                                    type='button'
                                                    onClick={() => tcRunPreset(item)}
                                                    title={info.bad || 'Запустить проверку с этими настройками'}
                                                    style={{
                                                        marginLeft: 'auto',
                                                        background: 'none',
                                                        border: '1px solid ' + (info.bad ? '#fecdca' : '#c7d7fe'),
                                                        color: info.bad ? '#b54708' : '#1760e8',
                                                        borderRadius: 6,
                                                        cursor: 'pointer',
                                                        padding: '2px 10px',
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    Запустить
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={() => tcApplyPreset(item)}
                                                    style={{ background: 'none', border: '1px solid #d0d7e2', color: '#344054', borderRadius: 6, cursor: 'pointer', padding: '2px 10px', fontSize: 12 }}
                                                >
                                                    Заполнить
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={() => tcDeletePreset(item.name)}
                                                    style={{ background: 'none', border: '1px solid #fecdca', color: '#b42318', borderRadius: 6, cursor: 'pointer', padding: '2px 10px', fontSize: 12 }}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            </>
                            )}
                        </div>

                        {tcOpen && (
                        <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginTop: 8 }}>
                            <div style={{ fontSize: 12, color: '#344054', position: 'relative' }} ref={tcDsBoxRef}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>Набор данных</span>
                                    {tcDatasets.length > 0 && (
                                        <span style={{ color: '#98a2b3' }}>
                                            · удалить можно крестиком в списке
                                        </span>
                                    )}
                                </div>
                                <div
                                    role='button'
                                    tabIndex={0}
                                    onClick={() => !tcLoadingDs && setTcDsOpen(v => !v)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (!tcLoadingDs) setTcDsOpen(v => !v);
                                        }
                                    }}
                                    style={{
                                        marginTop: 4,
                                        minWidth: 280,
                                        maxWidth: 460,
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        border: '1px solid ' + (tcDsOpen ? '#1760e8' : '#d0d7e2'),
                                        background: '#fff',
                                        cursor: tcLoadingDs ? 'default' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: 1,
                                            color: tcIndex ? '#101828' : '#98a2b3',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {tcLoadingDs
                                            ? '— загружаю список —'
                                            : (() => {
                                                  const sel = tcDatasets.find(ds => tcDatasetValue(ds) === tcIndex);
                                                  return sel
                                                      ? (sel.label || sel.name) + ' · ' + sel.docs + ' сообщ.' +
                                                            (sel.folder ? ' · папка «' + sel.folder + '»' : '')
                                                      : '— выберите набор данных —';
                                              })()}
                                    </span>
                                    <span style={{ color: '#667085', fontSize: 10 }}>{tcDsOpen ? '▲' : '▼'}</span>
                                </div>
                                {tcDsErr && (
                                    <div style={{ marginTop: 4, color: tcDsErr.indexOf('Запись в списке') === 0 ? '#667085' : '#b42318', maxWidth: 460 }}>
                                        {tcDsErr}
                                    </div>
                                )}
                                {tcDsOpen && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            zIndex: 30,
                                            marginTop: 4,
                                            minWidth: 340,
                                            maxWidth: 520,
                                            maxHeight: 300,
                                            overflowY: 'auto',
                                            background: '#fff',
                                            border: '1px solid #d0d7e2',
                                            borderRadius: 8,
                                            boxShadow: '0 12px 28px rgba(16,24,40,.14)',
                                        }}
                                    >
                                        {tcDatasets.length === 0 && (
                                            <div style={{ padding: '8px 10px', color: '#667085' }}>
                                                — наборов нет —
                                            </div>
                                        )}
                                        {tcDatasets.map(ds => {
                                            const value = tcDatasetValue(ds);
                                            const active = value === tcIndex;
                                            return (
                                                <div
                                                    key={value}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '7px 10px',
                                                        borderTop: '1px solid #f2f4f7',
                                                        background: active ? '#f6f9ff' : '#fff',
                                                    }}
                                                >
                                                    <span
                                                        role='button'
                                                        tabIndex={0}
                                                        title={ds.name}
                                                        onClick={() => {
                                                            setTcIndex(value);
                                                            setTcDsOpen(false);
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                setTcIndex(value);
                                                                setTcDsOpen(false);
                                                            }
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            cursor: 'pointer',
                                                            color: '#101828',
                                                            fontSize: 13,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {ds.label || ds.name} · {ds.docs} сообщ.
                                                        {ds.labeled ? ' · размечено ' + ds.labeled : ''}
                                                        {ds.folder ? ' · папка «' + ds.folder + '»' : ''}
                                                    </span>
                                                    <button
                                                        type='button'
                                                        title='Удалить набор данных'
                                                        disabled={tcDeleting === value}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            tcDeleteDataset(ds);
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: tcDeleting === value ? '#98a2b3' : '#b42318',
                                                            cursor: tcDeleting === value ? 'default' : 'pointer',
                                                            fontSize: 16,
                                                            lineHeight: 1,
                                                            padding: '0 4px',
                                                        }}
                                                    >
                                                        {tcDeleting === value ? '…' : '×'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {tcDsErr && (
                                            <div style={{ padding: '7px 10px', borderTop: '1px solid #f2f4f7', color: tcDsErr.indexOf('Запись в списке') === 0 ? '#667085' : '#b42318' }}>
                                                {tcDsErr}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

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
                        </div>
                        </>
                        )}

                        {tcErr && <div style={{ color: '#c53030', marginTop: 8 }}>{tcErr}</div>}

                        {tcJob && tcJob.job_id && (
                            <div>
                                <ToneProgressCard job={tcJob} onCancel={tcCancel} cancelling={tcCancelling} />

                                {tcJob.status === 'done' && tcJob.summary && (tcJob.summary.agreement != null || (Array.isArray(tcJob.aspect_objects) && tcJob.aspect_objects.length > 0)) && (
                                    <div style={{ marginTop: 8, color: '#101828' }}>
                                        {tcJob.summary.agreement != null && (
                                        <div>
                                            Наша оценка совпала с источником: <b>{Math.round((tcJob.summary.agreement || 0) * 1000) / 10}%</b>
                                            {' · '}каппа Коэна: <b>{Math.round((tcJob.summary.kappa || 0) * 100) / 100}</b>
                                            {' · '}расхождений: <b>{tcJob.summary.mismatches}</b>
                                            {tcJob.summary.pass2_share != null ? ' · спорных разобрала сильная модель: ' + Math.round((tcJob.summary.pass2_share || 0) * 100) + '%' : ''}
                                        </div>
                                        )}
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
                                                Данные отчёта
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

                                {tcJob.status === 'done' && Array.isArray(tcJob.aspect_objects) && tcJob.aspect_objects.length > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ fontWeight: 600 }}>
                                            Отношение к объектам
                                            {Array.isArray(tcJob.objects) && tcJob.objects.length ? ' («' + tcJob.objects.join('», «') + '»)' : ''}:
                                        </div>
                                        <table style={{ borderCollapse: 'collapse', marginTop: 4, fontSize: 12 }}>
                                            <thead>
                                                <tr>
                                                    {['Объект', 'Упоминаний', 'Позитив', 'Нейтрал', 'Негатив', 'Перевес позитива'].map(h => (
                                                        <th
                                                            key={h}
                                                            style={{ border: '1px solid #e4e7ec', padding: '3px 8px', textAlign: 'left', color: '#667085', fontWeight: 600 }}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tcJob.aspect_objects.map(row => (
                                                    <tr key={row.object}>
                                                        <td style={{ border: '1px solid #e4e7ec', padding: '3px 8px' }}>{row.object}</td>
                                                        <td style={{ border: '1px solid #e4e7ec', padding: '3px 8px' }}>{row.mentions}</td>
                                                        <td style={{ border: '1px solid #e4e7ec', padding: '3px 8px', color: '#067647' }}>
                                                            {Math.round((row.positive_share || 0) * 1000) / 10}%
                                                        </td>
                                                        <td style={{ border: '1px solid #e4e7ec', padding: '3px 8px', color: '#667085' }}>
                                                            {Math.round((row.neutral_share || 0) * 1000) / 10}%
                                                        </td>
                                                        <td style={{ border: '1px solid #e4e7ec', padding: '3px 8px', color: '#b42318' }}>
                                                            {Math.round((row.negative_share || 0) * 1000) / 10}%
                                                        </td>
                                                        <td style={{ border: '1px solid #e4e7ec', padding: '3px 8px' }}>
                                                            {Math.round((row.tone_index || 0) * 100) / 100}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {tcJob.source_note && (
                                            <div style={{ color: '#98a2b3', marginTop: 4 }}>{tcJob.source_note}</div>
                                        )}
                                    </div>
                                )}

                                {tcJob.status === 'cancelled' && (
                                    <div style={{ marginTop: 8, color: '#b54708' }}>
                                        Проверка остановлена
                                        {tcJob.processed != null && tcJob.total
                                            ? ': размечено ' + tcJob.processed + ' из ' + tcJob.total + ' сообщений'
                                            : ''}
                                        . Отчёт собран по уже проверенным сообщениям.
                                    </div>
                                )}
                                {tcJob.status === 'error' && (
                                    <div style={{ marginTop: 8, color: '#c53030' }}>Не получилось: {tcJob.error || 'попробуйте ещё раз'}</div>
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
