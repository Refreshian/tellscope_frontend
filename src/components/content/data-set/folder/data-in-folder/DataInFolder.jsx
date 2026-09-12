import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

import Pagination from '@/components/ui/pagination/Pagination';

import { useDataInFolder } from '../../../../../hooks/useDataInFolder';
import { useDataAddFileMutation } from '../../../../../services/dataSet.service';
import {
  useGetUserFoldersQuery,
  useGetUserIdQuery,
} from '../../../../../services/other.service';

import styles from './DataInFolder.module.scss';
import { useLazyFileLoadQuery } from '@/services/dataSet.service';
import FileOrigin from '@/components/ui/file-origin/FileOrigin';

const uploadStatusLabel = status => {
	switch (status) {
		case 'pending':
			return 'Подготовка...';
		case 'processing':
		case 'uploading':
			return 'Обработка...';
		case 'completed':
		case 'success':
			return 'Готово!';
		case 'failed':
			return 'Ошибка';
		default:
			return status || '';
	}
};

const uploadStatusColor = status => {
	switch (status) {
		case 'completed':
		case 'success':
			return '#52c41a';
		case 'failed':
			return '#ff4d4f';
		default:
			return '#1890ff';
	}
};

const uploadStageLabel = stage => {
	switch (stage) {
		case 'starting':
			return 'Начало обработки';
		case 'excel_conversion':
			return 'Конвертация Excel → JSON';
		case 'elasticsearch_preparation':
			return 'Подготовка к загрузке в Elasticsearch';
		case 'chunking':
			return 'Разбивка текста на фрагменты';
		case 'embedding':
			return 'Построение эмбеддингов (смысл текста)...';
		case 'preparing':
			return 'Подготовка к индексации';
		case 'qdrant_preparation':
			return 'Подготовка векторной базы';
		case 'qdrant_upload':
			return 'Загрузка эмбеддингов в векторную базу';
		case 'indexing':
			return 'Индексация в Elasticsearch';
		case 'completed':
			return 'Обработка завершена';
		case 'failed':
			return 'Ошибка обработки';
		default:
			return '';
	}
};

