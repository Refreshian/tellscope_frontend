import { convertDateFormat } from './timestamp';

export const truncateDescription = (description, maxLength = 250) => {
  if (!description || typeof description !== 'string') return '';
  return description.length <= maxLength 
    ? description 
    : `${description.substring(0, maxLength)}...`;
};

export const truncateMiddle = (str, num) => {
	//HELP: Если строка короче или равна числу, возвращаем её без изменений
	if (str.length <= num) {
		return str;
	}

	//HELP: Вычисляем, сколько символов взять с начала и конца
	const half = Math.floor(num / 2);

	//HELP: Берём начало строки
	const start = str.slice(0, half);

	//HELP: Берём конец строки
	const end = str.slice(-half);

	//HELP: Собираем результат: начало + многоточие + конец
	return `${start}...${end}`;
};

export function getFirstWordAfterUnderscore(inputString) {
	const underscoreIndex = inputString.indexOf('_');
	if (underscoreIndex !== -1) {
		const firstWord = inputString.substring(0, underscoreIndex);
		return firstWord;
	} else {
		return 'no group'; // Если символ "_" не найден, вернуть null или другое значение по вашему усмотрению
	}
}

export const formatDates = dates => {
	return `${dates[0] !== undefined ? convertDateFormat(dates[0]) : 'no date'} -
					${dates[1] !== undefined ? convertDateFormat(dates[1]) : 'no date'}`;
};
