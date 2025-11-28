import { useState, useEffect } from 'react';

/**
 * Hook to check if a media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    return undefined;
  }, [query]);

  return matches;
}

/**
 * Common breakpoint hooks based on Tailwind defaults
 */
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 640px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px)') && !useMediaQuery('(min-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/**
 * Check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Check if user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
