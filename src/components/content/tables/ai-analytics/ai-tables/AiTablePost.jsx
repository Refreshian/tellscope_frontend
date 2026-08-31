import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useGetStatusRequestQuery } from '../../../../../services/tables.service';
import { truncateDescription } from '../../../../../utils/editText';

import styles from './AiTables.module.scss';

const AiTablePost = ({ id = '0' }) => {
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { data: data_status, isSuccess: isSuccess_status } =
    useGetStatusRequestQuery(id);

  const tableData = useMemo(() => {
    if (!isSuccess_status || !data_status) return [];

    // Добавляем отладочную информацию
    console.log('data_status:', data_status);
    
    // Убедимся, что results и texts существуют и являются массивами
    let results = [];
    let texts = [];
    
    // Проверяем results
    if (data_status?.results) {
      try {
        // Если results - строка JSON, пробуем распарсить
        if (typeof data_status.results === 'string') {
          results = JSON.parse(data_status.results);
        } else {
          results = data_status.results;
        }
      } catch (e) {
        console.error('Ошибка парсинга results:', e);
        results = [];
      }
    }
    
    // Проверяем texts
    if (data_status?.texts) {
      try {
        // Если texts - строка JSON, пробуем распарсить
        if (typeof data_status.texts === 'string') {
          texts = JSON.parse(data_status.texts);
        } else {
          texts = data_status.texts;
        }
      } catch (e) {
        console.error('Ошибка парсинга texts:', e);
        texts = [];
      }
    }
    
    // Проверяем, что texts и results являются массивами
    if (!Array.isArray(results)) {
      console.error('results не является массивом:', results);
      results = [];
    }
    
    if (!Array.isArray(texts)) {
      console.error('texts не является массивом:', texts);
      texts = [];
    }

    //HELP: Объединяем данные по индексу
    return texts.map((text, index) => {
      return {
        text: text || 'Нет данных',
        theme: results[index] || '',
      };
    });
  }, [isSuccess_status, data_status]);

  const columns = useMemo(
    () => [
      {
        header: 'Текст',
        accessorKey: 'text',
      },
      {
        header: 'Ответ ИИ',
        accessorKey: 'theme',
      },
    ],
    [],
  );

  const tableInstance = useReactTable({
    columns,
    data: tableData,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.wrapper_table}>
      <table>
        <thead>
          {tableInstance.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
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
                  {truncateDescription(cell.getValue()?.toString() || '', 300)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AiTablePost;