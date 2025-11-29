'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Feature {
  title: string;
  description: string;
}

interface ProductPageProps {
  productKey: 'urlShortener' | 'qrCodes' | 'linkInBio' | 'analytics';
  icon: LucideIcon;
  color: string;
  image?: string;
}

export default function ProductPage({ productKey, icon: Icon, color }: ProductPageProps) {
  const t = useTranslations(`products.${productKey}`);

  const features = t.raw('features') as Feature[];

  return (
    <>
      <Header />
      <main className="pt-24">
        {/* Hero */}
        <section className={`py-20 ${color}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-6">
                  <Icon className="w-8 h-8 text-orange-500" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                  {t('title')}
                </h1>
                <p className="text-xl text-gray-600 mb-6">{t('subtitle')}</p>
                <p className="text-gray-600 mb-8">{t('description')}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="http://localhost:60010/signup" className="btn-primary inline-flex items-center justify-center space-x-2">
                    <span>Start for Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a href="#features" className="btn-secondary inline-flex items-center justify-center">
                    Learn More
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl shadow-2xl p-8 aspect-video flex items-center justify-center">
                  <Icon className="w-32 h-32 text-gray-200" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Features</h2>
              <p className="text-lg text-gray-600">Everything you need to succeed</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of businesses already using lnk.day
            </p>
            <a href="http://localhost:60010/signup" className="btn-primary inline-flex items-center space-x-2">
              <span>Start for Free</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
