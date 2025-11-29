'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PricingCard from '@/components/pricing/PricingCard';

export default function PricingPage() {
  const t = useTranslations('pricing');
  const [isYearly, setIsYearly] = useState(true);

  return (
    <>
      <Header />
      <main className="pt-24">
        {/* Header */}
        <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4"
            >
              {t('title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
            >
              {t('subtitle')}
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center bg-gray-100 rounded-full p-1"
            >
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  !isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {t('monthly')}
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {t('yearly')}
                <span className="ml-2 text-orange-500 text-xs">{t('save')}</span>
              </button>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
              <PricingCard plan="free" isYearly={isYearly} />
              <PricingCard plan="starter" isYearly={isYearly} />
              <PricingCard plan="pro" isYearly={isYearly} isPopular />
              <PricingCard plan="enterprise" isYearly={isYearly} />
            </div>
          </div>
        </section>

        {/* FAQ or comparison section could go here */}
      </main>
      <Footer />
    </>
  );
}
