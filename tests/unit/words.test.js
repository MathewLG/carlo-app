import { describe, expect, it } from 'vitest';
import { foldText, initialOf, matchesWord, parseWordInput, publicWord, sortWords } from '@utils/words';

const now = new Date('2026-10-25T18:00:00Z');
const valid = { word: ' awa ', meaning: 'agua  fresca', saidAt: '2024-05-15', heardBy: ' Mamá ', firstWord: true };

describe('parseWordInput', () => {
  it('trims and squeezes the text, and stores the day at noon UTC', () => {
    expect(parseWordInput(valid, now)).toEqual({
      word: 'awa',
      meaning: 'agua fresca',
      saidAt: new Date('2024-05-15T12:00:00Z'),
      heardBy: 'Mamá',
      firstWord: true,
    });
  });

  it('leaves who heard it optional and first word off by default', () => {
    expect(parseWordInput({ word: 'tete', meaning: 'chupón', saidAt: '2024-01-02' }, now)).toMatchObject({ heardBy: '', firstWord: false });
  });

  it.each([
    ['no word', { ...valid, word: ' ' }, 'obligatorios'],
    ['no meaning', { ...valid, meaning: undefined }, 'obligatorios'],
    ['a word over 40 characters', { ...valid, word: 'a'.repeat(41) }, 'demasiado largo'],
    ['a meaning over 200 characters', { ...valid, meaning: 'a'.repeat(201) }, 'demasiado largo'],
    ['who heard it over 60 characters', { ...valid, heardBy: 'a'.repeat(61) }, 'demasiado largo'],
    ['no day', { ...valid, saidAt: '' }, 'La fecha es obligatoria'],
    ['a day that is not real', { ...valid, saidAt: '2024-02-30' }, 'no es válida'],
    ['a day in the future', { ...valid, saidAt: '2026-10-26' }, 'en el futuro'],
    ['a first word that is not true or false', { ...valid, firstWord: 'sí' }, 'Solicitud inválida'],
    ['no body', null, 'obligatorios'],
  ])('refuses %s', (_label, body, message) => {
    expect(parseWordInput(body, now).error).toContain(message);
  });
});

describe('sorting and searching', () => {
  it('sorts A to Z the Spanish way: accents with their letter, ñ after n', () => {
    const words = ['ñaña', 'Ábaco', 'nene', 'zapato', 'abuelo', 'oso'].map((word) => ({ word }));
    expect(sortWords(words).map((w) => w.word)).toEqual(['Ábaco', 'abuelo', 'nene', 'ñaña', 'oso', 'zapato']);
  });

  it('heads each entry with its letter', () => {
    expect(['Ábaco', 'ñaña', 'oso', '3 ositos'].map(initialOf)).toEqual(['A', 'Ñ', 'O', '#']);
  });

  it('finds words by the word or what it meant, ignoring accents and case', () => {
    const entry = { word: 'Awa', meaning: 'Agüita del río' };
    expect(['awa', 'AGUITA', 'rio', '  '].map((q) => matchesWord(entry, q))).toEqual([true, true, true, true]);
    expect(matchesWord(entry, 'leche')).toBe(false);
    expect(foldText('Ñandú Ámbar')).toBe('nandu ambar');
  });
});

describe('publicWord', () => {
  it('gives the day as YYYY-MM-DD and the author by the name they chose, without their email', () => {
    const word = {
      _id: 'w1',
      word: 'awa',
      meaning: 'agua',
      saidAt: new Date('2024-05-15T12:00:00Z'),
      firstWord: true,
      creator: { _id: 'u1', username: 'rosa', displayName: 'Abuela Rosa', email: 'rosa@example.com' },
    };
    expect(publicWord(word)).toEqual({
      id: 'w1',
      word: 'awa',
      meaning: 'agua',
      saidAt: '2024-05-15',
      heardBy: '',
      firstWord: true,
      creator: { _id: 'u1', name: 'Abuela Rosa', image: null },
    });
  });
});
