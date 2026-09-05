import { useState } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import {
	useDeleteFileMutation,
	useDeleteFolderMutation,
} from '../../../services/dataSet.service';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../services/other.service';

import styles from './PopupDelete.module.scss';

const PopupDelete = () => {
	const {
		SetPopupDelete,
		addButtonTarget_PopupDelete,
		deleteProcessedFolder,
		deleteFolder,
		deleteProcessedDataFolder,
		deleteDataFolder,
	} = useActions();
	const { title, folder, isProcessed, buttonTarget } = useSelector(
		state => state.popupDelete,
	);
	const { data: targetData, allData } = useSelector(
		state => state.folderTarget,
	);
	const [
		trigger_deleteFolder,
		{ data: data_dataDeleteFolder, isSuccess: isSuccess_dataDeleteFolder },
	] = useDeleteFolderMutation();
	const [
		trigger_deleteFile,
		{ data: data_dataDeleteFile, isSuccess: isSuccess_dataDeleteFile },
	] = useDeleteFileMutation();
	const {
		data: data_getUserId,
		isError: isError_getUserId,
		error: error_getUserId,
		isLoading: isLoading_getUserId,
	} = useGetUserIdQuery();
	const { refetch, data, isError, error, isLoading, isSuccess } =
		useGetUserFoldersQuery(data_getUserId);

	const [delErr, setDelErr] = useState('');

	// const onClick = button => {
	// 	if (button === 'stop') {
	// 		// toggle_PopupDelete('');
	// 		SetPopupDelete(false);
	// 	} else {
	// 		const data = {
	// 			isFolder: title === 'Папка' ? true : false,
	// 			name: folder,
	// 			base_files:
	// 				buttonTarget === 'Файлы кластеризации авторов' ? false : true,
	// 		};
	// 		if (title === 'Папка') {
	// 			// trigger_dataDelete(null, data);
	// 			trigger_dataDelete({
	// 				folder_name: folder,
	// 				file_name: null,
	// 				base_files: data.base_files,
	// 			});

	// 			if (buttonTarget === 'Файлы кластеризации авторов') {
	// 				deleteProcessedFolder({
	// 					name_folder: folder,
	// 				});
	// 			} else {
	// 				deleteFolder({
	// 					name_folder: folder,
	// 				});
	// 			}
	// 		} else {
	// 			// trigger_dataDelete(folder, data);
	// 			trigger_dataDelete({
	// 				folder_name: targetData.name,
	// 				file_name: folder,
	// 				base_files: data.base_files,
	// 			});

	// 			if (isProcessed) {
	// 				deleteProcessedDataFolder({
	// 					name_folder: targetData.name,
	// 					name_file: folder,
	// 				});
	// 			} else {
	// 				// console.log('targetData, folder', targetData, folder);

	// 				deleteDataFolder({
	// 					name_folder: targetData.name,
	// 					name_file: folder,
	// 				});
	// 			}
	// 		}
	// 		// toggle_PopupDelete('');
	// 		SetPopupDelete(false);

	// 		const timeoutId = setTimeout(() => {
	// 			addButtonTarget_PopupDelete('');
	// 		}, 3000);

	// 		return () => clearTimeout(timeoutId);
	// 	}
	// };

	const onClick = async action => {
		if (action !== 'delete') {
			SetPopupDelete(false);
			return;
		}
		if (!data_getUserId) {
			SetPopupDelete(false);
			return;
		}
		setDelErr('');
		const convertDirectory =
			buttonTarget === 'Файлы данных'
				? 'json_files_directory'
				: buttonTarget === 'Файлы кластеризации авторов'
					? 'projector_files_directory'
					: 'bertopic_files_directory';
		try {
			if (title === 'Папка') {
				await trigger_deleteFolder({
					user: data_getUserId,
					folder_name: folder,
					directory: convertDirectory,
				}).unwrap();
			} else {
				await trigger_deleteFile({
					user: data_getUserId,
					folder_name: targetData,
					directory: convertDirectory,
					file_name: !folder ? folder : folder.file,
				}).unwrap();
			}
			if (buttonTarget === 'Файлы кластеризации авторов' && title === 'Папка') {
				deleteProcessedFolder({ name_folder: folder });
			}
		} catch (errDel) {
			console.error('Ошибка удаления:', errDel);
			setDelErr((errDel && errDel.message) ? String(errDel.message).slice(0, 200) : 'Не удалось удалить. Попробуйте ещё раз.');
			return;
		}
		try {
			await refetch();
		} catch (e) {}
		SetPopupDelete(false);
	};

	return (
		<div className={styles.block__popupDelete}>
			{delErr ? (
				<p style={{ color: '#c53030', maxWidth: 320 }}>{delErr}</p>
			) : (
				<p>{title === 'Папка' ? `Удалить папку «${folder}»?` : `Удалить файл «${folder}»?`}</p>
			)}
			<button className={styles.button__stop} onClick={() => onClick('close')}>
				Отмена
			</button>
			{!delErr && (
				<button
					className={styles.button__close}
					style={{ background: '#c53030', color: '#fff', border: 0, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
					onClick={() => onClick('delete')}
				>
					Удалить
				</button>
			)}
		</div>
	);
};

export default PopupDelete;
