'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PricingCardProps {
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  isYearly: boolean;
  isPopular?: boolean;
}

export default function PricingCard({ plan, isYearly, isPopular }: PricingCardProps) {
  const t = useTranslations('pricing');

  const planData = {
    free: {
      name: t('free.name'),
      price: t('free.price'),
      yearlyPrice: t('free.price'),
      description: t('free.description'),
      cta: t('free.cta'),
      features: t.raw('free.features') as string[],
    },
    starter: {
      name: t('starter.name'),
      price: t('starter.price'),
      yearlyPrice: t('starter.yearlyPrice'),
      description: t('starter.description'),
      cta: t('starter.cta'),
      features: t.raw('starter.features') as string[],
    },
    pro: {
      name: t('pro.name'),
      price: t('pro.price'),
      yearlyPrice: t('pro.yearlyPrice'),
      description: t('pro.description'),
      cta: t('pro.cta'),
      features: t.raw('pro.features') as string[],
    },
    enterprise: {
      name: t('enterprise.name'),
      price: t('enterprise.price'),
      yearlyPrice: t('enterprise.price'),
      description: t('enterprise.description'),
      cta: t('enterprise.cta'),
      features: t.raw('enterprise.features') as string[],
    },
  };

  const data = planData[plan];
  const currentPrice = isYearly && plan !== 'free' && plan !== 'enterprise' ? data.yearlyPrice : data.price;
  const isPaid = plan !== 'free' && plan !== 'enterprise';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative rounded-2xl p-8 ${
        isPopular
          ? 'bg-gray-900 text-white shadow-xl scale-105 z-10'
          : 'bg-white text-gray-900 shadow-sm border border-gray-100'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-orange-500 text-white text-sm font-medium px-4 py-1 rounded-full">
            {t('popular')}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-xl font-semibold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
          {data.name}
        </h3>
        <p className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
          {data.description}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
            {currentPrice}
          </span>
          {isPaid && (
            <span className={`ml-2 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('perMonth')}
            </span>
          )}
        </div>
        {isYearly && isPaid && (
          <p className={`text-sm mt-1 ${isPopular ? 'text-orange-400' : 'text-orange-600'}`}>
            {t('save')}
          </p>
        )}
      </div>

      <a
        href={plan === 'enterprise' ? '/contact' : 'http://localhost:60010/signup'}
        className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors mb-8 ${
          isPopular
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : plan === 'free'
            ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {data.cta}
      </a>

      <ul className="space-y-4">
        {data.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check
              className={`w-5 h-5 mr-3 flex-shrink-0 ${
                isPopular ? 'text-orange-400' : 'text-orange-500'
              }`}
            />
            <span className={`text-sm ${isPopular ? 'text-gray-300' : 'text-gray-600'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
