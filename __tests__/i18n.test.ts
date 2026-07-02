/**
 * @format
 * Ensures the ES and EN translation tables stay in sync (no missing keys).
 */
import {describe, it, expect} from '@jest/globals';
import {translations, LANGUAGE_LIST} from '../src/i18n/translations';

describe('i18n translations', () => {
  it('has the same keys in every language', () => {
    const esKeys = Object.keys(translations.es).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it('has no empty strings', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(typeof value === 'string' && value.length > 0).toBe(true);
        void key;
      }
    }
  });

  it('exposes exactly the offered languages', () => {
    expect(LANGUAGE_LIST.map(l => l.id).sort()).toEqual(['en', 'es']);
  });
});
