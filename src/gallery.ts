export const LAYOUT_VARIANTS = [
  'feature',
  'panorama',
  'portrait',
  'square',
  'portrait',
  'landscape',
  'wide',
  'portrait',
  'square',
  'landscape',
  'portrait',
  'wide',
] as const;

export interface PhotoEntry {
  url: string;
  caption?: string;
}

export interface ParsedPhotoEntries {
  photos: PhotoEntry[];
  warnings: string[];
}

export function parsePhotoEntries(source: string): ParsedPhotoEntries {
  const photos: PhotoEntry[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const value = rawLine.trim();

    if (!value || value.startsWith('#')) {
      return;
    }

    const separatorIndex = value.indexOf('|');
    const rawUrl = (separatorIndex === -1 ? value : value.slice(0, separatorIndex)).trim();
    const caption = separatorIndex === -1 ? '' : value.slice(separatorIndex + 1).trim();

    try {
      const url = new URL(rawUrl);

      if (url.protocol !== 'https:') {
        warnings.push(`Line ${index + 1}: only HTTPS image URLs are supported.`);
        return;
      }

      if (!seen.has(url.href)) {
        seen.add(url.href);
        photos.push({
          url: url.href,
          ...(caption ? { caption } : {}),
        });
      }
    } catch {
      warnings.push(`Line ${index + 1}: invalid image URL.`);
    }
  });

  return { photos, warnings };
}

export function getLayoutVariant(index: number): (typeof LAYOUT_VARIANTS)[number] {
  return LAYOUT_VARIANTS[index % LAYOUT_VARIANTS.length];
}

export function formatPhotoNumber(value: number): string {
  return String(value).padStart(2, '0');
}
