import Link from 'next/link';
import Avatar from './Avatar';
import AuthorLink from './AuthorLink';
import { authorName, memoryDate, formatDate } from '@utils/format';
import { ageAt } from '@utils/age';
import InstantPhoto from './media/InstantPhoto';
import VoiceNote from './media/VoiceNote';

const PREVIEW_LENGTH = 280;

// birthDate: Carlo's, to show his age on the day; null hides it.
const MemoryCard = ({ memory, onTagClick, birthDate = null }) => {
  // A memory can outlive its author's account, so creator may be missing.
  const author = authorName(memory.creator);
  const isLong = memory.memory.length > PREVIEW_LENGTH;
  const date = memoryDate(memory);
  const age = ageAt(birthDate, date);
  const text = isLong ? `${memory.memory.substring(0, PREVIEW_LENGTH).trimEnd()}…` : memory.memory;

  return (
    <article className="sticker">
      <header className="flex items-center gap-3">
        <AuthorLink person={memory.creator} className="shrink-0" tabIndex={-1} aria-hidden="true">
          <Avatar image={memory.creator?.image} name={author} />
        </AuthorLink>
        <div>
          <p className="font-display font-semibold leading-tight">
            <AuthorLink person={memory.creator} className="hover:underline">{author}</AuthorLink>
          </p>
          <p className="text-sm text-ink-soft">
            {formatDate(date)}
            {age && <> · {age}</>}
          </p>
        </div>
      </header>

      {memory.photo && <InstantPhoto photo={memory.photo} className="mt-4" />}

      <p className="mt-4 whitespace-pre-line text-base leading-relaxed">{text}</p>

      {memory.voice && (
        <div className="mt-4">
          <VoiceNote voice={memory.voice} />
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="tag-chip"
          onClick={() => onTagClick?.(memory.tag)}
          aria-label={`Ver recuerdos con la categoría ${memory.tag}`}
        >
          {memory.tag}
        </button>
        <Link href={`/memories/${memory._id}`} className="link text-sm">
          {isLong ? 'Leer completo' : 'Abrir'}
        </Link>
      </footer>
    </article>
  );
};

export default MemoryCard;
