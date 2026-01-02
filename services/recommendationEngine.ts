import { Video, User, FeedType } from '../types';
import { MOCK_VIDEOS } from '../constants';
import { supabase } from './supabaseClient';

interface UserInterestProfile {
  [category: string]: number;
}

let userProfile: UserInterestProfile = {
  dance: 0.1, comedy: 0.1, travel: 0.1, tech: 0.1, food: 0.1, ad: 0,
};

// Memory-only storage for the current session to keep blob URLs alive while the page isn't refreshed
let sessionPinnedVideos: Video[] = [];

const sanitizeForStorage = (video: Video): Video => {
    const clean = { ...video };
    // Keep poster (base64) so it still shows in the grid even if url is lost
    if (clean.url && clean.url.startsWith('blob:')) {
        delete clean.url; 
    }
    return clean;
};

const getInitialDatabase = (): Video[] => {
    const userSaved = localStorage.getItem('ha_user_posts');
    let userPosts: Video[] = [];
    
    if (userSaved) {
        try {
            userPosts = JSON.parse(userSaved);
        } catch (e) {
            console.error("[Engine] Failed to parse local posts", e);
        }
    }
    // Return saved user posts and mock videos for a full feed
    return [...userPosts, ...MOCK_VIDEOS];
};

let videoDatabase: Video[] = getInitialDatabase();

const saveUserPosts = () => {
    const currentUserId = localStorage.getItem('ha_last_user_id');
    const uniqueMap = new Map<string, Video>();
    
    sessionPinnedVideos.forEach(v => uniqueMap.set(v.id, sanitizeForStorage(v)));
    videoDatabase.forEach(v => {
        if (!uniqueMap.has(v.id)) {
            uniqueMap.set(v.id, sanitizeForStorage(v));
        }
    });

    const allVideos = Array.from(uniqueMap.values());
    const userVideos = allVideos.filter(v => 
        v.isLocal === true || 
        v.id.startsWith('v_local_') || 
        v.id.startsWith('v_mock_') || // Ensure mock videos stay in general pool
        (currentUserId && v.user && v.user.id === currentUserId)
    ).slice(0, 100); 
    
    localStorage.setItem('ha_user_posts', JSON.stringify(userVideos));
};

export const claimLocalVideos = (user: User) => {
    const updateVideo = (v: Video): Video => {
        if (v.isLocal || v.id.startsWith('v_local_')) {
            return { ...v, user: { ...user }, isLocal: false };
        }
        return v;
    };

    sessionPinnedVideos = sessionPinnedVideos.map(updateVideo);
    videoDatabase = videoDatabase.map(updateVideo);
    saveUserPosts();
};

export const injectVideo = (video: Video) => {
  const cleanVideo = {
      ...video,
      duration: video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 15
  };

  const existingInSession = sessionPinnedVideos.findIndex(v => v.id === cleanVideo.id);
  if (existingInSession !== -1) {
      sessionPinnedVideos[existingInSession] = cleanVideo;
  } else {
      sessionPinnedVideos = [cleanVideo, ...sessionPinnedVideos];
  }

  const existingIdx = videoDatabase.findIndex(v => v.id === cleanVideo.id);
  if (existingIdx !== -1) {
      videoDatabase[existingIdx] = { ...videoDatabase[existingIdx], ...cleanVideo };
  } else {
      videoDatabase.unshift(cleanVideo);
  }
  
  saveUserPosts();
};

export const getLocalDatabase = () => {
    const pinnedIds = new Set(sessionPinnedVideos.map(v => v.id));
    const others = videoDatabase.filter(v => !pinnedIds.has(v.id));
    const merged = [...sessionPinnedVideos, ...others];
    return merged.length === 0 ? MOCK_VIDEOS : merged;
};

export const getPersistentUserPosts = (userId: string) => {
    const db = getLocalDatabase();
    return db.filter(v => 
        (v.user && v.user.id === userId) || 
        v.isLocal === true || 
        v.id.startsWith('v_local_')
    );
};

export type InteractionType = 'view_start' | 'view_complete' | 'like' | 'share' | 'skip' | 'not_interested' | 'watch_time';

export const trackInteraction = async (video: Video, type: InteractionType, metadata?: any) => {
  const category = video.category;
  if (!category || category === 'ad') return;

  switch (type) {
    case 'like': userProfile[category] = (userProfile[category] || 0) + 0.5; break;
    case 'share': userProfile[category] = (userProfile[category] || 0) + 0.8; break;
    case 'view_complete': userProfile[category] = (userProfile[category] || 0) + 0.2; break;
    case 'watch_time':
        if (metadata?.percentWatched > 80) userProfile[category] = (userProfile[category] || 0) + 0.3;
        break;
    case 'skip': userProfile[category] = Math.max(0, (userProfile[category] || 0) - 0.1); break;
    case 'not_interested': userProfile[category] = Math.max(0, (userProfile[category] || 0) - 0.5); break;
  }

  try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          await supabase.from('analytics').insert({
              user_id: session.user.id,
              event_type: type,
              video_id: video.id,
              category: video.category,
              metadata: metadata || {}
          });
      }
  } catch (e) {}
};

export const markNotInterested = (video: Video) => {
    trackInteraction(video, 'not_interested');
};

const scoreVideo = (video: Video): number => {
  if (video.isAd) return -1;
  const categoryScore = userProfile[video.category] || 0;
  const popularityScore = video.likes / 100000;
  const randomNoise = Math.random() * 0.2;
  
  const isPinned = sessionPinnedVideos.some(v => v.id === video.id);
  const freshnessBoost = isPinned ? 100.0 : (video.isLocal ? 50.0 : 0);
  
  return (categoryScore * 0.6) + (popularityScore * 0.2) + freshnessBoost + randomNoise;
};

export const getRecommendedFeed = (type: FeedType, offset: number = 0): Video[] => {
  let candidates = getLocalDatabase();
  
  if (type === 'following') {
      const currentUserId = localStorage.getItem('ha_last_user_id');
      candidates.sort((a, b) => {
          const aMine = a.user?.id === currentUserId ? 1 : 0;
          const bMine = b.user?.id === currentUserId ? 1 : 0;
          if (aMine !== bMine) return bMine - aMine;
          return b.id.localeCompare(a.id);
      });
      return candidates.slice(0, 50);
  }
  
  candidates.sort((a, b) => scoreVideo(b) - scoreVideo(a));
  return candidates;
};