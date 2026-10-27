'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { zipSync } from 'fflate';
import AdminNav from '@components/AdminNav';
import { buildBackupFiles } from '@utils/backup';
import { todayString } from '@utils/dates';

const fetchBytes = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${url}`);
  return new Uint8Array(await response.arrayBuffer());
};

function Backup() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The zip is built here in the browser: a server reply holding every photo
  // would not fit in one Vercel response.
  const download = async () => {
    setBusy(true);
    setError('');
    setStatus('Leyendo los recuerdos…');
    try {
      const response = await fetch('/api/admin/backup');
      if (!response.ok) throw new Error('No se pudieron leer los recuerdos.');
      const backup = await response.json();
      const files = await buildBackupFiles(backup, fetchBytes, (done, total) =>
        setStatus(`Descargando archivos: ${done} de ${total}…`),
      );
      // Photos and audio are already compressed; storing them is faster.
      const zip = zipSync(files, { level: 0 });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
      link.download = `carlo-app-respaldo-${todayString()}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      setStatus(`Listo: ${backup.memories.length} recuerdos en ${link.download}.`);
    } catch (err) {
      console.error(err);
      setStatus('');
      setError(`${err.message} Inténtalo de nuevo.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="sticker mt-8" aria-labelledby="backup-title">
      <h2 id="backup-title" className="text-2xl font-bold">Respaldo completo</h2>
      <p className="mt-2 text-ink-soft">
        Descarga un archivo .zip con todos los recuerdos, fotos y notas de voz. Adentro, recuerdos.html se abre en
        cualquier navegador, sin la app y sin internet. Guárdalo en un lugar seguro, fuera de esta computadora.
      </p>
      <button type="button" className="btn btn-primary mt-4" onClick={download} disabled={busy}>
        {busy ? 'Preparando…' : 'Descargar respaldo'}
      </button>
      {status && <p role="status" className="mt-3 font-semibold">{status}</p>}
      {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
    </section>
  );
}

const STEPS = { escribir: 'guardar', leer: 'leer', borrar: 'borrar' };

// "Probar el almacenamiento": saves, reads back and deletes a tiny file where
// photos and voice notes go, to tell whether uploads can work and why not.
function StorageCheck() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/storage-check', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      setResult(response.ok ? data : { ok: false, reason: data.error || `error ${response.status}` });
    } catch {
      setResult({ ok: false, reason: 'no hubo conexión con el servidor' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="sticker mt-8" aria-labelledby="storage-title">
      <h2 id="storage-title" className="text-2xl font-bold">Almacenamiento de fotos</h2>
      <p className="mt-2 text-ink-soft">
        Guarda, lee y borra un archivo de prueba donde viven las fotos y las notas de voz, para saber si se pueden subir.
      </p>
      <button type="button" className="btn btn-outline mt-4" onClick={run} disabled={busy}>
        {busy ? 'Probando…' : 'Probar el almacenamiento'}
      </button>
      {result?.ok && <p role="status" className="mt-3 font-semibold">Funciona: se pudo guardar, leer y borrar un archivo.</p>}
      {result && !result.ok && (
        <p role="alert" className="mt-3 font-semibold text-danger">
          No funciona{result.step ? ` al ${STEPS[result.step]} el archivo` : ''}: {result.reason}.
        </p>
      )}
    </section>
  );
}

export default function AdminBackup() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p className="status-text mt-12">Cargando…</p>;
  if (session?.user?.role !== 'admin') {
    return <p className="status-text mt-12">Solo el administrador puede ver esta página.</p>;
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Respaldo</h1>
      <AdminNav />
      <Backup />
      <StorageCheck />
    </div>
  );
}
