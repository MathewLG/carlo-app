'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminNav from '@components/AdminNav';
import { forgetCarloBirthDate } from '@components/useCarloBirthDate';
import { parseDay, todayString } from '@utils/dates';
import { formatDate } from '@utils/format';

function BirthDate() {
  const [saved, setSaved] = useState(undefined); // undefined while loading
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((data) => {
        setSaved(data.carloBirthDate);
        setValue(data.carloBirthDate ?? '');
      })
      .catch(() => setError('No se pudo cargar. Recarga la página.'));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carloBirthDate: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
      setSaved(data.carloBirthDate);
      // Pages read the birth date once per load; make them read it again.
      forgetCarloBirthDate();
      setMessage('Guardado. Cada recuerdo muestra ahora la edad de Carlo.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="sticker mt-8" aria-labelledby="birth-title">
      <h2 id="birth-title" className="text-2xl font-bold">Fecha de nacimiento</h2>
      <p className="mt-2 text-ink-soft">
        {saved === undefined && 'Cargando…'}
        {saved === null && 'Todavía no está guardada, así que los recuerdos no muestran la edad de Carlo.'}
        {saved && `Carlo nació el ${formatDate(parseDay(saved))}.`}
      </p>
      <form onSubmit={save} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="label">Fecha de nacimiento de Carlo</span>
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            max={todayString()}
            required
            className="field"
          />
        </label>
        <button type="submit" className="btn btn-primary">Guardar</button>
      </form>
      {message && <p role="status" className="mt-3 font-semibold">{message}</p>}
      {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
    </section>
  );
}

export default function AdminCarlo() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p className="status-text mt-12">Cargando…</p>;
  if (session?.user?.role !== 'admin') {
    return <p className="status-text mt-12">Solo el administrador puede ver esta página.</p>;
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Carlo</h1>
      <AdminNav />
      <BirthDate />
    </div>
  );
}
