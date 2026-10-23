import { describe, expect, it } from 'vitest';
import { toNumberOrNull } from '../product-view';

/**
 * Regression guard. Medusa stores height/width/length/weight as TEXT but its
 * write validator demands numbers, so a product loaded from the API hands back
 * strings. Sending those straight back broke EVERY product edit with:
 *   Expected type: 'number' for field 'weight', got: 'string'
 */
describe('toNumberOrNull', () => {
  it('converts the strings the API actually returns', () => {
    expect(toNumberOrNull('3')).toBe(3);
    expect(toNumberOrNull('0.4')).toBe(0.4);
    expect(toNumberOrNull('55')).toBe(55);
    expect(toNumberOrNull(' 12.5 ')).toBe(12.5);
  });

  it('passes numbers through untouched', () => {
    expect(toNumberOrNull(3)).toBe(3);
    expect(toNumberOrNull(0.4)).toBe(0.4);
  });

  it('keeps zero rather than turning it into null', () => {
    expect(toNumberOrNull(0)).toBe(0);
    expect(toNumberOrNull('0')).toBe(0);
  });

  it('treats empty and missing as null', () => {
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
    expect(toNumberOrNull('')).toBeNull();
  });

  it('refuses garbage rather than sending NaN to the API', () => {
    expect(toNumberOrNull('abc')).toBeNull();
    expect(toNumberOrNull('12lbs')).toBeNull();
    expect(toNumberOrNull(NaN)).toBeNull();
    expect(toNumberOrNull(Infinity)).toBeNull();
  });

  it('never returns a string, whatever it is given', () => {
    for (const v of ['3', 3, '0.4', 0, '', null, undefined, 'abc', {}, []]) {
      const out = toNumberOrNull(v);
      expect(typeof out === 'number' || out === null).toBe(true);
    }
  });
});
