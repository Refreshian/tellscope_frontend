import { useEffect, useState } from 'react';

import { colors } from '../../../app.constants';
import { useActions } from '../../../hooks/useActions';
import { useDebounce } from '../../../hooks/useDebounce';
import { useStartAiRequests } from '../../../hooks/useStartAiRequests';
import AiTablePost from '../../content/tables/ai-analytics/ai-tables/AiTablePost';
import BackgroundLoader from '../../loading/background-loader/BackgroundLoader';
import Loader from '../../loading/loader/Loader';
import Button from '../../ui/button/Button';
import TextArea from '../../ui/textarea/TextArea';

import styles from './PopupAi.module.scss';

const default_value_system = 'Ты дружелюбный ассистент для разметки текстов';
const default_value_text =
	'Какая тематика у этого текста? Ответь на русском языке в 1 предложение';

const PopupAi = () => {
	const { toggleIsViewPromptPopup, setSystemPrompt, setTextPrompt } =
		useActions();
	const {
		isLoadingTest,
		isSuccessTest,
		onStartTesting,
		data,
		onStartDataAi,
		isSuccessAi,
		setIsSuccessAi,
	} = useStartAiRequests();

	const { value: value_system, onChange: onChange_system } = useDebounce(
		setSystemPrompt,
		400, //HELP: задержка дебаунса
		500, //HELP: количество символов в поле
		default_value_system,
	);
	const { value: value_text, onChange: onChange_text } = useDebounce(
		setTextPrompt,
		400,
		1000,
		default_value_text,
	);

	const [error, setError] = useState({ message: '', isActive: false });

	useEffect(() => {
		if (value_text === '') {
			setError({ message: 'Введите текст запроса', isActive: true });
		} else if (value_system === '') {
			setError({ message: 'Введите текст промта', isActive: true });
		} else {
			setError({ isActive: false, message: '' });
		}
	}, [value_text, value_system]);

	return (
		<div className={styles.wrapper_popup}>
			<div className={styles.block__header}>
				<h2 className={styles.title}>
					{isSuccessTest ? 'Результаты тестирования' : 'Тестирование'}
				</h2>
				<button
					className={styles.button__exit}
					onClick={() => toggleIsViewPromptPopup(false)}
				>
					<img src='/images/icons/exit.svg' alt='exit' />
				</button>
			</div>
			{isSuccessTest ? (
				<AiTablePost id={data.task_id || '0'} />
			) : (
				<>
					{isLoadingTest && (
						<>
							<BackgroundLoader />
							<Loader />
						</>
					)}
					<div className={styles.block__content}>
						<TextArea
							value={value_system}
							onChange={onChange_system}
							style={
								value_system === default_value_system
									? { color: colors.grey_graph }
									: {}
							}
						/>
						<TextArea
							value={value_text}
							onChange={onChange_text}
							style={
								value_text === default_value_text
									? { color: colors.grey_graph }
									: {}
							}
						/>
					</div>
				</>
			)}
			<div className={styles.block__footer}>
				<span className={styles.error}>
					{error.isActive ? error.message : ''}
				</span>
				{isSuccessTest ? (
					<div className={styles.block_buttons}>
						<Button
							disabled={!(value_system.length > 0 && value_text.length > 0)}
							style={{
								backgroundColor: colors.color_very_light_grey,
								color: colors.color_blue,
								border: `1px solid ${colors.color_blue}`,
								width: 'calc(132/1440*100vw)',
								height: 'calc(30/1440*100vw)',
							}}
							onClick={onStartTesting}
						>
							Тестировать
						</Button>
						<Button
							style={{
								width: 'calc(132/1440*100vw)',
								height: 'calc(30/1440*100vw)',
							}}
							onClick={onStartDataAi}
						>
							Запустить ИИ
						</Button>
					</div>
				) : (
					<Button
						disabled={!(value_system.length > 0 && value_text.length > 0)}
						onClick={onStartTesting}
					>
						Тестировать
					</Button>
				)}
			</div>
		</div>
	);
};

export default PopupAi;
