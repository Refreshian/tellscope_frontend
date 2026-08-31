export function convertFromTimestampToRegular(timestamp) {
	return new Date(timestamp * 1000);
}

export function convertFromTimestampToTime(timestamp) {
	const date = new Date(timestamp);
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function convertDateFormat(dateString) {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
	const day = String(date.getDate()).padStart(2, '0');
	return `${day}/${month}/${year}`; //HELP: Поменял местами день и месяц, т.к. почему-то в месяце отображает день и наоборот
}

export function convertFromRegularToTimestamp(dateTimeString) {
	const date = new Date(dateTimeString);
	return Math.floor(date / 1000);
}

export function fromTimestampToNewDateFormat(timestamp) {
	const date = new Date(timestamp * 1000); // Преобразование в миллисекунды

	// Добавляем метод для получения отформатированной строки
	date.getFormattedString = function () {
		const options = {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'long',
		};
		return this.toLocaleString('en-US', options);
	};

	return date;
}

export function formatDateToDDMMYY(date) {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы с 0-11, поэтому прибавляем 1
	const year = String(date.getFullYear()).slice(2); // Берем последние две цифры года

	return `${day}/${month}/${year}`;
}

export function convertUnixTimestampToDate(unixTimestamp) {
	// Создаем объект Date из Unix timestamp (в миллисекундах)
	const date = new Date(unixTimestamp * 1000);

	// Получаем составляющие даты
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	// Форматируем дату в "DD.MM.YYYY HH:mm"
	const formattedDate = `${day}.${month}.${year} ${hours}:${minutes}`;

	return formattedDate;
}
