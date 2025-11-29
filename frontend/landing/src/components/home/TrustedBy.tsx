'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export default function TrustedBy() {
  const t = useTranslations('trustedBy');

  const brands = [
    'Nike',
    'Spotify',
    'Airbnb',
    'Shopify',
    'HubSpot',
    'Stripe',
    'Notion',
    'Figma',
  ];

  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-gray-500 uppercase tracking-wider mb-8"
        >
          {t('title')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center items-center gap-8 md:gap-12"
        >
          {brands.map((brand, index) => (
            <div
              key={index}
              className="text-2xl font-bold text-gray-300 hover:text-gray-400 transition-colors"
            >
              {brand}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
