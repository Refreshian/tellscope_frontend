import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export const downloadJSON = (data, filename) => {
	const jsonString = JSON.stringify(data, null, 2);
	const blob = new Blob([jsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `${filename}.json`;
	a.click();

	URL.revokeObjectURL(url);
};

export const downloadFile = (fileName, content) => {
	const element = document.createElement('a');
	const file = new Blob([content], { type: 'text/plain' });

	element.href = URL.createObjectURL(file);
	element.download = fileName;
	document.body.appendChild(element); // Нужно для работы в Firefox
	element.click();
	document.body.removeChild(element);
};

export const exportToExcel = (data, fileName) => {
	const ws = XLSX.utils.json_to_sheet(data); // Преобразуем JSON в Excel-формат
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

	const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
	const excelBlob = new Blob([excelBuffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});

	saveAs(excelBlob, `${fileName}.xlsx`);
};
