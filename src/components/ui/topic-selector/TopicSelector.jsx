import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useActions } from '@/hooks/useActions';
import useClickOutside from '../../../hooks/useClickOutside';
import { truncateDescription } from '@/utils/editText';
import styles from './TopicSelector.module.scss';

const TopicSelector = ({ multi = true, style }) => {
	const [isViewOptions, setViewOptions] = useState(false);
	const { json_files_directory } = useSelector(store => store.dataUsersSlice);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { addThemesInd } = useActions();
	const [checkedState, setCheckedState] = useState({});
	const wrapperRef = useClickOutside(() => setViewOptions(false));

	// Получаем все файлы из всех групп в плоском массиве
	const allFiles = json_files_directory 
		? Object.values(json_files_directory).flat() 
		: [];

	useEffect(() => {
		// Обновляем состояние чекбоксов
		const newCheckedState = {};
		allFiles.forEach(file => {
			newCheckedState[file.index_number] = dataForRequest.themes_ind.includes(file.index_number);
		});
		setCheckedState(newCheckedState);
	}, [dataForRequest.themes_ind, json_files_directory]);

	const onClick = (file) => {
		if (multi) {
			addThemesInd(file.index_number);
		}
	};

	// Получаем названия выбранных файлов для отображения
	const getSelectedFilesDisplay = () => {
		const selectedFiles = allFiles.filter(file => 
			dataForRequest.themes_ind.includes(file.index_number)
		);
		
		if (selectedFiles.length === 0) {
			return 'Выберите темы для анализа';
		}
		
		if (selectedFiles.length === 1) {
			return truncateDescription(selectedFiles[0].file || selectedFiles[0]['html-file'], 30);
		}
		
		if (selectedFiles.length === 2) {
			return `${truncateDescription(selectedFiles[0].file || selectedFiles[0]['html-file'], 15)} + ${truncateDescription(selectedFiles[1].file || selectedFiles[1]['html-file'], 15)}`;
		}
		
		return `Выбрано ${selectedFiles.length} ${selectedFiles.length > 4 ? 'тем' : 'темы'}`;
	};

	return (
		<div className={styles.wrapper_data} ref={wrapperRef} style={style}>
			<div
				className={styles.block__data}
				onClick={() => setViewOptions(!isViewOptions)}
			>
				<div className={styles.block__description}>
					<h2>Темы для анализа</h2>
					<p>{getSelectedFilesDisplay()}</p>
				</div>
				<img
					className={`${styles.data__arrow} ${isViewOptions ? styles.rotated : ''}`}
					src='/images/icons/arrow_for_search.svg'
					alt='arrow'
				/>
			</div>
			{isViewOptions && (
				<div className={styles.block__options}>
					<div className={styles.options_list}>
						{allFiles.map(file => (
							<div
								className={styles.option}
								key={file.index_number}
								onClick={() => onClick(file)}
							>
								<input
									type='checkbox'
									checked={checkedState[file.index_number] || false}
									onChange={e => e.preventDefault()}
								/>
								<p title={file.file || file['html-file']}>
									{truncateDescription(file.file || file['html-file'], 40)}
								</p>
							</div>
						))}
						{allFiles.length === 0 && (
							<div className={styles.no_options}>
								Нет доступных тем
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default TopicSelector;