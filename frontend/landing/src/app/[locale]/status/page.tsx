'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, Bell } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function StatusPage() {
  const t = useTranslations('status');
  const services = t.raw('services') as Array<{ name: string; status: string }>;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="py-20 bg-gradient-to-b from-green-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-6">
                <Activity className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('title')}</h1>
              <p className="text-xl text-gray-600">{t('subtitle')}</p>
            </motion.div>

            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-green-500 text-white rounded-xl p-6 mb-8 flex items-center justify-center space-x-3"
            >
              <CheckCircle className="w-6 h-6" />
              <span className="text-lg font-medium">{t('allOperational')}</span>
            </motion.div>

            {/* Services List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100"
            >
              {services.map((service, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <span className="text-gray-900 font-medium">{service.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-sm text-green-600 capitalize">Operational</span>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Uptime */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-gray-500 mt-6"
            >
              {t('uptime')}
            </motion.p>

            {/* Subscribe */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 text-center"
            >
              <button className="inline-flex items-center space-x-2 px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">{t('subscribe')}</span>
              </button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
