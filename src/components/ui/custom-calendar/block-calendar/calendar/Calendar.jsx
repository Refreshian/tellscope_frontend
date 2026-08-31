import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { useCalendar } from '../../../../../hooks/useCalendar';

import styles from './Calendar.module.scss';

const weeksArr = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const Calendar = ({ start, callbackDate }) => {
	const { min_date, max_date } = useSelector(state => state.dataForRequest);
	const toLocalDate = start ? min_date : max_date;
	const [currentDate, setCurrentDate] = useState(new Date(toLocalDate * 1000));

	const {
		getDaysInMonth,
		getStartDayOfWeek,
		formatDate,
		handleDateClick,
		isSelected,
		changeMonth,
		changeYear,
		isDisabled,
	} = useCalendar(callbackDate, setCurrentDate, start);

	const renderDays = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		const startDayOfWeek = getStartDayOfWeek(year, month) || 7; // Чтобы понедельник был первым
		const prevMonthDays = getDaysInMonth(year, month - 1 >= 0 ? month - 1 : 11);

		const rows = [];
		let cells = [];

		//HELP: Добавляем дни предыдущего месяца (если месяц не начинается с понедельника)
		for (let i = startDayOfWeek - 1; i > 0; i--) {
			const day = prevMonthDays - i + 1;
			const date =
				month - 1 < 0
					? formatDate(year - 1, 11, day)
					: formatDate(year, month - 1, day);

			cells.push(
				<div key={date} className={`${styles.day} ${styles.otherMonth}`}>
					{day}
				</div>,
			);
		}

		//HELP: Добавляем текущие дни месяца
		for (let day = 1; day <= daysInMonth; day++) {
			const date = formatDate(year, month, day);
			const disabled = isDisabled(date);

			cells.push(
				<div
					key={date}
					// className={`${styles.day} ${styles.currentMonth} ${isInRange(date) ? styles.inRange : ''} ${disabled ? styles.disabled : ''}`}
					className={`${styles.day} ${styles.currentMonth} ${isSelected(date) ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
					onClick={() => (disabled ? undefined : handleDateClick(date))}
				>
					{day}
				</div>,
			);

			//HELP: Если дошли до конца недели (воскресенье) – переносим на новую строку
			if (cells.length % 7 === 0) {
				rows.push(
					<div key={`week-${rows.length}`} className={styles.week}>
						{cells}
					</div>,
				);
				cells = [];
			}
		}

		//HELP: Добавляем дни следующего месяца, чтобы завершить последнюю неделю (если нужно)
		let nextMonthDay = 1;
		while (cells.length < 7) {
			const date =
				month + 1 > 11
					? formatDate(year + 1, 0, nextMonthDay)
					: formatDate(year, month + 1, nextMonthDay);

			cells.push(
				<div key={date} className={`${styles.day} ${styles.otherMonth}`}>
					{nextMonthDay}
				</div>,
			);

			nextMonthDay++;
		}

		//HELP: Добавляем последнюю строку в календарь
		if (cells.length > 0) {
			rows.push(
				<div key={`week-${rows.length}`} className={styles.week}>
					{cells}
				</div>,
			);
		}

		return rows;
	};

	return (
		<div className={styles.calendar}>
			<div className={styles['calendar-header']}>
				<div className={styles['calendar-header__month']}>
					<span>
						{currentDate.toLocaleString('default', { month: 'long' })}
					</span>
					<div className={styles['calendar-header__block-buttons']}>
						<button onClick={() => changeMonth(1)}></button>
						<button onClick={() => changeMonth(-1)}></button>
					</div>
				</div>
				<div className={styles['calendar-header__year']}>
					<span>{currentDate.getFullYear()}</span>
					<div className={styles['calendar-header__block-buttons']}>
						<button onClick={() => changeYear(1)}></button>
						<button onClick={() => changeYear(-1)}></button>
					</div>
				</div>
			</div>
			<div className={styles.weekDays}>
				{weeksArr.map(day => (
					<div key={day} className={styles.weekDay}>
						{day}
					</div>
				))}
			</div>
			{renderDays()}
		</div>
	);
};

export default Calendar;