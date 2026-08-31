import { useState } from 'react';
import { Link } from 'react-router-dom';

import styles from './SectionInfo.module.scss';

const SectionInfo = ({ elemInfo }) => {
	const [hoveredItem, setHoveredItem] = useState(null);

	const handleMouseEnter = id => {
		setHoveredItem(id);
	};

	const handleMouseLeave = () => {
		setHoveredItem(null);
	};

	const isDisabled = elemInfo.path === '/none';

	return (
		<Link
			to={isDisabled ? null : elemInfo.path}
			className={styles.block__sectionInfo}
			onMouseEnter={() => handleMouseEnter(elemInfo.id)}
			onMouseLeave={handleMouseLeave}
		>
			<img src={elemInfo.src_active} alt={elemInfo.text} />
			<p>{elemInfo.text}</p>
			{isDisabled && elemInfo.path && hoveredItem === elemInfo.id && (
				<p className={styles.not_ready}>В разработке</p>
			)}
		</Link>
	);
};

export default SectionInfo;
