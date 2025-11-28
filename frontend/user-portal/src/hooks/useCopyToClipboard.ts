import { useState, useCallback } from 'react';

interface CopyResult {
  success: boolean;
  error?: Error;
}

/**
 * Hook for copying text to clipboard with feedback
 */
export function useCopyToClipboard(resetDelay: number = 2000): {
  copied: boolean;
  copy: (text: string) => Promise<CopyResult>;
  reset: () => void;
} {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<CopyResult> => {
      if (!navigator?.clipboard) {
        // Fallback for older browsers
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-999999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopied(true);
          setTimeout(() => setCopied(false), resetDelay);
          return { success: true };
        } catch (error) {
          return { success: false, error: error as Error };
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
        return { success: true };
      } catch (error) {
        setCopied(false);
        return { success: false, error: error as Error };
      }
    },
    [resetDelay]
  );

  const reset = useCallback(() => {
    setCopied(false);
  }, []);

  return { copied, copy, reset };
}

/**
 * Hook to copy with specific ID tracking (useful for lists)
 */
export function useCopyWithId(resetDelay: number = 2000): {
  copiedId: string | null;
  copy: (id: string, text: string) => Promise<CopyResult>;
  reset: () => void;
} {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback(
    async (id: string, text: string): Promise<CopyResult> => {
      if (!navigator?.clipboard) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-999999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), resetDelay);
          return { success: true };
        } catch (error) {
          return { success: false, error: error as Error };
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), resetDelay);
        return { success: true };
      } catch (error) {
        setCopiedId(null);
        return { success: false, error: error as Error };
      }
    },
    [resetDelay]
  );

  const reset = useCallback(() => {
    setCopiedId(null);
  }, []);

  return { copiedId, copy, reset };
}
