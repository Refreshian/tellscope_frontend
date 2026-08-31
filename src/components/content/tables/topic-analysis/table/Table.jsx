import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Categories from '@/components/ui/categories/Categories';

import { useActions } from '@/hooks/useActions';

import styles from './Table.module.scss';

const Table = () => {
	const { values, categories } = useSelector(state => state.topicAnalysisData);
	const {
		addObject_topicAnalysisData,
		addThemesData_topicAnalysisData,
		addCategories_topicAnalysisData,
	} = useActions();
	const [valueCategories, setValueCategories] = useState('');
	const [draggedData, setDraggedData] = useState(null);

	const columns = useMemo(
		() => [
			{ id: 'Тематика', header: 'Тематика', accessorKey: 'description' },
			{ id: 'Количество', header: 'Количество', accessorKey: 'count' },
			{ id: 'Аудитория', header: 'Аудитория', accessorKey: 'audience' },
			{ id: 'Вовлеченность', header: 'Вовлеченность', accessorKey: 'er' },
			{ id: 'Просмотров', header: 'Просмотров', accessorKey: 'viewsCount' },
			{ id: 'Текст', header: 'Текст', accessorKey: 'texts' },
		],
		[],
	);

	const [columnVisibility, setColumnVisibility] = useState({});
	const [sorting, setSorting] = useState([]);
	const [filtering, setFiltering] = useState('');

	const countTableElemSize = useMemo(() => [10, 15, 20], []);

	const tableInstance = useReactTable({
		columns,
		data: values,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: { sorting, globalFilter: filtering, columnVisibility },
		onSortingChange: setSorting,
		onGlobalFilterChange: setFiltering,
		onColumnVisibilityChange: setColumnVisibility,
	});

	const visiblePages = useMemo(() => {
		const pageIndex = tableInstance.getState().pagination.pageIndex;
		const pageCount = tableInstance.getPageCount();

		if (pageCount <= 5)
			return Array.from({ length: pageCount }, (_, i) => i + 1);
		if (pageIndex < 4) return [1, 2, 3, 4, '...', pageCount];
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
	}, [tableInstance]);

	const handleDragStart = useCallback(data => {
		setDraggedData(data);
	}, []);

	const handleDrop = useCallback(
		event => {
			event.preventDefault();
			if (draggedData) {
				const buttonText = event.target.innerText;
				addObject_topicAnalysisData({ text: buttonText, data: draggedData });
				setDraggedData(null);
			}
		},
		[draggedData],
	);

	const addNewData = useCallback(
		event => {
			const target = event.target.innerText;
		},
		[categories],
	);

	return (
		<div className={styles.wrapper_table}>
			<div className={styles.table__header}>
				<div className={styles.header__topBlock}>
					<div className={styles.block__globalFilter}>
						<img src='../images/icons/input_button/search.svg' alt='search' />
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
									addCategories_topicAnalysisData(valueCategories);
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
					{tableInstance.getHeaderGroups().map(headerEl => (
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
									{columnEl.column.getIsSorted() === 'asc'
										? ' \u2227'
										: columnEl.column.getIsSorted() === 'desc'
											? ' \u2228'
											: ''}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{Object.keys(categories).map(themes => (
						<Categories
							key={themes}
							themes={themes}
							categories={categories}
							addNewData={addNewData}
							handleDrop={handleDrop}
							table='analysis'
						/>
					))}

					{tableInstance.getRowModel().rows.map(rowEl => (
						<tr
							key={rowEl.id}
							draggable
							onDragStart={() => handleDragStart(rowEl.original)}
						>
							{rowEl.getVisibleCells().map(cellEl => (
								<td key={cellEl.id}>
									{flexRender(
										cellEl.column.columnDef.cell,
										cellEl.getContext(),
									)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>

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

					{visiblePages.map((page, idx) =>
						page === '...' ? (
							<span key={idx}>...</span>
						) : (
							<button
								key={idx}
								onClick={() => tableInstance.setPageIndex(page - 1)}
								className={
									visiblePages.pageIndex + 1 === page
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

export default Table;
