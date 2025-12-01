/**
 * Centralized configuration for console-dashboard
 * All configurable values should be defined here
 */

// Short link domain - used for displaying short URLs
export const SHORT_LINK_DOMAIN = import.meta.env.VITE_SHORT_LINK_DOMAIN || 'lnk.day';

// Full short link base URL (with protocol)
export const SHORT_LINK_BASE_URL = import.meta.env.VITE_SHORT_LINK_BASE_URL || `https://${SHORT_LINK_DOMAIN}`;

// Console service API URL
export const CONSOLE_SERVICE_URL = import.meta.env.VITE_CONSOLE_SERVICE_URL || 'http://localhost:60009/api/v1';

// Helper function to build short link URL
export function buildShortUrl(shortCode: string): string {
  return `${SHORT_LINK_BASE_URL}/${shortCode}`;
}

// Helper function to build page URL
export function buildPageUrl(slug: string): string {
  return `${SHORT_LINK_BASE_URL}/${slug}`;
}

// Helper function to format short URL for display (domain/shortCode format)
export function formatShortUrl(shortCode: string): string {
  return `${SHORT_LINK_DOMAIN}/${shortCode}`;
}
