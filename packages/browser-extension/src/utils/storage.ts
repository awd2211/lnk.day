/**
 * Chrome storage utilities
 */

export interface ExtensionSettings {
  apiKey?: string;
  defaultCampaignId?: string;
  defaultFolderId?: string;
  defaultTags?: string[];
  defaultDomain?: string;
  autoShorten: boolean;
  autoCopy: boolean;
  showNotifications: boolean;
  showBadge: boolean;
  highlightLinks: boolean;
  theme: 'light' | 'dark' | 'system';
  qrCodeDefaults: {
    size: number;
    color: string;
    backgroundColor: string;
    format: 'png' | 'svg';
  };
}

const defaultSettings: ExtensionSettings = {
  autoShorten: false,
  autoCopy: true,
  showNotifications: true,
  showBadge: true,
  highlightLinks: false,
  theme: 'system',
  qrCodeDefaults: {
    size: 200,
    color: '000000',
    backgroundColor: 'ffffff',
    format: 'png',
  },
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

// Link history management
export interface LinkHistoryItem {
  id: string;
  shortUrl: string;
  originalUrl: string;
  title?: string;
  createdAt: string;
}

export async function getLinkHistory(): Promise<LinkHistoryItem[]> {
  const result = await chrome.storage.local.get(['linkHistory']);
  return result.linkHistory || [];
}

export async function addToLinkHistory(link: LinkHistoryItem): Promise<void> {
  const history = await getLinkHistory();
  const updated = [link, ...history.filter(h => h.id !== link.id)].slice(0, 50);
  await chrome.storage.local.set({ linkHistory: updated });
}

export async function clearLinkHistory(): Promise<void> {
  await chrome.storage.local.remove(['linkHistory']);
}

// Usage statistics
export interface UsageStats {
  linksCreated: number;
  qrCodesGenerated: number;
  linksCopied: number;
  lastActive: string;
}

export async function getUsageStats(): Promise<UsageStats> {
  const result = await chrome.storage.local.get(['usageStats']);
  return result.usageStats || {
    linksCreated: 0,
    qrCodesGenerated: 0,
    linksCopied: 0,
    lastActive: new Date().toISOString(),
  };
}

export async function incrementUsageStat(
  stat: keyof Omit<UsageStats, 'lastActive'>
): Promise<void> {
  const stats = await getUsageStats();
  stats[stat]++;
  stats.lastActive = new Date().toISOString();
  await chrome.storage.local.set({ usageStats: stats });
}

// Favorites management
export async function getFavorites(): Promise<string[]> {
  const result = await chrome.storage.sync.get(['favorites']);
  return result.favorites || [];
}

export async function addFavorite(linkId: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(linkId)) {
    await chrome.storage.sync.set({ favorites: [...favorites, linkId] });
  }
}

export async function removeFavorite(linkId: string): Promise<void> {
  const favorites = await getFavorites();
  await chrome.storage.sync.set({
    favorites: favorites.filter(id => id !== linkId),
  });
}

export async function isFavorite(linkId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(linkId);
}
