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

import styles from './AiTables.module.scss';

const AiTablePost = () => {
	const { post } = useSelector(state => state.aiData);

	const data = useMemo(() => post.texts, [post.texts]);

	const columns = useMemo(
		() => [
			{
				id: 'Текст',
				header: 'Текст',
				accessorKey: 'text',
			},
			{
				id: 'AI',
				header: 'AI',
				accessorKey: 'llm_text',
			},
		],
		[],
	);

	const [columnVisibility, setColumnVisibility] = useState({});
	const [sorting, setSorting] = useState([]);
	const [filtering, setFiltering] = useState('');
	const countTableElemSize = [10, 15, 20];

	const { addText_popupNormal, toggle_popupNormal } = useActions();

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

	return (
		<div className={styles.wrapper_table}>
			<div className={styles.table__header}>
				<div className={styles.header__topBlock}>
					<div
						className={styles.block__globalFilter}
						style={{ marginLeft: 'calc(-30/1440*100vw)' }}
					>
						<img src='/images/icons/input_button/search.svg' alt='search' />
						<input
							type='text'
							value={filtering}
							onChange={e => setFiltering(e.target.value)}
							placeholder='Поиск'
						/>
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
										{/* HELP: СОРТИРОВКА КОЛОНОК */}
										{
											{ asc: ' \u2227', desc: ' \u2228' }[
												columnEl.column.getIsSorted() ?? null
											]
										}
									</th>
								))}
							</tr>
						);
					})}
				</thead>
				<tbody>
					{tableInstance.getRowModel().rows.map(rowEl => (
						<tr key={rowEl.id}>
							{rowEl.getVisibleCells().map(cellEl => {
								return (
									<td
										key={cellEl.id}
										onClick={() => {
											console.log(rowEl.original);
											if (cellEl.column.id === 'Текст') {
												addText_popupNormal({
													description: rowEl.original.text,
													link: null,
													time: null,
												});
											} else {
												addText_popupNormal({
													description: rowEl.original.llm_text,
													link: null,
													time: null,
												});
											}
											toggle_popupNormal('');
										}}
										style={{ cursor: 'pointer' }}
									>
										{cellEl.column.id === 'Текст'
											? truncateDescription(rowEl.original.text, 150)
											: truncateDescription(rowEl.original.llm_text, 150)}
									</td>
								);
							})}
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

export default AiTablePost;
