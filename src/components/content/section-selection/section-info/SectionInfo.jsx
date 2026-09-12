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

	const isAccent = Boolean(elemInfo.accent);

	return (
		<Link
			to={isDisabled ? null : elemInfo.path}
			className={`${styles.block__sectionInfo} ${isAccent ? styles.block__sectionInfo_accent : ''}`}
			onMouseEnter={() => handleMouseEnter(elemInfo.id)}
			onMouseLeave={handleMouseLeave}
		>
			{isAccent ? <span className={styles.badge}>{elemInfo.tileBadge || 'AI'}</span> : null}
			<img src={elemInfo.src_active} alt={elemInfo.text} />
			<p>{elemInfo.text}</p>
			{isAccent ? (
				<span className={styles.accentHint}>{elemInfo.accentHint || 'автоматические отчёты'}</span>
			) : null}
			{isDisabled && elemInfo.path && hoveredItem === elemInfo.id && (
				<p className={styles.not_ready}>В разработке</p>
			)}
		</Link>
	);
};

export default SectionInfo;
