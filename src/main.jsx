import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import AuthProvider from './providers/AuthProvider.jsx';
import Router from './routes/Router.jsx';
import { store } from './store/store.js';
import './styles/global.scss';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<AuthProvider>
			<Provider store={store}>
				<Router />
			</Provider>
		</AuthProvider>
	</StrictMode>,
);
