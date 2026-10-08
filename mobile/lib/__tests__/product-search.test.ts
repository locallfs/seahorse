import { describe, expect, it } from 'vitest';
import {
  filterTokens,
  isBarcodeLike,
  matchScore,
  matchesAllTokens,
  normalizeSearchText,
  productHaystack,
  searchTokens,
  serverProbe,
} from '../product-search';

/** Mirrors how listProducts scores a row. */
function score(p: { title: string; variants?: any[] }, typed: string): number {
  const normalized = normalizeSearchText(typed);
  return matchScore(p, normalized, filterTokens(normalized));
}

// Titles below are real production rows, including their defects.
const GEM_TANG = { title: 'Gem Tang', variants: [{ title: 'Default' }] };
const SNOWFLAKE = {
  title: 'Black Snowflake Clownfish',
  variants: [{ title: 'Default' }],
};
const DOUBLE_SPACE = {
  // Stored with two spaces before "Heater".
  title: 'Aquatop 100 Watt Titanium  Heater',
  variants: [{ title: 'Default', sku: 'AQ-TI-100' }],
};
const CURLY = {
  // Stored with a typographic apostrophe (U+2019).
  title: 'Sally’s Frozen Krill 3.5oz flat',
  variants: [{ title: 'Default' }],
};
const WITH_CODES = {
  title: 'Red Sea NoPox 1000ml',
  variants: [
    { title: '1000ml', sku: 'RS-NOPOX-1000', upc: '812345678901', barcode: '7290100770214' },
  ],
};

describe('normalizeSearchText', () => {
  it('collapses the double space that makes a stored title unsearchable', () => {
    expect(normalizeSearchText('Aquatop 100 Watt Titanium  Heater')).toBe(
      'aquatop 100 watt titanium heater',
    );
  });

  it('folds a typographic apostrophe to ASCII so a phone keyboard matches', () => {
    expect(normalizeSearchText('Sally’s')).toBe("sally's");
    expect(normalizeSearchText("Sally's")).toBe("sally's");
  });

  it('folds en/em dashes and the minus sign to a plain hyphen', () => {
    expect(normalizeSearchText('Sea Veggies – Purple')).toBe('sea veggies - purple');
    expect(normalizeSearchText('Sea Veggies — Purple')).toBe('sea veggies - purple');
  });

  it('folds non-breaking and zero-width spaces', () => {
    expect(normalizeSearchText('Blue Green​Chromis')).toBe('blue green chromis');
  });

  it('trims the trailing space three live titles carry', () => {
    expect(normalizeSearchText('Blue Green Chromis ')).toBe('blue green chromis');
  });

  it('keeps the letter s intact', () => {
    // Guards a regression where /s+/ was used instead of /\s+/.
    expect(normalizeSearchText('Scopas Tang')).toBe('scopas tang');
  });
});

describe('searchTokens', () => {
  it('splits a phrase into words', () => {
    expect(searchTokens('gem tang')).toEqual(['gem', 'tang']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchTokens('')).toEqual([]);
  });
});

describe('filterTokens', () => {
  it('leaves a single word as one term so it stays unfiltered', () => {
    expect(filterTokens('coral')).toEqual(['coral']);
  });

  it('breaks a hyphenated SKU into its parts as well as the whole', () => {
    expect(filterTokens('ws-ai-axis-20-centrifugal-pump')).toEqual([
      'ws-ai-axis-20-centrifugal-pump',
      'ws',
      'ai',
      'axis',
      '20',
      'centrifugal',
      'pump',
    ]);
  });

  it('adds the punctuation-free form of a word alongside it', () => {
    expect(filterTokens("sally's frozen krill")).toEqual([
      "sally's",
      'frozen',
      'krill',
      'sally',
    ]);
  });

  it('does not duplicate plain words', () => {
    expect(filterTokens('gem tang')).toEqual(['gem', 'tang']);
  });
});

describe('serverProbe', () => {
  it('sends the longest word, not the phrase the server cannot match', () => {
    expect(serverProbe('gem tang')).toBe('tang');
    expect(serverProbe('tang gem')).toBe('tang');
  });

  it('splits on punctuation so a curly-quoted title is still reachable', () => {
    // "sally's" would miss a title stored as "Sally’s"; "frozen" hits it.
    expect(serverProbe("sally's frozen krill")).toBe('frozen');
  });

  it('passes a barcode through whole', () => {
    expect(serverProbe('812345678901')).toBe('812345678901');
  });

  it('falls back to the raw query when no run reaches two characters', () => {
    expect(serverProbe('a b')).toBe('a b');
  });
});

describe('isBarcodeLike', () => {
  it('accepts UPC-A, EAN-13 and UPC-E lengths', () => {
    expect(isBarcodeLike('812345678901')).toBe(true);
    expect(isBarcodeLike('7290100770214')).toBe(true);
    expect(isBarcodeLike('01234565')).toBe(true);
  });

  it('ignores spaces and dashes a scanner or human may introduce', () => {
    expect(isBarcodeLike('8123 4567 8901')).toBe(true);
    expect(isBarcodeLike('812345-678901')).toBe(true);
  });

  it('rejects names and short numbers', () => {
    expect(isBarcodeLike('gem tang')).toBe(false);
    expect(isBarcodeLike('1000')).toBe(false);
    expect(isBarcodeLike('rs-nopox-1000')).toBe(false);
  });
});

