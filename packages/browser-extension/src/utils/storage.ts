/**
 * Chrome storage utilities
 */

export interface ExtensionSettings {
  apiKey?: string;
  defaultCampaignId?: string;
  defaultTags?: string[];
  autoShorten: boolean;
  showNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

const defaultSettings: ExtensionSettings = {
  autoShorten: false,
  showNotifications: true,
  theme: 'system',
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(['settings']);
  return { ...defaultSettings, ...result.settings };
}

export async function updateSettings(
  updates: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const newSettings = { ...current, ...updates };
  await chrome.storage.sync.set({ settings: newSettings });
  return newSettings;
}

export async function getRecentUrls(): Promise<string[]> {
  const result = await chrome.storage.local.get(['recentUrls']);
  return result.recentUrls || [];
}

export async function addRecentUrl(url: string): Promise<void> {
  const recent = await getRecentUrls();
  const updated = [url, ...recent.filter(u => u !== url)].slice(0, 10);
  await chrome.storage.local.set({ recentUrls: updated });
}

export async function clearRecentUrls(): Promise<void> {
  await chrome.storage.local.remove(['recentUrls']);
}
