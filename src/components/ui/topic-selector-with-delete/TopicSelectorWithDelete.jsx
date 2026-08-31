import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useActions } from '@/hooks/useActions';
import useClickOutside from '../../../hooks/useClickOutside';
import { truncateDescription } from '@/utils/editText';
import axios from 'axios';
import styles from './TopicSelectorWithDelete.module.scss';

const TopicSelectorWithDelete = ({ multi = true, style, onDeleteRequest }) => {
	const [isViewOptions, setViewOptions] = useState(false);
	const [collections, setCollections] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { addThemesInd, setThemesInd } = useActions();
	const [checkedState, setCheckedState] = useState({});
	const wrapperRef = useClickOutside(() => {
		setViewOptions(false);
	});

	// Загрузка коллекций из Qdrant
	const loadCollections = async () => {
		setIsLoading(true);
		try {
			const response = await axios.get('/api/qdrant/collections');
			const collectionsData = response.data.collections || [];
			
			// Добавляем index_number к каждой коллекции
			const collectionsWithIndex = collectionsData.map((collection, index) => ({
				...collection,
				index_number: index
			}));
			
			setCollections(collectionsWithIndex);
		} catch (error) {
			console.error('Ошибка загрузки коллекций:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadCollections();
	}, []);

	useEffect(() => {
		// Обновляем состояние чекбоксов на основе index_number
		const newCheckedState = {};
		collections.forEach((collection) => {
			newCheckedState[collection.index_number] = dataForRequest.themes_ind.includes(collection.index_number);
		});
		setCheckedState(newCheckedState);
	}, [dataForRequest.themes_ind, collections]);

	const handleSelect = (indexNumber) => {
		if (multi) {
			addThemesInd(indexNumber);
		}
	};

	const handleDelete = (collection) => {
		if (onDeleteRequest) {
			onDeleteRequest(collection);
		}
	};

	const getSelectedCollectionsDisplay = () => {
		const selectedCollections = collections.filter(collection => 
			dataForRequest.themes_ind.includes(collection.index_number)
		);
		
		if (selectedCollections.length === 0) {
			return 'Выберите тему';
		}
		
		if (selectedCollections.length === 1) {
			return truncateDescription(selectedCollections[0].name, 30);
		}
		
		if (selectedCollections.length === 2) {
			return `${truncateDescription(selectedCollections[0].name, 15)} + ${truncateDescription(selectedCollections[1].name, 15)}`;
		}
		
		return `Выбрано ${selectedCollections.length} ${selectedCollections.length > 4 ? 'тем' : 'темы'}`;
	};

	return (
		<div className={styles.wrapper_data} ref={wrapperRef} style={style}>
			<div
				className={styles.block__data}
				onClick={() => setViewOptions(!isViewOptions)}
			>
				<div className={styles.block__description}>
					<h2>Темы для анализа</h2>
					<p>{getSelectedCollectionsDisplay()}</p>
				</div>
				<img
					className={`${styles.data__arrow} ${isViewOptions ? styles.rotated : ''}`}
					src='/images/icons/arrow_for_search.svg'
					alt='arrow'
				/>
			</div>
			{isViewOptions && (
				<div className={styles.block__options}>
					{isLoading ? (
						<div className={styles.loading}>Загрузка коллекций...</div>
					) : (
						<div className={styles.options_list}>
							{collections.map((collection) => (
								<div
									className={styles.option}
									key={collection.index_number}
								>
									<div 
										className={styles.option__content}
										onClick={() => handleSelect(collection.index_number)}
									>
										<input
											type='checkbox'
											checked={checkedState[collection.index_number] || false}
											onChange={() => {}}
										/>
										<div className={styles.option__info}>
											<p title={collection.name}>
												{truncateDescription(collection.name, 35)}
											</p>
											<span className={styles.option__meta}>
												{collection.points_count} сообщений
											</span>
										</div>
									</div>
									<button
										className={styles.delete__button}
										onClick={(e) => {
											e.stopPropagation();
											handleDelete(collection);
										}}
										title='Удалить коллекцию'
									>
										×
									</button>
								</div>
							))}
							{collections.length === 0 && (
								<div className={styles.no_options}>
									Нет доступных коллекций в Qdrant
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default TopicSelectorWithDelete;