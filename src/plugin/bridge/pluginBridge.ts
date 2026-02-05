/**
 * Plugin IPC Bridge
 *
 * Exposes plugin management operations to the renderer process via
 * the existing IPC bridge pattern used throughout AionUi.
 *
 * This module registers handlers for plugin-related IPC channels so
 * the settings UI can install, activate, and configure plugins.
 */

import { ipcMain } from 'electron';

import type { PluginManager } from '../PluginManager';
import type { PluginPermission, PluginRegistryEntry } from '../types';

// ─── IPC Channel Names ───────────────────────────────────────────────────────

export const PLUGIN_CHANNELS = {
  // Query
  LIST: 'plugin:list',
  GET: 'plugin:get',
  LIST_ACTIVE: 'plugin:list-active',

  // Installation
  INSTALL_NPM: 'plugin:install-npm',
  INSTALL_GITHUB: 'plugin:install-github',
  INSTALL_LOCAL: 'plugin:install-local',
  UNINSTALL: 'plugin:uninstall',

  // Lifecycle
  ACTIVATE: 'plugin:activate',
  DEACTIVATE: 'plugin:deactivate',

  // Settings & Permissions
  UPDATE_SETTINGS: 'plugin:update-settings',
  GRANT_PERMISSIONS: 'plugin:grant-permissions',
  REVOKE_PERMISSIONS: 'plugin:revoke-permissions',

  // Updates
  CHECK_UPDATES: 'plugin:check-updates',

  // Events (main → renderer)
  PLUGIN_ACTIVATED: 'plugin:event:activated',
  PLUGIN_DEACTIVATED: 'plugin:event:deactivated',
  PLUGIN_ERROR: 'plugin:event:error',
} as const;

// ─── Bridge Response Type ────────────────────────────────────────────────────

interface BridgeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Bridge Initialization ───────────────────────────────────────────────────

/**
 * Initialize the plugin IPC bridge.
 * Call this during main process bridge initialization (initAllBridges).
 */
export function initPluginBridge(pluginManager: PluginManager): void {
  // ── Query Handlers ──────────────────────────────────────────────────────

  ipcMain.handle(PLUGIN_CHANNELS.LIST, async (): Promise<BridgeResponse<PluginRegistryEntry[]>> => {
    try {
      return { success: true, data: pluginManager.getPlugins() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    PLUGIN_CHANNELS.GET,
    async (_, pluginId: string): Promise<BridgeResponse<PluginRegistryEntry | undefined>> => {
      try {
        return { success: true, data: pluginManager.getPlugin(pluginId) };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.LIST_ACTIVE,
    async (): Promise<BridgeResponse<PluginRegistryEntry[]>> => {
      try {
        return { success: true, data: pluginManager.getActivePlugins() };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // ── Installation Handlers ───────────────────────────────────────────────

  ipcMain.handle(
    PLUGIN_CHANNELS.INSTALL_NPM,
    async (_, params: { packageName: string; version?: string }): Promise<BridgeResponse<{ pluginId: string }>> => {
      try {
        const result = await pluginManager.installFromNpm(params.packageName, params.version);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, data: { pluginId: result.pluginId! } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.INSTALL_GITHUB,
    async (_, params: { repo: string; ref?: string }): Promise<BridgeResponse<{ pluginId: string }>> => {
      try {
        const result = await pluginManager.installFromGithub(params.repo, params.ref);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, data: { pluginId: result.pluginId! } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.INSTALL_LOCAL,
    async (_, params: { dirPath: string }): Promise<BridgeResponse<{ pluginId: string }>> => {
      try {
        const result = await pluginManager.installFromLocal(params.dirPath);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        return { success: true, data: { pluginId: result.pluginId! } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.UNINSTALL,
    async (_, pluginId: string): Promise<BridgeResponse> => {
      try {
        return await pluginManager.uninstall(pluginId);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // ── Lifecycle Handlers ──────────────────────────────────────────────────

  ipcMain.handle(
    PLUGIN_CHANNELS.ACTIVATE,
    async (_, pluginId: string): Promise<BridgeResponse> => {
      try {
        return await pluginManager.activatePlugin(pluginId);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.DEACTIVATE,
    async (_, pluginId: string): Promise<BridgeResponse> => {
      try {
        return await pluginManager.deactivatePlugin(pluginId);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // ── Settings & Permissions Handlers ─────────────────────────────────────

  ipcMain.handle(
    PLUGIN_CHANNELS.UPDATE_SETTINGS,
    async (_, params: { pluginId: string; settings: Record<string, unknown> }): Promise<BridgeResponse> => {
      try {
        return await pluginManager.updatePluginSettings(params.pluginId, params.settings);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.GRANT_PERMISSIONS,
    async (_, params: { pluginId: string; permissions: PluginPermission[] }): Promise<BridgeResponse> => {
      try {
        return await pluginManager.grantPermissions(params.pluginId, params.permissions);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    PLUGIN_CHANNELS.REVOKE_PERMISSIONS,
    async (_, params: { pluginId: string; permissions: PluginPermission[] }): Promise<BridgeResponse> => {
      try {
        return await pluginManager.revokePermissions(params.pluginId, params.permissions);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // ── Update Check Handler ────────────────────────────────────────────────

  ipcMain.handle(
    PLUGIN_CHANNELS.CHECK_UPDATES,
    async (): Promise<BridgeResponse<Array<{ pluginId: string; currentVersion: string; latestVersion: string }>>> => {
      try {
        const updates = await pluginManager.checkForUpdates();
        return { success: true, data: updates };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // ── Forward Plugin Events to Renderer ───────────────────────────────────

  pluginManager.on('plugin:activated', (data) => {
    // BrowserWindow.getAllWindows() can be used to broadcast to all windows
    const { BrowserWindow } = require('electron');
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(PLUGIN_CHANNELS.PLUGIN_ACTIVATED, data);
    }
  });

  pluginManager.on('plugin:deactivated', (data) => {
    const { BrowserWindow } = require('electron');
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(PLUGIN_CHANNELS.PLUGIN_DEACTIVATED, data);
    }
  });
}
