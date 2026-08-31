import { useState } from 'react';

import styles from './Question.module.scss';

const Question = ({ question }) => {
	const [isViewDescription, setIsViewDescription] = useState(false);

	return (
		<li key={question.id} className={styles.block__faq}>
			<div className={styles.block__content}>
				<h3 className={styles.title__faq}>{question.title}</h3>
				{isViewDescription && (
					<p className={styles.description__faq}>{question.description}</p>
				)}
			</div>
			<button
				className={styles.button}
				onClick={() => setIsViewDescription(!isViewDescription)}
			>
				<img src='/images/icons/plus.svg' alt='plus' className={styles.image} />
			</button>
		</li>
	);
};

export default Question;
