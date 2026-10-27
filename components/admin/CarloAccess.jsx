'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { forgetCarloBirthDate } from '@components/useCarloBirthDate';
import { parseDay } from '@utils/dates';
import { formatDate } from '@utils/format';
import { MAX_ACCESS_AGE, MAX_WELCOME_LENGTH } from '@utils/carlo';

const statusLine = (saved) => {
  if (!saved.carloEmail) return 'Todavía no guardas el correo de Carlo, así que nadie puede entrar como él.';
  if (saved.carloAccess === 'paused') return 'En pausa: Carlo no puede entrar hasta que lo reanudes.';
  if (saved.accessOpen) return 'Carlo ya puede entrar a leer sus recuerdos.';
  if (!saved.accessDay) return 'Guarda la fecha de nacimiento de Carlo para saber cuándo se abre su acceso.';
  return `Su acceso se abre solo el ${formatDate(parseDay(saved.accessDay))}, cuando cumpla ${saved.carloAccessAge}.`;
};

// "Acceso de Carlo": his email, the age it opens at, opening early or pausing,
// and the welcome he reads the first time.
export default function CarloAccess() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/carlo')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((data) => {
        setSaved(data);
        setForm({ ...data, carloAccessAge: String(data.carloAccessAge) });
      })
      .catch(() => setError('No se pudo cargar. Recarga la página.'));
  }, []);

  if (!form) {
    return (
      <section className="sticker mt-8" aria-labelledby="access-title">
        <h2 id="access-title" className="text-2xl font-bold">Acceso de Carlo</h2>
        {error ? <p role="alert" className="mt-3 font-semibold text-danger">{error}</p> : <p className="mt-2 text-ink-soft">Cargando…</p>}
      </section>
    );
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/carlo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carloEmail: form.carloEmail,
          carloAccessAge: Number(form.carloAccessAge),
          carloAccess: form.carloAccess,
          welcomeText: form.welcomeText,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
      setSaved(data);
      setForm({ ...data, carloAccessAge: String(data.carloAccessAge) });
      // The welcome preview and the family banner read the settings again.
      forgetCarloBirthDate();
      setMessage('Guardado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="sticker mt-8" aria-labelledby="access-title">
      <h2 id="access-title" className="text-2xl font-bold">Acceso de Carlo</h2>
      <p className="mt-2 font-semibold">{statusLine(saved)}</p>
      {saved.carloSignedIn && (
        <p className="mt-1 text-sm text-ink-soft">{saved.carloWelcomed ? 'Carlo ya entró y leyó su bienvenida.' : 'Carlo ya inició sesión.'}</p>
      )}
      <form onSubmit={save} className="mt-4 flex flex-col gap-4">
        <label>
          <span className="label">Correo de Google de Carlo</span>
          <input type="email" value={form.carloEmail} onChange={set('carloEmail')} placeholder="carlo@gmail.com" className="field" />
          <span className="mt-1 block text-sm text-ink-soft">Solo esta cuenta entra como Carlo: puede leer todo, pero no cambiar nada.</span>
        </label>
        <label>
          <span className="label">Su acceso se abre cuando cumpla</span>
          <input type="number" inputMode="numeric" min={1} max={MAX_ACCESS_AGE} value={form.carloAccessAge} onChange={set('carloAccessAge')} required className="field max-w-[8rem]" />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="label">Estado</legend>
          {[
            ['auto', 'Abrir solo en su cumpleaños'],
            ['open', 'Abrir ahora'],
            ['paused', 'Pausar'],
          ].map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2">
              <input type="radio" name="carlo-access" checked={form.carloAccess === mode} onChange={() => setForm({ ...form, carloAccess: mode })} className="h-5 w-5" />
              {label}
            </label>
          ))}
        </fieldset>
        <label>
          <span className="label">Su bienvenida</span>
          <textarea value={form.welcomeText} onChange={set('welcomeText')} maxLength={MAX_WELCOME_LENGTH} rows={8} className="field resize-y" />
          <span className="mt-1 block text-sm text-ink-soft">
            Lo primero que lee la primera vez que entra. <Link href="/bienvenida" className="link">Ver cómo se ve</Link>
          </span>
        </label>
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar acceso'}</button>
        </div>
      </form>
      {message && <p role="status" className="mt-3 font-semibold">{message}</p>}
      {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
    </section>
  );
}
