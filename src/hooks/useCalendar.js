import { useState } from 'react';
import { useSelector } from 'react-redux';

export const useCalendar = (callbackDate, setCurrentDate, start) => {
	const { min_date, max_date } = useSelector(state => state.dataForRequest);
	const [selectedDate, setSelectedDate] = useState(null);

	const getDaysInMonth = (year, month) =>
		new Date(year, month + 1, 0).getDate();
	const getStartDayOfWeek = (year, month) => new Date(year, month, 1).getDay();
	const formatDate = (year, month, day) =>
		`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

	const handleDateClick = date => {
		setSelectedDate(date);
		callbackDate(start, date); //HELP: Передаем в родительский компонент
	};

	const isSelected = date => selectedDate === date;

	const changeMonth = offset => {
		setCurrentDate(
			prev => new Date(prev.getFullYear(), prev.getMonth() + offset),
		);
	};

	const changeYear = offset => {
		setCurrentDate(
			prev => new Date(prev.getFullYear() + offset, prev.getMonth()),
		);
	};

	const isDisabled = date => {
		const timestamp = new Date(date).getTime() / 1000;
		return timestamp < min_date || timestamp > max_date;
	};

	return {
		getDaysInMonth,
		getStartDayOfWeek,
		formatDate,
		handleDateClick,
		isSelected,
		changeMonth,
		changeYear,
		isDisabled,
	};
};
