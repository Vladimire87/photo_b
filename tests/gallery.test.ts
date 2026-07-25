import { describe, expect, it } from 'vitest';
import {
  LAYOUT_VARIANTS,
  formatPhotoNumber,
  getLayoutVariant,
  isUsablePhotoDimensions,
  parsePhotoEntries,
} from '../src/gallery';

describe('parsePhotoEntries', () => {
  it('accepts optional captions and ignores comments, blanks, and duplicates', () => {
    const result = parsePhotoEntries(`
      # Collection
      https://images.example.com/one.jpg | AEGEAN LIGHT

      https://images.example.com/one.jpg
      https://images.example.com/two.webp
    `);

    expect(result.photos).toEqual([
      { url: 'https://images.example.com/one.jpg', caption: 'AEGEAN LIGHT' },
      { url: 'https://images.example.com/two.webp' },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('skips unsafe and invalid lines without breaking valid entries', () => {
    const result = parsePhotoEntries(`
      http://images.example.com/insecure.jpg
      not-a-url
      javascript:alert(1)
      https://images.example.com/safe.jpg
    `);

    expect(result.photos).toEqual([{ url: 'https://images.example.com/safe.jpg' }]);
    expect(result.warnings).toHaveLength(3);
  });
});

describe('editorial metadata', () => {
  it('repeats the editorial layout pattern', () => {
    expect(getLayoutVariant(0)).toBe('feature');
    expect(getLayoutVariant(LAYOUT_VARIANTS.length)).toBe('feature');
  });

  it('formats photo numbers consistently', () => {
    expect(formatPhotoNumber(1)).toBe('01');
    expect(formatPhotoNumber(12)).toBe('12');
  });
});

describe('image validation', () => {
  it('rejects tiny deletion placeholders while accepting gallery photographs', () => {
    expect(isUsablePhotoDimensions(130, 60)).toBe(false);
    expect(isUsablePhotoDimensions(640, 853)).toBe(true);
    expect(isUsablePhotoDimensions(1080, 720)).toBe(true);
  });
});
