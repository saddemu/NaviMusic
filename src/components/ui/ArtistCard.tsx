import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Artist } from '@/types/subsonic';
import { coverArtUrl } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/lib/utils';
import styles from './ArtistCard.module.css';

interface Props {
  artist: Artist;
}

function ArtistCardInner({ artist }: Props) {
  const config = useAuthStore((s) => s.config);
  const img = artist.artistImageUrl
    ? artist.artistImageUrl
    : config && artist.coverArt
    ? coverArtUrl(config, artist.coverArt, 300)
    : '';

  return (
    <Link to={`/artist/${artist.id}`} className={styles.card}>
      <div className={styles.avatar} aria-hidden>
        {img ? (
          <img src={img} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{getInitials(artist.name)}</span>
        )}
      </div>
      <div className={styles.name} title={artist.name}>
        {artist.name}
      </div>
      {artist.albumCount !== undefined && (
        <div className={styles.count}>
          {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
        </div>
      )}
    </Link>
  );
}

export default memo(ArtistCardInner);
