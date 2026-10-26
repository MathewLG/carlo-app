'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAppSettings } from '@components/useCarloBirthDate';

// Carlo's first sign-in: the welcome his family wrote (Admin → Carlo), then
// the timeline from the day he was born. The family can read it here too.
export default function Welcome() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const settings = useAppSettings();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const isCarlo = session?.user?.role === 'carlo';

  const start = async () => {
    setStarting(true);
    setError('');
    try {
      if (isCarlo) {
        const response = await fetch('/api/carlo/welcomed', { method: 'POST' });
        if (!response.ok) throw new Error();
        await update();
      }
      router.push('/linea-del-tiempo');
    } catch {
      setError('Algo salió mal. Inténtalo de nuevo.');
      setStarting(false);
    }
  };

  if (status === 'unauthenticated') return <p className="status-text mt-12">Inicia sesión para ver esta página.</p>;
  if (!settings) return <p role="status" className="status-text mt-12">Cargando…</p>;

  return (
    <section className="mx-auto mt-10 w-full max-w-2xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Bienvenido, Carlo</h1>
      {!isCarlo && <p className="mt-3 text-ink-soft">Así verá Carlo esta página la primera vez que entre.</p>}
      <div className="sticker mt-8">
        <p className="whitespace-pre-line text-lg leading-relaxed">{settings.welcomeText}</p>
      </div>
      <button type="button" className="btn btn-sun mt-8" onClick={start} disabled={starting}>
        {starting ? 'Abriendo…' : 'Empezar desde el día que naciste'}
      </button>
      {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
    </section>
  );
}
