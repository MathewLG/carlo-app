'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Join() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const join = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        // Refresh the session so the pages see the new membership.
        await update();
        router.replace('/');
        return;
      }
      const triesLeft = data.triesLeft ? ` Te quedan ${data.triesLeft} intentos.` : '';
      setError(`${data.error || 'No se pudo comprobar el código.'}${triesLeft}`);
    } catch (err) {
      console.error(err);
      setError('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <p className="status-text mt-12">Cargando…</p>;
  }
  if (status === 'unauthenticated') {
    return (
      <div className="mt-12 flex flex-col items-center gap-4">
        <p className="status-text">Inicia sesión con Google para unirte a la familia.</p>
        <button type="button" className="btn btn-primary" onClick={() => signIn('google')}>
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto mt-6 w-full max-w-xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Únete a la familia</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Carlo App es privada: solo la familia puede leer los recuerdos. Escribe el código familiar que te compartió
        Mathew. Solo lo necesitas una vez.
      </p>

      <form onSubmit={join} className="sticker mt-8 flex flex-col gap-6">
        <label>
          <span className="label">Código familiar</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={100}
            className="field"
          />
        </label>

        {error && (
          <p role="alert" className="font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" className="link" onClick={() => signOut({ callbackUrl: '/' })}>
            Cerrar sesión ({session?.user?.email})
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Comprobando…' : 'Entrar'}
          </button>
        </div>
      </form>

      <p className="mt-6 text-ink-soft">¿No tienes el código? Pídeselo a Mathew.</p>
    </section>
  );
}
