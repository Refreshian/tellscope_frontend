import { useState } from 'react';

import useClickOutside from '../../../hooks/useClickOutside';
import Checkbox from '../checkbox/Checkbox';

import styles from './AdditionalParameters.module.scss';

const AdditionalParameters = () => {
	const [isViewOptions, setViewOptions] = useState(false);
	const wrapperRef = useClickOutside(() => setViewOptions(false));

	return (
		<div className={styles.wrapper_param} ref={wrapperRef}>
			<div
				className={styles.block__param}
				onClick={() => setViewOptions(!isViewOptions)}
			>
				<div className={styles.block__description}>
					<h2>Доп. параметры</h2>
					<p>Посты, репосты, СМИ</p>
				</div>
				<img
					className={styles.data__arrow}
					src='/images/icons/arrow_for_search.svg'
					alt='arrow'
				/>
			</div>
			{isViewOptions && (
				<div className={styles.block__options}>
					<Checkbox id='post' text='Посты' />
					<Checkbox id='repost' text='Репосты' />
					<Checkbox id='SMI' text='СМИ' />
				</div>
			)}
		</div>
	);
};

export default AdditionalParameters;
