/**
 * PluginItem — Individual plugin card in the plugin list.
 *
 * Displays plugin name, description, version, state, and action buttons.
 * Follows the styling pattern of McpServerItem and AssistantManagement.
 */

import { Avatar, Button, Switch, Tag } from '@arco-design/web-react';
import { Delete, SettingOne } from '@icon-park/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PluginRegistryEntry } from '@/common/ipcBridge';

interface PluginItemProps {
  plugin: PluginRegistryEntry;
  onToggle: (pluginId: string, enabled: boolean) => void;
  onSettings: (plugin: PluginRegistryEntry) => void;
  onUninstall: (pluginId: string) => void;
  isLoading?: boolean;
}

const PluginItem: React.FC<PluginItemProps> = ({ plugin, onToggle, onSettings, onUninstall, isLoading }) => {
  const { t } = useTranslation();

  const isActive = plugin.state === 'active';
  const isBuiltin = plugin.source === 'builtin';
  const hasError = plugin.state === 'error';

  // Get source badge color
  const getSourceBadge = () => {
    switch (plugin.source) {
      case 'builtin':
        return (
          <Tag size='small' color='arcoblue'>
            {t('settings.pluginBuiltin', { defaultValue: 'Built-in' })}
          </Tag>
        );
      case 'npm':
        return (
          <Tag size='small' color='green'>
            npm
          </Tag>
        );
      case 'github':
        return (
          <Tag size='small' color='purple'>
            GitHub
          </Tag>
        );
      case 'local':
        return (
          <Tag size='small' color='orange'>
            {t('settings.pluginLocal', { defaultValue: 'Local' })}
          </Tag>
        );
      default:
        return null;
    }
  };

  // Get state indicator
  const getStateIndicator = () => {
    if (hasError) {
      return <div className='w-8px h-8px rounded-full bg-red-500' title={plugin.error} />;
    }
    if (isActive) {
      return <div className='w-8px h-8px rounded-full bg-green-500' />;
    }
    return <div className='w-8px h-8px rounded-full bg-gray-400' />;
  };

  return (
    <div className='bg-fill-0 rounded-lg px-16px py-12px flex items-center justify-between hover:bg-fill-1 transition-colors'>
      <div className='flex items-center gap-12px min-w-0 flex-1'>
        {/* Plugin Avatar */}
        <Avatar shape='square' size={36} className='bg-fill-2 rounded-8px flex-shrink-0'>
          <span className='text-18px'>🔌</span>
        </Avatar>

        {/* Plugin Info */}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-8px'>
            {getStateIndicator()}
            <span className='font-medium text-t-primary truncate'>{plugin.name}</span>
            <span className='text-12px text-t-secondary'>v{plugin.version}</span>
            {getSourceBadge()}
          </div>
          <div className='text-12px text-t-secondary truncate mt-2px'>{plugin.description || t('settings.pluginNoDescription', { defaultValue: 'No description' })}</div>
          {hasError && <div className='text-12px text-red-500 truncate mt-2px'>{plugin.error}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className='flex items-center gap-12px flex-shrink-0 ml-12px'>
        <Switch size='small' checked={isActive} loading={isLoading} disabled={isLoading} onChange={(checked) => onToggle(plugin.id, checked)} onClick={(e) => e.stopPropagation()} />

        <Button type='text' size='small' icon={<SettingOne size={16} />} onClick={() => onSettings(plugin)} disabled={isLoading} />

        {!isBuiltin && <Button type='text' size='small' status='danger' icon={<Delete size={16} />} onClick={() => onUninstall(plugin.id)} disabled={isLoading} />}
      </div>
    </div>
  );
};

export default PluginItem;
