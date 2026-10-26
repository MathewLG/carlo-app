import Link from 'next/link';
import { MAX_MEMORY_LENGTH, MAX_TAG_LENGTH } from '@utils/validate';
import { todayString } from '@utils/dates';
import MediaFields from './media/MediaFields';
import MilestoneField from './MilestoneField';
import LockField from './LockField';

// media/setMedia: the photo and voice note, from emptyMedia() in media/prepareMedia.js.
const Form = ({ title, description, submitLabel, cancelHref, post, setPost, media, setMedia, submitting, handleSubmit, error }) => (
  <section className="mx-auto mt-6 w-full max-w-2xl">
    <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
    <p className="mt-3 text-lg text-ink-soft">{description}</p>

    <form onSubmit={handleSubmit} className="sticker mt-8 flex flex-col gap-6">
      <label>
        <span className="label">Tu recuerdo con Carlo</span>
        <textarea
          value={post.memory}
          onChange={(e) => setPost({ ...post, memory: e.target.value })}
          maxLength={MAX_MEMORY_LENGTH}
          placeholder="Escribe tu mensaje aquí"
          required
          rows={8}
          className="field resize-y"
        />
        <span className="mt-1 block text-right text-sm text-ink-soft">
          {post.memory.length} / {MAX_MEMORY_LENGTH}
        </span>
      </label>

      <label>
        <span className="label">Categoría</span>{' '}
        <span className="text-ink-soft">(por ejemplo #mensaje o #recuerdo)</span>
        <input
          value={post.tag}
          onChange={(e) => setPost({ ...post, tag: e.target.value })}
          maxLength={MAX_TAG_LENGTH}
          placeholder="#categoria"
          required
          className="field"
        />
      </label>

      <label>
        <span className="label">¿Cuándo pasó?</span>{' '}
        <span className="text-ink-soft">(opcional; déjalo vacío si fue hoy)</span>
        <input
          type="date"
          value={post.happenedAt ?? ''}
          onChange={(e) => setPost({ ...post, happenedAt: e.target.value })}
          max={todayString()}
          className="field"
        />
      </label>

      <MilestoneField value={post.milestone ?? ''} onChange={(milestone) => setPost({ ...post, milestone })} />

      {media && <MediaFields media={media} setMedia={setMedia} />}

      <LockField value={post.lock} onChange={(lock) => setPost({ ...post, lock })} />

      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-4">
        <Link href={cancelHref} className="link">
          Cancelar
        </Link>
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  </section>
);

export default Form;
