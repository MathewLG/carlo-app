'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Avatar from '@components/Avatar';
import Feed from '@components/Feed';
import { MAX_DISPLAY_NAME_LENGTH } from '@utils/format';

// "Mi nombre en Carlo App": the name shown on everything this person writes.
function NameForm({ user, onSaved }) {
  const [name, setName] = useState(user.displayName || '');
  const [state, setState] = useState({ saving: false, message: '', error: '' });

  const save = async (event) => {
    event.preventDefault();
    setState({ saving: true, message: '', error: '' });
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar tu nombre. Inténtalo de nuevo.');
      setName(data.displayName);
      await onSaved();
      setState({ saving: false, message: 'Listo: tus recuerdos ya muestran este nombre.', error: '' });
    } catch (e) {
      setState({ saving: false, message: '', error: e.message });
    }
  };

  return (
    <form onSubmit={save} className="sticker mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="label">Mi nombre en Carlo App</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          placeholder={user.username}
          aria-describedby="name-help"
          className="field"
        />
        <span id="name-help" className="mt-1 block text-sm text-ink-soft">
          Como quieres que Carlo te reconozca, por ejemplo “Abuela Rosa”. Vacío, se usa {user.username}.
        </span>
      </label>
      <button type="submit" className="btn btn-primary" disabled={state.saving}>
        {state.saving ? 'Guardando…' : 'Guardar nombre'}
      </button>
      {state.message && <p role="status" className="font-semibold sm:basis-full">{state.message}</p>}
      {state.error && <p role="alert" className="font-semibold text-danger sm:basis-full">{state.error}</p>}
    </form>
  );
}

export default function Profile() {
  const { data: session, update } = useSession();
  const user = session?.user;
  const shownName = user?.displayName || user?.username || user?.name;

  return (
    <section className="mt-6">
      {user && (
        <>
          <div className="flex items-center gap-4">
            <Avatar image={user.image} name={shownName} size={64} />
            <div>
              <h1 className="text-4xl font-bold sm:text-5xl">Mis recuerdos</h1>
              <p className="mt-1 text-lg text-ink-soft">
                Todo lo que has escrito para Carlo, como {shownName}.{' '}
                {user.id && <Link href={`/familia/${user.id}`} className="link">Ver mi página en Familia</Link>}
              </p>
            </div>
          </div>
          <NameForm key={user.id} user={user} onSaved={update} />
        </>
      )}
      <Feed mine />
    </section>
  );
}
