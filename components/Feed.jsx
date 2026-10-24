'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import MemoryCard from './MemoryCard';

const MemoryCardList = ({ data, handleTagClick }) => (
  <div className="mt-16 prompt_layout">
    {data.map((memory) => (
      <MemoryCard key={memory._id} memory={memory} handleTagClick={handleTagClick} />
    ))}
  </div>
);

const StatusMessage = ({ children, role = 'status' }) => (
  <p role={role} className="mt-16 desc text-center">
    {children}
  </p>
);

const Feed = () => {
  const { status } = useSession();
  const [memories, setMemories] = useState([]);
  const [loadState, setLoadState] = useState('idle'); // idle | loading | ready | error

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchMemories = async () => {
      setLoadState('loading');
      try {
        const response = await fetch('/api/memory');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setMemories(await response.json());
        setLoadState('ready');
      } catch (error) {
        console.error('Could not load memories', error);
        setLoadState('error');
      }
    };
    fetchMemories();
  }, [status]);

  if (status === 'loading') {
    return <StatusMessage>Cargando…</StatusMessage>;
  }
  if (status === 'unauthenticated') {
    return <StatusMessage>Inicia sesión para ver y agregar recuerdos.</StatusMessage>;
  }

  return (
    <section className="feed">
      {(loadState === 'idle' || loadState === 'loading') && (
        <StatusMessage>Cargando recuerdos…</StatusMessage>
      )}
      {loadState === 'error' && (
        <StatusMessage role="alert">
          No se pudieron cargar los recuerdos. Recarga la página para intentarlo de nuevo.
        </StatusMessage>
      )}
      {loadState === 'ready' && memories.length === 0 && (
        <StatusMessage>Todavía no hay recuerdos. Agrega el primero.</StatusMessage>
      )}
      {loadState === 'ready' && memories.length > 0 && (
        <MemoryCardList data={memories} handleTagClick={() => {}} />
      )}
    </section>
  );
};

export default Feed;
