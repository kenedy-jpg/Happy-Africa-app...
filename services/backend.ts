import { supabase, setSupabaseToken } from './supabaseClient';
import { User, Video, Comment, ChatSession, Message, LiveStream, Product, MusicTrack, Collection } from '../types';
import { MOCK_PRODUCTS, MOCK_USERS } from '../constants';
import { getLocalDatabase, getPersistentUserPosts } from './recommendationEngine';
import { performanceCache, requestDeduplicator } from './performanceCache';
import { canPerformAction, ExponentialBackoff } from './rateLimiter';

let _cachedUser: User | null = null;

const STARTER_VIBES: Video[] = [
    {
        id: 'starter_1',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        poster: 'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?auto=format&fit=crop&w=400&h=800',
        description: 'Welcome to Happy Africa! 🌍 Discover the rhythm of the continent. #HappyAfrica #Vibe #Africa',
        hashtags: ['#HappyAfrica', '#Vibe', '#Africa'],
        likes: 45200,
        comments: 1205,
        shares: 890,
        user: MOCK_USERS[0],
        category: 'travel',
        duration: 15
    }
];

const mapProfileToUser = (profile: any, userId?: string): User | null => {
  if (!profile) {
    // Return null instead of guest user - users must have real profiles
    return null;
  }

  // If profile is auth user object
  if (profile.id && profile.email && !profile.username) {
    const displayName = profile.user_metadata?.full_name || profile.user_metadata?.username || null;
    // Require real name or username - no auto-generated names
    if (!displayName) return null;
    
    return {
      id: profile.id,
      username: profile.user_metadata?.username || profile.email.split('@')[0],
      displayName: displayName,
      avatarUrl: profile.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
      followers: 0, following: 0, likes: 0, coins: 0,
      email: profile.email
    };
  }

  // Normal profile from db - require real full_name
  if (!profile.full_name || profile.full_name.trim() === '') {
    return null; // Reject profiles without real names
  }

  return {
    id: profile.id || userId || null,
    username: profile.username || profile.email?.split('@')[0] || 'user',
    displayName: profile.full_name,
    avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=random`,
    followers: profile.followers_count || 0,
    following: profile.following_count || 0,
    likes: profile.likes_count || 0,
    coins: profile.coins || 0,
    bio: profile.bio || '',
    isSeller: profile.is_seller || false,
    email: profile.email,
    profileViewsEnabled: profile.profile_views_enabled ?? true
  };
};

export const backend = {
  auth: {
    getCurrentUser(): User | null { return _cachedUser; },
    setUser(user: User | null) {
        _cachedUser = user;
        if (user) {
            localStorage.setItem('ha_last_user_id', user.id);
            // Cache full profile data including avatar for refresh persistence
            localStorage.setItem('ha_cached_profile', JSON.stringify(user));
        } else {
            localStorage.removeItem('ha_cached_profile');
        }
    },
    async getProfile(userId: string): Promise<User | null> {
        try {
            // Check localStorage cache first for faster refresh
            const localCache = localStorage.getItem('ha_cached_profile');
            if (localCache) {
                const cachedUser = JSON.parse(localCache);
                if (cachedUser.id === userId) {
                    console.log('[Profile] Using cached profile from localStorage');
                    _cachedUser = cachedUser;
                    return cachedUser;
                }
            }

            // Check memory cache
            const cacheKey = `profile:${userId}`;
            const cached = performanceCache.get<User>(cacheKey);
            if (cached) return cached;
            
            // Deduplicate concurrent requests
            return await requestDeduplicator.dedupe(cacheKey, async () => {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
                if (error) throw error;
                const user = mapProfileToUser(data, userId);
                if (!user) throw new Error('Profile incomplete - real name required');
                
                // Cache for 5 minutes
                performanceCache.set(cacheKey, user, 5 * 60 * 1000);
                return user;
            });
        } catch (e) { 
            console.error('Failed to load user profile:', e);
            return null; 
        }
    },
    async refreshSession(): Promise<{ user: User, access_token: string } | null> {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (session) {
                const user = mapProfileToUser(session.user, session.user.id);
                this.setUser(user);
                setSupabaseToken(session.access_token);
                return { user, access_token: session.access_token };
            }
        } catch (err) { 
            console.warn("[Auth] Using local fallback");
        }
        return null;
    },
    async login(identifier: string, password: string): Promise<User> {
      const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier.includes('@') ? identifier : `${identifier}@example.com`,
          password: password
      });
      if (error) throw error;
      
      const user = mapProfileToUser(data.user, data.user!.id);
      if (!user) {
          throw new Error('Account profile incomplete - real name required');
      }
      
      this.setUser(user);
      return user;
    },
    async signup(userData: any, password: string): Promise<User> {
        // Require full name for signup
        if (!userData.fullName || userData.fullName.trim() === '') {
            throw new Error('Full name is required');
        }
        if (!userData.username || userData.username.trim() === '') {
            throw new Error('Username is required');
        }
        
        // Generate avatar URL
        const avatarUrl = userData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`;
        
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: password,
            options: { 
                data: { 
                    username: userData.username,
                    full_name: userData.fullName,
                    avatar_url: avatarUrl
                } 
            }
        });
        if (error) throw error;
        
        const user = mapProfileToUser({ 
            id: data.user?.id, 
            ...userData,
            full_name: userData.fullName,
            avatar_url: avatarUrl,
            user_metadata: {
                username: userData.username,
                full_name: userData.fullName,
                avatar_url: avatarUrl
            }
        });
        
        if (!user) throw new Error('Profile creation failed - real name is required');
        this.setUser(user);
        return user;
    },
    async logout() { 
        await supabase.auth.signOut().catch(() => {}); 
        this.setUser(null); 
    },
    async getCurrentUserAsync(): Promise<User | null> {
        if (_cachedUser) return _cachedUser;
        const session = await this.refreshSession().catch(() => null);
        return session?.user || null;
    }
  },

  content: {
    async getSignedUrl(path: string): Promise<string> {
      try {
        const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, 604800); // 1 week
        if (error) throw error;
        return data.signedUrl;
      } catch (e) {
        console.error('Failed to get signed URL:', e);
        return '';
      }
    },

    async fetchVideosSafe(queryModifier: (query: any) => any): Promise<Video[]> {
        try {
            const { data: vData, error: vError } = await queryModifier(supabase.from("videos").select("*"));
            if (vError) throw vError;
            if (!vData || vData.length === 0) return [];
            
            const userIds = Array.from(new Set(vData.map((v: any) => v.user_id))).filter(id => !!id);
            if (userIds.length === 0) {
                return await Promise.all(vData.map(async (v: any) => {
                    let url = v.url || v.video_url || v.media_url;
                    if (v.file_path) {
                        url = await this.getSignedUrl(v.file_path);
                    } else if (v.url && (v.url.includes('/public/videos/') || !v.url.startsWith('http'))) {
                        const path = decodeURIComponent(v.url.includes('/public/videos/') ? v.url.split('/public/videos/')[1] : v.url);
                        url = await this.getSignedUrl(path);
                    }
                    return {
                        id: v.id.toString(),
                        url: url, 
                        poster: v.poster_url || 'https://picsum.photos/400/800',
                        description: v.description || '',
                        hashtags: v.hashtags || [],
                        likes: v.likes_count || 0,
                        comments: v.comments_count || 0,
                        shares: v.shares_count || 0,
                        user: mapProfileToUser(null, v.user_id),
                        musicTrack: v.music_track || 'Original Sound',
                        category: v.category || 'general',
                        location: v.location_name,
                        duration: v.duration || 60,
                        isLocal: false
                    };
                });
            }

            const { data: pData, error: pError } = await supabase.from("profiles").select("*").in("id", userIds);
            const profileMap = new Map(pData?.map(p => [p.id, p]) || []);
            
            return vData.map((v: any) => {
                // ✅ Use public URL directly for faster loading (no signed URL needed)
                let url = v.video_url || v.url || v.media_url;
                
                // If we only have file_path, construct public URL directly
                if (!url && v.file_path) {
                    const { data } = supabase.storage.from('videos').getPublicUrl(v.file_path);
                    url = data.publicUrl;
                }
                
                const durationVal = v.duration ? parseFloat(v.duration) : 15;
                
                // ✅ FIXED: Don't skip videos if profile is missing - create fallback user
                // This ensures newly uploaded videos appear even if profile hasn't synced yet
                let userProfile = mapProfileToUser(profileMap.get(v.user_id), v.user_id);
                
                if (!userProfile) {
                    console.warn(`[Backend] No profile found for video ${v.id}, using fallback user`);
                    // Create fallback user so video still shows
                    userProfile = {
                        id: v.user_id,
                        username: 'user_' + v.user_id.slice(0, 8),
                        displayName: 'Happy Africa User',
                        avatarUrl: `https://ui-avatars.com/api/?name=User&background=random`,
                        followers: 0,
                        following: 0,
                        likes: 0,
                        coins: 0
                    };
                }
                
                return {
                    id: v.id.toString(),
                    url: url, 
                    poster: v.poster_url || 'https://picsum.photos/400/800',
                    description: v.description || '',
                    hashtags: v.hashtags || [],
                    likes: v.likes_count || 0,
                    comments: v.comments_count || 0,
                    shares: v.shares_count || 0,
                    user: userProfile,
                    musicTrack: v.music_track || 'Original Sound',
                    category: v.category || 'general',
                    location: v.location_name,
                    duration: isNaN(durationVal) || durationVal <= 0 ? 60 : durationVal,
                    isLocal: false
                };
            });
        } catch (e: any) { 
            console.error("[Backend] Supabase fetch error:", e?.message || e);
            throw e; 
        }
    },
    async getFeed(type: string, page: number = 0, pageSize: number = 10): Promise<Video[]> {
        try {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            console.log(`[Backend] Fetching feed page ${page}, range ${from}-${to}`);
            
            // ✅ Fetch ALL published videos from database (public feed like TikTok)
            // This ensures EVERYONE can see EVERYONE's videos
            const liveVideos = await backend.content.fetchVideosSafe((q: any) => 
                q.eq('is_published', true)  // Only show published videos
                 .order("created_at", { ascending: false })
                 .range(from, to)
            );
            
            console.log(`[Backend] Fetched ${liveVideos.length} videos from database`);
            
            // For first page, show starter content if no videos exist yet
            if (page === 0 && liveVideos.length === 0) {
                console.log('[Backend] No videos in database, showing starter content');
                return STARTER_VIBES;
            }
            
            // Return database videos (they persist after refresh)
            return liveVideos;
        } catch (e: any) { 
            console.error("[Backend] getFeed failed:", e?.message || e);
            // Only show starter content on error for first page
            return page === 0 ? STARTER_VIBES : [];
        }
    },
    async getMyVideos(userId: string): Promise<Video[]> {
        try {
            const remoteVideos = await backend.content.fetchVideosSafe((q) => 
                q.eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
            );
            const localPosts = getPersistentUserPosts(userId);
            const remoteIds = new Set(remoteVideos.map(r => r.id));
            
            // Bring back videos: Don't filter out isLocal ones even if url is missing (still show poster in grid)
            const uniqueLocals = localPosts.filter(l => !remoteIds.has(l.id));
            
            const combined = [...uniqueLocals, ...remoteVideos];
            return combined.sort((a, b) => b.id.localeCompare(a.id));
        } catch (e: any) { 
            // Fallback to local posts if remote fetch fails
            return getPersistentUserPosts(userId); 
        }
    },
    async uploadVideo(
      file: File, 
      description: string, 
      posterBase64?: string, 
      duration?: number,
      onProgress?: (progress: number) => void
    ): Promise<void> {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required to post");

      // Start upload immediately
      console.log('[Upload] Starting upload - File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

      const fileName = `${user.id}/${Date.now()}_video.mp4`;
      const videoId = `v_${user.id}_${Date.now()}`;
      
      // Use new robust upload service with presigned URLs and retry logic
      const { uploadVideo: robustUpload } = await import('./uploadService');
      
      try {
        // IMPORTANT: Parameter order is (file, fileName, options)
        await robustUpload(file, fileName, {
          maxRetries: 3,
          retryDelay: 1000,
          onProgress: (uploadProgress) => {
            // Convert detailed progress to simple percentage (20-85%)
            const percent = 20 + (uploadProgress.progress * 0.65);
            onProgress?.(Math.round(percent));
            
            // Log detailed progress
            if (uploadProgress.progress % 10 < 1) { // Log every ~10%
              console.log('[Upload] Progress:', {
                percent: uploadProgress.progress.toFixed(1) + '%',
                loaded: (uploadProgress.loaded / (1024 * 1024)).toFixed(2) + ' MB',
                total: (uploadProgress.total / (1024 * 1024)).toFixed(2) + ' MB',
                speed: (uploadProgress.speed / 1024).toFixed(1) + ' KB/s'
              });
            }
          }
        });
        
        onProgress?.(90); // Upload complete, saving to database
        console.log('[Upload] File uploaded successfully to storage');
        
      } catch (uploadError: any) {
        console.error('[Upload] Upload failed:', uploadError);
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      try {
        // Prepare video record with ALL possible fields to avoid RLS issues
        const videoRecord = {
          id: videoId,
          user_id: user.id,
          file_path: fileName,
          video_url: publicUrl,
          description: description || '',
          poster_url: posterBase64 || null,
          duration: duration && duration > 0 ? Math.round(duration) : 0,
          is_published: true,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('[Upload] Attempting database insert with record:', {
          ...videoRecord,
          poster_url: videoRecord.poster_url ? '[base64...]' : null
        });

        // ✅ Insert video into database - this makes it persistent and visible to all users
        const { data: insertData, error: insertError } = await supabase
          .from("videos")
          .insert(videoRecord)
          .select()
          .single();

        if (insertError) {
          console.error('[Upload] Database insert error details:', {
            message: insertError.message,
            code: insertError.code,
            status: (insertError as any).status,
            details: (insertError as any).details,
            hint: (insertError as any).hint
          });

          // FALLBACK: Save locally and keep the video in storage
          // This allows videos to persist even if database is misconfigured
          console.log('[Upload] Saving video locally as fallback...');
          try {
            const localVideos = JSON.parse(localStorage.getItem('ha_videos') || '[]');
            
            const fallbackVideo = {
              id: videoId,
              url: publicUrl,
              poster: posterBase64 || `https://picsum.photos/400/800?random=${Date.now()}`,
              description: description || '',
              duration: duration && duration > 0 ? Math.round(duration) : 15,
              user_id: user.id,
              created_at: new Date().toISOString(),
              is_published: true,
              isLocal: true, // Mark as local backup
              notes: 'Saved locally - database was unavailable'
            };
            
            localVideos.push(fallbackVideo);
            localStorage.setItem('ha_videos', JSON.stringify(localVideos));
            console.log('[Upload] Video saved to local storage as backup');
            
            // Still throw the original error so user knows there was an issue
            // but the video is preserved
            const errorDetails = `Database save failed\n\nError Code: ${insertError.code}\nMessage: ${insertError.message}\n\nYour video has been saved locally as a backup and will sync when the connection is restored.\n\nTo fix this issue:\n1. Go to Supabase Dashboard → SQL Editor\n2. Run the SQL script from FIX_RLS_POLICIES.sql\n3. Make sure you're properly logged in`;
            throw new Error(errorDetails);
          } catch (localSaveError: any) {
            console.error('[Upload] Failed to save locally too:', localSaveError);
            // Delete the uploaded file since we couldn't save it anywhere
            try {
              await supabase.storage.from("videos").remove([fileName]);
              console.log('[Upload] Cleaned up uploaded file due to complete failure');
            } catch (cleanupError) {
              console.warn('[Upload] Failed to cleanup file:', cleanupError);
            }
            throw new Error(`Failed to save video to database: ${insertError.message}\n\nError Code: ${insertError.code}\nStatus: ${(insertError as any).status || 'N/A'}\n\nThis is a server configuration issue. Run FIX_RLS_POLICIES.sql in Supabase to resolve it.`);
          }
        }

        console.log('[Upload] ✅ Video successfully saved to database:', insertData);
        
        // Invalidate feed cache so new video appears immediately
        performanceCache.invalidatePattern('feed:.*');
        performanceCache.invalidate(`user:${user.id}:videos`);
        
        onProgress?.(100); // Complete
      } catch (e: any) {
        console.error('[Upload] Final error:', e);
        // Don't delete file here - it might be kept as local backup
        throw e;
      }
    },

    async compressVideo(file: File): Promise<File> {
      // Use canvas-based compression as fallback
      // For production, consider using FFmpeg.wasm or similar
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const video = document.createElement('video');
            video.src = e.target?.result as string;
            video.onloadedmetadata = () => {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth * 0.75; // Reduce resolution by 25%
              canvas.height = video.videoHeight * 0.75;
              
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Canvas context unavailable');
              
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob(
                (blob) => {
                  if (!blob) reject(new Error('Canvas conversion failed'));
                  else resolve(new File([blob], file.name, { type: 'video/mp4' }));
                },
                'video/mp4',
                0.8 // 80% quality
              );
            };
            video.onerror = () => reject(new Error('Video load failed'));
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
      });
    },
    async uploadImage(file: File, bucket: string): Promise<string> {
        const fileName = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return publicUrlData.publicUrl;
    },
    async getComments(videoId: string): Promise<Comment[]> {
        try {
            const { data, error } = await supabase.from('comments')
                .select('*, profiles(username, avatar_url)')
                .eq('video_id', videoId)
                .order('created_at', { ascending: false });
            if (error) return [];
            return data.map((c: any) => ({
                id: c.id, username: c.profiles?.username || 'User', text: c.text, createdAt: new Date(c.created_at).toLocaleDateString(), likes: c.likes_count || 0, avatarUrl: c.profiles?.avatar_url
            }));
        } catch (e) { return []; }
    },
    async addComment(videoId: string, comment: Comment): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('comments').insert({ video_id: videoId, user_id: user.id, text: comment.text });
    },
    async getTrendingVideos(): Promise<Video[]> { return backend.content.getFeed('foryou', 0, 20); },
    async searchVideos(query: string): Promise<Video[]> { return await backend.content.fetchVideosSafe((q) => q.ilike('description', `%${query}%`)).catch(() => []); },
    async searchSounds(query: string): Promise<MusicTrack[]> { return []; },
    async toggleLike(videoId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.rpc('toggle_video_like', { vid: videoId, uid: user.id }).catch(() => {});
    },
    async repostVideo(videoId: string, thought: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('videos').insert({
            user_id: user.id,
            reposted_from: videoId,
            description: thought
        }).catch(() => {});
    },
    async getVideosBySound(soundTitle: string): Promise<Video[]> { return await backend.content.fetchVideosSafe((q) => q.ilike('music_track', `%${soundTitle}%`)).catch(() => []); },
    async getVideosByHashtag(tag: string): Promise<Video[]> { return await backend.content.fetchVideosSafe((q) => q.contains('hashtags', [tag])).catch(() => []); }
  },

  user: {
    async getUserInteractions(userId: string) { 
        try {
            const { data } = await supabase.from('user_interactions').select('*').eq('user_id', userId).maybeSingle();
            return {
                likedVideoIds: data?.liked_video_ids || [],
                followedUserIds: data?.followed_video_ids || [],
                bookmarkedVideoIds: data?.bookmarked_video_ids || []
            };
        } catch (e) {
            return { likedVideoIds: [], followedUserIds: [], bookmarkedVideoIds: [] };
        }
    },
    async toggleFollow(targetUserId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.rpc('toggle_user_follow', { target_id: targetUserId, follower_id: user.id }).catch(() => {});
    },
    async searchUsers(query: string): Promise<User[]> {
        try {
            const { data } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`);
            return data?.map(p => mapProfileToUser(p)) || [];
        } catch (e) { return []; }
    },
    async recordProfileView(viewerId: string, profileId: string): Promise<void> {
        if (viewerId === profileId) return;
        await supabase.from('profile_views').insert({ viewer_id: viewerId, profile_id: profileId }).catch(() => {});
    },
    async getProfileViews(userId: string): Promise<User[]> { 
        try {
            const { data } = await supabase.from('profile_views').select('viewer_id, profiles!viewer_id(*)').eq('profile_id', userId).order('created_at', { ascending: false }).limit(20);
            return data?.map(d => mapProfileToUser(d.profiles)) || [];
        } catch (e) { return []; }
    },
    async updateProfile(user: User): Promise<void> {
        console.log('[Backend] Updating profile:', {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl ? user.avatarUrl.substring(0, 50) + '...' : 'none'
        });
        
        const { error } = await supabase.from('profiles').update({
            username: user.username,
            full_name: user.displayName, 
            bio: user.bio, 
            avatar_url: user.avatarUrl, 
            profile_views_enabled: user.profileViewsEnabled
        }).eq('id', user.id);
        
        if (error) {
            console.error('[Backend] Profile update failed:', error);
            throw error;
        }
        
        console.log('[Backend] Profile updated successfully');
        
        // Also update the cached user
        backend.auth.setUser(user);
    },
    async getFollowers(userId: string): Promise<User[]> { return []; },
    async getFollowing(userId: string): Promise<User[]> { return []; },
    async getCollections(userId: string): Promise<Collection[]> { return []; },
    async createCollection(userId: string, name: string, isPrivate: boolean): Promise<Collection> {
        return { id: 'new-col', name, isPrivate, coverUrl: '', videoCount: 0 };
    }
  },

  messaging: {
    async getConversations(userId: string): Promise<ChatSession[]> { return []; },
    async sendMessage(senderId: string, receiverId: string, text: string): Promise<void> {
        await supabase.from('messages').insert({ sender_id: senderId, receiver_id: receiverId, text }).catch(() => {});
    }
  },

  notifications: {
    async getNotifications(userId: string): Promise<any[]> { return []; },
    async markAsRead(userId: string): Promise<void> {}
  },

  wallet: {
    async purchaseCoins(userId: string, amount: number, type: string): Promise<void> {
        try {
            const user = await supabase.from('profiles').select('coins').eq('id', userId).single();
            const current = user.data?.coins || 0;
            await supabase.from('profiles').update({ coins: current + amount }).eq('id', userId);
        } catch (e) {}
    },
    async getTransactions(userId: string): Promise<any[]> { return []; }
  },

  live: {
    async startStream(userId: string, title: string, category: string): Promise<string> { return `live_${Date.now()}`; },
    async endStream(streamId: string): Promise<void> {},
    async getActiveStreams(): Promise<LiveStream[]> { return []; }
  },

  shop: {
    async getShowcase(userId: string): Promise<Product[]> { return []; },
    async getProducts(): Promise<Product[]> { return MOCK_PRODUCTS; },
    async placeOrder(userId: string, productId: string): Promise<void> {},
    async getOrders(userId: string): Promise<any[]> { return []; },
    async addToShowcase(userId: string, productId: string): Promise<void> {}
  }
};