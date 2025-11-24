'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookingDrawer } from './booking-drawer';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}

interface ServicesListProps {
  services: Service[];
}

export function ServicesList({ services }: ServicesListProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleBookClick = (service: Service) => {
    setSelectedService(service);
    setDrawerOpen(true);
  };

  if (services.length === 0) {
    return (
      <section className="px-4 py-12">
        <div className="text-center text-muted-foreground">
          Услуги пока не добавлены
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="services" className="px-4 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
          Наши услуги
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                {service.description && (
                  <CardDescription>{service.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {service.price.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Длительность: {service.durationMinutes} мин
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleBookClick(service)}
                  className="w-full"
                >
                  Записаться
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {selectedService && (
        <BookingDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          serviceId={selectedService.id}
          serviceName={selectedService.name}
        />
      )}
    </>
  );
}

