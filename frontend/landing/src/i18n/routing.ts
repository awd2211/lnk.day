import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'zh-TW', 'ja', 'es', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});
