'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Avatar from '@components/Avatar';
import { memoryDate, formatDate } from '@utils/format';
import { ageAt } from '@utils/age';
import useCarloBirthDate from '@components/useCarloBirthDate';
import InstantPhoto from '@components/media/InstantPhoto';
import VoiceNote from '@components/media/VoiceNote';

export default function SingleMemory() {
  const { memory: id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const birthDate = useCarloBirthDate();
  const [memory, setMemory] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | missing | error
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/memory/${id}`)
      .then(async (response) => {
        if (response.status === 404) return setLoadState('missing');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setMemory(await response.json());
        setLoadState('ready');
      })
      .catch((error) => {
        console.error(error);
        setLoadState('error');
      });
  }, [id, status]);

  // Escape backs out of the delete confirmation.
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e) => e.key === 'Escape' && setConfirming(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming]);

  const deleteMemory = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo borrar el recuerdo.');
      }
      router.push('/profile');
      router.refresh();
    } catch (error) {
      setDeleteError(error.message);
      setDeleting(false);
    }
  };

  if (status === 'unauthenticated') {
    return <p className="status-text mt-12">Inicia sesión para ver este recuerdo.</p>;
  }
  if (status === 'loading' || loadState === 'loading') {
    return <p role="status" className="status-text mt-12">Cargando recuerdo…</p>;
  }
  if (loadState === 'missing') {
    return (
      <div className="mt-12 flex flex-col items-center gap-4">
        <p className="status-text">Este recuerdo no existe o fue borrado.</p>
        <Link href="/" className="btn btn-outline">Ver todos los recuerdos</Link>
      </div>
    );
  }
  if (loadState === 'error') {
    return (
      <p role="alert" className="status-text mt-12">
        No se pudo cargar el recuerdo. Recarga la página para intentarlo de nuevo.
      </p>
    );
  }

  const author = memory.creator?.username ?? 'Familia';
  // Same rule as the API: the author or the admin can change a memory.
  const isOwner = memory.creator?._id && memory.creator._id === session?.user?.id;
  const canChange = isOwner || session?.user?.role === 'admin';

  return (
    <article className="mx-auto mt-6 w-full max-w-2xl">
      <Link href="/" className="link">Volver a los recuerdos</Link>

      <div className="sticker mt-6">
        <header className="flex items-center gap-3">
          <Avatar image={memory.creator?.image} name={author} size={48} />
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{author}</p>
            <p className="text-ink-soft">{formatDate(memoryDate(memory))}</p>
            {ageAt(birthDate, memoryDate(memory)) && (
              <p className="text-ink-soft">{ageAt(birthDate, memoryDate(memory))}</p>
            )}
          </div>
        </header>
        {memory.photo && <InstantPhoto photo={memory.photo} className="mx-auto mt-6 max-w-md" />}
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{memory.memory}</p>
        {memory.voice && (
          <div className="mt-6">
            <VoiceNote voice={memory.voice} />
          </div>
        )}
        <p className="mt-6">
          <span className="tag-chip">{memory.tag}</span>
        </p>
      </div>

      {canChange && !confirming && (
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href={`/memories/${id}/edit`} className="btn btn-outline">Editar</Link>
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
            Borrar
          </button>
        </div>
      )}

      {canChange && confirming && (
        <div role="alertdialog" aria-labelledby="confirm-title" className="mt-8 rounded-2xl border-2 border-danger bg-white p-5">
          <p id="confirm-title" className="font-display text-lg font-semibold">
            ¿Borrar este recuerdo? No se puede deshacer.
          </p>
          {deleteError && <p role="alert" className="mt-2 font-semibold text-danger">{deleteError}</p>}
          <div className="mt-4 flex flex-wrap gap-4">
            <button type="button" className="btn btn-danger" onClick={deleteMemory} disabled={deleting}>
              {deleting ? 'Borrando…' : 'Sí, borrar'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)} autoFocus>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
