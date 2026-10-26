'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Form from '@components/Form';
import { toDayString } from '@utils/dates';
import { emptyMedia, saveMedia } from '@components/media/prepareMedia';

export default function EditMemory() {
  const { memory: id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [post, setPost] = useState({ memory: '', tag: '', happenedAt: '', milestone: '' });
  const [loadState, setLoadState] = useState('loading'); // loading | ready | forbidden | missing | error
  const [submitting, setSubmitting] = useState(false);
  // A new memory whose photo or voice note failed lands here with ?aviso=<why>.
  const notice = useSearchParams().get('aviso');
  const [error, setError] = useState(
    notice ? `El recuerdo se guardó, pero el archivo no: ${notice} Inténtalo de nuevo aquí.` : '',
  );
  const [media, setMedia] = useState(emptyMedia);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/memory/${id}`)
      .then(async (response) => {
        if (response.status === 404) return setLoadState('missing');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const memory = await response.json();
        const canChange = memory.creator?._id === session.user.id || session.user.role === 'admin';
        if (!canChange) return setLoadState('forbidden');
        setPost({
          memory: memory.memory,
          tag: memory.tag,
          happenedAt: memory.happenedAt ? toDayString(new Date(memory.happenedAt)) : '',
          milestone: memory.milestone ?? '',
        });
        setMedia(emptyMedia(memory));
        setLoadState('ready');
      })
      .catch((err) => {
        console.error(err);
        setLoadState('error');
      });
  }, [id, status, session?.user?.id, session?.user?.role]);

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
        try {
          await saveMedia(id, media);
        } catch (mediaError) {
          setError(`Los cambios del texto se guardaron, pero el archivo no: ${mediaError.message}`);
          return;
        }
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
      media={media}
      setMedia={setMedia}
      submitting={submitting}
      handleSubmit={saveMemory}
      error={error}
    />
  );
}
