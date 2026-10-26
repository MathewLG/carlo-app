import { toDayString } from '@utils/dates';
import { authorName } from '@utils/format';
import { parsePastDay } from '@utils/validate';

export const MAX_WORD_LENGTH = 40;
export const MAX_MEANING_LENGTH = 200;
export const MAX_HEARD_BY_LENGTH = 60;

const text = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

// Returns { word, meaning, saidAt, heardBy, firstWord } or { error } with a
// message for the user. The day is required: the dictionary shows his age.
export const parseWordInput = (body, now = new Date()) => {
  const word = text(body?.word);
  const meaning = text(body?.meaning);
  const heardBy = text(body?.heardBy);
  if (!word || !meaning) return { error: 'La palabra y lo que quería decir son obligatorios' };
  if (word.length > MAX_WORD_LENGTH || meaning.length > MAX_MEANING_LENGTH || heardBy.length > MAX_HEARD_BY_LENGTH) {
    return { error: 'El texto es demasiado largo' };
  }
  if (!body?.saidAt) return { error: '¿Qué día lo dijo? La fecha es obligatoria' };
  const said = parsePastDay(body.saidAt, now);
  if (said.error) return { error: said.error };
  if (body.firstWord !== undefined && typeof body.firstWord !== 'boolean') return { error: 'Solicitud inválida' };
  return { word, meaning, saidAt: said.date, heardBy, firstWord: Boolean(body.firstWord) };
};

// For sorting and searching: lower case, without accents, so "Ábaco" sits
// with the a's and "agua" finds "Água".
export const foldText = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// A to Z the way a Spanish dictionary sorts, ñ after n.
export const sortWords = (words) => [...words].sort((a, b) => a.word.localeCompare(b.word, 'es', { sensitivity: 'base' }));

// The heading letter for an entry: Á goes under A, Ñ stays Ñ.
export const initialOf = (word) => {
  const first = word.trim().charAt(0).toUpperCase();
  if (first === 'Ñ') return 'Ñ';
  const folded = foldText(first).toUpperCase();
  return /[A-Z]/.test(folded) ? folded : '#';
};

export const matchesWord = (entry, query) => {
  const q = foldText(query.trim());
  return !q || foldText(entry.word).includes(q) || foldText(entry.meaning).includes(q);
};

// What the browser gets for an entry.
export const publicWord = (word) => ({
  id: String(word._id),
  word: word.word,
  meaning: word.meaning,
  saidAt: toDayString(word.saidAt),
  heardBy: word.heardBy ?? '',
  firstWord: Boolean(word.firstWord),
  creator: word.creator?._id
    ? { _id: String(word.creator._id), name: authorName(word.creator), image: word.creator.image ?? null }
    : null,
});
