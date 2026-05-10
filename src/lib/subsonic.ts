import type {
  Album,
  Artist,
  ArtistInfo,
  Genre,
  LyricLine,
  Lyrics,
  LyricsList,
  Playlist,
  SearchResult,
  Song,
  StructuredLyrics,
  SubsonicConfig,
  SubsonicResponse,
  SubsonicUser,
} from '@/types/subsonic';
import { SubsonicError } from '@/types/subsonic';

const CLIENT = 'pMusic';
const VERSION = '1.16.1';

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  const url = new URL(trimmed);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SubsonicError(0, 'Server URL must use http or https.');
  }
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`;
}

export function buildUrl(
  config: SubsonicConfig,
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
): string {
  const url = new URL(`${config.serverUrl}/rest/${endpoint}`);
  url.searchParams.set('u', config.username);
  url.searchParams.set('t', config.token);
  url.searchParams.set('s', config.salt);
  url.searchParams.set('v', VERSION);
  url.searchParams.set('c', CLIENT);
  url.searchParams.set('f', 'json');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function request<T>(
  config: SubsonicConfig,
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = buildUrl(config, endpoint, params);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new SubsonicError(-1, 'Cannot reach server.');
  }
  if (!res.ok) throw new SubsonicError(res.status, `HTTP ${res.status}`);
  const json = (await res.json()) as SubsonicResponse<T>;
  const root = json['subsonic-response'];
  if (!root || root.status !== 'ok') {
    const code = root?.error?.code ?? 0;
    const message = root?.error?.message ?? 'Unknown server error.';
    // Subsonic auth errors: 40 = wrong username/password, 41 = token mismatch
    if (code === 40 || code === 41) {
      window.dispatchEvent(new CustomEvent('pmusic:auth-error'));
    }
    throw new SubsonicError(code, message);
  }
  return root as T;
}

const arr = <T>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

// ─── endpoints ──────────────────────────────────────────────────────────────

export async function ping(config: SubsonicConfig): Promise<void> {
  await request(config, 'ping');
}

export async function getUser(config: SubsonicConfig, username: string): Promise<SubsonicUser> {
  const data = await request<{ user: SubsonicUser }>(config, 'getUser', { username });
  return data.user;
}

export async function getAlbumList2(
  config: SubsonicConfig,
  type:
    | 'random'
    | 'newest'
    | 'frequent'
    | 'recent'
    | 'starred'
    | 'alphabeticalByName'
    | 'alphabeticalByArtist'
    | 'byYear'
    | 'byGenre',
  size = 20,
  offset = 0,
  fromYear?: number,
  toYear?: number,
  genre?: string,
): Promise<Album[]> {
  const data = await request<{ albumList2: { album?: Album[] } }>(config, 'getAlbumList2', {
    type,
    size,
    offset,
    fromYear,
    toYear,
    genre,
  });
  return arr(data.albumList2.album);
}

export async function getArtists(config: SubsonicConfig): Promise<Artist[]> {
  const data = await request<{
    artists: { index?: { artist?: Artist[] }[] | { artist?: Artist[] } };
  }>(config, 'getArtists');
  const indices = arr(data.artists.index);
  return indices.flatMap((ix) => arr(ix.artist));
}

export async function getArtist(config: SubsonicConfig, id: string): Promise<Artist> {
  const data = await request<{ artist: Artist }>(config, 'getArtist', { id });
  return { ...data.artist, album: arr(data.artist.album) };
}

export async function getArtistInfo2(
  config: SubsonicConfig,
  id: string,
  count = 10,
): Promise<ArtistInfo> {
  const data = await request<{ artistInfo2: ArtistInfo }>(config, 'getArtistInfo2', { id, count });
  return { ...data.artistInfo2, similarArtist: arr(data.artistInfo2.similarArtist) };
}

export async function getAlbum(config: SubsonicConfig, id: string): Promise<Album> {
  const data = await request<{ album: Album }>(config, 'getAlbum', { id });
  return { ...data.album, song: arr(data.album.song) };
}

export async function getSong(config: SubsonicConfig, id: string): Promise<Song> {
  const data = await request<{ song: Song }>(config, 'getSong', { id });
  return data.song;
}

export async function search3(
  config: SubsonicConfig,
  query: string,
  artistCount = 5,
  albumCount = 5,
  songCount = 5,
  offset = 0,
): Promise<SearchResult> {
  const data = await request<{ searchResult3: SearchResult }>(config, 'search3', {
    query,
    artistCount,
    albumCount,
    songCount,
    artistOffset: offset,
    albumOffset: offset,
    songOffset: offset,
  });
  return {
    artist: arr(data.searchResult3.artist),
    album: arr(data.searchResult3.album),
    song: arr(data.searchResult3.song),
  };
}

export async function getPlaylists(config: SubsonicConfig): Promise<Playlist[]> {
  const data = await request<{ playlists: { playlist?: Playlist[] } }>(config, 'getPlaylists');
  return arr(data.playlists.playlist);
}

export async function getPlaylist(config: SubsonicConfig, id: string): Promise<Playlist> {
  const data = await request<{ playlist: Playlist }>(config, 'getPlaylist', { id });
  return { ...data.playlist, entry: arr(data.playlist.entry) };
}

export async function createPlaylist(
  config: SubsonicConfig,
  name: string,
  songIds: string[] = [],
): Promise<Playlist> {
  const params: Record<string, string | number> = { name };
  const data = await request<{ playlist?: Playlist }>(config, 'createPlaylist', params).then(
    async (created) => {
      if (created.playlist) return created;
      // createPlaylist sometimes returns nothing — fetch the latest
      const list = await getPlaylists(config);
      return { playlist: list.find((p) => p.name === name) };
    },
  );
  if (!data.playlist) throw new SubsonicError(0, 'Playlist creation failed.');
  if (songIds.length) await updatePlaylist(config, data.playlist.id, undefined, songIds);
  return data.playlist;
}

export async function updatePlaylist(
  config: SubsonicConfig,
  id: string,
  name?: string,
  songIdsToAdd?: string[],
  songIndexesToRemove?: number[],
): Promise<void> {
  const params = new URLSearchParams();
  params.set('playlistId', id);
  if (name) params.set('name', name);
  for (const sid of songIdsToAdd ?? []) params.append('songIdToAdd', sid);
  for (const idx of songIndexesToRemove ?? []) params.append('songIndexToRemove', String(idx));
  const url = buildUrl(config, 'updatePlaylist');
  const finalUrl = `${url}&${params.toString()}`;
  const res = await fetch(finalUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new SubsonicError(res.status, `HTTP ${res.status}`);
  const json = (await res.json()) as SubsonicResponse<unknown>;
  if (json['subsonic-response'].status !== 'ok') {
    const err = json['subsonic-response'].error;
    throw new SubsonicError(err?.code ?? 0, err?.message ?? 'Update failed');
  }
}

export async function deletePlaylist(config: SubsonicConfig, id: string): Promise<void> {
  await request(config, 'deletePlaylist', { id });
}

export async function star(
  config: SubsonicConfig,
  ids: { id?: string; albumId?: string; artistId?: string },
): Promise<void> {
  await request(config, 'star', ids);
}

export async function unstar(
  config: SubsonicConfig,
  ids: { id?: string; albumId?: string; artistId?: string },
): Promise<void> {
  await request(config, 'unstar', ids);
}

export async function getStarred2(config: SubsonicConfig): Promise<{
  song: Song[];
  album: Album[];
  artist: Artist[];
}> {
  const data = await request<{
    starred2: { song?: Song[]; album?: Album[]; artist?: Artist[] };
  }>(config, 'getStarred2');
  return {
    song: arr(data.starred2.song),
    album: arr(data.starred2.album),
    artist: arr(data.starred2.artist),
  };
}

export function streamUrl(
  config: SubsonicConfig,
  id: string,
  maxBitRate?: number,
  format?: string,
): string {
  const params: Record<string, string | number> = { id };
  if (maxBitRate) params.maxBitRate = maxBitRate;
  if (format) params.format = format;
  return buildUrl(config, 'stream', params);
}

export function coverArtUrl(config: SubsonicConfig, id: string | undefined, size?: number): string {
  if (!id) return '';
  const params: Record<string, string | number> = { id };
  if (size) params.size = size;
  return buildUrl(config, 'getCoverArt', params);
}

export async function getLyrics(
  config: SubsonicConfig,
  artist?: string,
  title?: string,
): Promise<Lyrics> {
  const data = await request<{ lyrics: Lyrics }>(config, 'getLyrics', { artist, title });
  return data.lyrics ?? {};
}

export async function getLyricsBySongId(
  config: SubsonicConfig,
  id: string,
): Promise<LyricsList> {
  const data = await request<{ lyricsList: LyricsList }>(config, 'getLyricsBySongId', { id });
  return {
    structuredLyrics: arr(data.lyricsList?.structuredLyrics).map((s) => ({
      ...s,
      line: arr(s.line),
    })),
  };
}

const LRC_LINE = /^\s*((?:\[\d+:\d+(?:[.:]\d+)?\]\s*)+)(.*)$/;
const LRC_TAG = /\[(\d+):(\d+)(?:[.:](\d+))?\]/g;

/**
 * Parses an LRC-format string into structured lyrics. If no timestamps are
 * present the returned `synced` is false and lines preserve their original
 * order with `start` undefined.
 */
export function parseLrc(text: string): StructuredLyrics {
  const lines: LyricLine[] = [];
  let synced = false;
  for (const raw of text.split(/\r?\n/)) {
    const m = LRC_LINE.exec(raw);
    if (m) {
      const tags = m[1];
      const value = m[2].trim();
      let tagMatch: RegExpExecArray | null;
      LRC_TAG.lastIndex = 0;
      let matched = false;
      while ((tagMatch = LRC_TAG.exec(tags)) !== null) {
        matched = true;
        synced = true;
        const minutes = Number.parseInt(tagMatch[1], 10);
        const seconds = Number.parseInt(tagMatch[2], 10);
        const fracRaw = tagMatch[3] ?? '';
        const fracMs = fracRaw
          ? Number.parseInt(fracRaw.padEnd(3, '0').slice(0, 3), 10)
          : 0;
        const ms = minutes * 60_000 + seconds * 1000 + fracMs;
        lines.push({ start: ms, value });
      }
      if (!matched && value) lines.push({ value });
    } else if (raw.trim()) {
      lines.push({ value: raw.trim() });
    }
  }
  if (synced) lines.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  return { synced, line: lines };
}

export async function getTopSongs(
  config: SubsonicConfig,
  artistName: string,
  count = 10,
): Promise<Song[]> {
  const data = await request<{ topSongs: { song?: Song[] } }>(config, 'getTopSongs', {
    artist: artistName,
    count,
  });
  return arr(data.topSongs.song);
}

export async function getSimilarSongs2(
  config: SubsonicConfig,
  id: string,
  count = 50,
): Promise<Song[]> {
  const data = await request<{ similarSongs2: { song?: Song[] } }>(config, 'getSimilarSongs2', {
    id,
    count,
  });
  return arr(data.similarSongs2.song);
}

export async function getGenres(config: SubsonicConfig): Promise<Genre[]> {
  const data = await request<{ genres: { genre?: Genre[] } }>(config, 'getGenres');
  return arr(data.genres.genre);
}

export async function getSongsByGenre(
  config: SubsonicConfig,
  genre: string,
  count = 50,
  offset = 0,
): Promise<Song[]> {
  const data = await request<{ songsByGenre: { song?: Song[] } }>(config, 'getSongsByGenre', {
    genre,
    count,
    offset,
  });
  return arr(data.songsByGenre.song);
}

export async function getRandomSongs(
  config: SubsonicConfig,
  size = 20,
  genre?: string,
  fromYear?: number,
  toYear?: number,
): Promise<Song[]> {
  const data = await request<{ randomSongs: { song?: Song[] } }>(config, 'getRandomSongs', {
    size,
    genre,
    fromYear,
    toYear,
  });
  return arr(data.randomSongs.song);
}

export async function scrobble(
  config: SubsonicConfig,
  id: string,
  submission = true,
): Promise<void> {
  await request(config, 'scrobble', { id, submission });
}
