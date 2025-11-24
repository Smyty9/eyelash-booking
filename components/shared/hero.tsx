'use client';

import { Button } from '@/components/ui/button';

export function Hero() {
  const scrollToServices = () => {
    const servicesSection = document.getElementById('services');
    servicesSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="px-4 py-16 sm:py-24 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
        Наращивание ресниц
      </h1>
      <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        Профессиональное наращивание ресниц с гарантией качества. 
        Запишитесь онлайн и получите идеальный взгляд.
      </p>
      <Button size="lg" className="text-base" onClick={scrollToServices}>
        Записаться онлайн
      </Button>
    </section>
  );
}

