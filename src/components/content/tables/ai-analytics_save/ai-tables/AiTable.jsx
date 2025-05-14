import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '../../../../../hooks/useActions';
import { truncateDescription } from '../../../../../utils/editText';
import { convertUnixTimestampToDate } from '../../../../../utils/timestamp';
import Categories from '../../../../ui/categories/Categories';

import styles from './AiTables.module.scss';

const AiTable = () => {
	const { get, categories } = useSelector(state => state.aiData);
	const { texts_ids } = useSelector(state => state.dataForRequest);

	const data = useMemo(() => get, [get]);
	const [valueCategories, setValueCategories] = useState('');
	const [draggedData, setDraggedData] = useState(null);

	const {
		addObject_aiData,
		addCategories_aiData,
		addTextsIds,
		deleteTextsIds,
		addText_popupNormal,
		toggle_popupNormal,
		deleteAllTextsIds,
		addAllTextsIds,
	} = useActions();

	const columns = useMemo(
		() => [
			{
				id: 'Чекбокс',
				header: 'Чекбокс',
			},
			{
				id: 'Текст',
				header: 'Текст',
				accessorKey: 'text',
			},
			{
				id: 'Источник',
				header: 'Источник',
				accessorKey: 'hub',
				cell: ({ row }) => {
					const { url, hub } = row.original;
					return url ? (
						<a href={url} target='_blank' rel='noopener noreferrer'>
							{hub}
						</a>
					) : (
						hub
					);
				},
			},
			{
				id: 'Аудитория',
				header: 'Аудитория',
				accessorKey: 'audienceCount',
			},
			{
				id: 'Комментариев',
				header: 'Комментариев',
				accessorKey: 'commentsCount',
			},
			{
				id: 'Вовлеченность',
				header: 'Вовлеченность',
				accessorKey: 'er',
			},
		],
		[],
	);

	const [columnVisibility, setColumnVisibility] = useState({});
	const [sorting, setSorting] = useState([]);
	const [filtering, setFiltering] = useState('');
	const countTableElemSize = [10, 15, 20];

	const tableInstance = useReactTable({
		columns,
		data,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: {
			sorting: sorting,
			globalFilter: filtering,
			columnVisibility: columnVisibility,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setFiltering,
		onColumnVisibilityChange: setColumnVisibility,
	});

	const pageIndex = tableInstance.getState().pagination.pageIndex;
	const pageCount = tableInstance.getPageCount();

	const visiblePages = () => {
		if (pageCount <= 5) {
			return Array.from({ length: pageCount }, (_, i) => i + 1);
		}
		if (pageIndex < 4) {
			return [1, 2, 3, 4, '...', pageCount];
		}
		if (pageIndex >= 4 && pageIndex < pageCount - 4) {
			return [
				1,
				'...',
				pageIndex,
				pageIndex + 1,
				pageIndex + 2,
				'...',
				pageCount,
			];
		}
		return [1, '...', pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
	};

	const handleDragStart = data => {
		setDraggedData(data);
	};

	const handleDrop = event => {
		event.preventDefault();

		if (draggedData) {
			const buttonText = event.target.innerText; // Получаем текст кнопки
			const payload = {
				text: buttonText,
				data: draggedData,
			};

			addObject_aiData(payload); // Добавляем данные в массив кнопки
			setDraggedData(null); // Сбрасываем перетаскиваемые данные
		}
	};

	const addNewData = event => {
		const target = event.target.innerText;
	};

	return (
		<div className={styles.wrapper_table}>
			<div className={styles.table__header}>
				<div className={styles.header__topBlock}>
					<div className={styles.block__globalFilter}>
						<img src='/images/icons/input_button/search.svg' alt='search' />
						<input
							type='text'
							value={filtering}
							onChange={e => setFiltering(e.target.value)}
							placeholder='Поиск'
						/>
					</div>
					<div className={styles.block__categories}>
						<input
							type='text'
							value={valueCategories}
							onChange={e => setValueCategories(e.target.value)}
							placeholder='Название тематики'
						/>

						<button
							onClick={() => {
								if (valueCategories !== '') {
									addCategories_aiData(valueCategories);
									setValueCategories('');
								}
							}}
						>
							Добавить тематику
						</button>
					</div>
				</div>
				<div className={styles.block__hiddenColumns}>
					<label>
						<input
							{...{
								type: 'checkbox',
								checked: tableInstance.getIsAllColumnsVisible(),
								onChange: tableInstance.getToggleAllColumnsVisibilityHandler(),
							}}
						/>
						Все колонки
					</label>
					{tableInstance.getAllColumns().map(column => (
						<label key={column.id}>
							<input
								{...{
									type: 'checkbox',
									checked: column.getIsVisible(),
									onChange: column.getToggleVisibilityHandler(),
								}}
							/>
							{column.id}
						</label>
					))}
				</div>
			</div>
			<table>
				<thead>
					{tableInstance.getHeaderGroups().map(headerEl => {
						return (
							<tr key={headerEl.id}>
								{headerEl.headers.map(columnEl => (
									<th
										key={columnEl.id}
										colSpan={columnEl.colSpan}
										onClick={columnEl.column.getToggleSortingHandler()}
									>
										{flexRender(
											columnEl.column.columnDef.header,
											columnEl.getContext(),
										)}
										{
											{
												asc: ' \u2227',
												desc: ' \u2228',
											}[columnEl.column.getIsSorted() ?? null]
										}
									</th>
								))}
							</tr>
						);
					})}
				</thead>
				<tbody>
					{Object.keys(categories).map(themes => {
						console.log(themes, categories);
						return (
							<Categories
								key={Math.random()}
								themes={themes}
								categories={categories}
								addNewData={addNewData}
								handleDrop={handleDrop}
							/>
						);
					})}

					{tableInstance.getRowModel().rows.map(rowEl => (
						<tr
							key={rowEl.id}
							draggable
							onDragStart={() => handleDragStart(rowEl.original)}
						>
							{rowEl.getVisibleCells().map(cellEl => {
								if (cellEl.column.id === 'Чекбокс') {
									return (
										<td
											key={cellEl.id}
											style={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												height: '100%',
											}}
										>
											<input
												className={styles.input__checkbox}
												type='checkbox'
												checked={texts_ids.some(
													elem => elem === rowEl.original.id,
												)}
												onChange={e => {
													console.log(
														e.target.checked,
														texts_ids,
														texts_ids.some(elem => elem === rowEl.original.id),
													);
													if (e.target.checked) {
														addTextsIds(rowEl.original.id);
													} else {
														deleteTextsIds(rowEl.original.id);
													}
												}}
											/>
										</td>
									);
								} else if (cellEl.column.id === 'Текст') {
									return (
										<td
											key={cellEl.id}
											onClick={() => {
												addText_popupNormal({
													description: rowEl.original.text,
													link: rowEl.original.url,
													time: convertUnixTimestampToDate(
														rowEl.original.timeCreate,
													),
												});
												toggle_popupNormal('');
											}}
											style={{ cursor: 'pointer' }}
										>
											{truncateDescription(rowEl.original.text, 150)}
										</td>
									);
								} else {
									return (
										<td key={cellEl.id}>
											{flexRender(
												cellEl.column.columnDef.cell,
												cellEl.getContext(),
											)}
										</td>
									);
								}
							})}
						</tr>
					))}
				</tbody>
			</table>
			<div className={styles.block__allInput}>
				<input
					className={styles.input__checkbox}
					type='checkbox'
					checked={texts_ids.length === get.length}
					onChange={() => {
						if (texts_ids.length === get.length) {
							deleteAllTextsIds('');
						} else {
							addAllTextsIds(get);
						}
					}}
				/>
				<p className={styles.allInput__paragraph}>Выбрать все</p>
			</div>

			<div className={styles.block__bottom}>
				<div className={styles.block__select}>
					<span>Строк на странице</span>
					<select
						className={styles.select}
						value={tableInstance.options.state.pagination.pageSize}
						onChange={e => tableInstance.setPageSize(e.target.value)}
					>
						{countTableElemSize.map(pageSize => (
							<option key={pageSize} value={pageSize}>
								{pageSize}
							</option>
						))}
					</select>
				</div>
				<div className={styles.block__pagination}>
					<button
						onClick={() => tableInstance.previousPage()}
						disabled={!tableInstance.getCanPreviousPage()}
						className={styles.arrow__button}
					>
						{'<'}
					</button>

					{visiblePages().map((page, idx) =>
						page === '...' ? (
							<span key={idx}>...</span>
						) : (
							<button
								key={idx}
								onClick={() => tableInstance.setPageIndex(page - 1)}
								className={
									pageIndex + 1 === page
										? ` ${styles.page} ${styles.activePage}`
										: styles.page
								}
							>
								{page}
							</button>
						),
					)}

					<button
						onClick={() => tableInstance.nextPage()}
						disabled={!tableInstance.getCanNextPage()}
						className={styles.arrow__button}
					>
						{'>'}
					</button>
				</div>
				<div className={styles.block__input_page}>
					<p className={styles.block__pagination}>Номер страницы</p>
					<input
						type='text'
						defaultValue={tableInstance.options.state.pagination.pageIndex}
						onChange={e => tableInstance.setPageIndex(e.target.value)}
					/>
				</div>
			</div>
		</div>
	);
};

export default AiTable;
