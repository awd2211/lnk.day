import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import TrustedBy from '@/components/home/TrustedBy';
import Features from '@/components/home/Features';
import CTA from '@/components/home/CTA';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustedBy />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
