/**
 * PluginManagement — Main plugin management page.
 *
 * Provides a unified interface for:
 * - Viewing installed plugins (both built-in and user-installed)
 * - Installing new plugins from npm, GitHub, or local directories
 * - Activating/deactivating plugins
 * - Managing plugin settings
 * - Uninstalling user-installed plugins
 *
 * Follows the styling patterns of McpManagement and AssistantManagement.
 */

import { Button, Collapse, Modal, Drawer, Typography, Empty, Spin } from '@arco-design/web-react';
import { Plus, Refresh, Close } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import type { PluginRegistryEntry } from '@/common/ipcBridge';
import PluginItem from './PluginItem';
import AddPluginModal from './AddPluginModal';

interface PluginManagementProps {
  message: ReturnType<typeof import('@arco-design/web-react').Message.useMessage>[0];
}

const PluginManagement: React.FC<PluginManagementProps> = ({ message }) => {
  const { t } = useTranslation();

  // State
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlugins, setLoadingPlugins] = useState<Record<string, boolean>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginRegistryEntry | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pluginToDelete, setPluginToDelete] = useState<string | null>(null);

  // Load plugins
  const loadPlugins = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ipcBridge.plugin.list.invoke();
      if (result.success && result.data) {
        // Sort: builtin first, then by name
        const sorted = [...result.data].sort((a, b) => {
          if (a.source === 'builtin' && b.source !== 'builtin') return -1;
          if (a.source !== 'builtin' && b.source === 'builtin') return 1;
          return a.name.localeCompare(b.name);
        });
        setPlugins(sorted);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
      message.error(t('settings.pluginLoadFailed', { defaultValue: 'Failed to load plugins' }));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void loadPlugins();
  }, [loadPlugins]);

  // Listen for plugin events
  useEffect(() => {
    const unsubActivated = ipcBridge.plugin.onActivated.on(() => {
      void loadPlugins();
    });
    const unsubDeactivated = ipcBridge.plugin.onDeactivated.on(() => {
      void loadPlugins();
    });
    const unsubError = ipcBridge.plugin.onError.on(({ pluginId, error }) => {
      message.error(`Plugin ${pluginId}: ${error}`);
      void loadPlugins();
    });

    return () => {
      unsubActivated();
      unsubDeactivated();
      unsubError();
    };
  }, [loadPlugins, message]);

  // Toggle plugin state
  const handleToggle = async (pluginId: string, enabled: boolean) => {
    setLoadingPlugins((prev) => ({ ...prev, [pluginId]: true }));
    try {
      const result = enabled ? await ipcBridge.plugin.activate.invoke(pluginId) : await ipcBridge.plugin.deactivate.invoke(pluginId);

      if (result.success) {
        message.success(enabled ? t('settings.pluginActivated', { defaultValue: 'Plugin activated' }) : t('settings.pluginDeactivated', { defaultValue: 'Plugin deactivated' }));
        await loadPlugins();
      } else {
        message.error(result.msg || t('settings.pluginToggleFailed', { defaultValue: 'Failed to toggle plugin' }));
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
      message.error(t('settings.pluginToggleFailed', { defaultValue: 'Failed to toggle plugin' }));
    } finally {
      setLoadingPlugins((prev) => ({ ...prev, [pluginId]: false }));
    }
  };

  // Open settings drawer
  const handleSettings = (plugin: PluginRegistryEntry) => {
    setSelectedPlugin(plugin);
    setSettingsDrawerVisible(true);
  };

  // Show uninstall confirmation
  const handleUninstallClick = (pluginId: string) => {
    setPluginToDelete(pluginId);
    setDeleteConfirmVisible(true);
  };

  // Confirm uninstall
  const handleUninstallConfirm = async () => {
    if (!pluginToDelete) return;

    setLoadingPlugins((prev) => ({ ...prev, [pluginToDelete]: true }));
    try {
      const result = await ipcBridge.plugin.uninstall.invoke(pluginToDelete);
      if (result.success) {
        message.success(t('settings.pluginUninstalled', { defaultValue: 'Plugin uninstalled' }));
        await loadPlugins();
      } else {
        message.error(result.msg || t('settings.pluginUninstallFailed', { defaultValue: 'Failed to uninstall plugin' }));
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      message.error(t('settings.pluginUninstallFailed', { defaultValue: 'Failed to uninstall plugin' }));
    } finally {
      setLoadingPlugins((prev) => ({ ...prev, [pluginToDelete]: false }));
      setDeleteConfirmVisible(false);
      setPluginToDelete(null);
    }
  };

  // Handle successful plugin installation
  const handleInstallSuccess = async () => {
    await loadPlugins();
  };

  // Separate builtin and user-installed plugins
  const builtinPlugins = plugins.filter((p) => p.source === 'builtin');
  const userPlugins = plugins.filter((p) => p.source !== 'builtin');

  return (
    <div>
      <Collapse.Item
        className='[&_div.arco-collapse-item-header-title]:flex-1'
        header={
          <div className='flex items-center justify-between'>
            <span>{t('settings.plugins', { defaultValue: 'Plugins' })}</span>
            <div className='flex items-center gap-8px'>
              <Button type='text' size='small' icon={<Refresh size={14} />} loading={loading} onClick={(e) => { e.stopPropagation(); void loadPlugins(); }}>
                {t('common.refresh', { defaultValue: 'Refresh' })}
              </Button>
              <Button type='outline' icon={<Plus size={14} />} shape='round' onClick={(e) => { e.stopPropagation(); setAddModalVisible(true); }}>
                {t('settings.pluginInstall', { defaultValue: 'Install Plugin' })}
              </Button>
            </div>
          </div>
        }
        name='plugins'
      >
        {loading ? (
          <div className='flex justify-center py-32px'>
            <Spin />
          </div>
        ) : plugins.length === 0 ? (
          <Empty description={t('settings.pluginEmpty', { defaultValue: 'No plugins installed' })} className='py-32px' />
        ) : (
          <div className='space-y-16px'>
            {/* Built-in Plugins */}
            {builtinPlugins.length > 0 && (
              <div>
                <div className='text-12px text-t-secondary mb-8px font-medium'>{t('settings.pluginBuiltinSection', { defaultValue: 'Built-in Plugins' })}</div>
                <div className='bg-fill-2 rounded-16px p-16px space-y-8px'>
                  {builtinPlugins.map((plugin) => (
                    <PluginItem key={plugin.id} plugin={plugin} onToggle={handleToggle} onSettings={handleSettings} onUninstall={handleUninstallClick} isLoading={loadingPlugins[plugin.id]} />
                  ))}
                </div>
              </div>
            )}

            {/* User-installed Plugins */}
            {userPlugins.length > 0 && (
              <div>
                <div className='text-12px text-t-secondary mb-8px font-medium'>{t('settings.pluginUserSection', { defaultValue: 'Installed Plugins' })}</div>
                <div className='bg-fill-2 rounded-16px p-16px space-y-8px'>
                  {userPlugins.map((plugin) => (
                    <PluginItem key={plugin.id} plugin={plugin} onToggle={handleToggle} onSettings={handleSettings} onUninstall={handleUninstallClick} isLoading={loadingPlugins[plugin.id]} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for user plugins section */}
            {userPlugins.length === 0 && builtinPlugins.length > 0 && (
              <div className='text-center py-16px text-t-secondary text-12px'>
                {t('settings.pluginNoUserPlugins', { defaultValue: 'No user-installed plugins. Click "Install Plugin" to add one.' })}
              </div>
            )}
          </div>
        )}
      </Collapse.Item>

      {/* Add Plugin Modal */}
      <AddPluginModal visible={addModalVisible} onCancel={() => setAddModalVisible(false)} onSuccess={handleInstallSuccess} message={message} />

      {/* Plugin Settings Drawer */}
      <Drawer
        title={
          <>
            <span>{t('settings.pluginSettings', { defaultValue: 'Plugin Settings' })}</span>
            <div onClick={() => setSettingsDrawerVisible(false)} className='absolute right-4 top-2 cursor-pointer text-t-secondary hover:text-t-primary transition-colors p-1' style={{ zIndex: 10, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <Close size={18} />
            </div>
          </>
        }
        closable={false}
        visible={settingsDrawerVisible}
        placement='right'
        width={400}
        zIndex={2000}
        onCancel={() => setSettingsDrawerVisible(false)}
        headerStyle={{ background: 'var(--color-bg-1)' }}
        bodyStyle={{ background: 'var(--color-bg-1)' }}
        footer={null}
      >
        {selectedPlugin && (
          <div className='space-y-16px'>
            {/* Plugin Info */}
            <div className='bg-fill-2 rounded-12px p-16px'>
              <div className='flex items-center gap-12px mb-12px'>
                <div className='w-48px h-48px bg-fill-1 rounded-12px flex items-center justify-center'>
                  <span className='text-24px'>🔌</span>
                </div>
                <div>
                  <div className='font-medium text-t-primary text-16px'>{selectedPlugin.name}</div>
                  <div className='text-12px text-t-secondary'>v{selectedPlugin.version}</div>
                </div>
              </div>
              {selectedPlugin.description && <div className='text-13px text-t-secondary'>{selectedPlugin.description}</div>}
              {selectedPlugin.author && (
                <div className='text-12px text-t-secondary mt-8px'>
                  {t('settings.pluginAuthor', { defaultValue: 'Author' })}: {selectedPlugin.author}
                </div>
              )}
              {selectedPlugin.homepage && (
                <div className='text-12px mt-4px'>
                  <a href={selectedPlugin.homepage} target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>
                    {t('settings.pluginHomepage', { defaultValue: 'Homepage' })}
                  </a>
                </div>
              )}
            </div>

            {/* Permissions */}
            {selectedPlugin.permissions && selectedPlugin.permissions.length > 0 && (
              <div>
                <Typography.Text bold className='mb-8px block'>
                  {t('settings.pluginPermissions', { defaultValue: 'Permissions' })}
                </Typography.Text>
                <div className='bg-fill-2 rounded-12px p-12px'>
                  <div className='space-y-4px'>
                    {selectedPlugin.permissions.map((perm) => (
                      <div key={perm} className='text-13px text-t-secondary flex items-center gap-8px'>
                        <span className={selectedPlugin.grantedPermissions?.includes(perm) ? 'text-green-500' : 'text-orange-500'}>{selectedPlugin.grantedPermissions?.includes(perm) ? '✓' : '○'}</span>
                        {perm}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Plugin State Info */}
            <div>
              <Typography.Text bold className='mb-8px block'>
                {t('settings.pluginInfo', { defaultValue: 'Information' })}
              </Typography.Text>
              <div className='bg-fill-2 rounded-12px p-12px space-y-8px text-13px'>
                <div className='flex justify-between'>
                  <span className='text-t-secondary'>{t('settings.pluginState', { defaultValue: 'State' })}</span>
                  <span className={selectedPlugin.state === 'active' ? 'text-green-500' : selectedPlugin.state === 'error' ? 'text-red-500' : 'text-t-secondary'}>{selectedPlugin.state}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-t-secondary'>{t('settings.pluginSource', { defaultValue: 'Source' })}</span>
                  <span className='text-t-primary'>{selectedPlugin.source}</span>
                </div>
                {selectedPlugin.installedAt && (
                  <div className='flex justify-between'>
                    <span className='text-t-secondary'>{t('settings.pluginInstalledAt', { defaultValue: 'Installed' })}</span>
                    <span className='text-t-primary'>{new Date(selectedPlugin.installedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Uninstall Confirmation Modal */}
      <Modal title={t('settings.pluginUninstallTitle', { defaultValue: 'Uninstall Plugin' })} visible={deleteConfirmVisible} onCancel={() => setDeleteConfirmVisible(false)} onOk={handleUninstallConfirm} okButtonProps={{ status: 'danger' }} okText={t('common.uninstall', { defaultValue: 'Uninstall' })} cancelText={t('common.cancel', { defaultValue: 'Cancel' })} style={{ width: 400 }}>
        <p>{t('settings.pluginUninstallConfirm', { defaultValue: 'Are you sure you want to uninstall this plugin? This action cannot be undone.' })}</p>
        {pluginToDelete && (
          <div className='mt-12px p-12px bg-fill-2 rounded-lg'>
            <div className='font-medium'>{plugins.find((p) => p.id === pluginToDelete)?.name}</div>
            <div className='text-12px text-t-secondary'>{plugins.find((p) => p.id === pluginToDelete)?.description}</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PluginManagement;
