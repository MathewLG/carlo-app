'use client';
import { useEffect, useRef, useState } from 'react';
import { MAX_CAPTION_LENGTH, MAX_VOICE_SECONDS } from '@utils/media';
import { checkVoiceFile, recordingType, shrinkPhoto } from './prepareMedia';
import { formatDuration } from './VoiceNote';

function VoiceRecorder({ onRecorded, onError }) {
  const recorder = useRef(null);
  const timers = useRef([]);
  const [seconds, setSeconds] = useState(null); // null when not recording

  const clearTimers = () => {
    timers.current.forEach((t) => clearInterval(t));
    timers.current = [];
  };
  useEffect(() => () => {
    clearTimers();
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();

  const start = async () => {
    const type = recordingType();
    if (!type || !navigator.mediaDevices?.getUserMedia) {
      onError('Este navegador no puede grabar. Sube un audio en su lugar.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError('No se pudo usar el micrófono. Revisa el permiso del navegador.');
      return;
    }
    const chunks = [];
    const started = Date.now();
    const media = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32000 });
    media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    media.onstop = () => {
      clearTimers();
      stream.getTracks().forEach((track) => track.stop());
      setSeconds(null);
      const blob = new Blob(chunks, { type: type.split(';')[0] });
      // Recorded files often carry no length, so the clock measures it.
      onRecorded({ blob, durationSec: Math.min(MAX_VOICE_SECONDS, (Date.now() - started) / 1000) });
    };
    recorder.current = media;
    media.start();
    setSeconds(0);
    timers.current.push(
      setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_VOICE_SECONDS) stop();
      }, 250),
    );
  };

  if (seconds === null) {
    return (
      <button type="button" className="btn btn-outline" onClick={start}>
        Grabar nota de voz
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span role="status" className="font-display font-semibold text-danger">
        Grabando {formatDuration(seconds)} / {formatDuration(MAX_VOICE_SECONDS)}
      </span>
      <button type="button" className="btn btn-danger" onClick={stop}>
        Detener
      </button>
    </div>
  );
}

// The photo and voice-note part of the memory form. `media` comes from
// emptyMedia() in prepareMedia.js; nothing is uploaded until the form saves.
const MediaFields = ({ media, setMedia }) => {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (changes) => setMedia((current) => ({ ...current, ...changes }));

  const shownPhoto = media.photo?.previewUrl ?? (!media.removePhoto && media.currentPhoto?.url);
  const shownVoice = media.voice ?? (!media.removeVoice && media.currentVoice);

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const photo = await shrinkPhoto(file);
      if (media.photo) URL.revokeObjectURL(media.photo.previewUrl);
      update({ photo: { ...photo, previewUrl: URL.createObjectURL(photo.blob) }, removePhoto: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setVoice = ({ blob, durationSec }) => {
    if (media.voice) URL.revokeObjectURL(media.voice.previewUrl);
    update({ voice: { blob, durationSec, previewUrl: URL.createObjectURL(blob) }, removeVoice: false });
  };

  const pickVoice = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      setVoice(await checkVoiceFile(file));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <fieldset className="flex flex-col gap-6">
      <legend className="label">Foto y nota de voz (opcional)</legend>

      <div className="flex flex-col gap-3">
        {shownPhoto ? (
          <>
            <figure className="instant-photo max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shownPhoto} alt="Foto elegida para este recuerdo" />
              <figcaption>{media.caption}</figcaption>
            </figure>
            <label>
              <span className="label">Pie de foto</span>
              <input
                value={media.caption}
                onChange={(e) => update({ caption: e.target.value })}
                maxLength={MAX_CAPTION_LENGTH}
                placeholder="Por ejemplo: En el parque con la abuela"
                className="field"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="btn btn-outline cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-carlo-blue">
                Cambiar foto
                <input type="file" accept="image/*" onChange={pickPhoto} className="sr-only" />
              </label>
              <button type="button" className="btn btn-outline" onClick={() => update({ photo: null, removePhoto: true })}>
                Quitar foto
              </button>
            </div>
          </>
        ) : (
          <label className="btn btn-outline cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-carlo-blue self-start">
            Agregar una foto
            <input type="file" accept="image/*" onChange={pickPhoto} className="sr-only" />
          </label>
        )}
        {busy && <p role="status" className="text-ink-soft">Preparando la foto…</p>}
      </div>

      <div className="flex flex-col gap-3">
        {shownVoice ? (
          <>
            <audio controls src={media.voice?.previewUrl ?? media.currentVoice.url} className="w-full">
              Nota de voz
            </audio>
            <button
              type="button"
              className="btn btn-outline self-start"
              onClick={() => update({ voice: null, removeVoice: true })}
            >
              Quitar nota de voz
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <VoiceRecorder onRecorded={setVoice} onError={setError} />
            <label className="link cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-carlo-blue">
              o sube un audio
              <input type="file" accept="audio/*" onChange={pickVoice} className="sr-only" />
            </label>
          </div>
        )}
        <p className="text-sm text-ink-soft">Hasta 5 minutos.</p>
      </div>

      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default MediaFields;
