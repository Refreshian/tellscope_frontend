import { useEffect, useState } from 'react';

import Button from '@/components/ui/button/Button';

import { useActions } from '../../../../hooks/useActions';
import { convertFromRegularToTimestamp } from '../../../../utils/timestamp';

import styles from './BlockCalendar.module.scss';
import Calendar from './calendar/Calendar';
import { colors } from '@/app.constants';

const BlockCalendar = ({ multi, setViewCalendar }) => {
	const { addMinRangeDate, addMaxRangeDate } = useActions();

	const [dateCalendar, setDateCalendar] = useState({
		start: null,
		end: null,
	});

	const callbackDate = (start, date) => {
		if (start) {
			setDateCalendar(prev => ({
				...prev,
				start: convertFromRegularToTimestamp(new Date(date)),
			}));
		} else {
			setDateCalendar(prev => ({
				...prev,
				end: convertFromRegularToTimestamp(new Date(date)),
			}));
		}
	};
	const removeCalendar = () => {
		setViewCalendar(false);
	};
	const addDateToState = () => {
		addMinRangeDate(
			convertFromRegularToTimestamp(new Date(dateCalendar.start * 1000)),
		);
		addMaxRangeDate(
			convertFromRegularToTimestamp(new Date(dateCalendar.end * 1000)),
		);
		setViewCalendar(false);
	};

	useEffect(() => {
		console.log('dateCalendar', dateCalendar);
	}, [dateCalendar]);

	return (
		<div className={styles.block_calendar}>
			<div className={styles.block__calendars}>
				<Calendar start={true} callbackDate={callbackDate} />
				<Calendar start={false} callbackDate={callbackDate} />
			</div>
			<div className={styles.block__preview}>
				<p className={styles.preview__date}></p>
				<div className={styles.block__buttons}>
					<Button
						style={{
							backgroundColor: colors.color_white,
							color: colors.color_blue,
							width: 'calc(82/1440*100vw)',
							height: 'calc(33/1440*100vw)',
							fontSize: '0.8rem',
						}}
						onClick={removeCalendar}
					>
						Отменить
					</Button>
					<Button
						style={{
							width: 'calc(151/1440*100vw)',
							height: 'calc(40/1440*100vw)',
						}}
						onClick={addDateToState}
					>
						Применить
					</Button>
				</div>
			</div>
		</div>
	);
};

export default BlockCalendar; 