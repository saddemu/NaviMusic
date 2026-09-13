import { useEffect, useState } from 'react';
import { coverArtUrl } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';
import styles from './Backdrop.module.css';

/**
 * Page backdrop: blurred image behind the main scroll area.
 * Picks the URL from (in order) the page-set override, then the
 * currently playing song's cover.
 */
export default function Backdrop() {
  const config = useAuthStore((s) => s.config);
  const overrideUrl = useUiStore((s) => s.backdropImageUrl);
  const playingCover = usePlayerStore((s) => s.currentSong?.coverArt);

  // Blurred by 80px before it is ever seen, so the detail in a large image is
  // thrown away on arrival. 200px is indistinguishable and a tenth the bytes.
  const playingUrl = config && playingCover ? coverArtUrl(config, playingCover, 200) : '';
  const url = overrideUrl ?? playingUrl;

  // Cross-fade between covers — keep the previous URL visible until the new
  // one is loaded so transitions feel smooth instead of flashing black.
  const [layers, setLayers] = useState<{ key: number; url: string }[]>(
    url ? [{ key: 0, url }] : [],
  );

  useEffect(() => {
    if (!url) {
      if (layers.length > 0) setLayers([]);
      return;
    }
    if (layers.length > 0 && layers[layers.length - 1].url === url) return;
    const next = { key: (layers[layers.length - 1]?.key ?? 0) + 1, url };
    setLayers((prev) => [...prev.slice(-1), next]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className={styles.backdrop} aria-hidden>
      {layers.map((l) => (
        <img key={l.key} src={l.url} alt="" className={styles.img} />
      ))}
      <div className={styles.veil} />
    </div>
  );
}
