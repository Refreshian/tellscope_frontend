import styles from './FaqContent.module.scss';
import Question from './question/Question';
import { faqData } from '@/data/faq.data';

const FaqContent = () => {
	return (
		<div className={styles.wrapper_faq}>
			<h2 className={styles.title}>FAQ</h2>
			<ul className={styles.menu}>
				{faqData.map(question => (
					<Question key={question.id} question={question} />
				))}
			</ul>
		</div>
	);
};

export default FaqContent;
