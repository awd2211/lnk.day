import React, { useState, useEffect } from 'react';
import { ExtensionSettings, getSettings, updateSettings } from '../utils/storage';

export function Options() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const loadedSettings = await getSettings();
    setSettings(loadedSettings);

    const result = await chrome.storage.sync.get(['apiKey']);
    if (result.apiKey) {
      setApiKey('••••••••••••••••');
      setIsConnected(true);
    }
  }

  async function handleSaveApiKey() {
    if (!apiKey.trim() || apiKey.startsWith('•')) return;

    setIsSaving(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VALIDATE_API_KEY',
        payload: { apiKey: apiKey.trim() },
      });

      if (response.valid) {
        await chrome.runtime.sendMessage({
          type: 'SET_API_KEY',
          payload: { apiKey: apiKey.trim() },
        });
        setIsConnected(true);
        setApiKey('••••••••••••••••');
        setMessage({ type: 'success', text: 'API key saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Invalid API key. Please check and try again.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to validate API key' });
    }
    setIsSaving(false);
  }

  async function handleDisconnect() {
    await chrome.storage.sync.remove(['apiKey']);
    setIsConnected(false);
    setApiKey('');
    setMessage({ type: 'success', text: 'Disconnected from lnk.day' });
  }

  async function handleSettingChange(key: keyof ExtensionSettings, value: any) {
    if (!settings) return;
    const newSettings = await updateSettings({ [key]: value });
    setSettings(newSettings);
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">lnk</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">lnk.day Extension</h1>
          <p className="text-gray-500">Configure your extension settings</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* API Key Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Connection</h2>

        {isConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Connected</p>
                <p className="text-sm text-gray-500">Your extension is connected to lnk.day</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Enter your API key to connect this extension to your lnk.day account.
            </p>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim() || isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Get your API key from{' '}
              <a
                href="https://lnk.day/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                lnk.day/settings/api
              </a>
            </p>
          </div>
        )}
      </section>

      {/* General Settings */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Notifications</p>
              <p className="text-sm text-gray-500">Display notifications when links are created</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showNotifications}
                onChange={(e) => handleSettingChange('showNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Theme</p>
              <p className="text-sm text-gray-500">Choose your preferred theme</p>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Keyboard Shortcuts</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Shorten current page</span>
            <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
              Ctrl+Shift+L
            </kbd>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Open extension popup</span>
            <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
              Ctrl+Shift+K
            </kbd>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          You can customize keyboard shortcuts in{' '}
          <a
            href="chrome://extensions/shortcuts"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            }}
          >
            Chrome Extension Settings
          </a>
        </p>
      </section>

      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>lnk.day Extension v1.0.0</p>
        <p className="mt-1">
          <a href="https://lnk.day/help" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Help Center
          </a>
          {' · '}
          <a href="https://lnk.day/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
}
