import { useSelector } from 'react-redux';

import { useCheckAuth } from '../../../hooks/useCheckAuth';
import Content from '../../content/Content';
import FaqContent from '../../content/faq-content/FaqContent';
import Layout from '../../layout/Layout';
import LeftMenu from '../../ui/left-menu/LeftMenu';
import LeftMenuActive from '../../ui/left-menu/left-menu-active/LeftMenuActive';

const Faq = () => {
	useCheckAuth();

	const { active_menu } = useSelector(store => store.booleanValues);

	return (
		<Layout style={{ justifyContent: 'space-between' }}>
			{active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>
				<FaqContent />
			</Content>
		</Layout>
	);
};

export default Faq;
