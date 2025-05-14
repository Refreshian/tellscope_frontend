import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import Pagination from '@/components/ui/pagination/Pagination';

import { useDataInFolder } from '../../../../../hooks/useDataInFolder';
import { useDataAddFileMutation } from '../../../../../services/dataSet.service';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../../../services/other.service';

import styles from './DataInFolder.module.scss';
import { useLazyFileLoadQuery } from '@/services/dataSet.service';

const DataInFolder = () => {
	const navigate = useNavigate();
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
	const { data, isError, error, isLoading, isSuccess } =
		useGetUserFoldersQuery(data_getUserId);

	const [currentPage, setCurrentPage] = useState(1);
	const filesPerPage = 9;

	const isDataSetPath = /^\/data-set(\/processed)\/[^/]+$/.test(
		location.pathname,
	);

	const renderFiles = (name_folder, allData) => {
		if (!name_folder || typeof name_folder === 'object' || !allData)
			return { json_files_directory: [] };
		if (isDataSetPath) {
			if (name_folder.trim() in allData.projector_files_directory) {
				return {
					json_files_directory: allData.projector_files_directory[name_folder],
				};
			} else {
				return { json_files_directory: [] };
			}
		} else {
			if (name_folder.trim() in allData.json_files_directory) {
				return {
					json_files_directory: allData.json_files_directory[name_folder],
				};
			} else {
				return { json_files_directory: [] };
			}
		}
	};

	const dynamicDirectoryFile = isDataSetPath
		? ['tsv-file', 'txt-file']
		: ['file'];

	const files = renderFiles(name_folder, data).json_files_directory.filter(
		file => {
			return dynamicDirectoryFile.some(
				key =>
					file[key] &&
					file[key].toLowerCase().includes(filterText.toLowerCase()),
			);
		},
	);

	const allFiles = renderFiles(name_folder, data).json_files_directory;

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
													className={styles.button__edit}
													onClick={() => onClick(file, 'edit')}
												>
													<img
														src='/images/icons/setting/edit.svg'
														alt='edit'
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
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default DataInFolder;
