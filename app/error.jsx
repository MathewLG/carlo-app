'use client';
import { useEffect } from 'react';

// Any page that fails while showing: a calm message and a way to try again,
// instead of a blank screen.
export default function PageError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-5 text-center">
      <h1 className="text-4xl font-bold">Algo salió mal</h1>
      <p className="text-lg text-ink-soft">No se pudo mostrar esta página. Tus recuerdos están a salvo; inténtalo de nuevo.</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>Intentar de nuevo</button>
    </section>
  );
}
