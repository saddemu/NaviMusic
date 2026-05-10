export interface SubsonicConfig {
  serverUrl: string;
  username: string;
  token: string;
  salt: string;
}

export interface SubsonicResponse<T> {
  'subsonic-response': {
    status: 'ok' | 'failed';
    version: string;
    type?: string;
    serverVersion?: string;
    error?: { code: number; message: string };
  } & T;
}

export interface SubsonicUser {
  username: string;
  email?: string;
  scrobblingEnabled?: boolean;
  adminRole?: boolean;
  streamRole?: boolean;
  downloadRole?: boolean;
  playlistRole?: boolean;
  folder?: number[];
}

export interface Song {
  id: string;
  parent?: string;
  isDir: boolean;
  title: string;
  album?: string;
  artist?: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  transcodedContentType?: string;
  transcodedSuffix?: string;
  duration?: number;
  bitRate?: number;
  path?: string;
  isVideo?: boolean;
  playCount?: number;
  discNumber?: number;
  created?: string;
  albumId?: string;
  artistId?: string;
  type?: string;
  starred?: string;
  userRating?: number;
  averageRating?: number;
}

export interface Album {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount: number;
  duration?: number;
  playCount?: number;
  created?: string;
  starred?: string;
  year?: number;
  genre?: string;
  song?: Song[];
}

export interface Artist {
  id: string;
  name: string;
  coverArt?: string;
  artistImageUrl?: string;
  albumCount?: number;
  starred?: string;
  album?: Album[];
}

export interface ArtistInfo {
  biography?: string;
  musicBrainzId?: string;
  lastFmUrl?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  similarArtist?: Artist[];
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount: number;
  duration: number;
  created: string;
  changed?: string;
  coverArt?: string;
  entry?: Song[];
}

export interface Genre {
  value: string;
  songCount: number;
  albumCount: number;
}

export interface SearchResult {
  artist?: Artist[];
  album?: Album[];
  song?: Song[];
}

export interface Lyrics {
  artist?: string;
  title?: string;
  value?: string;
}

export interface LyricLine {
  /** Milliseconds from start of song. Undefined when unsynced. */
  start?: number;
  value: string;
}

export interface StructuredLyrics {
  lang?: string;
  synced: boolean;
  displayArtist?: string;
  displayTitle?: string;
  /** Milliseconds offset to apply to all line starts. */
  offset?: number;
  line: LyricLine[];
}

export interface LyricsList {
  structuredLyrics?: StructuredLyrics[];
}

export class SubsonicError extends Error {
  override readonly name = 'SubsonicError';
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
  }
}
