import { describe, expect, it } from 'vitest';
import { canChange, canEdit, redactLocked } from '@utils/access';

const rosa = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'familiar' };
const tio = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'familiar' };
const mathew = { _id: 'cccccccccccccccccccccccc', role: 'admin' };

describe('canEdit', () => {
  it('lets the author change their memory, whether creator is populated or not', () => {
    expect(canEdit(rosa, { creator: { _id: rosa._id } })).toBe(true);
    expect(canEdit(rosa, { creator: rosa._id })).toBe(true);
  });

  it('does not let another family member change it', () => {
    expect(canEdit(tio, { creator: { _id: rosa._id } })).toBe(false);
  });

  it("lets the admin change anyone's memory, even one whose author is gone", () => {
    expect(canEdit(mathew, { creator: { _id: rosa._id } })).toBe(true);
    expect(canEdit(mathew, { creator: null })).toBe(true);
  });

  it('refuses when there is no user or no memory', () => {
    expect(canEdit(null, { creator: rosa._id })).toBe(false);
    expect(canEdit(rosa, null)).toBe(false);
    expect(canEdit(rosa, { creator: null })).toBe(false);
  });
});

describe('sealed letters', () => {
  const now = new Date('2026-10-25T18:00:00Z');
  const letter = {
    _id: 'm1',
    creator: { _id: rosa._id, username: 'rosa' },
    memory: 'Querido Carlo…',
    tag: '#carta',
    happenedAt: new Date('2026-10-01T12:00:00Z'),
    photo: { url: '/api/media/m1/photo?v=1' },
    unlockAt: new Date('2039-03-12T12:00:00Z'),
    lockAge: 15,
    createdAt: new Date('2026-10-25T10:00:00Z'),
  };

  it('is only an envelope for everyone but its author, the admin included', () => {
    const envelope = { _id: 'm1', creator: letter.creator, locked: true, unlockAt: letter.unlockAt, lockAge: 15, createdAt: letter.createdAt };
    expect(redactLocked(letter, tio, now)).toEqual(envelope);
    expect(redactLocked(letter, mathew, now)).toEqual(envelope);
    expect(redactLocked(letter, null, now)).toEqual(envelope);
    expect(redactLocked(letter, rosa, now)).toBe(letter);
  });

  it('is whole for everyone once it opens, and ordinary memories are never touched', () => {
    expect(redactLocked(letter, tio, new Date('2039-03-12T18:00:00Z'))).toBe(letter);
    const plain = { ...letter, unlockAt: undefined };
    expect(redactLocked(plain, tio, now)).toBe(plain);
  });

  it('only its author may change it before it opens; the admin again after', () => {
    expect(canChange(rosa, letter, now)).toBe(true);
    expect(canChange(mathew, letter, now)).toBe(false);
    expect(canChange(tio, letter, now)).toBe(false);
    expect(canChange(mathew, letter, new Date('2039-03-13T18:00:00Z'))).toBe(true);
    expect(canEdit(mathew, letter)).toBe(true); // deleting stays allowed
  });
});
