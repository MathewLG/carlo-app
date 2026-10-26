'use client';
import { useSession } from 'next-auth/react';
import { useAppSettings } from './useCarloBirthDate';

// On the home page once Carlo's access is open, so the family knows who
// their words reach now.
const CarloBanner = () => {
  const settings = useAppSettings();
  const isCarlo = useSession().data?.user?.role === 'carlo';
  if (!settings?.carloCanRead || isCarlo) return null;
  return (
    <p role="status" className="mt-6 inline-block rounded-2xl border-2 border-ink bg-sun px-4 py-3 font-display text-lg font-semibold shadow-sticker-sm">
      Carlo ya puede leer sus recuerdos
    </p>
  );
};

export default CarloBanner;
