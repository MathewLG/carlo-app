import Link from 'next/link';
import Avatar from './Avatar';
import { memoryDate, formatDate } from '@utils/format';

const PREVIEW_LENGTH = 280;

const MemoryCard = ({ memory, onTagClick }) => {
  // A memory can outlive its author's account, so creator may be missing.
  const author = memory.creator?.username ?? 'Familia';
  const isLong = memory.memory.length > PREVIEW_LENGTH;
  const text = isLong ? `${memory.memory.substring(0, PREVIEW_LENGTH).trimEnd()}…` : memory.memory;

  return (
    <article className="sticker">
      <header className="flex items-center gap-3">
        <Avatar image={memory.creator?.image} name={author} />
        <div>
          <p className="font-display font-semibold leading-tight">{author}</p>
          <p className="text-sm text-ink-soft">{formatDate(memoryDate(memory))}</p>
        </div>
      </header>

      <p className="mt-4 whitespace-pre-line text-base leading-relaxed">{text}</p>

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
