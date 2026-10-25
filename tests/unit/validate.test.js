import { describe, expect, it } from 'vitest';
import { escapeRegex, MAX_MEMORY_LENGTH, MAX_TAG_LENGTH, parseMemoryInput } from '@utils/validate';

describe('parseMemoryInput', () => {
  it('trims and returns a valid memory and tag', () => {
    expect(parseMemoryInput({ memory: '  Hola Carlo  ', tag: ' #mensaje ' })).toEqual({
      memory: 'Hola Carlo',
      tag: '#mensaje',
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
