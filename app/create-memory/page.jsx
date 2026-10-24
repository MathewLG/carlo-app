'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Form from '@components/Form';

const CreateMemory = () => {
  const router = useRouter();
  const { status } = useSession();
  const [submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [post, setPost] = useState({ memory: '', tag: '' });

  const createMemory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/memory/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory: post.memory, tag: post.tag }),
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
        return;
      }
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'No se pudo guardar el recuerdo. Inténtalo de nuevo.');
    } catch (err) {
      console.error(err);
      setError('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <p className="status-text mt-12">Cargando…</p>;
  }
  if (status === 'unauthenticated') {
    return <p className="status-text mt-12">Inicia sesión para escribir un recuerdo.</p>;
  }

  return (
    <Form
      title="Nuevo recuerdo"
      description="Escribe algo para el Carlo del futuro: lo que pasó hoy, lo que te hizo reír o lo que quieres que sepa."
      submitLabel="Guardar recuerdo"
      cancelHref="/"
      post={post}
      setPost={setPost}
      submitting={submitting}
      handleSubmit={createMemory}
      error={error}
    />
  );
};

export default CreateMemory;
