import { useEffect, useCallback, useRef } from 'react';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';
type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  modifiers?: ModifierKey[];
  handler: KeyHandler;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  scope?: string;
}

/**
 * Check if the event target is an input element where shortcuts should be ignored
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

/**
 * Check if modifier keys match the shortcut configuration
 */
function modifiersMatch(event: KeyboardEvent, modifiers: ModifierKey[] = []): boolean {
  const hasCtrl = modifiers.includes('ctrl');
  const hasAlt = modifiers.includes('alt');
  const hasShift = modifiers.includes('shift');
  const hasMeta = modifiers.includes('meta');

  return (
    event.ctrlKey === hasCtrl &&
    event.altKey === hasAlt &&
    event.shiftKey === hasShift &&
    event.metaKey === hasMeta
  );
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if typing in an input
      if (isInputElement(event.target)) return;

      for (const shortcut of shortcutsRef.current) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifiersOk = modifiersMatch(event, shortcut.modifiers);

        if (keyMatches && modifiersOk) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common shortcut configurations for the app
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  goToDashboard: {
    key: 'd',
    modifiers: ['ctrl', 'shift'] as ModifierKey[],
    description: '前往仪表盘',
  },
  goToLinks: {
    key: 'l',
    modifiers: ['ctrl', 'shift'] as ModifierKey[],
    description: '前往链接管理',
  },
  goToAnalytics: {
    key: 'a',
    modifiers: ['ctrl', 'shift'] as ModifierKey[],
    description: '前往数据分析',
  },
  goToSettings: {
    key: 's',
    modifiers: ['ctrl', 'shift'] as ModifierKey[],
    description: '前往设置',
  },

  // Actions
  newLink: {
    key: 'n',
    modifiers: ['ctrl'] as ModifierKey[],
    description: '创建新链接',
  },
  search: {
    key: 'k',
    modifiers: ['ctrl'] as ModifierKey[],
    description: '搜索',
  },
  save: {
    key: 's',
    modifiers: ['ctrl'] as ModifierKey[],
    description: '保存',
  },
  escape: {
    key: 'Escape',
    modifiers: [] as ModifierKey[],
    description: '取消/关闭',
  },
};

/**
 * Hook for using common app shortcuts
 */
export function useAppShortcuts(handlers: {
  onNewLink?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onEscape?: () => void;
  onNavigate?: (path: string) => void;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (handlers.onNewLink) {
    shortcuts.push({
      ...COMMON_SHORTCUTS.newLink,
      handler: handlers.onNewLink,
    });
  }

  if (handlers.onSearch) {
    shortcuts.push({
      ...COMMON_SHORTCUTS.search,
      handler: handlers.onSearch,
    });
  }

  if (handlers.onSave) {
    shortcuts.push({
      ...COMMON_SHORTCUTS.save,
      handler: handlers.onSave,
    });
  }

  if (handlers.onEscape) {
    shortcuts.push({
      ...COMMON_SHORTCUTS.escape,
      handler: handlers.onEscape,
    });
  }

  if (handlers.onNavigate) {
    shortcuts.push(
      {
        ...COMMON_SHORTCUTS.goToDashboard,
        handler: () => handlers.onNavigate!('/dashboard'),
      },
      {
        ...COMMON_SHORTCUTS.goToLinks,
        handler: () => handlers.onNavigate!('/links'),
      },
      {
        ...COMMON_SHORTCUTS.goToAnalytics,
        handler: () => handlers.onNavigate!('/analytics'),
      },
      {
        ...COMMON_SHORTCUTS.goToSettings,
        handler: () => handlers.onNavigate!('/settings'),
      }
    );
  }

  useKeyboardShortcuts(shortcuts);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(key: string, modifiers: ModifierKey[] = []): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  const modifierSymbols: Record<ModifierKey, string> = {
    ctrl: isMac ? '⌃' : 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: '⇧',
    meta: isMac ? '⌘' : 'Win',
  };

  const parts = modifiers.map((m) => modifierSymbols[m]);
  parts.push(key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
