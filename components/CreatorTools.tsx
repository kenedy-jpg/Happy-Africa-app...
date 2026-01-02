
import React from 'react';
import { ChevronLeft, TrendingUp, Users, Clock, Info, DollarSign, ShoppingBag, ArrowRight } from 'lucide-react';
import { PageRoute } from '../types';

interface CreatorToolsProps {
  onBack: () => void;
  onNavigate?: (route: PageRoute) => void;
}

export const CreatorTools: React.FC<CreatorToolsProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="absolute inset-0 z-[60] bg-brand-indigo flex flex-col animate-slide-right overflow-y-auto">
        <div className="p-4 pt-safe flex items-center border-b border-white/10 sticky top-0 bg-brand-indigo z-10">
            <button onClick={onBack}><ChevronLeft className="text-white" /></button>
            <h2 className="flex-1 text-center font-bold text-white">Creator Tools</h2>
            <div className="w-6"></div>
        </div>

        <div className="p-4 pb-24">
            
            {/* Affiliate Dashboard Section */}
            <div className="bg-gradient-to-br from-purple-900 to-brand-indigo rounded-xl p-4 mb-6 border border-white/10 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-pink p-1.5 rounded-full">
                            <DollarSign size={16} className="text-white" />
                        </div>
                        <h3 className="font-bold text-white">Affiliate Dashboard</h3>
                    </div>
                    <button className="text-xs text-gray-300 flex items-center gap-1">View All <ArrowRight size={12} /></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Total Earnings</p>
                        <p className="text-xl font-bold text-brand-gold">$1,240.50</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Products Sold</p>
                        <p className="text-xl font-bold text-white">85</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => onNavigate && onNavigate({ name: 'affiliate-marketplace' })}
                    className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
                >
                    <ShoppingBag size={16} /> Enter Marketplace
                </button>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-brand-pink" size={20} />
                    <h3 className="font-bold text-white">Overview (Last 7 days)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Video Views</p>
                        <p className="text-xl font-bold text-white">12.5K <span className="text-green-500 text-xs">+15%</span></p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Profile Views</p>
                        <p className="text-xl font-bold text-white">1,204 <span className="text-green-500 text-xs">+5%</span></p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Likes</p>
                        <p className="text-xl font-bold text-white">8.9K <span className="text-red-500 text-xs">-2%</span></p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Comments</p>
                        <p className="text-xl font-bold text-white">450 <span className="text-green-500 text-xs">+20%</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="text-brand-gold" size={20} />
                    <h3 className="font-bold text-white">Follower Insights</h3>
                </div>
                <div className="h-32 flex items-end gap-2 justify-between px-2">
                    {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                        <div key={i} className="w-full bg-brand-pink/30 rounded-t hover:bg-brand-pink/60 transition-colors relative group" style={{ height: `${h}%` }}>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h}%</div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-1">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-blue-400" size={20} />
                    <h3 className="font-bold text-white">Best Time to Post</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Based on your followers activity</p>
                <div className="flex items-center justify-between text-center">
                    <div>
                        <p className="text-2xl font-bold text-white">8 PM</p>
                        <p className="text-[10px] text-gray-500">Weekdays</p>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div>
                        <p className="text-2xl font-bold text-white">11 AM</p>
                        <p className="text-[10px] text-gray-500">Weekends</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
