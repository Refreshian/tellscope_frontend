import { Component } from 'react';

/*
 * Ловит ошибки отрисовки и эффектов: вместо белого экрана показываем понятную надпись.
 * Появилось после случая, когда Ctrl+R в папке давал пустую страницу из-за падения
 * обновления данных — пользователь видел белый экран без объяснений.
 */
class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		// Для диагностики — в консоль; пользователю — короткая подсказка.
		console.error('Ошибка интерфейса:', error, info);
	}

	render() {
		if (this.state.error) {
			const text = String(
				(this.state.error && this.state.error.message) || this.state.error,
			).slice(0, 300);
			return (
				<div style={{ padding: '48px 24px', textAlign: 'center' }}>
					<h2 style={{ margin: '0 0 8px' }}>Не удалось показать страницу</h2>
					<div style={{ color: '#667085', marginBottom: 12 }}>
						Что-то пошло не так при отрисовке. Данные не потеряны — обновите страницу.
					</div>
					<div style={{ color: '#98a2b3', fontSize: 12, marginBottom: 16 }}>{text}</div>
					<button
						type='button'
						onClick={() => window.location.reload()}
						style={{
							background: '#F79009',
							border: '1px solid #F79009',
							color: '#fff',
							borderRadius: 8,
							padding: '8px 16px',
							cursor: 'pointer',
							fontWeight: 600,
						}}
					>
						Обновить страницу
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
