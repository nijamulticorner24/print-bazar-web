import { HeroSection } from '@/components/home/HeroSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TrustSection } from '@/components/home/TrustSection';

export default function HomePage() {
  return (
    <div className="flex flex-col bg-white w-full max-w-full overflow-x-hidden">
      {/* 1. Hero Section (Reference Composition) */}
      <HeroSection />

      {/* 2. 7-Item Category Showcase Strip */}
      <CategoryShowcase />

      {/* 3. 6 Featured Product Cards Grid */}
      <FeaturedProducts />

      {/* 4. Dark Industrial "How It Works" & 5-Step Process */}
      <HowItWorks />

      {/* 5. "Why Businesses Trust Us", 4 Business Metrics & Printed Magazine */}
      <TrustSection />
    </div>
  );
}
