import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import { getDocForPath } from '@/data/docs.data';

import HelpDrawer from './HelpDrawer';
import PageHelpButton from './PageHelpButton';

const HelpContext = createContext(null);

export const useHelp = () => useContext(HelpContext);

/**
 * Провайдер пользовательской документации.
 * Держит открытую статью справки и рисует панель-шторку поверх приложения.
 * Открыть можно из любого места через useHelp().open(doc | pathname).
 */
const HelpProvider = ({ children }) => {
	const { pathname } = useLocation();
	const [doc, setDoc] = useState(null);
	const [source, setSource] = useState('page');

	const open = useCallback(
		(target, from = 'page') => {
			const entry =
				target && typeof target === 'object'
					? target
					: getDocForPath(target || pathname);
			setDoc(entry || null);
			setSource(from);
		},
		[pathname],
	);

	const close = useCallback(() => setDoc(null), []);

	// При переходе на другую страницу справку закрываем
	useEffect(() => {
		setDoc(null);
	}, [pathname]);

	const value = useMemo(
		() => ({ doc, source, open, close, isOpen: Boolean(doc) }),
		[doc, source, open, close],
	);

	return (
		<HelpContext.Provider value={value}>
			{children}
			<HelpDrawer doc={doc} onClose={close} />
			<PageHelpButton />
		</HelpContext.Provider>
	);
};

export default HelpProvider;
