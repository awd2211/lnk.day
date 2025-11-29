'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Link2, Sparkles } from 'lucide-react';

export default function Hero() {
  const t = useTranslations('hero');
  const [url, setUrl] = useState('');

  const handleShorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      window.location.href = `http://localhost:60010/signup?url=${encodeURIComponent(url)}`;
    }
  };

  const stats = [
    { value: '500M+', label: t('stats.links') },
    { value: '10B+', label: t('stats.clicks') },
    { value: '100K+', label: t('stats.users') },
  ];

  return (
    <section className="hero-gradient pt-32 pb-20 lg:pt-40 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('badge')}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
          >
            {t('title')} <span className="gradient-text">{t('titleHighlight')}</span>{' '}
            {t('titleEnd')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
          >
            {t('subtitle')}
          </motion.p>

          {/* URL Input */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={handleShorten}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100">
              <div className="flex-1 flex items-center px-4">
                <Link2 className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t('inputPlaceholder')}
                  className="w-full py-3 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
              <button
                type="submit"
                className="btn-primary flex items-center justify-center space-x-2 px-8"
              >
                <span>{t('shortenButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.form>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <a href="http://localhost:60010/signup" className="btn-primary flex items-center space-x-2">
              <span>{t('cta')}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <button className="btn-secondary flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>{t('secondaryCta')}</span>
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
