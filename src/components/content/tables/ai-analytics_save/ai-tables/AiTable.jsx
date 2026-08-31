import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
  } from '@tanstack/react-table';
  import { useMemo, useState, useEffect } from 'react';
  import { useSelector } from 'react-redux';
  import Slider from 'rc-slider';
  import 'rc-slider/assets/index.css';
  
  import { useActions } from '../../../../../hooks/useActions';
  import { truncateDescription } from '../../../../../utils/editText';
  import { convertUnixTimestampToDate } from '../../../../../utils/timestamp';
  import Button from '../../../../ui/button/Button';
  
  import styles from './AiTables.module.scss';
  
  const AiTable = () => {
	const { aiTesting } = useSelector(state => state.aiData);
	const { texts } = useSelector(state => state.dataForRequest);

	// Получение максимальных значений для слайдеров
	const getMaxValues = () => {
	  if (!aiTesting || aiTesting.length === 0) return { audience: 50000, comments: 1000, er: 100 };
	  
	  let maxAudience = 0;
	  let maxComments = 0;
	  let maxEr = 0;
	  
	  aiTesting.forEach(item => {
		const audience = parseInt(item.audienceCount) || 0;
		const comments = parseInt(item.commentsCount) || 0;
		const er = parseFloat(item.er) || 0;
		
		maxAudience = Math.max(maxAudience, audience);
		maxComments = Math.max(maxComments, comments);
		maxEr = Math.max(maxEr, er);
	  });
	  
	  return {
		audience: maxAudience > 0 ? Math.ceil(maxAudience * 1.1) : 50000,
		comments: maxComments > 0 ? Math.ceil(maxComments * 1.1) : 1000,
		er: maxEr > 0 ? Math.ceil(maxEr * 1.1) : 100
	  };
	};
	
	const maxValues = useMemo(getMaxValues, [aiTesting]);

	// Состояния для фильтрации данных - инициализируем после получения maxValues
	const [audienceRange, setAudienceRange] = useState([0, maxValues.audience]);
	const [commentsRange, setCommentsRange] = useState([0, maxValues.comments]);
	const [erRange, setErRange] = useState([0, maxValues.er]);

	// Обновляем диапазоны слайдеров при изменении данных
	useEffect(() => {
	  setAudienceRange([0, maxValues.audience]);
	  setCommentsRange([0, maxValues.comments]);
	  setErRange([0, maxValues.er]);
	}, [maxValues.audience, maxValues.comments, maxValues.er]);
  
	// Фильтрованные данные
	const data = useMemo(() => {
	  if (!aiTesting) return [];
	  
	  return aiTesting.filter(item => {
		const audience = parseInt(item.audienceCount) || 0;
		const comments = parseInt(item.commentsCount) || 0;
		const er = parseFloat(item.er) || 0;
		
		return (
		  audience >= audienceRange[0] && audience <= audienceRange[1] &&
		  comments >= commentsRange[0] && comments <= commentsRange[1] &&
		  er >= erRange[0] && er <= erRange[1]
		);
	  });
	}, [aiTesting, audienceRange, commentsRange, erRange]);
  
	// Обработчики для слайдеров
	const handleSliderChange = (setter) => (value) => {
	  setter(value);
	};
  
	const {
	  addTextsIds,
	  deleteTextsIds,
	  addText_popupNormal,
	  toggle_popupNormal,
	  deleteAllTextsIds,
	  toggleIsViewPromptPopup,
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
  
	// Функция для обработки изменения чекбокса
	const handleCheckboxChange = (obj, isChecked) => {
	  if (isChecked) {
		if (texts.length < 5) {
		  addTextsIds(obj);
		}
	  } else {
		deleteTextsIds(obj);
	  }
	};
  
	return (
	  <div className={styles.wrapper_table}>
		<div className={styles.table__header}>
		  <div className={styles.header__info}>
			<h2 className={styles.header__title}>Тестирование</h2>
			<p className={styles.header__description}>
			  Выберите до 5 текстов и запустите тестирование
			</p>
			<div className={styles.block__checked}>
			  <p className={styles.text}>Выбрано: {texts.length}</p>
			  <button
				className={styles.button__exit}
				onClick={() => deleteAllTextsIds('')}
			  >
				<img src='/images/icons/exit_blue.svg' alt='exit' />
			  </button>
			</div>
		  </div>
		  <Button
			disabled={texts.length === 0}
			onClick={() => toggleIsViewPromptPopup(true)}
		  >
			Тестировать
		  </Button>
		</div>
  
		{/* Ползунки для фильтрации */}
		<div className={styles.slidersContainer}>
		  <div className={styles.sliderWrapper}>
			<label>Аудитория:</label>
			<Slider
			  range
			  min={0}
			  max={maxValues.audience}
			  value={audienceRange}
			  onChange={handleSliderChange(setAudienceRange)}
			/>
			<div className={styles.sliderValues}>
			  <span>{audienceRange[0]}</span> - <span>{audienceRange[1]}</span>
			</div>
		  </div>
		  <div className={styles.sliderWrapper}>
			<label>Комментарии:</label>
			<Slider
			  range
			  min={0}
			  max={maxValues.comments}
			  value={commentsRange}
			  onChange={handleSliderChange(setCommentsRange)}
			/>
			<div className={styles.sliderValues}>
			  <span>{commentsRange[0]}</span> - <span>{commentsRange[1]}</span>
			</div>
		  </div>
		  <div className={styles.sliderWrapper}>
			<label>Вовлеченность:</label>
			<Slider
			  range
			  min={0}
			  max={maxValues.er}
			  value={erRange}
			  onChange={handleSliderChange(setErRange)}
			/>
			<div className={styles.sliderValues}>
			  <span>{erRange[0]}</span> - <span>{erRange[1]}</span>
			</div>
		  </div>
		</div>
  
		{/* Информация о фильтрации */}
		{aiTesting && aiTesting.length > 0 && (
		  <div className={styles.filterInfo}>
			Текущие фильтры содержат <b>{data.length}</b> записей из <b>{aiTesting.length}</b>
		  </div>
		)}
  
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
			{tableInstance.getRowModel().rows.map(rowEl => (
			  <tr key={rowEl.id}>
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
						  checked={texts.some(
							elem => elem.id === rowEl.original.id,
						  )}
						  onChange={e => {
							console.log(rowEl.original);
							handleCheckboxChange(
							  {
								id: rowEl.original.id,
								text: rowEl.original.text,
							  },
							  e.target.checked,
							);
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
						{truncateDescription(rowEl.original.text, 250)}
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