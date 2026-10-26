'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import MemoryCard from './MemoryCard';
import WriteLink from './WriteLink';
import useCarloBirthDate from './useCarloBirthDate';

const SEARCH_DELAY_MS = 300;

const Status = ({ children, role = 'status' }) => (
  <div role={role} className="mt-12 flex flex-col items-center gap-4">
    {children}
  </div>
);

// mine: only the signed-in user's memories (used on /profile).
// author: only that person's memories, in the order they happened (/familia/[id]).
const Feed = ({ mine = false, author = null }) => {
  const { status } = useSession();
  const birthDate = useCarloBirthDate();
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  // The last finished request. Until the current one finishes, the feed shows loading.
  const [result, setResult] = useState({ key: null, state: 'loading', memories: [] });
  const requestKey = `${query}|${tag}|${mine}|${author}|${reloadKey}`;
  const loadState = result.key === requestKey ? result.state : 'loading'; // loading | ready | error
  const memories = result.memories;

  // Wait until typing pauses before searching, so each key press is not a request.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (tag) params.set('tag', tag);
    if (mine) params.set('mine', '1');
    if (author) {
      params.set('author', author);
      params.set('order', 'oldest');
    }

    fetch(`/api/memory?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => setResult({ key: requestKey, state: 'ready', memories: data }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('Could not load memories', error);
        setResult({ key: requestKey, state: 'error', memories: [] });
      });

    return () => controller.abort();
  }, [status, query, tag, mine, author, requestKey]);

  if (status === 'loading') {
    return (
      <Status>
        <p className="status-text">Cargando…</p>
      </Status>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Status>
        <p className="status-text">Los recuerdos son solo para la familia. Inicia sesión para verlos.</p>
        <button type="button" className="btn btn-primary" onClick={() => signIn('google')}>
          Iniciar sesión con Google
        </button>
      </Status>
    );
  }

  const filtering = Boolean(query || tag);
  const clearFilters = () => {
    setSearchText('');
    setQuery('');
    setTag('');
  };

  return (
    <section aria-label="Recuerdos" className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="label">Buscar</span>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Una palabra o una categoría"
            maxLength={100}
            className="field"
          />
        </label>
        {tag && (
          <div className="flex items-center gap-2">
            <span className="text-ink-soft">Categoría:</span>
            <span className="tag-chip">{tag}</span>
            <button type="button" className="link text-sm" onClick={() => setTag('')}>
              Quitar
            </button>
          </div>
        )}
      </div>

      {loadState === 'loading' && (
        <Status>
          <p className="status-text">Cargando recuerdos…</p>
        </Status>
      )}

      {loadState === 'error' && (
        <Status role="alert">
          <p className="status-text">No se pudieron cargar los recuerdos. Revisa tu conexión.</p>
          <button type="button" className="btn btn-outline" onClick={() => setReloadKey((k) => k + 1)}>
            Intentar de nuevo
          </button>
        </Status>
      )}

      {loadState === 'ready' && memories.length === 0 && filtering && (
        <Status>
          <p className="status-text">Ningún recuerdo coincide con tu búsqueda.</p>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Ver todos los recuerdos
          </button>
        </Status>
      )}

      {loadState === 'ready' && memories.length === 0 && !filtering && author && (
        <Status>
          <p className="status-text">Todavía no ha escrito ningún recuerdo.</p>
        </Status>
      )}

      {loadState === 'ready' && memories.length === 0 && !filtering && !author && (
        <Status>
          <p className="status-text">
            {mine ? 'Todavía no has escrito ningún recuerdo.' : 'Todavía no hay recuerdos. Escribe el primero.'}
          </p>
          <WriteLink />
        </Status>
      )}

      {loadState === 'ready' && memories.length > 0 && (
        <div className="memory-grid mt-10">
          {memories.map((memory) => (
            <MemoryCard key={memory._id} memory={memory} onTagClick={setTag} birthDate={birthDate} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Feed;
