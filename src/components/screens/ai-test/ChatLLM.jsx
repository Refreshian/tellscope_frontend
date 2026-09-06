import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useCheckAuth } from '../../../hooks/useCheckAuth';

import styles from './ChatLLM.module.scss';

const API_BASE = import.meta.env.PROD ? '' : '';

const ChatLLM = () => {
	const { pathname } = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);
	
	const [message, setMessage] = useState('');
	const [response, setResponse] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [models, setModels] = useState([]);
	const [selectedModel, setSelectedModel] = useState('deepseek-chat-v3.1');

	useCheckAuth();

	useEffect(() => {
		const fetchModels = async () => {
			try {
				const response = await fetch(`${API_BASE}/api/models`);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.json();
				setModels(data.models || []);
			} catch (error) {
				console.error('Ошибка загрузки моделей:', error);
				setError('Не удалось загрузить список моделей');
			}
		};
		fetchModels();
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!message.trim()) return;

		setLoading(true);
		setResponse('');
		setError('');

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 500000);

		try {
			const requestData = {
				message: message.trim(),
				model: selectedModel,
			};

			const res = await fetch(`${API_BASE}/api/chat`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestData),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(
					errorData.detail || 
					`Ошибка сервера: ${res.status} ${res.statusText}`
				);
			}

			const data = await res.json();
			setResponse(data.response || 'Ответ не получен');

		} catch (error) {
			clearTimeout(timeoutId);
			console.error('Ошибка запроса:', error);

			if (error.name === 'AbortError') {
				setError('Превышено время ожидания ответа (2 минуты)');
			} else if (error.message.includes('Failed to fetch')) {
				setError('Сервер не отвечает. Проверьте подключение к бэкенду.');
			} else {
				setError(`Ошибка: ${error.message}`);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Layout>
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

			<Content>
				<div className={styles.block__pageName}>
					<h3 className={styles.pageName__title}>💬 Чат с LLM</h3>
				</div>

				<div className={styles.chatContainer}>
					{error && (
						<div className={styles.errorBlock}>
							<span className={styles.errorIcon}>⚠️</span>
							<div>
								<strong>Ошибка</strong>
								<p>{error}</p>
							</div>
						</div>
					)}

					<div className={styles.controlsRow}>
						<div className={styles.modelSelector}>
							<label htmlFor="model">Модель:</label>
							<select
								id="model"
								value={selectedModel}
								onChange={(e) => setSelectedModel(e.target.value)}
								className={styles.select}
								disabled={loading || models.length === 0}
							>
								{models.length === 0 ? (
									<option>Загрузка моделей...</option>
								) : (
									models.map((model) => (
										<option key={model} value={model}>
											{model}
										</option>
									))
								)}
							</select>
						</div>
					</div>

					<form onSubmit={handleSubmit} className={styles.form}>
						<div className={styles.inputGroup}>
							<label htmlFor="message">Ваш запрос:</label>
							<textarea
								id="message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Введите ваш вопрос к AI-модели..."
								className={styles.textarea}
								rows={8}
								disabled={loading}
							/>
						</div>

						<button
							type="submit"
							disabled={loading || !message.trim() || models.length === 0}
							className={styles.button}
						>
							{loading ? (
								<>
									<span className={styles.spinner}></span>
									Обработка...
								</>
							) : (
								<>
									Отправить
								</>
							)}
						</button>
					</form>

					{response && (
						<div className={styles.responseBlock}>
							<div className={styles.responseHeader}>
								<h4>Ответ модели {selectedModel}</h4>
								<span className={styles.responseBadge}>✓ Получено</span>
							</div>
							<div className={styles.response}>
								{response}
							</div>
						</div>
					)}
				</div>
			</Content>
		</Layout>
	);
};

export default ChatLLM;