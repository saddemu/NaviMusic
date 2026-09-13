import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const HomeIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z" />
  </svg>
);

export const SearchIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const AlbumIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const ArtistIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

export const SongIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" fill="currentColor" />
    <circle cx="18" cy="16" r="3" fill="currentColor" />
  </svg>
);

export const GenreIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

export const PlaylistIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M4 6h12M4 12h12M4 18h7" />
    <circle cx="17" cy="17" r="3" fill="currentColor" />
    <path d="M20 11V8" />
  </svg>
);

export const HeartIcon = ({
  filled,
  size,
  ...rest
}: IconProps & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...rest}>
    <path d="M12 21s-7.5-4.5-9.5-9c-1.6-3.6 1-7 4.5-7 2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.5 0 6.1 3.4 4.5 7-2 4.5-9.5 9-9.5 9Z" />
  </svg>
);

export const PlayIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5Z" />
  </svg>
);

export const PauseIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const NextIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <path d="M5.55 4.17 16 11a1 1 0 0 1 0 1.66L5.55 19.83A1 1 0 0 1 4 19V5a1 1 0 0 1 1.55-.83Z" />
    <rect x="17.5" y="5" width="2.5" height="14" rx="1" />
  </svg>
);

export const PrevIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <path d="M18.45 4.17 8 11a1 1 0 0 0 0 1.66l10.45 6.83A1 1 0 0 0 20 19V5a1 1 0 0 0-1.55-.83Z" />
    <rect x="4" y="5" width="2.5" height="14" rx="1" />
  </svg>
);

export const ShuffleIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M16 4h4v4" />
    <path d="M20 4 4 20" />
    <path d="M16 20h4v-4" />
    <path d="m4 4 6.5 6.5" />
    <path d="m13.5 13.5 6.5 6.5" />
  </svg>
);

export const RepeatIcon = ({
  mode,
  size,
  ...rest
}: IconProps & { mode?: 'off' | 'all' | 'one' }) => (
  <svg {...base(size)} {...rest}>
    <path d="M17 3 21 7l-4 4" />
    <path d="M3 13v-2a4 4 0 0 1 4-4h14" />
    <path d="M7 21l-4-4 4-4" />
    <path d="M21 11v2a4 4 0 0 1-4 4H3" />
    {mode === 'one' && (
      <text
        x="12"
        y="13.5"
        fontSize="6.5"
        fontWeight="700"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontFamily="system-ui, sans-serif"
      >
        1
      </text>
    )}
  </svg>
);

export const VolumeIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
    <path d="M19 5a8 8 0 0 1 0 14" />
  </svg>
);

export const MutedIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="m16 9 5 6m0-6-5 6" />
  </svg>
);

export const QueueIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M3 6h13M3 12h13M3 18h8" />
    <path d="m18 14 5 4-5 4Z" fill="currentColor" stroke="currentColor" />
  </svg>
);

export const LyricsIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M4 5h12M4 10h16M4 15h10M4 20h14" />
  </svg>
);

export const MoreIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);

export const PlusIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CloseIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const LogoutIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const SettingsIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.43 12.98a8 8 0 0 0 0-1.96l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a8 8 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.49.42l-.38 2.65a8 8 0 0 0-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65a8 8 0 0 0 0 1.96l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1a8 8 0 0 0 1.69.98l.38 2.65a.5.5 0 0 0 .49.42h4a.5.5 0 0 0 .49-.42l.38-2.65a8 8 0 0 0 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64Z" />
  </svg>
);

export const ExpandIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

export const ChevronRight = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const TrashIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} {...rest}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

export const DragIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <circle cx="9" cy="6" r="1.4" />
    <circle cx="15" cy="6" r="1.4" />
    <circle cx="9" cy="12" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="9" cy="18" r="1.4" />
    <circle cx="15" cy="18" r="1.4" />
  </svg>
);

export const GithubIcon = ({ size, ...rest }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03a9.53 9.53 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85l-.01 2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
);

export const BrandMark = ({ size = 24, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="M9 17V5l12-2v12" />
    <circle cx="6" cy="17" r="3" fill="currentColor" stroke="currentColor" />
    <circle cx="18" cy="15" r="3" fill="currentColor" stroke="currentColor" />
  </svg>
);