describe('productHaystack', () => {
  it('includes the title, size names and every code', () => {
    const hay = productHaystack(WITH_CODES);
    expect(hay).toContain('red sea nopox');
    expect(hay).toContain('rs-nopox-1000');
    expect(hay).toContain('812345678901');
    expect(hay).toContain('7290100770214');
  });

  it('survives a product with no variants', () => {
    expect(productHaystack({ title: 'Gem Tang' })).toBe('gem tang');
  });
});

describe('matchesAllTokens', () => {
  it('ignores word order — the original bug report', () => {
    expect(matchesAllTokens(GEM_TANG, searchTokens('tang gem'))).toBe(true);
    expect(matchesAllTokens(SNOWFLAKE, searchTokens('clownfish snowflake'))).toBe(true);
  });

  it('matches a skipped middle word', () => {
    expect(matchesAllTokens(SNOWFLAKE, searchTokens('black clownfish'))).toBe(true);
  });

  it('finds a title stored with a double space from the name as it appears', () => {
    const tokens = searchTokens(normalizeSearchText('Aquatop 100 Watt Titanium Heater'));
    expect(matchesAllTokens(DOUBLE_SPACE, tokens)).toBe(true);
  });

  it('finds a curly-apostrophe title from a straight apostrophe', () => {
    const tokens = searchTokens(normalizeSearchText("Sally's Frozen Krill"));
    expect(matchesAllTokens(CURLY, tokens)).toBe(true);
  });

  it('finds a product by a SKU on one of its sizes', () => {
    expect(matchesAllTokens(WITH_CODES, filterTokens('rs-nopox-1000'))).toBe(true);
  });

  it('finds a product by a barcode on one of its sizes', () => {
    expect(matchesAllTokens(WITH_CODES, filterTokens('812345678901'))).toBe(true);
  });

  it('rejects a product that only shares one part of a SKU', () => {
    // "nopox" alone must not pull in an unrelated Red Sea item.
    const other = { title: 'Red Sea Reef Foundation', variants: [{ sku: 'RS-FOUND-1' }] };
    expect(matchesAllTokens(other, filterTokens('rs-nopox-1000'))).toBe(false);
  });

  it('still rejects a product that is missing one of the words', () => {
    expect(matchesAllTokens(GEM_TANG, searchTokens('gem wrasse'))).toBe(false);
  });
});

describe('matchScore', () => {
  // The products that outranked the real answer before ranking existed.
  const DESCRIPTION_ONLY = {
    title: 'Orange Ocellaris Clownfish (Captive Bred)',
    variants: [{ title: 'Default' }],
  };

  it('ranks a title that starts with the typed text highest', () => {
    expect(score(GEM_TANG, 'gem')).toBe(5);
    expect(score(GEM_TANG, 'gem ta')).toBe(5);
  });

  it('ranks the phrase inside the title above a word-by-word match', () => {
    // "snowflake clown" appears verbatim inside the title.
    expect(score(SNOWFLAKE, 'snowflake clown')).toBe(4);
    // Reordered, so no longer verbatim — but each word still starts a title word.
    expect(score(SNOWFLAKE, 'clownfish snowflake')).toBe(3);
    expect(score(SNOWFLAKE, 'snowflake clown')).toBeGreaterThan(
      score(SNOWFLAKE, 'clownfish snowflake'),
    );
  });

  it('scores any contiguous run of the title as a phrase match', () => {
    // Both sit inside the title verbatim, mid-word or not.
    expect(score(SNOWFLAKE, 'clown')).toBe(4);
    expect(score(SNOWFLAKE, 'ownfish')).toBe(4);
  });

  it('ranks gapped word prefixes at 3', () => {
    // "snowfl clown" is not a contiguous run, but each part starts a word.
    expect(score(SNOWFLAKE, 'snowfl clown')).toBe(3);
  });

  it('ranks words that only sit mid-word at 2', () => {
    // Neither part starts a title word, and together they are not contiguous.
    expect(score(SNOWFLAKE, 'ownfish nowflake')).toBe(2);
  });

  it('ranks a prefix of each title word above a loose substring match', () => {
    const leopard = { title: 'Black Leopard Wrasse', variants: [] };
    expect(score(leopard, 'leop wras')).toBe(3);
  });

  it('ranks a code-only match below any title match', () => {
    expect(score(WITH_CODES, '812345678901')).toBe(1);
  });

  it('ranks a description-only match last', () => {
    // "snowfl" is nowhere in this product's title or codes.
    expect(score(DESCRIPTION_ONLY, 'snowfl')).toBe(0);
  });

  it('puts the real product above the description noise', () => {
    expect(score(SNOWFLAKE, 'snowfl')).toBeGreaterThan(
      score(DESCRIPTION_ONLY, 'snowfl'),
    );
  });

  it('scores every row 0 when nothing is typed', () => {
    expect(matchScore(GEM_TANG, '', [])).toBe(0);
    expect(matchScore(DESCRIPTION_ONLY, '', [])).toBe(0);
  });
});
