import { useMutation, useQueryClient } from '@tanstack/react-query';
import { star, unstar } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/store/toastStore';

interface StarTarget {
  id?: string;
  albumId?: string;
  artistId?: string;
  starred: boolean;
}

export function useStarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: StarTarget) => {
      const config = useAuthStore.getState().config;
      if (!config) throw new Error('Not authenticated');
      const ids = { id: target.id, albumId: target.albumId, artistId: target.artistId };
      if (target.starred) await unstar(config, ids);
      else await star(config, ids);
      return target;
    },
    onSuccess: (target) => {
      showToast(target.starred ? 'Removed from starred' : 'Added to starred', 'success');
      queryClient.invalidateQueries({ queryKey: ['starred'] });
      queryClient.invalidateQueries({ queryKey: ['album'] });
      queryClient.invalidateQueries({ queryKey: ['artist'] });
      queryClient.invalidateQueries({ queryKey: ['playlist'] });
    },
    onError: () => {
      showToast('Failed to update starred status', 'error');
    },
  });
}
