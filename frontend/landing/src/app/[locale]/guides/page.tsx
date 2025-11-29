'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { FileText, Rocket, BarChart3, Code, Lightbulb } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const icons = [Rocket, BarChart3, Code, Lightbulb];

export default function GuidesPage() {
  const t = useTranslations('guides');
  const categories = t.raw('categories') as Array<{ title: string; description: string }>;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="py-20 bg-gradient-to-b from-teal-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 mb-6">
                <FileText className="w-8 h-8 text-teal-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{t('title')}</h1>
              <p className="text-xl text-gray-600 mb-4">{t('subtitle')}</p>
              <p className="text-gray-500">{t('description')}</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {categories.map((category, index) => {
                const Icon = icons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.title}</h3>
                    <p className="text-gray-600">{category.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
