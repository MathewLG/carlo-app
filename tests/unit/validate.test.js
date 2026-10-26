import { describe, expect, it } from 'vitest';
import { escapeRegex, MAX_MEMORY_LENGTH, MAX_TAG_LENGTH, parseMemoryInput } from '@utils/validate';

describe('parseMemoryInput', () => {
  it('trims and returns a valid memory and tag', () => {
    expect(parseMemoryInput({ memory: '  Hola Carlo  ', tag: ' #mensaje ' })).toEqual({
      memory: 'Hola Carlo',
      tag: '#mensaje',
      happenedAt: null,
      milestone: '',
    });
  });

  it.each([
    ['no body', undefined],
    ['an empty memory', { memory: '   ', tag: '#mensaje' }],
    ['an empty tag', { memory: 'Hola', tag: '' }],
    ['non-string fields', { memory: 42, tag: ['#x'] }],
  ])('refuses %s', (_label, body) => {
    expect(parseMemoryInput(body)).toEqual({ error: 'El recuerdo y la categoría son obligatorios' });
  });

  it('accepts text exactly at the limits', () => {
    const body = { memory: 'a'.repeat(MAX_MEMORY_LENGTH), tag: 'b'.repeat(MAX_TAG_LENGTH) };
    expect(parseMemoryInput(body).error).toBeUndefined();
  });

  it.each([
    ['memory', { memory: 'a'.repeat(MAX_MEMORY_LENGTH + 1), tag: '#x' }],
    ['tag', { memory: 'Hola', tag: 'b'.repeat(MAX_TAG_LENGTH + 1) }],
  ])('refuses a %s over the limit', (_label, body) => {
    expect(parseMemoryInput(body)).toEqual({ error: 'El texto es demasiado largo' });
  });
});

describe('escapeRegex', () => {
  it('makes search text match literally', () => {
    const pattern = new RegExp(escapeRegex('(a+b)?*'));
    expect(pattern.test('x(a+b)?*y')).toBe(true);
    expect(pattern.test('aab')).toBe(false);
  });
});

describe('parseMemoryInput: when it happened', () => {
  const now = new Date('2026-10-25T18:00:00Z');
  const body = (happenedAt) => ({ memory: 'Hola', tag: '#m', happenedAt });

  it('is optional', () => {
    expect(parseMemoryInput(body(undefined), now).happenedAt).toBeNull();
    expect(parseMemoryInput(body(''), now).happenedAt).toBeNull();
  });

  it('accepts today and past days, including before Carlo was born', () => {
    expect(parseMemoryInput(body('2026-10-25'), now).happenedAt.toISOString()).toBe('2026-10-25T12:00:00.000Z');
    expect(parseMemoryInput(body('2022-09-01'), now).error).toBeUndefined();
  });

  it('refuses a future day and a day that does not exist', () => {
    expect(parseMemoryInput(body('2026-10-26'), now)).toEqual({ error: 'La fecha no puede ser en el futuro' });
    expect(parseMemoryInput(body('2026-02-30'), now)).toEqual({ error: 'La fecha no es válida' });
  });
});