const DataInFolder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: name_folder,
    allData,
    processedData,
  } = useSelector(state => state.folderTarget);
  const {
    title,
    folder: folderName,
    isPopupDelete,
    buttonTarget,
  } = useSelector(state => state.popupDelete);
  const [filterText, setFilterText] = useState('');

  // Получаем имя папки из URL
  const pathSegments = location.pathname.split('/');
  const rawFolderName = pathSegments[pathSegments.length - 1];
  let urlFolderName = rawFolderName;
  try {
    urlFolderName = decodeURIComponent(rawFolderName);
  } catch (e) {}

  const [
    trigger_fileLoad,
    {
      data: data_fileLoad,
      isSuccess: isSuccess_fileLoad,
      isLoading: isLoading_fileLoad,
    },
  ] = useLazyFileLoadQuery();

  const [
    trigger_dataAddFile,
    {
      data: data_dataAddFile,
      isSuccess: isSuccess_dataAddFile,
      isLoading: isLoading_dataAddFile,
    },
  ] = useDataAddFileMutation();

  const {
    data: data_getUserId,
    isError: isError_getUserId,
    error: error_getUserId,
    isLoading: isLoading_getUserId,
  } = useGetUserIdQuery();
  
  const { data, isError, error, isLoading, isSuccess, refetch } =
    useGetUserFoldersQuery(data_getUserId);

  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 9;

  const isDataSetPath = /^\/data-set(\/processed)\/[^/]+$/.test(
    location.pathname,
  );

  // Эффект для проверки и обновления данных при изменении URL
  useEffect(() => {
    // Если имя папки из URL не совпадает с текущим в состоянии,
    // можно выполнить дополнительные действия
    if (urlFolderName && name_folder !== urlFolderName) {
      // Например, запросить данные для новой папки
      refetch();
    }
  }, [urlFolderName, name_folder, refetch]);

  const renderFiles = (folderName, allData) => {
    if (!folderName || typeof folderName === 'object' || !allData)
      return { json_files_directory: [] };
    
    if (isDataSetPath) {
      if (folderName.trim() in allData.projector_files_directory) {
        return {
          json_files_directory: allData.projector_files_directory[folderName],
        };
      } else {
        return { json_files_directory: [] };
      }
    } else {
      if (folderName.trim() in allData.json_files_directory) {
        return {
          json_files_directory: allData.json_files_directory[folderName],
        };
      } else {
        return { json_files_directory: [] };
      }
    }
  };

  // Используем имя папки из URL, если оно есть, иначе из состояния
  const activeFolderName = urlFolderName || name_folder;
  const dynamicDirectoryFile = isDataSetPath
    ? ['tsv-file', 'txt-file']
    : ['file'];

  const files = renderFiles(activeFolderName, data).json_files_directory.filter(
    file => {
      return dynamicDirectoryFile.some(
        key =>
          file[key] &&
          file[key].toLowerCase().includes(filterText.toLowerCase()),
      );
    },
  );

  const allFiles = renderFiles(activeFolderName, data).json_files_directory;

  const totalPages = Math.ceil(files.length / filesPerPage);

  const style = {
    block__files: {
      display: allFiles.length > 0 ? 'block' : 'flex',
      justifyContent: allFiles.length > 0 ? undefined : 'center',
      borderTop:
        allFiles.length > 0 ? '1px solid rgba(#1e1e1e, $alpha: 0.04)' : 'none',
    },
    block__field: {
      display: allFiles.length > 0 ? 'flex' : 'none',
    },
  };

  const viewStyle = name => ({
    display: isPopupDelete && folderName === name ? 'none' : 'flex',
  });

  const {
    onClick,
    handleInputChange,
    handlePageChange,
    handleFileChange,
    handleDrop,
    handleDragLeave,
    handleDragOver,
    dragging,
    buildEmbeddings,
    setBuildEmbeddings,
    uploads,
  } = useDataInFolder();

  if (!data || !allData || !processedData) {
    return <p>Загрузка данных...</p>;
  }

  return (
    <div className={styles.wrapper_dataInFolder}>
      <button className={styles.button__back} onClick={() => navigate(-1)}>
        <img src='/images/icons/arrow_in_folder_left.svg' alt='arrow' />
        Назад
      </button>
      <div className={styles.block__title}>
        <h3 className={styles.title}>{data.name}</h3>
        <div className={styles.block__field} style={style.block__field}>
          <img
            src='/images/icons/input_button/search.svg'
            alt='search'
            className={styles.image__search}
          />
          <input
            type='text'
            className={styles.input__search}
            placeholder='Поиск по названию'
            onChange={handleInputChange}
          />
        </div>
      </div>
      <div className={styles.block__files} style={style.block__files}>
        {uploads.length > 0 && (
          <>
            {uploads.map(up => {
              const safeProgress = Math.max(
                0,
                Math.min(100, parseFloat(up.progress) || 0),
              );
              const color = uploadStatusColor(up.status);
              const detail = up.stage_details || uploadStageLabel(up.stage);
              return (
                <div key={up.key} className={styles.file__group}>
                  <div
                    className={styles.file}
                    style={{
                      cursor: 'default',
                      flexWrap: 'wrap',
                      borderColor:
                        up.status === 'failed'
                          ? 'rgba(255,77,79,0.4)'
                          : undefined,
                    }}
                  >
                    <p className={styles.name}>{up.filename}</p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        alignItems: 'center',
                        marginLeft: 'auto',
                        fontSize: 12,
                        color: '#667085',
                      }}
                    >
                      <span style={{ color, fontWeight: 600 }}>
                        {uploadStatusLabel(up.status)}
                      </span>
                      {up.status !== 'completed' &&
                        up.status !== 'success' &&
                        up.status !== 'failed' && (
                          <span style={{ color: '#667085' }}>
                            {Math.round(safeProgress)}%
                          </span>
                        )}
                    </div>
                    <div
                      style={{
                        flexBasis: '100%',
                        height: 6,
                        marginTop: 6,
                        borderRadius: 4,
                        background: 'rgba(16,24,40,0.07)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${safeProgress}%`,
                          background: color,
                          transition: 'width 0.3s ease-in-out',
                        }}
                      />
                    </div>
                    {detail ? (
                      <div
                        style={{
                          flexBasis: '100%',
                          marginTop: 4,
                          fontSize: 12,
                          color: '#667085',
                        }}
                      >
                        {detail}
                        {up.error ? ` (${up.error})` : ''}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </>
        )}
        {allFiles.length > 0 ? (
          <>
            {files
              .slice(
                (currentPage - 1) * filesPerPage,
                currentPage * filesPerPage,
              )
              .map((file, ind) => (
                <div
                  key={ind}
                  className={styles.file__group}
                  style={viewStyle(file)}
                >
                  {isDataSetPath && file['tsv-file'] && (
                    <div
                      key={`${ind}-tsv`}
                      className={styles.file}
                      style={viewStyle(file)}
                    >
                      <p className={styles.name}>{file['tsv-file']}</p>
                      <div className={styles.block__buttons}>
                        <button
                          className={styles.button__upload}
                          onClick={() => onClick(file['tsv-file'], 'upload')}
                        >
                          <img
                            src='/images/icons/setting/upload.svg'
                            alt='upload'
                          />
                        </button>
                        <button
                          className={styles.button__delete}
                          onClick={() => onClick(file['tsv-file'], 'delete')}
                        >
                          <img
                            src='/images/icons/setting/delete.svg'
                            alt='delete'
                          />
                        </button>
                        <FileOrigin
                          userId={data_getUserId}
                          folder={activeFolderName}
                          file={file['tsv-file']}
                        />
                      </div>
                    </div>
                  )}
                  {isDataSetPath && file['txt-file'] && (
                    <div
                      key={`${ind}-txt`}
                      className={styles.file}
                      style={viewStyle(file)}
                    >
                      <p className={styles.name}>{file['txt-file']}</p>
                      <div className={styles.block__buttons}>
                        <button
                          className={styles.button__upload}
                          onClick={() => onClick(file['txt-file'], 'upload')}
                        >
                          <img
                            src='/images/icons/setting/upload.svg'
                            alt='upload'
                          />
                        </button>
                        <button
                          className={styles.button__delete}
                          onClick={() => onClick(file['txt-file'], 'delete')}
                        >
                          <img
                            src='/images/icons/setting/delete.svg'
                            alt='delete'
                          />
                        </button>
                        <FileOrigin
                          userId={data_getUserId}
                          folder={activeFolderName}
                          file={file['txt-file']}
                        />
                      </div>
                    </div>
                  )}
                  {!isDataSetPath && (
                    <div
                      key={ind}
                      className={styles.file}
                      style={viewStyle(file)}
                    >
                      <p className={styles.name}>{file.file}</p>
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginLeft: 'auto',
                          alignItems: 'center',
                          color: '#667085',
                          fontSize: 12,
                        }}
                      >
                        <span title='Период данных в файле'>
                          {file.min_data && file.max_data
                            ? `период: ${fmtDay(file.min_data)} – ${fmtDay(file.max_data)}`
                            : 'период: —'}
                        </span>
                        {file.created ? (
                          <span title='Когда файл сформирован/загружен'>
                            получен: {fmtTime(file.created)}
                          </span>
                        ) : null}
                      </div>

                      <div className={styles.block__buttons}>
                        <button
                          className={styles.button__upload}
                          onClick={() => onClick(file.file, 'upload')}
                        >
                          <img
                            src='/images/icons/setting/upload.svg'
                            alt='upload'
                          />
                        </button>


                        <button
                          className={styles.button__delete}
                          onClick={() => onClick(file, 'delete')}
                        >
                          <img
                            src='/images/icons/setting/delete.svg'
                            alt='delete'
                          />
                        </button>
                        <FileOrigin
                          userId={data_getUserId}
                          folder={activeFolderName}
                          file={file.file}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className={styles.block__add}>
            <h3 className={styles.title__add}>Здесь пока ничего нет</h3>
            <div
              className={`${styles.add__file} ${
                dragging ? styles.dragging : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className={styles.description}>
                Перетащите файл или выберите на компьютере
              </p>
              <div className={styles.choice__file}>
                <input
                  type='file'
                  className={styles.input__add}
                  onChange={handleFileChange}
                />
                <p className={styles.choice}>Выбрать файл</p>
              </div>
              <div
                style={{
                  marginTop: 12,
                  maxWidth: 480,
                  fontSize: 13,
                  color: '#344054',
                  lineHeight: 1.45,
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    gap: 7,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type='checkbox'
                    style={{ marginTop: 2 }}
                    checked={buildEmbeddings === true}
                    onChange={e => setBuildEmbeddings(e.target.checked ? true : null)}
                  />
                  <span style={{ fontWeight: 600 }}>Включить ИИ-анализ (эмбеддинги)</span>
                </label>
                <div style={{ marginTop: 4, fontSize: 12, color: '#667085' }}>
                  Система распознаёт <b>смысл</b> сообщений, а не только совпадение слов. Это включит: <b>ИИ-анализ и Анализ тем</b> (темы и тематики всплесков), <b>Граф связей</b>, <b>AI-бот (Ассистент)</b> и <b>смысловой поиск</b> по датасету.
                  <br />
                  Для больших файлов (сотни тысяч записей) обработка может занять часы —
                  обычно её оставляют выключенной.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const fmtDay = ts => {
  if (!ts) return '';
  try { return new Date(Number(ts) * 1000).toLocaleDateString('ru-RU'); } catch (e) { return ''; }
};
const fmtTime = ts => {
  if (!ts) return '';
  try {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
};

export default DataInFolder;