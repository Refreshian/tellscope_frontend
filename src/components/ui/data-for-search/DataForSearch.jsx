import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import { truncateDescription } from '@/utils/editText';

import useClickOutside from '../../../hooks/useClickOutside';
import { truncateMiddle } from '../../../utils/editText';

import styles from './DataForSearch.module.scss';

const DataForSearch = ({ multi, directory, style }) => {
	const find_directory =
		directory === 'bertopic'
			? 'bertopic_files_directory'
			: 'json_files_directory';
	const [isViewOptions, setViewOptions] = useState(false);
	const { [find_directory]: dataUser } = useSelector(
		store => store.dataUsersSlice,
	);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { addIndex, addThemesInd, addIndexDoc_Ai, addNameIndexFile } =
		useActions();
	const [checkedState, setCheckedState] = useState({});
	const wrapperRef = useClickOutside(() => setViewOptions(false));

	const arrayData =
		dataUser && Object.keys(dataUser).length > 0 ? dataUser : {};

	useEffect(() => {
		// Обновляем состояние чекбоксов на основе обновленного состояния Redux
		const newCheckedState = {};

		Object.keys(arrayData).forEach(group => {
			arrayData[group].forEach(base => {
				let isChecked = dataForRequest.themes_ind.includes(base.index_number);
				newCheckedState[base.index_number] = isChecked;
			});
		});
		setCheckedState(newCheckedState);
	}, [dataForRequest.themes_ind, dataUser]);

	const onClick = option => {
		if (multi) {
			addThemesInd(option.index_number);
		} else {
			addIndex(option.index_number);
			setViewOptions(!isViewOptions);

			if (directory === 'bertopic') {
				addIndexDoc_Ai(option.index_number);
				///test
				addNameIndexFile(option['model-file']);
			}
		}
	};

	const findTargetFileMulti =
		dataForRequest.themes_ind.length > 0
			? Object.values(arrayData)
					.flat()
					.find(file => dataForRequest.themes_ind.includes(file.index_number))
			: undefined;
	const findTargetFileMultiDouble =
		dataForRequest.themes_ind.length === 2
			? Object.values(arrayData)
					.flat()
					.filter(
						el =>
							el.index_number === dataForRequest.themes_ind[0] ||
							el.index_number === dataForRequest.themes_ind[1],
					)
			: undefined;

	const findTargetFile =
		dataForRequest.index !== undefined
			? Object.values(arrayData)
					.flat()
					.find(file => file.index_number === dataForRequest.index)
			: undefined;

	const nameFile = multi
		? findTargetFileMultiDouble
			? `${truncateDescription(findTargetFileMultiDouble[0]?.file || '', 15)} - ${truncateDescription(findTargetFileMultiDouble[1]?.file || '', 15)}`
			: findTargetFileMulti?.file || ''
		: findTargetFile?.file || findTargetFile?.['html-file'] || '';

	const numLength = multi ? 26 : 30;

	return (
		<div className={styles.wrapper_data} ref={wrapperRef} style={style}>
			<div
				className={styles.block__data}
				onClick={() => setViewOptions(!isViewOptions)}
			>
				<div className={styles.block__description}>
					<h2>Выберите необходимую базу</h2>
					<p>
						{' '}
						{directory === 'bertopic'
							? nameFile
							: truncateDescription(nameFile, 30)}
					</p>
				</div>
				<img
					className={styles.data__arrow}
					src='/images/icons/arrow_for_search.svg'
					alt='arrow'
				/>
			</div>
			{isViewOptions && (
				<div className={styles.block__options}>
					{Object.keys(arrayData).map(group => {
						return (
							<div key={group} className={styles.group}>
								<h3 className={styles.groupTitle}>{group}</h3>
								{arrayData[group].map(option => (
									<div
										className={styles.option}
										key={option.file || option['html-file']}
										onClick={() => onClick(option)}
									>
										{multi && (
											<input
												type='checkbox'
												checked={checkedState[option.index_number] || false}
												onChange={e => e.preventDefault()}
											/>
										)}
										<p>
											{directory === 'bertopic'
												? option.file || option['html-file']
												: truncateMiddle(
														option.file || option['html-file'],
														numLength,
													)}
										</p>
									</div>
								))}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default DataForSearch;
