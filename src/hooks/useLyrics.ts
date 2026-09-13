import { useQuery } from '@tanstack/react-query';
import { getLyrics, getLyricsBySongId, parseLrc } from '@/lib/subsonic';
import { SubsonicError, type StructuredLyrics } from '@/types/subsonic';
import { useAuthStore } from '@/store/authStore';
import type { Song } from '@/types/subsonic';

/**
 * Fetches lyrics for a song. Prefers OpenSubsonic's `getLyricsBySongId`
 * (structured + timed), falls back to the legacy `getLyrics` plain text and
 * parses LRC tags from it.
 *
 * Returns `null` when no lyrics are available.
 */
export function useLyrics(song: Song | null | undefined, enabled = true) {
  const config = useAuthStore((s) => s.config);

  return useQuery<StructuredLyrics | null>({
    queryKey: ['lyrics', song?.id],
    enabled: !!config && !!song && enabled,
    staleTime: 60 * 60 * 1000,
    // Without this the global 30-minute gcTime evicts the entry long before
    // the hour is up, so the fetch happens again anyway.
    gcTime: 60 * 60 * 1000,
    // A song with no lyrics answers `null`, which is the answer — asking the
    // same two endpoints twice more will not produce any.
    retry: false,
    queryFn: async () => {
      if (!config || !song) return null;
      try {
        const list = await getLyricsBySongId(config, song.id);
        const struct = list.structuredLyrics?.[0];
        if (struct && struct.line.length > 0) return struct;
      } catch (err) {
        // Older Subsonic servers don't have getLyricsBySongId — fall through.
        if (!(err instanceof SubsonicError)) throw err;
      }
      try {
        const legacy = await getLyrics(config, song.artist, song.title);
        if (legacy.value && legacy.value.trim()) return parseLrc(legacy.value);
      } catch {
        /* ignore — surface as no lyrics */
      }
      return null;
    },
  });
}

/**
 * Returns the index of the active line at the given playback time (seconds),
 * or -1 if no line should be highlighted yet.
 */
export function activeLineIndex(
  lyrics: StructuredLyrics | null | undefined,
  seconds: number,
): number {
  if (!lyrics?.synced || lyrics.line.length === 0) return -1;
  const ms = seconds * 1000 - (lyrics.offset ?? 0);
  let lo = 0;
  let hi = lyrics.line.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = lyrics.line[mid].start ?? -1;
    if (start <= ms) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
