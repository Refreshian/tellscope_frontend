import { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useDataAddFileMutation } from '../services/dataSet.service';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../services/other.service';

import { useActions } from './useActions';
import { useLazyFileLoadQuery } from '@/services/dataSet.service';

export const useDataInFolder = () => {
	const {
		addText_PopupInFolder,
		toggle_PopupInFolder,
		SetPopupDelete,
		addTitle_PopupDelete,
	} = useActions();
	const [dragging, setDragging] = useState(false);
	const [buildEmbeddings, setBuildEmbeddings] = useState(null); // null=auto, true=force, false=only ES
	const [uploads, setUploads] = useState([]);
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);
	const { data } = useSelector(state => state.folderTarget);
	const { buttonTarget } = useSelector(state => state.popupDelete);
	const urlPathSeg = location.pathname.split('/').filter(Boolean);
	let folderFromUrl = urlPathSeg[urlPathSeg.length - 1] || '';
	try { folderFromUrl = decodeURIComponent(folderFromUrl); } catch (e) {}
	const activeFolderName =
		typeof data === 'string' && data && data !== 'processed' ? data : folderFromUrl;
	const {
		data: data_getUserId,
		isError: isError_getUserId,
		error: error_getUserId,
		isLoading: isLoading_getUserId,
	} = useGetUserIdQuery();
	const { refetch, isError, error, isLoading, isSuccess } =
		useGetUserFoldersQuery(data_getUserId);
	const [
		trigger_fileLoad,
		{
			data: data_fileLoad,
			isSuccess: isSuccess_fileLoad,
			isLoading: isLoading_fileLoad,
			isError: isError_fileLoad,
			error: error_fileLoad,
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

	const isDataSetPath = /^\/data-set(\/processed)\/[^/]+$/.test(
		location.pathname,
	);

	// --- Загрузка файла с индикацией прогресса (включая эмбеддинги) ---
	const removeUpload = useCallback(key => {
		setUploads(prev => prev.filter(u => u.key !== key));
	}, []);

	const trackUpload = useCallback(
		(taskId, fileName) => {
			const key = `${taskId}__${fileName}`;
			setUploads(prev => [
				...prev,
				{
					key,
					task_id: taskId,
					filename: fileName,
					progress: 0,
					status: 'pending',
					stage: '',
					stage_details: 'Подготовка к загрузке...',
					error: '',
				},
			]);

			const poll = async () => {
				if (!mountedRef.current) return;
				try {
					const r = await fetch(`/api/check-task-status/${taskId}`);
					if (!r.ok) {
						setUploads(prev =>
							prev.map(u =>
								u.key === key
									? { ...u, status: 'failed', stage_details: 'Не удалось получить статус обработки' }
									: u,
							),
						);
						setTimeout(() => removeUpload(key), 4000);
						return;
					}
					const d = await r.json();
					const status = d.status || 'processing';
					setUploads(prev =>
						prev.map(u =>
							u.key === key
								? {
										...u,
										progress: parseInt(d.progress) || 0,
										status,
										stage: d.stage || u.stage,
										stage_details: d.stage_details || d.stage || u.stage_details,
										error: d.error || '',
								  }
								: u,
						),
					);
					if (status === 'completed' || status === 'failed') {
						setTimeout(() => {
							removeUpload(key);
							refetch();
						}, 4000);
					} else if (mountedRef.current) {
						setTimeout(poll, 1200);
					}
				} catch (e) {
					if (!mountedRef.current) return;
					setUploads(prev =>
						prev.map(u =>
							u.key === key
								? { ...u, status: 'failed', stage_details: 'Ошибка подключения при проверке статуса' }
								: u,
						),
					);
					setTimeout(() => removeUpload(key), 4000);
				}
			};
			poll();
		},
		[refetch, removeUpload],
	);

	const uploadFile = useCallback(
		async file => {
			const formData = { uploaded_file: file };
			let result;
			try {
				result = await trigger_dataAddFile({
					data: formData,
					name: activeFolderName,
					fileName: file.name,
					user: data_getUserId,
					buildEmbeddings,
				}).unwrap();
			} catch (e) {
				console.error('Ошибка загрузки файла:', e);
				setUploads(prev => [
					...prev,
					{
						key: `${Date.now()}__${file.name}`,
						task_id: '',
						filename: file.name,
						progress: 0,
						status: 'failed',
						stage: '',
						stage_details: 'Ошибка загрузки',
						error: (e && e.message) || String(e),
					},
				]);
				setTimeout(() => setUploads(prev => prev.filter(u => u.filename !== file.name || u.status !== 'failed')), 4000);
				refetch();
				return;
			}

			const taskId = result && result.task_id;
			if (taskId) {
				// Показываем файл как строку с прогрессом; реальная строка появится после завершения обработки
				trackUpload(taskId, file.name);
			} else {
				// На случай ответа без task_id — просто обновляем список
				refetch();
			}
		},
		[trigger_dataAddFile, activeFolderName, data_getUserId, buildEmbeddings, trackUpload, refetch],
	);

	const onClick = async (file, button) => {
		console.log('сработало');
		if (button === 'edit') {
			addText_PopupInFolder({
				title: 'Редактирование файла',
				name_file: file,
			});

			toggle_PopupInFolder('');
		} else if (button === 'delete') {
			// const dataForRequest = {
			// 	isFolder: false,
			// 	name: '',
			// };

			addTitle_PopupDelete({
				folder: file,
				title: 'Файл',
				processed: isDataSetPath ? true : false,
			});

			SetPopupDelete(true);
		} else {
			const convertDirectory = isDataSetPath
					? 'projector_files_directory'
					: 'json_files_directory';
			// Выполняем запрос
			const response = await trigger_fileLoad({
				user: data_getUserId,
				directory: convertDirectory,
				folder_name: activeFolderName,
				file_name: file,
				responseType: 'blob', // Указываем тип ответа
			});

			if (response.data) {
				// Определяем имя файла
				const fileName =
					convertDirectory === 'json_files_directory' ? `${file}.json` : file;
				try {
					// Создаем ссылку для скачивания файла
					const url = window.URL.createObjectURL(response.data); // data должна быть Blob
					const a = document.createElement('a');
					a.href = url;
					a.download = fileName; // Имя файла для скачивания
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url); // Освобождаем память
				} catch (error) {
					console.error('Ошибка при создании ссылки для скачивания:', error);
				}
			} else if (isError_fileLoad) {
				console.error('Ошибка при загрузке файла');
			}
		}
	};

	const handleDragOver = event => {
		event.preventDefault();
		setDragging(true);
	};

	const handleDragLeave = () => {
		setDragging(false);
	};

	const handleDrop = async event => {
		event.preventDefault();
		setDragging(false);

		const droppedFiles = event.dataTransfer.files;

		if (droppedFiles.length) {
			await uploadFile(droppedFiles[0]);
		}
	};

	const handleFileChange = async event => {
		const selectedFile = event.target.files[0];
		if (selectedFile) {
			await uploadFile(selectedFile);
		}
	};

	const handlePageChange = page => {
		setCurrentPage(page);
	};

	const handleInputChange = event => {
		setFilterText(event.target.value);
	};

	return {
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
	};
};
