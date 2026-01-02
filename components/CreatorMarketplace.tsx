
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, Filter, Star, MapPin, Users, TrendingUp } from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS, formatNumber } from '../constants';

interface CreatorMarketplaceProps {
  onBack: () => void;
  onNavigateProfile: (user: User) => void;
}

// Enriched Mock Data for Marketplace
const MARKETPLACE_CREATORS = MOCK_USERS.map(u => ({
    ...u,
    marketplaceStats: {
        engagementRate: Number((Math.random() * 5 + 1).toFixed(1)),
        avgViews: Math.floor(Math.random() * 50000 + 5000),
        audienceLocation: ['Kenya', 'Nigeria', 'South Africa', 'Ghana'][Math.floor(Math.random() * 4)],
        category: ['Dance', 'Comedy', 'Lifestyle', 'Tech'][Math.floor(Math.random() * 4)]
    }
}));

export const CreatorMarketplace: React.FC<CreatorMarketplaceProps> = ({ onBack, onNavigateProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creators, setCreators] = useState(MARKETPLACE_CREATORS);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredCreators = creators.filter(c => {
      const matchesSearch = c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || c.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || c.marketplaceStats?.category === selectedCategory;
      return matchesSearch && matchesCat;
  });

  return (
    <div className="absolute inset-0 z-[60] bg-gray-50 flex flex-col animate-slide-right text-black">
        {/* Header */}
        <div className="bg-white p-4 pt-safe border-b border-gray-200 sticky top-0 z-10">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={onBack}><ChevronLeft /></button>
                <h1 className="font-bold text-lg">Creator Marketplace</h1>
            </div>
            
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Find creators..." 
                        className="w-full bg-gray-100 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none"
                    />
                </div>
                <button className="bg-gray-100 p-2.5 rounded-lg text-gray-600"><Filter size={20} /></button>
            </div>

            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {['All', 'Dance', 'Comedy', 'Lifestyle', 'Tech'].map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <h2 className="font-bold text-sm text-gray-500 mb-3 uppercase tracking-wide">Top Creators</h2>
            
            <div className="flex flex-col gap-3">
                {filteredCreators.map(creator => (
                    <div 
                        key={creator.id} 
                        onClick={() => onNavigateProfile(creator)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-3">
                                <img src={creator.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                <div>
                                    <h3 className="font-bold text-black">{creator.displayName}</h3>
                                    <p className="text-xs text-gray-500">@{creator.username}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 rounded">{creator.marketplaceStats?.category}</span>
                                        <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 rounded flex items-center gap-0.5"><MapPin size={8} /> {creator.marketplaceStats?.audienceLocation}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded text-xs font-bold">
                                <Star size={12} fill="currentColor" /> 4.9
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg">
                            <div className="text-center">
                                <p className="text-xs text-gray-400 flex justify-center items-center gap-1"><Users size={10} /> Followers</p>
                                <p className="font-bold text-black">{formatNumber(creator.followers)}</p>
                            </div>
                            <div className="text-center border-l border-gray-200">
                                <p className="text-xs text-gray-400 flex justify-center items-center gap-1"><TrendingUp size={10} /> Avg. Views</p>
                                <p className="font-bold text-black">{formatNumber(creator.marketplaceStats?.avgViews || 0)}</p>
                            </div>
                            <div className="text-center border-l border-gray-200">
                                <p className="text-xs text-gray-400">Engagement</p>
                                <p className="font-bold text-green-600">{creator.marketplaceStats?.engagementRate}%</p>
                            </div>
                        </div>
                        
                        <button className="w-full mt-3 bg-black text-white py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800">
                            Invite to Campaign
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
