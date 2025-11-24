import { getServices } from '@/lib/actions/services';
import { Hero } from '@/components/shared/hero';
import { ServicesList } from '@/components/shared/services-list';

export default async function Home() {
  const services = await getServices();

  return (
    <main className="min-h-screen">
      <Hero />
      <ServicesList services={services} />
    </main>
  );
}
