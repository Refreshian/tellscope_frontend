import { useState } from 'react';
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
	const { data } = useSelector(state => state.folderTarget);
	const { buttonTarget } = useSelector(state => state.popupDelete);
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
			const convertDirectory =
				buttonTarget === 'Файлы данных'
					? 'json_files_directory'
					: buttonTarget === 'Файлы кластеризации авторов'
						? 'projector_files_directory'
						: 'bertopic_files_directory';
			// Выполняем запрос
			const response = await trigger_fileLoad({
				user: data_getUserId,
				directory: convertDirectory,
				folder_name: data,
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
			const formData = {
				uploaded_file: droppedFiles[0],
			};
			await trigger_dataAddFile({
				data: formData,
				name: data,
				fileName: droppedFiles[0].name,
				user: data_getUserId,
			}).unwrap();
			refetch();
		}
	};

	const handleFileChange = async event => {
		const selectedFile = event.target.files[0];
		if (selectedFile) {
			const formData = {
				uploaded_file: selectedFile,
			};
			await trigger_dataAddFile({
				data: formData,
				name: data,
				fileName: selectedFile.name,
				user: data_getUserId,
			}).unwrap();
			refetch();
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
	};
};
