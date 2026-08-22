import type { Song } from '../types';

export function sanitizeSongUrl(raw: string | undefined): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function formatSongsLinkDump(
  songs: Pick<Song, 'label' | 'title' | 'artist' | 'url'>[]
): string {
  return songs
    .map((song, idx) => {
      const label = song.label || (['A', 'B', 'C', 'D'][idx] as Song['label']);
      const url = song.url?.trim();
      return url
        ? `${label}. ${song.title} / ${song.artist}\n${url}`
        : `${label}. ${song.title} / ${song.artist}\n（リンクなし）`;
    })
    .join('\n\n');
}
