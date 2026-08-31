import { useCallback, useEffect, useMemo, useState } from 'react';

import { useActions } from '@/hooks/useActions';

import { truncateDescription } from '@/utils/editText';
import { generateCalc, generateCalcString } from '@/utils/styles';
import { convertUnixTimestampToDate } from '@/utils/timestamp';

import styles from './Categories.module.scss';

const Categories = ({ themes, addNewData, handleDrop, categories, table }) => {
	const [isViewData, setIsViewData] = useState(false);
	const [isEditName, setIsEditName] = useState(false);
	const [newName, setNewName] = useState(themes);
	const {
		deleteCategoryArray_aiData,
		deleteCategoryArray_topicAnalysisData,
		updateCategoryArray_aiData,
		updateCategoryArray_topicAnalysisData,
		toggle_popupNormal,
		addText_popupNormal,
	} = useActions();

	// Мемозированная функция для проверки наличия ключа
	const isKey = useCallback(
		(themes, categories) => {
			return categories.hasOwnProperty(themes);
		},
		[categories],
	);

	// Мемозированное значение высоты
	const heightStyle = useMemo(() => {
		return categories[themes].length === 0
			? {
					height: isViewData ? 'calc(125/1440*100vw)' : 'calc(56/1440*100vw)',
				}
			: {
					height: generateCalcString(categories[themes], isViewData),
				};
	}, [isViewData, categories, themes]);

	// Изменение имени
	const onChange = useCallback(e => {
		setNewName(e.target.value);
	}, []);

	// Удаление темы
	const deleteThemes = useCallback(() => {
		const deleteFunc =
			table === 'analysis'
				? deleteCategoryArray_topicAnalysisData
				: deleteCategoryArray_aiData;
		deleteFunc(themes);
	}, [table, themes]);

	// Эффект для обновления имени темы
	useEffect(() => {
		const updateFunc =
			table === 'analysis'
				? updateCategoryArray_topicAnalysisData
				: updateCategoryArray_aiData;
		if (!isEditName && newName !== themes) {
			updateFunc({
				oldName: themes,
				newName: newName,
				newArray: categories[themes],
			});
		}
	}, [isEditName, newName, themes, categories, table]);

	return (
		<tr className={styles.block__categories} style={heightStyle}>
			<td
				className={styles.categories}
				onDrop={handleDrop}
				onDragOver={e => e.preventDefault()}
				onClick={addNewData}
				style={{
					...heightStyle,
					alignItems: 'flex-start',
				}}
			>
				<div className={styles.block__name}>
					<img
						src={
							isViewData
								? '/images/icons/categories_arrow/arrow__off.svg'
								: '/images/icons/categories_arrow/arrow__on.svg'
						}
						alt='arrow'
						onClick={() => setIsViewData(!isViewData)}
					/>
					{isEditName ? (
						<input
							type='text'
							placeholder={themes}
							className={styles.input__name}
							onChange={onChange}
							value={newName}
						/>
					) : (
						<p className={styles.name}>{themes}</p>
					)}
				</div>
				<div className={styles.block__buttons}>
					<button
						className={styles.button}
						onClick={() => setIsEditName(!isEditName)}
					>
						<img src='/images/icons/setting/edit.svg' alt='edit' />
					</button>
					<button className={styles.button} onClick={deleteThemes}>
						<img src='/images/icons/setting/delete.svg' alt='delete' />
					</button>
				</div>
			</td>
			{isViewData && isKey(themes, categories) && (
				<>
					{categories[themes].length === 0 ? (
						<td className={styles.block__add}>
							<div className={styles.add__file}>
								<p className={styles.description}>
									Перетащите файл или выберите на компьютере
								</p>
							</div>
						</td>
					) : (
						categories[themes].map((elem, index) => (
							<td
								key={elem.id || index} // Убедись, что используется уникальный идентификатор
								className={
									table === 'analysis'
										? `${styles.categories__data}`
										: `${styles.categories__data} ${styles.ai}`
								}
								style={{ marginTop: generateCalc(index) }}
							>
								<p
									onClick={() => {
										if (table !== 'analysis') {
											addText_popupNormal({
												description: elem.text,
												link: elem.url,
												time: convertUnixTimestampToDate(elem.timeCreate),
											});
											toggle_popupNormal('');
										}
									}}
									style={table === 'analysis' ? {} : { cursor: 'pointer' }}
								>
									{table === 'analysis'
										? truncateDescription(elem.description, 50)
										: truncateDescription(elem.text, 70)}
								</p>
								{table === 'analysis' ? (
									<p>{elem.count}</p>
								) : (
									<a href={elem.url}>{elem.hub}</a>
								)}
								<p>
									{table === 'analysis' ? elem.audience : elem.audienceCount}
								</p>
								<p>{table === 'analysis' ? elem.er : elem.commentsCount}</p>
								<p>{table === 'analysis' ? elem.viewsCount : elem.er}</p>
								{table === 'analysis' && (
									<p>{truncateDescription(elem.texts, 40)}</p>
								)}
							</td>
						))
					)}
				</>
			)}
		</tr>
	);
};

export default Categories;
