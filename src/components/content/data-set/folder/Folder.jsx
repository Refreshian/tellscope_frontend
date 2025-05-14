import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useActions } from '@/hooks/useActions';

import { downloadJSON } from '@/utils/downloadData';

import styles from './Folder.module.scss';
import { useLazyFileLoadQuery } from '@/services/dataSet.service';

const Folder = ({ folder, processedFolder, buttonTarget }) => {
	const { data: targetData } = useSelector(state => state.folderTarget);
	const navigate = useNavigate();
	const [isViewButtons, setIsViewButtons] = useState(false);
	const {
		title,
		folder: folderName,
		isPopupDelete,
	} = useSelector(state => state.popupDelete);
	const { addTargetFolder, addTitle_PopupDelete, SetPopupDelete } =
		useActions();

	const [
		trigger_fileLoad,
		{
			data: data_fileLoad,
			isSuccess: isSuccess_fileLoad,
			isLoading: isLoading_fileLoad,
		},
	] = useLazyFileLoadQuery();

	// const handleClick = () => {
	// 	addTargetFolder(folder);
	// 	if (buttonTarget === 'Файлы данных') {
	// 		navigate(`/data-set/${folder.name}`);
	// 	} else if (buttonTarget === 'Файлы кластеризации авторов') {
	// 		navigate(`/data-set/processed/${folder.name}`);
	// 	}
	// };

	const handleClick = () => {
		addTargetFolder(folder);
		if (buttonTarget === 'Файлы данных') {
			navigate(`/data-set/${folder}`);
		} else if (buttonTarget === 'Файлы кластеризации авторов') {
			navigate(`/data-set/processed/${folder}`);
		}
	};

	const onClick = () => {
		const data = {
			isFolder: true,
			name: folder,
		};

		addTitle_PopupDelete({
			folder: folder,
			title: 'Папка',
		});

		// toggle_PopupDelete('');
		SetPopupDelete(true);
	};

	const onClickProcessed = async action => {
		if (action === 'delete') {
			const data = {
				isFolder: true,
				name: folder.name,
			};

			addTitle_PopupDelete({ folder: folder.name, title: 'Папка' });

			// toggle_PopupDelete('');
			SetPopupDelete(true);
		} else {
			trigger_fileLoad({
				folder_name: targetData.name,
				file_name: null,
			});
			downloadJSON(data_fileLoad, targetData.name);
		}
	};

	const viewStyle = {
		display: isPopupDelete && folderName === folder.name ? 'none' : 'block',
	};

	return (
		<div className={styles.block__folder} style={viewStyle}>
			<img
				src='/images/folder.png'
				alt='folder'
				className={styles.folder}
				onClick={handleClick}
			/>
			<div className={styles.data}>
				<h3 className={styles.title}>{folder}</h3>
				{/* {processedFolder ? (
					<button
						className={`${styles.button__delete} ${
							processedFolder ? styles.processed : ''
						}`}
						onClick={() => {
							addTargetFolder(folder);
							setIsViewButtons(!isViewButtons);
						}}
					>
						<img
							className={styles.delete}
							src='/images/icons/settings_for_download_graph.svg'
							alt='delete'
						/>
					</button>
				) : ( */}
				<button className={styles.button__delete} onClick={onClick}>
					<img
						className={styles.delete}
						src='/images/icons/setting/delete.svg'
						alt='delete'
					/>
				</button>
				{/* )} */}
				{isViewButtons && (
					<div className={styles.block__buttons}>
						<button
							className={styles.button__download}
							onClick={() => onClickProcessed('upload')}
						>
							<img
								className={styles.download}
								src='/images/icons/setting/upload.svg'
								alt='upload'
							/>
							Скачать
						</button>
						<button
							className={styles.button__delete}
							onClick={() => onClickProcessed('delete')}
						>
							<img
								className={styles.delete}
								src='/images/icons/setting/delete.svg'
								alt='delete'
							/>
							Удалить
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default Folder;
