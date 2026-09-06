import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';

import { useActions } from '@/hooks/useActions';
import { truncateDescription } from '@/utils/editText';
import useClickOutside from '../../../hooks/useClickOutside';

import styles from './TopicSelectorWithDelete.module.scss';

const TopicSelectorWithDelete = ({ multi = true, style, onDeleteRequest }) => {
	const [isViewOptions, setViewOptions] = useState(false);
	const [collections, setCollections] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [query, setQuery] = useState('');
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { addThemesInd } = useActions();
	const [checkedState, setCheckedState] = useState({});

	const closeOptions = () => {
		setViewOptions(false);
		setQuery('');
	};

	const wrapperRef = useClickOutside(() => {
		closeOptions();
	});

	const loadCollections = async () => {
		setIsLoading(true);
		try {
			const response = await axios.get('/api/qdrant/collections');
			const collectionsData = response.data.collections || [];
			setCollections(
				collectionsData.map((collection, index) => ({
					...collection,
					index_number: index,
				})),
			);
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
		const next = {};
		collections.forEach(collection => {
			next[collection.index_number] = dataForRequest.themes_ind.includes(
				collection.index_number,
			);
		});
		setCheckedState(next);
	}, [dataForRequest.themes_ind, collections]);

	const selectedCollections = useMemo(
		() =>
			collections.filter(collection =>
				dataForRequest.themes_ind.includes(collection.index_number),
			),
		[collections, dataForRequest.themes_ind],
	);

	const filteredCollections = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return collections;
		return collections.filter(collection =>
			String(collection.name || '')
				.toLowerCase()
				.includes(needle),
		);
	}, [collections, query]);

	const handleSelect = indexNumber => {
		if (multi) addThemesInd(indexNumber);
		closeOptions();
	};

	const getSelectedCollectionsDisplay = () => {
		if (selectedCollections.length === 0) return 'Выберите тему';
		if (selectedCollections.length === 1) {
			return truncateDescription(selectedCollections[0].name, 32);
		}
		return `${selectedCollections.length} выбрано`;
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
					src="/images/icons/arrow_for_search.svg"
					alt=""
				/>
			</div>

			{selectedCollections.length > 0 && (
				<div className={styles.selectedRow}>
					{selectedCollections.map(collection => (
						<span key={collection.index_number} className={styles.chip}>
							{truncateDescription(collection.name, 28)}
							<button
								type="button"
								className={styles.chipRemove}
								onClick={e => {
									e.stopPropagation();
									handleSelect(collection.index_number);
								}}
								title="Снять выбор"
							>
								×
							</button>
						</span>
					))}
				</div>
			)}

			{isViewOptions && (
				<div className={styles.block__options} onClick={e => e.stopPropagation()}>
					<input
						className={styles.search}
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder="Поиск по названию"
						autoFocus
					/>
					{isLoading ? (
						<div className={styles.loading}>Загрузка…</div>
					) : (
						<div className={styles.options_list}>
							{filteredCollections.map(collection => (
								<div className={styles.option} key={collection.index_number}>
									<div
										className={styles.option__content}
										onClick={() => handleSelect(collection.index_number)}
									>
										<input
											type="checkbox"
											checked={checkedState[collection.index_number] || false}
											onChange={() => {}}
										/>
										<p title={collection.name}>
											{truncateDescription(collection.name, 34)}
										</p>
										<span className={styles.option__meta}>
											{Number(collection.points_count || 0).toLocaleString('ru-RU')}
										</span>
									</div>
									<button
										type="button"
										className={styles.delete__button}
										onClick={e => {
											e.stopPropagation();
											if (onDeleteRequest) onDeleteRequest(collection);
										}}
										title="Удалить коллекцию"
									>
										×
									</button>
								</div>
							))}
							{filteredCollections.length === 0 && (
								<div className={styles.no_options}>
									{collections.length === 0
										? 'Нет доступных коллекций'
										: 'Ничего не найдено'}
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
