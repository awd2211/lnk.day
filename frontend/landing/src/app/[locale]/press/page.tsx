'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Newspaper, Download, Mail } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PressPage() {
  const t = useTranslations('press');

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="py-20 bg-gradient-to-b from-amber-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-6">
                <Newspaper className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{t('title')}</h1>
              <p className="text-xl text-gray-600 mb-4">{t('subtitle')}</p>
              <p className="text-gray-500">{t('description')}</p>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8"
            >
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-amber-600" />
                <span className="text-gray-700">{t('contact')}</span>
              </div>
            </motion.div>

            {/* Press Kit */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-amber-500 rounded-xl p-8 text-center text-white mb-8"
            >
              <Download className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h3 className="text-xl font-semibold mb-4">{t('kit')}</h3>
              <button className="px-6 py-3 bg-white text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-colors">
                Download ZIP
              </button>
            </motion.div>

            {/* Recent News */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('recentNews')}</h2>
              <div className="text-center py-8">
                <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('comingSoon')}</p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
