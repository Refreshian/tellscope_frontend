import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { useCheckWidth } from '@/hooks/useCheckWidth';

import styles from './Mentions.module.scss';
import { renderActiveShape } from './RenderActiveShape';

const Mentions = ({ isViewSource, data, setData, activeButton }) => {
	const { windowSize } = useCheckWidth();

	const innerRadius = useMemo(
		() => windowSize.width * 0.055,
		[windowSize.width],
	);
	const outerRadius = useMemo(
		() => windowSize.width * 0.101,
		[windowSize.width],
	);

	const [activeIndex, setActiveIndex] = useState(0);
	const [deletedData, setDeletedData] = useState([]);

	useEffect(() => setDeletedData([]), [activeButton]); //HELP: Для того чтобы список удаления (в пояснениях к графику) очищался при переключении графика

	const onPieEnter = useCallback((_, index) => {
		setActiveIndex(index);
	}, []);

	const onPieClick = useCallback(() => {
		if (activeIndex !== null) {
			setData(prevData => {
				const newData = [...prevData];
				const deletedItem = newData.splice(activeIndex, 1)[0];
				setDeletedData(prevDeletedData => [...prevDeletedData, deletedItem]);
				return newData;
			});
			setActiveIndex(null);
		}
	}, [activeIndex, setData]);

	const handleRestoreClick = useCallback(
		index => {
			setDeletedData(prevDeletedData => {
				const restoredItem = prevDeletedData[index];
				setData(prevData => [...prevData, restoredItem]);
				return prevDeletedData.filter((_, i) => i !== index);
			});
		},
		[setData],
	);

	return (
		<>
			<ResponsiveContainer width='100%' height='100%'>
				<PieChart>
					<Pie
						activeIndex={activeIndex}
						activeShape={renderActiveShape}
						data={data}
						cx='50%'
						cy='50%'
						innerRadius={innerRadius}
						outerRadius={outerRadius}
						fill='#8884d8'
						dataKey='value'
						onMouseEnter={onPieEnter}
						onClick={onPieClick}
					>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={entry.color} />
						))}
					</Pie>
				</PieChart>
			</ResponsiveContainer>

			<div
				className={styles.block__sources}
				style={{ opacity: isViewSource ? 1 : 0 }}
			>
				{deletedData.map((entry, index) => (
					<p
						key={`deleted-${index}`}
						onClick={() => handleRestoreClick(index)}
						style={{ cursor: 'pointer', color: entry.color }}
					>
						{entry.name}
					</p>
				))}
			</div>
		</>
	);
};

export default Mentions;
