import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '../../../hooks/useActions';
import { useCheckAuth } from '../../../hooks/useCheckAuth';
import { useDataAddFileMutation } from '../../../services/dataSet.service';
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

const DataSetPage = () => {
  useCheckAuth();

  const { addText_PopupInFolder, toggle_PopupInFolder } = useActions();
  const { pathname } = useLocation();
  const { active_menu } = useSelector(store => store.booleanValues);
  const { isPopupInFolder } = useSelector(state => state.popupInFolder);

  const { data } = useSelector(state => state.folderTarget);
  const { isPopupDelete, buttonTarget } = useSelector(
    state => state.popupDelete,
  );

  const {
    data: data_getUserId,
    isError: isError_getUserId,
    error: error_getUserId,
    isLoading: isLoading_getUserId,
  } = useGetUserIdQuery();
  const { refetch, isError, error, isLoading, isSuccess } =
    useGetUserFoldersQuery(data_getUserId);
  const [
    trigger_dataAddFile,
    {
      data: data_dataAddFile,
      isSuccess: isSuccess_dataAddFile,
      isLoading: isLoading_dataAddFile,
      isError: isError_dataAddFile,
      error: error_dataAddFile,
    },
  ] = useDataAddFileMutation();

  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);

  // === NEW CODE START
  const [convertFile, setConvertFile] = useState(null);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertResult, setConvertResult] = useState(null);
  const [convertError, setConvertError] = useState('');
  const convertInputRef = useRef(null);
  // === NEW CODE END

  const handleFileChange = event => {
    const selectedFile = event.target.files[0];

    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const onClick = () => {
    addText_PopupInFolder({
      title: 'Новая папка',
      name_file: isPopupInFolder.name_file,
    });
    toggle_PopupInFolder('');
  };

  // === NEW CODE: обработка конвертации файла
  const onClickConvertBtn = () => {
    // Открыть диалог выбора файла
    convertInputRef.current.click();
  };

  const handleConvertFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setConvertFile(selectedFile);
    setConvertResult(null);
    setConvertError('');
    setConvertLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      // http://localhost:5000/convert-file-mlg
      const response = await fetch('/api/convert-file-mlg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка конвертации файла');

      // если возвращает файл, используем blob:
      const blob = await response.blob();
      // Предлагаем сохранить
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'converted_' + selectedFile.name.replace(/\.[^/.]+$/, '') + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setConvertResult('Файл успешно конвертирован.');
    } catch (err) {
      setConvertError('Ошибка при конвертации: ' + (err?.message || err));
    } finally {
      setConvertLoading(false);
    }
  };
  // === NEW CODE END

  useEffect(() => {
    if (file) {
      const formData = {
        uploaded_file: file,
      };

      const async_requests = async () => {
        await trigger_dataAddFile({
          data: formData,
          name: data,
          user: data_getUserId,
          fileName: fileName,
          // directory: buttonTarget,
        }).unwrap();
        setFile(null);
        refetch();
      };
      async_requests();
    }
  }, [file]);

  if (isError_dataAddFile) {
    return <NotFound error={error_dataAddFile} />;
  }

  // Добавьте в компонент состояние для тултипа
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Layout>
      {isPopupInFolder && <PopupInFolder />}
      {isLoading_dataAddFile && (
        <>
          <BackgroundLoader />
          <Loader />
        </>
      )}
      {pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

      <Content style={{ height: '95%' }}>
        <div className={styles.block__pageName}>
          <h3 className={styles.pageName__title}>Данные</h3>
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
								onChange={handleFileChange}
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

        {/* Сообщения о результате конвертации */}
        {convertError && <div className={styles.error} style={{ color: 'red', marginTop: 10 }}>{convertError}</div>}
        {convertResult && <div className={styles.success} style={{ color: 'green', marginTop: 10 }}>{convertResult}</div>}

        {pathname === '/data-set' ? <DataSet /> : <DataInFolder />}
        {isPopupDelete && <PopupDelete />}
      </Content>
    </Layout>
  );
};

export default DataSetPage;