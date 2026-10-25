'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDate } from '@utils/format';
import AdminNav from '@components/AdminNav';

const SOURCES = { memoria: 'Ya tenía recuerdos', codigo: 'Código familiar', admin: 'Agregado por ti' };

const send = async (url, method, body) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Algo salió mal. Inténtalo de nuevo.');
  return data;
};

function JoinCode() {
  const [state, setState] = useState(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    send('/api/admin/join-code', 'GET').then(setState).catch((e) => setError(e.message));
  }, []);

  const run = async (action, done) => {
    setError('');
    setMessage('');
    try {
      setState(await action());
      setMessage(done);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const saveCode = (e) => {
    e.preventDefault();
    run(() => send('/api/admin/join-code', 'PUT', { code }), 'Código guardado. La entrada con código está abierta.').then(
      (ok) => ok && setCode(''),
    );
  };

  return (
    <section className="sticker mt-8" aria-labelledby="code-title">
      <h2 id="code-title" className="text-2xl font-bold">Código familiar</h2>
      {state && (
        <p className="mt-2 text-ink-soft">
          {!state.hasCode && 'Todavía no hay código: nadie nuevo puede unirse por su cuenta.'}
          {state.hasCode && state.open && 'Abierto: quien tenga el código puede unirse.'}
          {state.hasCode && !state.open && 'Cerrado: el código guardado no funciona hasta que lo abras.'}
        </p>
      )}

      <form onSubmit={saveCode} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="label">{state?.hasCode ? 'Cambiar el código' : 'Elegir un código'}</span>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={100}
            required
            className="field"
          />
        </label>
        <button type="submit" className="btn btn-primary">Guardar código</button>
      </form>
      <p className="mt-2 text-sm text-ink-soft">
        Al menos 8 caracteres. Tres palabras al azar son más difíciles de adivinar que un nombre con un año.
      </p>

      {state?.hasCode && (
        <button
          type="button"
          className="btn btn-outline mt-4"
          onClick={() =>
            run(
              () => send('/api/admin/join-code', 'PATCH', { open: !state.open }),
              state.open ? 'Entrada con código cerrada.' : 'Entrada con código abierta.',
            )
          }
        >
          {state.open ? 'Cerrar la entrada con código' : 'Abrir la entrada con código'}
        </button>
      )}

      {message && <p role="status" className="mt-3 font-semibold">{message}</p>}
      {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
    </section>
  );
}

function Family({ ownEmail }) {
  const [family, setFamily] = useState(null);
  const [email, setEmail] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () => send('/api/admin/family', 'GET').then(setFamily).catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const run = async (action) => {
    setError('');
    try {
      await action();
      setConfirming(null);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const add = (e) => {
    e.preventDefault();
    run(() => send('/api/admin/family', 'POST', { email })).then((ok) => ok && setEmail(''));
  };

  return (
    <>
      <section className="sticker mt-8" aria-labelledby="add-title">
        <h2 id="add-title" className="text-2xl font-bold">Agregar a alguien</h2>
        <form onSubmit={add} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="label">Correo de Google</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="field" />
          </label>
          <button type="submit" className="btn btn-primary">Agregar</button>
        </form>
      </section>

      {error && <p role="alert" className="mt-6 font-semibold text-danger">{error}</p>}
      {!family && !error && <p role="status" className="status-text mt-8">Cargando familia…</p>}

      {family && (
        <section className="mt-10" aria-labelledby="members-title">
          <h2 id="members-title" className="text-2xl font-bold">En la familia ({family.members.length})</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {family.members.map((m) => (
              <li key={m.email} className="sticker flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display font-semibold">{m.username ?? m.email}</p>
                  <p className="text-sm text-ink-soft">
                    {m.email} · {SOURCES[m.source]} · {formatDate(new Date(m.joinedAt))} · {m.memories}{' '}
                    {m.memories === 1 ? 'recuerdo' : 'recuerdos'}
                    {m.role === 'admin' && ' · Administrador'}
                  </p>
                </div>
                {m.email !== ownEmail &&
                  (confirming === m.email ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold">¿Quitar a {m.username ?? m.email}?</span>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => run(() => send('/api/admin/family', 'DELETE', { email: m.email }))}
                      >
                        Sí, quitar
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => setConfirming(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-outline" onClick={() => setConfirming(m.email)}>
                      Quitar
                    </button>
                  ))}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-2xl font-bold">Esperando código ({family.pending.length})</h2>
          {family.pending.length === 0 ? (
            <p className="mt-2 text-ink-soft">Nadie está esperando.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {family.pending.map((p) => (
                <li key={p.email} className="sticker flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-semibold">{p.username}</p>
                    <p className="text-sm text-ink-soft">
                      {p.email} · Entró por primera vez el {formatDate(new Date(p.firstSeen))}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => run(() => send('/api/admin/family', 'POST', { email: p.email }))}
                  >
                    Agregar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

export default function AdminFamily() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p className="status-text mt-12">Cargando…</p>;
  if (session?.user?.role !== 'admin') {
    return <p className="status-text mt-12">Solo el administrador puede ver esta página.</p>;
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Familia</h1>
      <AdminNav />
      <p className="mt-3 text-lg text-ink-soft">Quién puede leer y escribir recuerdos para Carlo.</p>
      <JoinCode />
      <Family ownEmail={session.user.email.toLowerCase()} />
    </div>
  );
}
