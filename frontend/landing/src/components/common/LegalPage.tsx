'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface LegalPageProps {
  pageKey: 'privacy' | 'terms';
}

export default function LegalPage({ pageKey }: LegalPageProps) {
  const t = useTranslations(pageKey);

  const sections = t.raw('sections') as Array<{ title: string; content: string }>;

  return (
    <>
      <Header />
      <main className="pt-24">
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
              <p className="text-gray-500">{t('lastUpdated')}</p>
            </motion.div>

            <div className="prose prose-lg max-w-none">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-8"
                >
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    {index + 1}. {section.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">{section.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
