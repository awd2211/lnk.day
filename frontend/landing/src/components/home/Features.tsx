'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Link2,
  QrCode,
  BarChart3,
  Target,
  Megaphone,
  Puzzle,
} from 'lucide-react';

export default function Features() {
  const t = useTranslations('features');

  const features = [
    {
      icon: Link2,
      title: t('shortLinks.title'),
      description: t('shortLinks.description'),
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: QrCode,
      title: t('qrCodes.title'),
      description: t('qrCodes.description'),
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Target,
      title: t('linkInBio.title'),
      description: t('linkInBio.description'),
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: BarChart3,
      title: t('analytics.title'),
      description: t('analytics.description'),
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Megaphone,
      title: t('campaigns.title'),
      description: t('campaigns.description'),
      color: 'bg-pink-100 text-pink-600',
    },
    {
      icon: Puzzle,
      title: t('integrations.title'),
      description: t('integrations.description'),
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            {t('title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-6`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
