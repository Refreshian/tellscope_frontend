import { useState } from 'react';
import { useSelector } from 'react-redux';

import useClickOutside from '../../../hooks/useClickOutside';
import {
	convertDateFormat,
	convertFromTimestampToRegular,
} from '../../../utils/timestamp';

import styles from './CustomCalendar.module.scss';
import BlockCalendar from './block-calendar/BlockCalendar';

const CustomCalendar = ({ multi }) => {
	const [isViewCalendar, setViewCalendar] = useState(false);
	const wrapperRef = useClickOutside(() => setViewCalendar(false));
	const { min_date, max_date, max_range_date, min_range_date } = useSelector(
		state => state.dataForRequest,
	);

	return (
		<div className={styles.wrapper_calendar} ref={wrapperRef}>
			<div
				className={styles.block__data}
				onClick={() => setViewCalendar(!isViewCalendar)}
			>
				<div className={styles.block__description}>
					<h2>Период</h2>
					<p>
						{min_range_date && max_range_date
							? `${convertDateFormat(convertFromTimestampToRegular(min_range_date))} - ${convertDateFormat(convertFromTimestampToRegular(max_range_date))}`
							: 'Период не выбран'}
					</p>
				</div>
				<img
					className={styles.data__arrow}
					src='/images/icons/arrow_for_search.svg'
					alt='arrow'
				/>
			</div>
			{isViewCalendar && (
				<BlockCalendar multi={multi} setViewCalendar={setViewCalendar} />
			)}
		</div>
	);
};

export default CustomCalendar;
