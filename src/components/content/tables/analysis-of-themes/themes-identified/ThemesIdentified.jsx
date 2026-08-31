import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel, // импортируйте эту функцию
	useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { exportToExcel } from '../../../../../utils/downloadData';
import { truncateDescription } from '../../../../../utils/editText';
import styles from '../../ai-analytics/ai-tables/AiTables.module.scss';

const ThemesIdentified = ({ data_llm }) => {
	const columns = useMemo(
		() => [
			{
				header: 'Тематика',
				accessorKey: 'Имя кластера', // Ключ из данных
				cell: ({ getValue }) =>
					truncateDescription(getValue()?.toString() || '', 200),
			},
			{
				header: 'Количество',
				accessorKey: 'Количество',
			},
			{
				header: 'Аудитория',
				accessorKey: 'Аудитория',
			},
			{
				header: 'Комментариев',
				accessorKey: 'Комментариев',
			},
			{
				header: 'Репостов',
				accessorKey: 'Репостов',
			},
			{
				header: 'Лайков',
				accessorKey: 'Лайков',
			},
			{
				header: 'Вовлеченность',
				accessorKey: 'Вовлеченность',
			},
			{
				header: 'Просмотров',
				accessorKey: 'Просмотров',
			},
		],
		[],
	);

	const [columnVisibility, setColumnVisibility] = useState({});
	const [sorting, setSorting] = useState([]);
	const countTableElemSize = [10, 15, 20];

	const tableInstance = useReactTable({
		columns,
		data: data_llm?.aggregated_data || [],
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting: sorting,
			columnVisibility: columnVisibility,
		},
		onSortingChange: setSorting,
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
		<div className={styles.wrapper_table} style={{ marginTop: '0' }}>
			<div
				className={styles.table__header}
				style={{ justifyContent: 'flex-end' }}
			>
				<button
					className={styles.button__settings}
					onClick={() =>
						exportToExcel(data_llm?.aggregated_data || [], 'Выявленные темы')
					}
				>
					<img src='/images/icons/setting/upload_active.svg' alt='icon' />
				</button>
			</div>
			<table>
				<thead>
					{tableInstance.getHeaderGroups().map(headerGroup => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map(header => (
								<th
									key={header.id}
									style={{
										textAlign: 'left',
									}}
									onClick={
										header.column.getCanSort()
											? header.column.getToggleSortingHandler()
											: undefined
									}
								>
									{flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
									{
										{
											asc: ' \u2227',
											desc: ' \u2228',
										}[header.column.getIsSorted() ?? null]
									}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{tableInstance.getRowModel().rows.map(row => (
						<tr key={row.id}>
							{row.getVisibleCells().map(cell => (
								<td key={cell.id}>
									{/* {truncateDescription(cell.getValue()?.toString() || '', 25)} */}

									{flexRender(cell.column.columnDef.cell, cell.getContext())}
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

export default ThemesIdentified;
