import { useSelector } from 'react-redux';

import Layout from '@/components/layout/Layout';
import Content from '@/components/content/Content';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

const Configs = () => {
  const { active_menu } = useSelector(store => store.booleanValues);

  return (
    <Layout style={{ justifyContent: 'space-between' }}>
      {active_menu ? <LeftMenuActive /> : <LeftMenu />}
      <Content style={{ alignItems: 'stretch', padding: '24px 32px' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Конфигурации сервисов</h3>
          <div style={{ flex: 1, minHeight: '70vh' }}>
            <iframe
              src="/api/configs"
              title="Configs"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #e0e4f0',
                borderRadius: 6,
                background: '#fff',
              }}
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Configs;

