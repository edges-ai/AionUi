/**
 * AddPluginModal — Modal for installing new plugins.
 *
 * Supports installing from:
 * - npm package (e.g., @aionui/plugin-example)
 * - GitHub repository (e.g., owner/repo)
 * - Local directory (file path)
 */

import { Button, Input, Modal, Radio, Typography } from '@arco-design/web-react';
import { FolderOpen } from '@icon-park/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';

type InstallSource = 'npm' | 'github' | 'local';

interface AddPluginModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (pluginId: string) => void;
  message: ReturnType<typeof import('@arco-design/web-react').Message.useMessage>[0];
}

const AddPluginModal: React.FC<AddPluginModalProps> = ({ visible, onCancel, onSuccess, message }) => {
  const { t } = useTranslation();
  const [source, setSource] = useState<InstallSource>('npm');
  const [npmPackage, setNpmPackage] = useState('');
  const [npmVersion, setNpmVersion] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubRef, setGithubRef] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      let result;

      switch (source) {
        case 'npm':
          if (!npmPackage.trim()) {
            message.warning(t('settings.pluginNpmRequired', { defaultValue: 'Please enter an npm package name' }));
            setInstalling(false);
            return;
          }
          result = await ipcBridge.plugin.installNpm.invoke({
            packageName: npmPackage.trim(),
            version: npmVersion.trim() || undefined,
          });
          break;

        case 'github':
          if (!githubRepo.trim()) {
            message.warning(t('settings.pluginGithubRequired', { defaultValue: 'Please enter a GitHub repository (owner/repo)' }));
            setInstalling(false);
            return;
          }
          result = await ipcBridge.plugin.installGithub.invoke({
            repo: githubRepo.trim(),
            ref: githubRef.trim() || undefined,
          });
          break;

        case 'local':
          if (!localPath.trim()) {
            message.warning(t('settings.pluginLocalRequired', { defaultValue: 'Please select a local plugin directory' }));
            setInstalling(false);
            return;
          }
          result = await ipcBridge.plugin.installLocal.invoke({
            dirPath: localPath.trim(),
          });
          break;
      }

      if (result?.success && result.data?.pluginId) {
        message.success(t('settings.pluginInstallSuccess', { defaultValue: 'Plugin installed successfully' }));
        onSuccess(result.data.pluginId);
        handleClose();
      } else {
        message.error(result?.msg || t('settings.pluginInstallFailed', { defaultValue: 'Failed to install plugin' }));
      }
    } catch (error) {
      console.error('Plugin installation error:', error);
      message.error(t('settings.pluginInstallFailed', { defaultValue: 'Failed to install plugin' }));
    } finally {
      setInstalling(false);
    }
  };

  const handleClose = () => {
    setNpmPackage('');
    setNpmVersion('');
    setGithubRepo('');
    setGithubRef('');
    setLocalPath('');
    onCancel();
  };

  const handleBrowseLocal = async () => {
    try {
      const result = await ipcBridge.dialog.showOpen.invoke({
        properties: ['openDirectory'],
      });
      if (result && result.length > 0) {
        setLocalPath(result[0]);
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
    }
  };

  return (
    <Modal
      title={t('settings.pluginInstall', { defaultValue: 'Install Plugin' })}
      visible={visible}
      onCancel={handleClose}
      onOk={handleInstall}
      okText={t('settings.pluginInstallButton', { defaultValue: 'Install' })}
      cancelText={t('common.cancel', { defaultValue: 'Cancel' })}
      confirmLoading={installing}
      style={{ width: 500 }}
    >
      <div className='space-y-20px'>
        {/* Source Selection */}
        <div>
          <Typography.Text className='mb-8px block'>{t('settings.pluginSource', { defaultValue: 'Install From' })}</Typography.Text>
          <Radio.Group value={source} onChange={(val) => setSource(val as InstallSource)} className='flex gap-16px'>
            <Radio value='npm'>npm</Radio>
            <Radio value='github'>GitHub</Radio>
            <Radio value='local'>{t('settings.pluginLocalDir', { defaultValue: 'Local Directory' })}</Radio>
          </Radio.Group>
        </div>

        {/* npm Input */}
        {source === 'npm' && (
          <div className='space-y-12px'>
            <div>
              <Typography.Text className='mb-8px block'>
                {t('settings.pluginNpmPackage', { defaultValue: 'Package Name' })} <span className='text-red-500'>*</span>
              </Typography.Text>
              <Input value={npmPackage} onChange={setNpmPackage} placeholder='@aionui/plugin-example' />
            </div>
            <div>
              <Typography.Text className='mb-8px block'>{t('settings.pluginVersion', { defaultValue: 'Version (optional)' })}</Typography.Text>
              <Input value={npmVersion} onChange={setNpmVersion} placeholder='latest' />
            </div>
          </div>
        )}

        {/* GitHub Input */}
        {source === 'github' && (
          <div className='space-y-12px'>
            <div>
              <Typography.Text className='mb-8px block'>
                {t('settings.pluginGithubRepo', { defaultValue: 'Repository' })} <span className='text-red-500'>*</span>
              </Typography.Text>
              <Input value={githubRepo} onChange={setGithubRepo} placeholder='owner/repo' />
            </div>
            <div>
              <Typography.Text className='mb-8px block'>{t('settings.pluginGithubRef', { defaultValue: 'Branch/Tag (optional)' })}</Typography.Text>
              <Input value={githubRef} onChange={setGithubRef} placeholder='main' />
            </div>
          </div>
        )}

        {/* Local Directory Input */}
        {source === 'local' && (
          <div>
            <Typography.Text className='mb-8px block'>
              {t('settings.pluginLocalPath', { defaultValue: 'Plugin Directory' })} <span className='text-red-500'>*</span>
            </Typography.Text>
            <Input.Group className='flex items-center gap-8px'>
              <Input value={localPath} onChange={setLocalPath} placeholder='/path/to/plugin' className='flex-1' />
              <Button type='outline' icon={<FolderOpen size={16} />} onClick={handleBrowseLocal}>
                {t('common.browse', { defaultValue: 'Browse' })}
              </Button>
            </Input.Group>
          </div>
        )}

        {/* Help Text */}
        <div className='text-12px text-t-secondary bg-fill-2 p-12px rounded-lg'>
          {source === 'npm' && t('settings.pluginNpmHelp', { defaultValue: 'Install plugins from the npm registry. Enter the package name, e.g., @aionui/plugin-example' })}
          {source === 'github' && t('settings.pluginGithubHelp', { defaultValue: 'Install plugins directly from a GitHub repository. Enter the repo in owner/repo format.' })}
          {source === 'local' && t('settings.pluginLocalHelp', { defaultValue: 'Install a plugin from a local directory. The directory must contain a valid plugin manifest.' })}
        </div>
      </div>
    </Modal>
  );
};

export default AddPluginModal;
