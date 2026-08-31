import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useCheckAuth } from '../../../hooks/useCheckAuth';

import styles from './Clustering.module.scss';

const Clustering = () => {
	const { pathname } = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);

	useCheckAuth();

	return (
		<Layout>
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

			<Content>
				<div className={styles.block__pageName}>
					<h3 className={styles.pageName__title}>Кластеризация</h3>
				</div>
				<iframe
					src='https://projector.tensorflow.org/'
					width='100%'
					height='100%'
					style={{ border: 'none', marginTop: 'calc(30/1000*100vh)' }}
					title='TensorFlow Projector'
				></iframe>
			</Content>
		</Layout>
	);
};

export default Clustering;
