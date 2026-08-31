import { useState } from 'react';

export const useCalendarDate = initialDate => {
	// Состояние для выбранного месяца и года
	const [currentDate, setCurrentDate] = useState(initialDate);

	// Функция для получения количества дней в месяце
	const getDaysInMonth = (year, month) => {
		return new Date(year, month + 1, 0).getDate();
	};
	const prevMonth = () => {
		setCurrentDate(prev => {
			const prevMonthDate = new Date(prev.getFullYear(), prev.getMonth() - 1);
			return prevMonthDate;
		});
	};
	const nextMonth = () => {
		setCurrentDate(prev => {
			const nextMonthDate = new Date(prev.getFullYear(), prev.getMonth() + 1);
			return nextMonthDate;
		});
	};
	const prevYear = () => {
		setCurrentDate(prev => {
			const nextYearDate = new Date(
				prev.getFullYear() - 1,
				prev.getMonth(),
				prev.getDate(),
			);
			return nextYearDate;
		});
	};
	const nextYear = () => {
		setCurrentDate(prev => {
			const nextYearDate = new Date(
				prev.getFullYear() + 1,
				prev.getMonth(),
				prev.getDate(),
			);
			return nextYearDate;
		});
	};

	// Получаем количество дней в текущем месяце
	const daysInMonth = getDaysInMonth(
		currentDate.getFullYear(),
		currentDate.getMonth(),
	);

	return {
		currentDate,
		prevMonth,
		nextMonth,
		prevYear,
		nextYear,
		daysInMonth,
		setCurrentDate,
	};
};
