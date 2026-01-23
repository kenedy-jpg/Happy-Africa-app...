import { Video, User, Product } from './types';

// Removed guest user - all users must login with real credentials
// No guest/mock users allowed
export const CURRENT_USER: User | null = null;

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

export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};