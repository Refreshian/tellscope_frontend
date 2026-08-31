// Проверка, выходит ли дата за пределы диапазона
export const isOutOfRange = (day, month, year, minDate, maxDate) => {
	const dateToCheck = new Date(year, month, day);
	return dateToCheck < minDate || dateToCheck > maxDate;
};
// Проверка, является ли день промежуточным между выбранными
export const isInRange = (day, month, year, selectedDates) => {
	if (selectedDates.length === 2) {
		const [start, end] = selectedDates;
		const dateToCheck = new Date(year, month, day);
		// Проверяем, что дата находится строго между start и end, исключая их
		return dateToCheck > start && dateToCheck < end;
	}
	return false;
};
