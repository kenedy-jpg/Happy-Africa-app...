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

const mapProfileToUser = (profile: any, userId?: string): User => {
  if (!profile) return {
      id: userId || 'unknown', 
      username: 'user_' + (userId?.slice(0, 4) || 'guest'), 
      displayName: 'Guest User',
      avatarUrl: `https://ui-avatars.com/api/?name=User&background=random`, 
      followers: 0, following: 0, likes: 0, coins: 0
  };

  return {
    id: profile.id || userId || 'unknown',
    username: profile.username || profile.email?.split('@')[0] || 'user',
    displayName: profile.full_name || profile.username || 'User',
    avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username || 'User'}&background=random`,
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
            return mapProfileToUser(data, userId);
        } catch (e) { 
            return mapProfileToUser(null, userId); 
        }
    },
    async refreshSession(): Promise<{ user: User, access_token: string } | null> {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (session) {
                const user = await this.getProfile(session.user.id);
                if (user) {
                    this.setUser(user);
                    setSupabaseToken(session.access_token);
                    return { user, access_token: session.access_token };
                }
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
      const user = await this.getProfile(data.user!.id);
      if (!user) throw new Error("Profile sync failed");
      this.setUser(user);
      return user;
    },
    async signup(userData: any, password: string): Promise<User> {
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: password,
            options: { data: { username: userData.username } }
        });
        if (error) throw error;
        const user = mapProfileToUser({ id: data.user?.id, ...userData });
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
    async fetchVideosSafe(queryModifier: (query: any) => any): Promise<Video[]> {
        try {
            const { data: vData, error: vError } = await queryModifier(supabase.from("videos").select("*"));
            if (vError) throw vError;
            if (!vData || vData.length === 0) return [];
            
            const userIds = Array.from(new Set(vData.map((v: any) => v.user_id))).filter(id => !!id);
            if (userIds.length === 0) {
                return vData.map((v: any) => ({
                    id: v.id.toString(),
                    url: v.url || v.video_url || v.media_url, 
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
                    duration: v.duration || 15,
                    isLocal: false
                }));
            }

            const { data: pData, error: pError } = await supabase.from("profiles").select("*").in("id", userIds);
            const profileMap = new Map(pData?.map(p => [p.id, p]) || []);
            
            return vData.map((v: any) => {
                const durationVal = v.duration ? parseFloat(v.duration) : 15;
                return {
                    id: v.id.toString(),
                    url: v.url || v.video_url || v.media_url, 
                    poster: v.poster_url || 'https://picsum.photos/400/800',
                    description: v.description || '',
                    hashtags: v.hashtags || [],
                    likes: v.likes_count || 0,
                    comments: v.comments_count || 0,
                    shares: v.shares_count || 0,
                    user: mapProfileToUser(profileMap.get(v.user_id), v.user_id),
                    musicTrack: v.music_track || 'Original Sound',
                    category: v.category || 'general',
                    location: v.location_name,
                    duration: isNaN(durationVal) || durationVal <= 0 ? 15 : durationVal,
                    isLocal: false
                };
            });
        } catch (e: any) { 
            console.error("[Backend] Supabase fetch error:", e?.message || e);
            throw e; 
        }
    },
    async getFeed(type: string, page: number = 0, pageSize: number = 5): Promise<Video[]> {
        try {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            const liveVideos = await backend.content.fetchVideosSafe((q: any) => 
                q.order("created_at", { ascending: false }).range(from, to)
            );
            
            if (page === 0) {
                const localDB = getLocalDatabase().filter(v => !!v.url);
                const localIds = new Set(localDB.map(l => l.id));
                const filteredLive = liveVideos.filter(lv => !localIds.has(lv.id));
                const merged = [...localDB, ...filteredLive];
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
                q.eq('user_id', userId).order('created_at', { ascending: false })
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
    async uploadVideo(file: File, description: string, posterBase64?: string, duration?: number): Promise<void> {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required to post");

      const fileName = `${user.id}/${Date.now()}_video.mp4`;
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, { 
            contentType: "video/mp4", 
            upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        url: publicUrl,
        description: description || '',
        poster_url: posterBase64 || null,
        duration: duration || 15,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString()
      });

      if (insertError) {
          await supabase.storage.from("videos").remove([fileName]);
          throw insertError;
      }
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