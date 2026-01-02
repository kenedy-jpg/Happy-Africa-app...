import { LiveComment } from '../types';

// Mock data for simulation
const MOCK_COMMENTS = [
  "Hello from Nairobi! 🇰🇪",
  "This vibe is amazing 🔥",
  "Play that song again!",
  "Big love from Lagos 🇳🇬",
  "Can you say hi to Sarah?",
  "Wagwan!",
  "Respect ✊",
  "Beautiful!",
  "Where did you buy that?",
  "Happy Africa to the world 🌍",
  "Tanzania in the house 🇹🇿",
  "Sending gifts now!",
  "😂😂😂",
  "Best live today",
  "Follow back pls"
];

const MOCK_USERS = [
  "john_doe", "sarah_k", "musa_j", "africa_pride", "travel_ke", 
  "dance_queen", "bongo_flava", "naija_boy", "zulu_warrior"
];

const MOCK_AVATARS = [
  "https://picsum.photos/50/50?random=101",
  "https://picsum.photos/50/50?random=102",
  "https://picsum.photos/50/50?random=103",
  "https://picsum.photos/50/50?random=104"
];

// Helper to generate a random comment
export const generateBotComment = (): LiveComment => {
  const username = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
  const text = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
  const avatar = MOCK_AVATARS[Math.floor(Math.random() * MOCK_AVATARS.length)];
  
  return {
    id: Date.now().toString() + Math.random(),
    username,
    avatarUrl: avatar,
    text
  };
};

// Helper to simulate a user joining
export const generateJoinEvent = (): LiveComment => {
  const username = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
  return {
    id: Date.now().toString() + Math.random(),
    username,
    avatarUrl: "",
    text: "joined",
    isSystem: true
  };
};

// Helper to simulate a gift
export const generateGiftEvent = (): LiveComment => {
    const gifts = ["Rose 🌹", "Ice Cream 🍦", "GG 🕶️", "Heart 💖"];
    const gift = gifts[Math.floor(Math.random() * gifts.length)];
    const username = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    return {
        id: Date.now().toString() + Math.random(),
        username,
        avatarUrl: "",
        text: `sent ${gift}`,
        isSystem: true
    };
};
