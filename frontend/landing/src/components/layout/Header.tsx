'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  QrCode,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  Globe,
  Megaphone,
  Building2,
  ShoppingBag,
  Newspaper,
  Cpu,
} from 'lucide-react';

export default function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const fullPathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const otherLocale = locale === 'en' ? 'zh' : 'en';
  // Remove locale prefix from pathname for Link component
  const pathname = fullPathname.replace(/^\/(en|zh)/, '') || '/';

  const productLinks = [
    { href: '/products/url-shortener', icon: Link2, label: t('nav.urlShortener') },
    { href: '/products/qr-codes', icon: QrCode, label: t('nav.qrCodes') },
    { href: '/products/link-in-bio', icon: BarChart3, label: t('nav.linkInBio') },
    { href: '/products/analytics', icon: BarChart3, label: t('nav.analytics') },
    { href: '/products/campaigns', icon: Megaphone, label: t('nav.campaigns') },
  ];

  const solutionLinks = [
    { href: '/solutions/enterprise', icon: Building2, label: t('nav.enterprise') },
    { href: '/solutions/marketing', icon: Megaphone, label: t('nav.marketing') },
    { href: '/solutions/retail', icon: ShoppingBag, label: t('nav.retail') },
    { href: '/solutions/media', icon: Newspaper, label: t('nav.media') },
    { href: '/solutions/tech', icon: Cpu, label: t('nav.tech') },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{t('common.brand')}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {/* Products Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('products')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 font-medium">
                <span>{t('nav.products')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {activeDropdown === 'products' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2"
                  >
                    {productLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={`/${locale}${link.href}`}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <link.icon className="w-5 h-5 text-orange-500" />
                        <span className="text-gray-700">{link.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('solutions')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 font-medium">
                <span>{t('nav.solutions')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {activeDropdown === 'solutions' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2"
                  >
                    {solutionLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={`/${locale}${link.href}`}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <link.icon className="w-5 h-5 text-orange-500" />
                        <span className="text-gray-700">{link.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href={`/${locale}/pricing`}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              {t('nav.pricing')}
            </Link>

            {/* Language Switcher */}
            <Link
              href={pathname}
              locale={otherLocale}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">{otherLocale === 'en' ? 'EN' : '中文'}</span>
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <a
              href="http://localhost:60010/login"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              {t('common.login')}
            </a>
            <a href="http://localhost:60010/signup" className="btn-primary">
              {t('common.signup')}
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100"
            >
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <p className="px-4 text-sm font-semibold text-gray-500 uppercase">
                    {t('nav.products')}
                  </p>
                  {productLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={`/${locale}${link.href}`}
                      className="flex items-center space-x-3 px-4 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <link.icon className="w-5 h-5 text-orange-500" />
                      <span className="text-gray-700">{link.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="px-4 text-sm font-semibold text-gray-500 uppercase">
                    {t('nav.solutions')}
                  </p>
                  {solutionLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={`/${locale}${link.href}`}
                      className="flex items-center space-x-3 px-4 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <link.icon className="w-5 h-5 text-orange-500" />
                      <span className="text-gray-700">{link.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="px-4 pt-4 border-t border-gray-100 space-y-3">
                  <Link
                    href={pathname}
                    locale={otherLocale}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 text-gray-600"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{locale === 'en' ? 'Switch to 中文' : 'Switch to English'}</span>
                  </Link>
                  <a
                    href="http://localhost:60010/login"
                    className="block text-center py-2 text-gray-700 font-medium"
                  >
                    {t('common.login')}
                  </a>
                  <a
                    href="http://localhost:60010/signup"
                    className="block text-center btn-primary"
                  >
                    {t('common.signup')}
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
