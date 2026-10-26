'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import InstantPhoto from '@components/media/InstantPhoto';
import VoiceNote from '@components/media/VoiceNote';
import { ageAt } from '@utils/age';
import { parseDay } from '@utils/dates';
import { formatDate } from '@utils/format';
import { MILESTONES } from '@utils/milestones';
import { ageMarkers, MAX_TITLE_LENGTH } from '@utils/timeline';

const PREVIEW_LENGTH = 220;
const REFRESH_MS = 15_000;

const send = async (url, method, body) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Algo salió mal. Inténtalo de nuevo.');
  return data;
};

const dateRange = (event) => {
  const start = formatDate(parseDay(event.startDay));
  return event.startDay === event.endDay ? start : `Del ${start} al ${formatDate(parseDay(event.endDay))}`;
};

function Milestones({ events }) {
  const recorded = new Set(events.flatMap((e) => e.memories.map((m) => m.milestone)).filter(Boolean));
  const others = [...recorded].filter((label) => !MILESTONES.some((m) => m.label === label));
  return (
    <section aria-labelledby="firsts-title" className="sticker mt-8">
      <h2 id="firsts-title" className="text-2xl font-bold">Primeras veces</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {MILESTONES.map((m) => (
          <li
            key={m.label}
            className={`rounded-full border-2 border-ink px-3 py-1 font-display text-sm font-semibold ${recorded.has(m.label) ? 'bg-sky text-ink' : 'border-dashed bg-white text-ink-soft'}`}
          >
            {m.label}
            <span className="sr-only">{recorded.has(m.label) ? ': ya tiene recuerdo' : ': todavía sin recuerdo'}</span>
          </li>
        ))}
        {others.map((label) => (
          <li key={label} className="rounded-full border-2 border-ink bg-sky px-3 py-1 font-display text-sm font-semibold text-ink">
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-soft">
        Al escribir un recuerdo, elige “¿Es una primera vez?” para que tenga su propio momento.
      </p>
    </section>
  );
}

function EventCard({ event, index, events, birthDate, admin, onChange }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [error, setError] = useState('');
  const previous = events[index - 1];
  const next = events[index + 1];
  const age = ageAt(birthDate, parseDay(event.startDay));

  const run = async (url, body) => {
    setError('');
    try {
      await send(url, 'PATCH', body);
      setRenaming(false);
      onChange();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <article className="sticker" aria-labelledby={`event-${event.id}`}>
      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(`/api/timeline/events/${event.id}`, { title });
          }}
          className="flex flex-col gap-2"
        >
          <label>
            <span className="label">Nombre del momento</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE_LENGTH} required className="field" />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-outline" onClick={() => setRenaming(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <h2 id={`event-${event.id}`} className="text-2xl font-bold leading-tight">{event.title}</h2>
      )}
      <p className="mt-1 text-sm text-ink-soft">
        {dateRange(event)}
        {age && <> · {age}</>}
      </p>

      <ul className="mt-4 flex flex-col gap-5">
        {event.memories.map((memory) => {
          const long = memory.memory.length > PREVIEW_LENGTH;
          return (
            <li key={memory._id} className="flex flex-col gap-2 border-t-2 border-dashed border-ink/20 pt-4 first:border-t-0 first:pt-0">
              {memory.photo && <InstantPhoto photo={memory.photo} className="max-w-[14rem]" />}
              <p className="whitespace-pre-line leading-relaxed">
                {long ? `${memory.memory.slice(0, PREVIEW_LENGTH).trimEnd()}…` : memory.memory}
              </p>
              {memory.voice && <VoiceNote voice={memory.voice} />}
              <p className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                <span>{memory.creator?.username ?? 'Familia'}</span>
                <Link href={`/memories/${memory._id}`} className="link">
                  {long ? 'Leer completo' : 'Abrir'}
                </Link>
                {admin && previous && (
                  <button type="button" className="link" onClick={() => run(`/api/timeline/events/${event.id}`, { moveMemory: memory._id, toEvent: previous.id })}>
                    Mover al momento anterior
                  </button>
                )}
                {admin && next && (
                  <button type="button" className="link" onClick={() => run(`/api/timeline/events/${event.id}`, { moveMemory: memory._id, toEvent: next.id })}>
                    Mover al momento siguiente
                  </button>
                )}
              </p>
            </li>
          );
        })}
      </ul>

      {admin && !renaming && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-ink/10 pt-4">
          <button type="button" className="btn btn-outline" onClick={() => setRenaming(true)}>Cambiar nombre</button>
          {next && (
            <button type="button" className="btn btn-outline" onClick={() => run(`/api/timeline/events/${event.id}`, { mergeWith: next.id })}>
              Unir con el siguiente
            </button>
          )}
          {event.locked && <span className="text-sm text-ink-soft">Editado por ti: se queda como está</span>}
        </div>
      )}
      {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
    </article>
  );
}

