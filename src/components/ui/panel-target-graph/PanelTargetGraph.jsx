import { useEffect, useRef, useState } from 'react';

import styles from './PanelTargetGraph.module.scss';

const PanelTargetGraph = ({
	handleClick,
	dataButtons,
	activeButton,
	dataCounters,
}) => {
	const [lineStyle, setLineStyle] = useState({ width: 0, left: 0 });
	const buttonRefs = useRef([]);

	useEffect(() => {
		// Найти активную кнопку и обновить положение и ширину линии
		const activeIndex = dataButtons.findIndex(
			but => but.title === activeButton,
		);

		if (activeIndex !== -1 && buttonRefs.current[activeIndex]) {
			const button = buttonRefs.current[activeIndex];
			const buttonRect = button.getBoundingClientRect();
			setLineStyle({
				width: buttonRect.width,
				left: button.offsetLeft,
			});
		}
	}, [activeButton, dataButtons]);

	return (
		<div className={styles.block__buttons}>
			{dataButtons.map((but, index) => (
				<button
					key={but.id}
					ref={el => (buttonRefs.current[index] = el)} // Сохраняем реф для каждой кнопки
					className={
						activeButton === but.title ? styles.activeButton : styles.button
					}
					onClick={() => handleClick(but.title)}
				>
					{but.title}
					{but.isCount
						? but.title === 'Негативные упоминания'
							? `(${dataCounters.negative})`
							: but.title === 'Позитивные упоминания'
								? `(${dataCounters.positive})`
								: null
						: null}
				</button>
			))}
			<div
				className={styles.target__line}
				style={{
					width: `${lineStyle.width}px`,
					left: `${lineStyle.left}px`,
				}}
			></div>
		</div>
	);
};
export default PanelTargetGraph;
