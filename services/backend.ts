import { supabase, setSupabaseToken } from './supabaseClient';
import { User, Video, Comment, ChatSession, Message, LiveStream, Product, MusicTrack, Collection } from '../types';
import { MOCK_PRODUCTS, MOCK_USERS } from '../constants';
import { getLocalDatabase, getPersistentUserPosts } from './recommendationEngine';

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
        if (user) localStorage.setItem('ha_last_user_id', user.id);
    },
    async getProfile(userId: string): Promise<User | null> {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            if (error) throw error;
            const user = mapProfileToUser(data, userId);
            if (!user) throw new Error('Profile incomplete - real name required');
            return user;
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
        
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: password,
            options: { 
                data: { 
                    username: userData.username,
                    full_name: userData.fullName
                } 
            }
        });
        if (error) throw error;
        
        const user = mapProfileToUser({ 
            id: data.user?.id, 
            ...userData,
            full_name: userData.fullName,
            user_metadata: {
                username: userData.username,
                full_name: userData.fullName
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
                }));
            }

            const { data: pData, error: pError } = await supabase.from("profiles").select("*").in("id", userIds);
            const profileMap = new Map(pData?.map(p => [p.id, p]) || []);
            
            return await Promise.all(vData.map(async (v: any) => {
                let url = v.url || v.video_url || v.media_url;
                if (v.file_path) {
                    url = await this.getSignedUrl(v.file_path);
                } else if (v.url && (v.url.includes('/public/videos/') || !v.url.startsWith('http'))) {
                    const path = decodeURIComponent(v.url.includes('/public/videos/') ? v.url.split('/public/videos/')[1] : v.url);
                    url = await this.getSignedUrl(path);
                }
                const durationVal = v.duration ? parseFloat(v.duration) : 15;
                const userProfile = mapProfileToUser(profileMap.get(v.user_id), v.user_id);
                
                // Skip videos with missing user profile data
                if (!userProfile) {
                    console.warn(`[Backend] Skipping video ${v.id} - no user profile`);
                    return null;
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
            })).then(videos => videos.filter(v => v !== null));
        } catch (e: any) { 
            console.error("[Backend] Supabase fetch error:", e?.message || e);
            throw e; 
        }
    },
    async getFeed(type: string, page: number = 0, pageSize: number = 5): Promise<Video[]> {
        try {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            // Fetch all videos from database (not filtered by user)
            // This ensures all users can see each other's posts
            const liveVideos = await backend.content.fetchVideosSafe((q: any) => 
                q.eq('is_published', true)  // Only show published videos
                 .order("created_at", { ascending: false })
                 .range(from, to)
            );
            
            if (page === 0) {
                // Mix with local/temporary videos but prioritize database videos
                const localDB = getLocalDatabase().filter(v => !!v.url);
                const dbIds = new Set(liveVideos.map(v => v.id));
                const uniqueLocals = localDB.filter(l => !dbIds.has(l.id));
                const merged = [...liveVideos, ...uniqueLocals];
                return merged.length === 0 ? STARTER_VIBES : merged;
            }
            return liveVideos;
        } catch (e: any) { 
            console.error("[Backend] getFeed failed:", e?.message || e);
            return page === 0 ? getLocalDatabase().filter(v => !!v.url) : [];
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

      // Compress video before upload to reduce file size
      let uploadFile = file;
      onProgress?.(5); // Indicate compression starting
      
      // If file is large (>50MB), attempt compression
      if (file.size > 50 * 1024 * 1024) {
        try {
          uploadFile = await this.compressVideo(file);
        } catch (e) {
          console.warn('[Upload] Video compression skipped:', e);
          // Continue with original file if compression fails
        }
      }
      
      onProgress?.(15); // Compression complete, starting upload

      const fileName = `${user.id}/${Date.now()}_video.mp4`;
      
      // Upload with progress tracking
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, uploadFile, { 
            contentType: "video/mp4", 
            upsert: false,
            onUploadProgress: (progress: any) => {
              // Map upload progress to 15-85% range
              const uploadProgress = (progress.loaded / progress.total) * 100;
              onProgress?.(15 + (uploadProgress * 0.7));
            }
        });

      if (uploadError) throw uploadError;

      onProgress?.(90); // Upload complete, saving to database

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        file_path: fileName,
        description: description || '',
        poster_url: posterBase64 || null,
        duration: duration || null,
        is_published: true,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString()
      });

      if (insertError) {
          await supabase.storage.from("videos").remove([fileName]);
          throw insertError;
      }
      
      onProgress?.(100); // Complete
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
        await supabase.from('profiles').update({
            full_name: user.displayName, bio: user.bio, avatar_url: user.avatarUrl, profile_views_enabled: user.profileViewsEnabled
        }).eq('id', user.id);
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