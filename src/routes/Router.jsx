import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Auth from '../components/screens/auth/Auth';
import NotFound from '../components/screens/not-found/NotFound';
import HelpProvider from '../components/ui/help/HelpProvider';
import { useAuth } from '../hooks/useAuth';

import { routes } from './routes.data';

const Router = () => {
	const { isAuth } = useAuth();

	return (
		<BrowserRouter>
			<HelpProvider>
				<Routes>
					{routes.map(route => {
						if (route.isAuth && !isAuth) {
							return false;
						}

						return (
							<Route
								key={route.path}
								element={<route.component />}
								path={route.path}
							/>
						);
					})}
					{/* Страницы входа по старым адресам: /login и /auth всегда ведут на форму авторизации,
					    а не на страницу «не найдено» */}
					<Route element={<Auth />} path='/login' />
					<Route element={<Auth />} path='/auth' />
					<Route element={!isAuth ? <Auth /> : <NotFound />} path='*' />
					{/* <Route element={} path='*' /> */}
				</Routes>
			</HelpProvider>
		</BrowserRouter>
	);
};

export default Router;
