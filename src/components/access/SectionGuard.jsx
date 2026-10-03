// Защита раздела: если вкладка не выдана пользователю, показываем объяснение вместо экрана.
// Проверка повторяет серверную (там тот же доступ отдаётся через 403), но нужна, чтобы
// при прямом переходе по адресу человек видел понятное сообщение, а не пустой экран.
import { useNavigate } from 'react-router-dom';

import { useCurrentUser } from '@/hooks/useCurrentUser';

import { canOpenPath, sectionTitleForPath } from '@/utils/sections';

const SectionGuard = ({ path, children }) => {
	const me = useCurrentUser();
	const navigate = useNavigate();

	if (canOpenPath(me, path)) return children;

	const title = sectionTitleForPath(me, path);

	return (
		<div
			style={{
				margin: '48px auto',
				maxWidth: 640,
				padding: '28px 32px',
				border: '1px solid #e4e7ec',
				borderRadius: 16,
				background: '#fff',
				textAlign: 'center',
			}}
		>
			<h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Раздел не выдан</h2>
			<p style={{ margin: '0 0 8px', color: '#475467', fontSize: 14 }}>
				{title ? `Раздел «${title}» ` : 'Этот раздел '}
				не входит в ваши доступы. Запросите доступ у администратора сервиса.
			</p>
			<button
				type='button'
				onClick={() => navigate('/home')}
				style={{
					marginTop: 12,
					padding: '10px 18px',
					borderRadius: 10,
					border: '1px solid #1570ef',
					background: '#1570ef',
					color: '#fff',
					cursor: 'pointer',
					fontSize: 14,
				}}
			>
				Вернуться на главную
			</button>
		</div>
	);
};

export default SectionGuard;
