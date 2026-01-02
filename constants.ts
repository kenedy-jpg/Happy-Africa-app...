import { Video, User, Product } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  username: 'happy_user',
  displayName: 'Happy Creator',
  avatarUrl: 'https://picsum.photos/100/100',
  followers: 1205,
  following: 45,
  likes: 8500,
  coins: 1500, 
  bio: 'Sharing the joy of Africa! 🌍✨',
  isSeller: true
};

export const MOCK_USERS = [
  { id: 'u2', username: 'travel_king', displayName: 'Travel King', avatarUrl: 'https://picsum.photos/100/100?random=2', followers: 5000, following: 100, likes: 20000, coins: 0 },
  { id: 'u3', username: 'artistic_soul', displayName: 'Artistic Soul', avatarUrl: 'https://picsum.photos/100/100?random=4', followers: 8900, following: 20, likes: 45000, coins: 0 },
  { id: 'u4', username: 'tech_guru', displayName: 'Tech Guru', avatarUrl: 'https://picsum.photos/100/100?random=6', followers: 1200, following: 300, likes: 5000, coins: 0, isSeller: true },
  { id: 'u5', username: 'chef_mama', displayName: 'Mama Africa Kitchen', avatarUrl: 'https://picsum.photos/100/100?random=8', followers: 15000, following: 10, likes: 90000, coins: 0, isSeller: true },
  { id: 'u6', username: 'dance_crew_ke', displayName: 'Nairobi Dancers', avatarUrl: 'https://picsum.photos/100/100?random=9', followers: 32000, following: 50, likes: 120000, coins: 0 },
  { id: 'brand_coke', username: 'cocacola_africa', displayName: 'Coca-Cola Africa', avatarUrl: 'https://ui-avatars.com/api/?name=Coke&background=red&color=fff', followers: 100000, following: 0, likes: 5000, coins: 0 },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Traditional Maasai Shuka', price: 15.99, originalPrice: 25.00, image: 'https://picsum.photos/300/300?random=20', rating: 4.8, soldCount: 1200, description: 'Authentic Maasai Shuka blanket, perfect for picnics or fashion.', sellerId: 'u2' },
  { id: 'p2', name: 'Jollof Rice Spice Mix', price: 5.99, image: 'https://picsum.photos/300/300?random=21', rating: 4.9, soldCount: 5000, description: 'The secret ingredient to the perfect smoky Jollof Rice.', sellerId: 'u5' },
  { id: 'p3', name: 'Wireless Earbuds Pro', price: 29.99, originalPrice: 59.99, image: 'https://picsum.photos/300/300?random=22', rating: 4.5, soldCount: 850, description: 'High quality bass and noise cancellation.', sellerId: 'u4' },
  { id: 'p4', name: 'Afro-Pop Hoodie', price: 45.00, image: 'https://picsum.photos/300/300?random=23', rating: 4.7, soldCount: 300, description: 'Stylish streetwear representing African pop culture.', sellerId: 'u1' },
  { id: 'p5', name: 'Handmade Beaded Necklace', price: 12.50, image: 'https://picsum.photos/300/300?random=24', rating: 4.9, soldCount: 2100, description: 'Intricate beadwork made by local artisans.', sellerId: 'u3' },
];

export const MOCK_VIDEOS: Video[] = [
    {
        id: 'v_mock_1',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        poster: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=400&h=800',
        description: 'Exploring the beauty of nature in Kenya! 🦒🌿 #Safari #Kenya #Travel',
        hashtags: ['#Safari', '#Kenya', '#Travel'],
        likes: 12500,
        comments: 450,
        shares: 320,
        user: MOCK_USERS[0],
        category: 'travel',
        duration: 15
    },
    {
        id: 'v_mock_2',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        poster: 'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?auto=format&fit=crop&w=400&h=800',
        description: 'Sunday vibes with Bongo Flava 🎵✨ #Music #Vibe #Africa',
        hashtags: ['#Music', '#Vibe', '#Africa'],
        likes: 4500,
        comments: 120,
        shares: 55,
        user: MOCK_USERS[4],
        category: 'dance',
        duration: 15
    },
    {
        id: 'v_mock_3',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        poster: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&w=400&h=800',
        description: 'Nairobi night market is something else! 🌃🥘 #Foodie #Nairobi #Vibes',
        hashtags: ['#Foodie', '#Nairobi', '#Vibes'],
        likes: 8900,
        comments: 310,
        shares: 145,
        user: MOCK_USERS[5],
        category: 'food',
        duration: 15
    },
    {
        id: 'v_mock_4',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        poster: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&h=800',
        description: 'The future is African Tech 🚀💻 #Tech #Coding #AfricaRising',
        hashtags: ['#Tech', '#Coding', '#AfricaRising'],
        likes: 21000,
        comments: 980,
        shares: 1200,
        user: MOCK_USERS[2],
        category: 'tech',
        duration: 15
    }
];

export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};