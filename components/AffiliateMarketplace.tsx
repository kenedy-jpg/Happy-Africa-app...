
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, Filter, Plus, Check } from 'lucide-react';
import { backend } from '../services/backend';
import { Product } from '../types';
import { formatNumber } from '../constants';

interface AffiliateMarketplaceProps {
  onBack: () => void;
}

export const AffiliateMarketplace: React.FC<AffiliateMarketplaceProps> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
      const load = async () => {
          const user = backend.auth.getCurrentUser();
          const items = await backend.shop.getProducts();
          // Mocking commission data
          const itemsWithCommission = items.map(p => ({
              ...p,
              commission: parseFloat((p.price * 0.15).toFixed(2)) // 15% commission
          }));
          setProducts(itemsWithCommission);
          
          // Load existing showcase
          if (user) {
              const showcase = await backend.shop.getShowcase(user.id);
              setAddedProducts(new Set(showcase.map(p => p.id)));
          }
      };
      load();
  }, []);

  const handleAdd = async (id: string) => {
      const user = backend.auth.getCurrentUser();
      if (!user) return;
      
      await backend.shop.addToShowcase(user.id, id);
      setAddedProducts(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
      });
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="absolute inset-0 z-[70] bg-gray-50 flex flex-col animate-slide-right text-black">
       <div className="p-4 bg-white border-b border-gray-100 pt-safe sticky top-0 z-10">
           <div className="flex items-center mb-4">
               <button onClick={onBack}><ChevronLeft size={24} /></button>
               <h1 className="flex-1 text-center font-bold text-lg">Product Marketplace</h1>
               <button><Filter size={20} /></button>
           </div>
           
           <div className="relative">
               <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
               <input 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-gray-100 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none"
                 placeholder="Search products to sell..."
               />
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4">
           <div className="flex flex-col gap-3">
               {filtered.map(product => (
                   <div key={product.id} className="bg-white p-3 rounded-xl flex gap-3 shadow-sm border border-gray-100">
                       <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                           <img src={product.image} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1 flex flex-col justify-between">
                           <div>
                               <h3 className="font-bold text-sm line-clamp-2 leading-tight mb-1">{product.name}</h3>
                               <p className="text-xs text-gray-500">Sold {formatNumber(product.soldCount)}</p>
                           </div>
                           <div className="flex items-end justify-between">
                               <div>
                                   <p className="text-red-500 font-bold text-xs">Earn ${product.commission}</p>
                                   <p className="text-xs text-gray-400">Price ${product.price}</p>
                               </div>
                               <button 
                                 onClick={() => handleAdd(product.id)}
                                 disabled={addedProducts.has(product.id)}
                                 className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${addedProducts.has(product.id) ? 'bg-gray-100 text-gray-500' : 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20'}`}
                               >
                                   {addedProducts.has(product.id) ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                               </button>
                           </div>
                       </div>
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};
