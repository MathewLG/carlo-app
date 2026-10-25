'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Form from '@components/Form';

export default function EditMemory({ params }) {
  const id = params.memory;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [post, setPost] = useState({ memory: '', tag: '' });
  const [loadState, setLoadState] = useState('loading'); // loading | ready | forbidden | missing | error
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/memory/${id}`)
      .then(async (response) => {
        if (response.status === 404) return setLoadState('missing');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const memory = await response.json();
        if (memory.creator?._id !== session.user.id) return setLoadState('forbidden');
        setPost({ memory: memory.memory, tag: memory.tag });
        setLoadState('ready');
      })
      .catch((err) => {
        console.error(err);
        setLoadState('error');
      });
  }, [id, status, session?.user?.id]);

  const saveMemory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });
      if (response.ok) {
        router.push(`/memories/${id}`);
        router.refresh();
        return;
      }
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'No se pudieron guardar los cambios.');
    } catch (err) {
      console.error(err);
      setError('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'unauthenticated') {
    return <p className="status-text mt-12">Inicia sesión para editar tus recuerdos.</p>;
  }
  if (status === 'loading' || loadState === 'loading') {
    return <p role="status" className="status-text mt-12">Cargando recuerdo…</p>;
  }
  if (loadState === 'missing') {
    return <p className="status-text mt-12">Este recuerdo no existe o fue borrado.</p>;
  }
  if (loadState === 'forbidden') {
    return <p className="status-text mt-12">Solo quien escribió este recuerdo puede editarlo.</p>;
  }
  if (loadState === 'error') {
    return (
      <p role="alert" className="status-text mt-12">
        No se pudo cargar el recuerdo. Recarga la página para intentarlo de nuevo.
      </p>
    );
  }

  return (
    <Form
      title="Editar recuerdo"
      description="Corrige o agrega lo que quieras. Los cambios se guardan en el mismo recuerdo."
      submitLabel="Guardar cambios"
      cancelHref={`/memories/${id}`}
      post={post}
      setPost={setPost}
      submitting={submitting}
      handleSubmit={saveMemory}
      error={error}
    />
  );
}
