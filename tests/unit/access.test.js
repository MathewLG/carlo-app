import { describe, expect, it } from 'vitest';
import { canEdit } from '@utils/access';

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