export default function Timeline() {
  const { data: session, status } = useSession();
  const admin = session?.user?.role === 'admin';
  const [timeline, setTimeline] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [reorganizing, setReorganizing] = useState(false);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    fetch('/api/timeline')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((data) => active && setTimeline(data))
      .catch((error) => {
        console.error(error);
        if (active) setLoadError('No se pudo cargar la línea del tiempo. Recarga la página.');
      });
    return () => {
      active = false;
    };
  }, [status, reloadKey]);

  // While it is being rebuilt, check back now and then.
  useEffect(() => {
    if (!timeline?.updating) return;
    const timer = setTimeout(reload, REFRESH_MS);
    return () => clearTimeout(timer);
  }, [timeline, reload]);

  const reorganize = async () => {
    setReorganizing(true);
    try {
      await send('/api/timeline/rebuild', 'POST');
      reload();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setReorganizing(false);
    }
  };

  if (status === 'loading') return <p className="status-text mt-12">Cargando…</p>;
  if (status === 'unauthenticated') {
    return <p className="status-text mt-12">Inicia sesión para ver la línea del tiempo.</p>;
  }
  if (loadError) return <p role="alert" className="status-text mt-12">{loadError}</p>;
  if (!timeline) return <p role="status" className="status-text mt-12">Cargando la línea del tiempo…</p>;

  const { events, birthDate } = timeline;
  const markers = ageMarkers(events, birthDate);

  return (
    <div className="mx-auto mt-6 w-full max-w-5xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Línea del tiempo</h1>
      <p className="mt-3 text-lg text-ink-soft">Tu vida, Carlo, contada por tu familia, desde el principio.</p>
      {timeline.updating && (
        <p role="status" className="mt-3 font-semibold">Acomodando los recuerdos nuevos…</p>
      )}
      {admin && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-outline" onClick={reorganize} disabled={reorganizing}>
            {reorganizing ? 'Reorganizando…' : 'Reorganizar'}
          </button>
          <span className="text-sm text-ink-soft">Agrupa y nombra otra vez los momentos que no has editado.</span>
        </div>
      )}

      <Milestones events={events} />

      {events.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="status-text">Todavía no hay recuerdos en la línea del tiempo.</p>
          <Link href="/create-memory" className="btn btn-sun">Escribir un recuerdo</Link>
        </div>
      ) : (
        // The path: a line down the left on phones, down the middle on wide
        // screens, with the moments alternating sides.
        <ol className="timeline mt-10">
          {events.map((event, index) => (
            <li key={event.id} className="timeline-item">
              {markers
                .filter((m) => m.beforeIndex === index)
                .map((m) => (
                  <p key={m.label} className="timeline-marker">{m.label}</p>
                ))}
              <div className="timeline-card">
                <EventCard event={event} index={index} events={events} birthDate={birthDate} admin={admin} onChange={reload} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
