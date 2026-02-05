/**
 * PluginSettings — Settings page for plugin management.
 *
 * Wraps PluginManagement component with SettingsPageWrapper for consistent styling.
 */

import { Collapse, Message } from '@arco-design/web-react';
import React from 'react';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import PluginManagement from './PluginManagement';

const PluginSettings: React.FC = () => {
  const [message, contextHolder] = Message.useMessage();

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      {contextHolder}
      <Collapse defaultActiveKey={['plugins']} bordered={false} className='[&_.arco-collapse-item]:mb-0 [&_.arco-collapse-item-header]:bg-transparent [&_.arco-collapse-item-content]:bg-transparent'>
        <PluginManagement message={message} />
      </Collapse>
    </SettingsPageWrapper>
  );
};

export default PluginSettings;
