import AuthorLink from './AuthorLink';
import { authorName, formatDate } from '@utils/format';
import { unlockText } from '@utils/letters';

// A carta con candado before its day: a closed envelope with a seal, who
// wrote it and when it opens. Nothing of the letter itself is ever here.
// `children` adds actions under it (the admin's delete).
const SealedEnvelope = ({ memory, children }) => (
  <article className="sticker flex flex-col items-center gap-3 text-center" aria-label={`Carta con candado de ${authorName(memory.creator)}`}>
    <svg viewBox="0 0 120 80" className="h-20 w-28" aria-hidden="true">
      <rect x="4" y="4" width="112" height="72" rx="8" fill="#fff" stroke="#14274A" strokeWidth="4" />
      <path d="M6 8 L60 46 L114 8" fill="none" stroke="#14274A" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="60" cy="46" r="12" fill="#FFD23F" stroke="#14274A" strokeWidth="4" />
      <path d="M55 46 h10 M60 41 v10" stroke="#14274A" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <h2 className="font-display text-xl font-semibold">
      Carta de <AuthorLink person={memory.creator} className="hover:underline">{authorName(memory.creator)}</AuthorLink>
    </h2>
    <p className="font-semibold">{unlockText(memory)}</p>
    {memory.createdAt && <p className="text-sm text-ink-soft">Escrita el {formatDate(new Date(memory.createdAt))}</p>}
    {children}
  </article>
);

export default SealedEnvelope;
