import React, { useState, useEffect } from 'react';
import { Link } from '../utils/api';

type View = 'main' | 'settings' | 'history';

export function Popup() {
  const [view, setView] = useState<View>('main');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const result = await chrome.storage.sync.get(['apiKey']);
    setIsAuthenticated(!!result.apiKey);
    setIsLoading(false);
  }

  async function handleLogin() {
    if (!apiKey.trim()) return;

    setIsLoading(true);
    const response = await chrome.runtime.sendMessage({
      type: 'VALIDATE_API_KEY',
      payload: { apiKey: apiKey.trim() },
    });

    if (response.valid) {
      await chrome.runtime.sendMessage({
        type: 'SET_API_KEY',
        payload: { apiKey: apiKey.trim() },
      });
      setIsAuthenticated(true);
    } else {
      alert('Invalid API key');
    }
    setIsLoading(false);
  }

  async function handleLogout() {
    await chrome.storage.sync.remove(['apiKey']);
    setIsAuthenticated(false);
    setApiKey('');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-white">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">lnk</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">lnk.day</h1>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your API key to start shortening links.
          </p>

          <input
            type="password"
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleLogin}
            disabled={!apiKey.trim()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>

          <p className="text-xs text-gray-500 text-center">
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
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">lnk</span>
          </div>
          <span className="font-semibold text-gray-900">lnk.day</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('history')}
            className={`p-2 rounded-lg ${view === 'history' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            title="History"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setView('settings')}
            className={`p-2 rounded-lg ${view === 'settings' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            title="Settings"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'main' && <MainView />}
      {view === 'history' && <HistoryView onBack={() => setView('main')} />}
      {view === 'settings' && <SettingsView onBack={() => setView('main')} onLogout={handleLogout} />}
    </div>
  );
}

function MainView() {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Link | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadCurrentTab();
  }, []);

  async function loadCurrentTab() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' });
    if (response.url && !response.url.startsWith('chrome://')) {
      setUrl(response.url);
      setTitle(response.title || '');
    }
  }

  async function handleShorten() {
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_LINK',
        payload: {
          originalUrl: url.trim(),
          customCode: customCode.trim() || undefined,
          title: title.trim() || undefined,
        },
      });

      if (response.error) {
        setError(response.error);
      } else {
        setResult(response);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to shorten link');
    }

    setIsLoading(false);
  }

  async function handleCopy() {
    if (!result) return;

    await chrome.runtime.sendMessage({
      type: 'COPY_TO_CLIPBOARD',
      payload: { text: result.shortUrl },
    });

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setResult(null);
    setCustomCode('');
    loadCurrentTab();
  }

  if (result) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Link Shortened!</h3>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium hover:underline truncate"
            >
              {result.shortUrl}
            </a>
            <button
              onClick={handleCopy}
              className={`ml-2 p-2 rounded-lg transition-colors ${
                copied ? 'bg-green-100 text-green-600' : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{result.originalUrl}</p>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Shorten Another Link
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL to shorten
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/long-url"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg
          className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Advanced options
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-2 border-l-2 border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom code (optional)
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm">lnk.day/</span>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                placeholder="my-link"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link title for reference"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      )}

      <button
        onClick={handleShorten}
        disabled={!url.trim() || isLoading}
        className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Shortening...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Shorten Link
          </>
        )}
      </button>
    </div>
  );
}

function HistoryView({ onBack }: { onBack: () => void }) {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RECENT_LINKS',
        payload: { limit: 10 },
      });
      setLinks(response.error ? [] : response);
    } catch {
      setLinks([]);
    }
    setIsLoading(false);
  }

  async function handleCopy(url: string) {
    await chrome.runtime.sendMessage({
      type: 'COPY_TO_CLIPBOARD',
      payload: { text: url },
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-semibold text-gray-900">Recent Links</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : links.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p>No links yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {links.map((link) => (
            <div key={link.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm font-medium hover:underline truncate"
                >
                  {link.shortUrl.replace('https://', '')}
                </a>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{link.clicks} clicks</span>
                  <button
                    onClick={() => handleCopy(link.shortUrl)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {link.title || link.originalUrl}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsView({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-semibold text-gray-900">Settings</h2>
      </div>

      <div className="p-4 space-y-4">
        <a
          href="https://lnk.day/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
        >
          <span className="text-sm text-gray-700">Open Dashboard</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <a
          href="https://lnk.day/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
        >
          <span className="text-sm text-gray-700">Manage API Keys</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full py-2 px-4 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            Disconnect
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          lnk.day Extension v1.0.0
        </p>
      </div>
    </div>
  );
}
