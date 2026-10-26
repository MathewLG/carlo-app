'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AuthorLink from '@components/AuthorLink';
import useCarloBirthDate from '@components/useCarloBirthDate';
import useFamilyData from '@components/useFamilyData';
import { ageAt } from '@utils/age';
import { parseDay, todayString } from '@utils/dates';
import { formatDate } from '@utils/format';
import { initialOf, matchesWord, MAX_HEARD_BY_LENGTH, MAX_MEANING_LENGTH, MAX_WORD_LENGTH } from '@utils/words';

const EMPTY = { word: '', meaning: '', saidAt: '', heardBy: '', firstWord: false };

const send = async (url, method, body) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Algo salió mal. Inténtalo de nuevo.');
  return data;
};

// Adding a word, or changing one (`entry`).
function WordForm({ entry = null, onDone, onCancel }) {
  const [values, setValues] = useState(entry ? { ...EMPTY, ...entry } : EMPTY);
  const [state, setState] = useState({ saving: false, error: '' });
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const prefix = entry ? `edit-${entry.id}` : 'new';

  const save = async (event) => {
    event.preventDefault();
    setState({ saving: true, error: '' });
    try {
      const { word, meaning, saidAt, heardBy, firstWord } = values;
      await send(entry ? `/api/words/${entry.id}` : '/api/words', entry ? 'PATCH' : 'POST', { word, meaning, saidAt, heardBy, firstWord });
      setState({ saving: false, error: '' });
      if (!entry) setValues(EMPTY);
      onDone();
    } catch (e) {
      setState({ saving: false, error: e.message });
    }
  };

  return (
    <form onSubmit={save} className="sticker flex flex-col gap-4" aria-label={entry ? `Cambiar «${entry.word}»` : 'Agregar una palabra'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">La palabra, como la dijo</span>
          <input value={values.word} onChange={set('word')} maxLength={MAX_WORD_LENGTH} required placeholder="awa" className="field" />
        </label>
        <label>
          <span className="label">Lo que quería decir</span>
          <input value={values.meaning} onChange={set('meaning')} maxLength={MAX_MEANING_LENGTH} required placeholder="agua" className="field" />
        </label>
        <label>
          <span className="label">¿Qué día la dijo?</span>
          <input type="date" value={values.saidAt} onChange={set('saidAt')} max={todayString()} required className="field" />
        </label>
        <label>
          <span className="label">¿Quién la escuchó?</span>
          <input value={values.heardBy} onChange={set('heardBy')} maxLength={MAX_HEARD_BY_LENGTH} placeholder="Mamá y la abuela" className="field" />
        </label>
      </div>
      <label className="flex items-center gap-3" htmlFor={`${prefix}-first`}>
        <input id={`${prefix}-first`} type="checkbox" checked={values.firstWord} onChange={set('firstWord')} className="h-5 w-5" />
        <span>Es una de sus primeras palabras (aparece en la línea del tiempo)</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Guardando…' : entry ? 'Guardar cambios' : 'Agregar al diccionario'}
        </button>
        {onCancel && <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>}
      </div>
      {state.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}
    </form>
  );
}

function Entry({ entry, birthDate, mayEdit, onChange }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const day = parseDay(entry.saidAt);
  const age = ageAt(birthDate, day);

  if (editing) {
    return (
      <li>
        <WordForm entry={entry} onDone={() => { setEditing(false); onChange(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  const remove = async () => {
    try {
      await send(`/api/words/${entry.id}`, 'DELETE');
      onChange();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <li className="sticker">
      <article aria-labelledby={`word-${entry.id}`}>
        <h3 id={`word-${entry.id}`} className="font-display text-2xl font-bold">
          «{entry.word}»
          {entry.firstWord && <span className="ml-3 align-middle tag-chip">Primera palabra</span>}
        </h3>
        <p className="mt-1 text-lg leading-relaxed">{entry.meaning}</p>
        <p className="mt-2 text-sm text-ink-soft">
          {formatDate(day)}
          {age && <> · {age}</>}
          {entry.heardBy && <> · Lo escuchó: {entry.heardBy}</>}
          {' · '}Lo anotó <AuthorLink person={entry.creator} className="link">{entry.creator?.name ?? 'Familia'}</AuthorLink>
        </p>
        {mayEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="link text-sm" onClick={() => setEditing(true)}>Cambiar</button>
            {confirming ? (
              <>
                <span className="text-sm font-semibold">¿Borrar «{entry.word}»?</span>
                <button type="button" className="link text-sm text-danger" onClick={remove}>Sí, borrar</button>
                <button type="button" className="link text-sm" onClick={() => setConfirming(false)}>No</button>
              </>
            ) : (
              <button type="button" className="link text-sm" onClick={() => setConfirming(true)}>Borrar</button>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-2 font-semibold text-danger">{error}</p>}
      </article>
    </li>
  );
}

// The words Carlo said, A to Z, each with his age that day.
export default function Dictionary() {
  const { data: session } = useSession();
  const user = session?.user;
  const birthDate = useCarloBirthDate();
  const { session: sessionStatus, status, data: words, reload } = useFamilyData('/api/words');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  if (sessionStatus === 'unauthenticated') return <p className="status-text mt-12">Inicia sesión para ver el diccionario.</p>;

  const shown = (words ?? []).filter((w) => matchesWord(w, query));
  const letters = [...new Set(shown.map((w) => initialOf(w.word)))];
  const mayEdit = (entry) => user?.role === 'admin' || (user?.id && entry.creator?._id === user.id);

  return (
    <section className="mx-auto mt-6 w-full max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Diccionario de Carlo</h1>
      <p className="mt-3 text-lg text-ink-soft">Las palabras que dijiste a tu manera, y lo que querías decir.</p>

      <div className="mt-6">
        {adding ? (
          <WordForm onDone={() => { setAdding(false); reload(); }} onCancel={() => setAdding(false)} />
        ) : (
          <button type="button" className="btn btn-sun" onClick={() => setAdding(true)}>Agregar una palabra</button>
        )}
      </div>

      {status === 'loading' && <p role="status" className="status-text mt-12">Cargando el diccionario…</p>}
      {status === 'error' && <p role="alert" className="status-text mt-12">No se pudo cargar el diccionario. Recarga la página.</p>}
      {status === 'ready' && words.length === 0 && (
        <p className="status-text mt-12">Todavía no hay palabras. Agrega la primera que recuerdes.</p>
      )}
      {status === 'ready' && words.length > 0 && (
        <>
          <label className="mt-8 block">
            <span className="label">Buscar en el diccionario</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Una palabra o lo que quería decir" maxLength={100} className="field" />
          </label>
          {shown.length === 0 && <p className="status-text mt-10">Ninguna palabra coincide con tu búsqueda.</p>}
          {letters.map((letter) => (
            <section key={letter} aria-labelledby={`letter-${letter}`} className="mt-10">
              <h2 id={`letter-${letter}`} className="font-display text-3xl font-bold text-ink-soft">{letter}</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {shown
                  .filter((w) => initialOf(w.word) === letter)
                  .map((entry) => (
                    <Entry key={entry.id} entry={entry} birthDate={birthDate} mayEdit={mayEdit(entry)} onChange={reload} />
                  ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
