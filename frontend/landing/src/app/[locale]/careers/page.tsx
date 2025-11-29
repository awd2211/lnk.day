'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Wallet, Heart, GraduationCap, Mail } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const icons = [MapPin, Wallet, Heart, GraduationCap];

export default function CareersPage() {
  const t = useTranslations('careers');
  const perks = t.raw('perks') as Array<{ title: string; description: string }>;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-indigo-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 mb-6">
                <Briefcase className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{t('title')}</h1>
              <p className="text-xl text-gray-600 mb-4">{t('subtitle')}</p>
              <p className="text-gray-500">{t('description')}</p>
            </motion.div>

            {/* Perks */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {perks.map((perk, index) => {
                const Icon = icons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center"
                  >
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{perk.title}</h3>
                    <p className="text-gray-600 text-sm">{perk.description}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Open Positions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('openings')}</h2>
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('noOpenings')}</p>
                <div className="flex items-center justify-center space-x-2 text-indigo-600">
                  <Mail className="w-5 h-5" />
                  <span>{t('sendResume')}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
