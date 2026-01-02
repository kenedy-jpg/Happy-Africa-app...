export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
  following: number;
  likes: number;
  coins: number; // Virtual currency balance
  isLive?: boolean; 
  isSeller?: boolean; // New: If true, shows Shop tab on profile
  hasStory?: boolean; // New: TikTok-style story indicator
  profileViewsEnabled?: boolean; // Privacy setting
  email?: string;
  phone?: string;
  bio?: string;
  affiliateStats?: {
      earnings: number;
      productsSold: number;
      clickThroughRate: number;
  };
  marketplaceStats?: {
      engagementRate: number;
      avgViews: number;
      audienceLocation: string;
      category: string;
  };
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  type: 'image' | 'video';
  createdAt: number; // Timestamp
  duration: number; // Seconds
}

export interface Collection {
  id: string;
  name: string;
  coverUrl: string;
  videoCount: number;
  isPrivate: boolean;
  videos?: Video[]; // Optional: populated when fetching detail
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  soldCount: number;
  description: string;
  sellerId: string;
  commission?: number; // New: Affiliate commission amount
}

export interface Comment {
  id: string | number;
  username: string;
  text: string;
  createdAt: string;
  likes: number;
  avatarUrl?: string; 
  isGift?: boolean;
}

export interface Question {
  id: string;
  text: string;
  askedBy: string; // username
  askedAt: string;
  answerVideoId?: string;
}

export interface Clip {
  id: string;
  url: string;
  duration: number;
  startTime: number; // For trimming (relative to clip start)
  endTime: number;   // For trimming (relative to clip start)
  thumbnail?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string; // Fallback text or caption
  createdAt: string;
  isMe: boolean;
  type: 'text' | 'image' | 'video' | 'audio' | 'product';
  mediaUrl?: string; 
  isRead?: boolean;
  reactions?: string[];
  audioDuration?: number;
  attachment?: {
    type: 'video' | 'product' | 'image'; 
    id: string;
    cover: string;
    title?: string;
    price?: number; 
  };
}

export interface ChatSession {
  id: string;
  user: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover: string;
  genre?: string;
  audioUrl?: string;
}

export interface Keyframe {
  timestamp: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface InteractiveElement {
  id: string;
  type: 'poll' | 'sticker'; 
  question?: string; 
  options?: string[]; 
  content?: string; 
  style?: 'comment_reply'; 
  x: number;
  y: number;
  scale: number;
  rotation: number;
  keyframes?: Keyframe[]; // New: Motion Tracking Data
  meta?: any; // For linking to original comment/video
}

export interface Video {
  id: string;
  url?: string; 
  images?: string[]; 
  clips?: Clip[]; 
  type?: 'video' | 'slideshow';
  poster: string;
  description: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  reposts?: number; 
  user: User;
  musicTrack?: string;
  category: 'dance' | 'comedy' | 'travel' | 'tech' | 'food' | 'ad'; 
  location?: string; // New: Location tag
  isAd?: boolean;
  adLink?: string;
  isDraft?: boolean; 
  isLocal?: boolean; // New: Tracks if video is only on device
  productId?: string; 
  filterStyle?: string; 
  interactiveElements?: InteractiveElement[]; 
  replyToCommentId?: string | number; 
  speedSegments?: { start: number; end: number; rate: number }[]; // New: Speed Ramping Data
  duration?: number; // New: Video duration in seconds
}

export type Tab = 'home' | 'discover' | 'upload' | 'inbox' | 'profile' | 'live' | 'shop'; 
export type FeedType = 'following' | 'foryou' | 'friends' | 'nearby'; 

export type PageRoute = 
  | { name: 'sound'; id: string; title: string; subtitle?: string; cover?: string; audioUrl?: string }
  | { name: 'hashtag'; id: string }
  | { name: 'edit-profile' }
  | { name: 'settings' }
  | { name: 'qr-code'; user: User }
  | { name: 'user-profile'; user: User }
  | { name: 'video-detail'; videos: Video[]; initialIndex: number }
  | { name: 'profile-views' }
  | { name: 'product-detail'; product: Product }
  | { name: 'shop' } 
  | { name: 'orders' }
  | { name: 'creator-tools' } 
  | { name: 'affiliate-marketplace' } 
  | { name: 'creator-marketplace' } 
  | { name: 'story-viewer'; user: User }
  | { name: 'collection-detail'; collection: Collection }
  | { name: 'followers-list'; user: User; type: 'followers' | 'following' }; 

export type CreationContext = 
  | { type: 'normal' }
  | { type: 'sound'; track: { title: string; artist: string; id: string; audioUrl?: string } }
  | { type: 'duet'; video: Video }
  | { type: 'stitch'; video: Video }
  | { type: 'hashtag'; tag: string } 
  | { type: 'reply'; comment: Comment; videoId?: string } 
  | { type: 'live' }; 

export interface LiveGoal {
  id: string;
  label: string;
  target: number;
  current: number;
  icon: string; 
}

export interface PKSession {
  isActive: boolean;
  opponent?: User;
  scoreLocal: number;
  scoreOpponent: number;
  timeLeft: number; 
}

export interface LiveComment {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  isSystem?: boolean; 
}

export interface LiveGuest {
    id: string;
    user: User;
    isMuted: boolean;
    hasVideo: boolean;
}

export interface LiveStream {
  id: string;
  host: User;
  title: string;
  viewers: number;
  likes: number;
  streamUrl: string; 
  category: string;
  pkSession?: PKSession; 
  liveGoal?: LiveGoal;
  guests?: LiveGuest[]; 
  isGaming?: boolean; 
}

export interface LiveStats {
  duration: string;
  totalViewers: number;
  newFollowers: number;
  diamondsEarned: number; 
}