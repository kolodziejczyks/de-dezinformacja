import EN from '../../public/i18n/en.json';
import PL from '../../public/i18n/pl.json';

const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.values(value).flatMap((nested) => stringsIn(nested));
}

describe('translation copy', () => {
  it('uses the same keys in Polish and English', () => {
    const plKeys = Object.keys(PL).sort();
    const enKeys = Object.keys(EN).sort();

    expect(plKeys).toEqual(enKeys);
  });

  it('keeps em dashes and en dashes out of the translation files', () => {
    const offending = [...stringsIn(PL), ...stringsIn(EN)].filter(
      (text) => text.includes(EM_DASH) || text.includes(EN_DASH),
    );

    expect(offending).toEqual([]);
  });
});
