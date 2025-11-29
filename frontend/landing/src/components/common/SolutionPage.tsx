'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface SolutionPageProps {
  solutionKey: 'enterprise' | 'marketing' | 'retail' | 'media' | 'tech';
  icon: LucideIcon;
  color: string;
}

export default function SolutionPage({ solutionKey, icon: Icon, color }: SolutionPageProps) {
  const t = useTranslations(`solutions.${solutionKey}`);

  const features = t.raw('features') as string[];

  return (
    <>
      <Header />
      <main className="pt-24">
        {/* Hero */}
        <section className={`py-20 ${color}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-8"
              >
                <Icon className="w-10 h-10 text-orange-500" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6"
              >
                {t('title')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-gray-600 mb-4"
              >
                {t('subtitle')}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 mb-10"
              >
                {t('description')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-center gap-4"
              >
                <a href="http://localhost:60010/signup" className="btn-primary inline-flex items-center justify-center space-x-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a href="/contact" className="btn-secondary inline-flex items-center justify-center">
                  Contact Sales
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What you get</h2>
              <p className="text-lg text-gray-600">
                Everything you need to succeed with lnk.day
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to transform your business?
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Join leading companies using lnk.day to power their growth
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="http://localhost:60010/signup" className="btn-primary inline-flex items-center justify-center space-x-2">
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/contact" className="bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors inline-flex items-center justify-center">
                Talk to Sales
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
