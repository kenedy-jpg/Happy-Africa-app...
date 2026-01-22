/**
 * Custom hook for real-time video updates
 * Subscribes to video changes in the database and updates the UI automatically
 */

import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Video } from '../types';

interface UseVideoRealtimeOptions {
  enabled?: boolean;
  userId?: string; // Filter to specific user's videos
  onVideoInserted?: (video: any) => void;
  onVideoUpdated?: (video: any) => void;
  onVideoDeleted?: (videoId: string) => void;
}

export const useVideoRealtime = (options: UseVideoRealtimeOptions = {}) => {
  const { enabled = true, userId, onVideoInserted, onVideoUpdated, onVideoDeleted } = options;

  useEffect(() => {
    if (!enabled) return;

    console.log('[useVideoRealtime] Setting up subscription', { userId });

    // Build filter
    let filter = 'is_published=eq.true';
    if (userId) {
      filter = `user_id=eq.${userId}`;
    }

    const channel = supabase
      .channel(`videos:${userId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos',
          filter
        },
        (payload) => {
          console.log('[useVideoRealtime] New video:', payload);
          if (onVideoInserted) {
            onVideoInserted(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter
        },
        (payload) => {
          console.log('[useVideoRealtime] Updated video:', payload);
          if (onVideoUpdated) {
            onVideoUpdated(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'videos',
          filter
        },
        (payload) => {
          console.log('[useVideoRealtime] Deleted video:', payload);
          if (onVideoDeleted) {
            onVideoDeleted(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useVideoRealtime] Subscription status:', status);
      });

    return () => {
      console.log('[useVideoRealtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [enabled, userId, onVideoInserted, onVideoUpdated, onVideoDeleted]);
};

/**
 * Fetch full video details including user profile
 */
export const fetchVideoWithProfile = async (videoData: any): Promise<Video | null> => {
  try {
    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', videoData.user_id)
      .single();

    if (!profileData) {
      console.error('[fetchVideoWithProfile] No profile found for user:', videoData.user_id);
      return null;
    }

    // Get video URL (use public URL or signed URL)
    const videoUrl = videoData.video_url || 
      supabase.storage.from('videos').getPublicUrl(videoData.file_path).data.publicUrl;

    const video: Video = {
      id: videoData.id,
      url: videoUrl,
      poster: videoData.poster_url || 'https://picsum.photos/400/800',
      description: videoData.description || '',
      hashtags: videoData.hashtags || [],
      likes: videoData.likes_count || 0,
      comments: videoData.comments_count || 0,
      shares: videoData.shares_count || 0,
      user: {
        id: profileData.id,
        username: profileData.username || '',
        displayName: profileData.full_name || '',
        avatarUrl: profileData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.full_name || 'User')}&background=random`,
        followers: profileData.followers_count || 0,
        following: profileData.following_count || 0,
        likes: profileData.likes_count || 0,
        coins: profileData.coins || 0
      },
      musicTrack: videoData.music_track || 'Original Sound',
      category: videoData.category || 'general',
      location: videoData.location_name,
      duration: videoData.duration || 15,
      isLocal: false
    };

    return video;
  } catch (error) {
    console.error('[fetchVideoWithProfile] Error:', error);
    return null;
  }
};
