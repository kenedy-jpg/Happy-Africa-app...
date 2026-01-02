
import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, ShoppingCart, Truck, CreditCard, ChevronRight, Star, ChevronLeft, Loader } from 'lucide-react';
import { formatNumber } from '../constants';
import { Product, PageRoute } from '../types';
import { backend } from '../services/backend';

interface ShopProps {
  onNavigate: (route: PageRoute) => void;
  onBack?: () => void;
}

const CATEGORIES = ['All', 'Beauty', 'Womens', 'Electronics', 'Mens', 'Home', 'Kids', 'Sports'];

export const Shop: React.FC<ShopProps> = ({ onNavigate, onBack }) => {
  const [activeCat, setActiveCat] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchProducts = async () => {
          setIsLoading(true);
          try {
              const items = await backend.shop.getProducts();
              setProducts(items);
          } catch (e) {
              console.error(e);
          } finally {
              setIsLoading(false);
          }
      };
      fetchProducts();
  }, []);

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col text-black pt-safe">
      {/* Header */}
      <div className="px-4 py-3 bg-white sticky top-0 z-20 shadow-sm">
         <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                 {onBack && (
                     <button onClick={onBack} className="p-1 -ml-2 rounded-full hover:bg-gray-100">
                         <ChevronLeft size={24} className="text-black" />
                     </button>
                 )}
                 <h1 className="text-lg font-bold flex items-center gap-1">
                     Happy Shop <ShoppingBag size={18} className="text-brand-pink" />
                 </h1>
             </div>
             <div className="flex gap-4">
                 <button className="flex items-center gap-1 bg-brand-pink text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg shadow-brand-pink/20" onClick={() => onNavigate({ name: 'orders' })}>
                     <ShoppingCart size={14} className="text-white" /> Orders
                 </button>
             </div>
         </div>
         
         <div className="relative">
             <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input 
               placeholder="Search products..." 
               className="w-full bg-gray-100 py-2 pl-10 pr-4 rounded-lg text-sm outline-none focus:ring-2 ring-brand-pink/20"
             />
         </div>
      </div>

      {/* Categories */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
          <div className="flex px-4">
              {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeCat === cat ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500'}`}
                  >
                      {cat}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
          {/* Flash Sale Banner */}
          <div className="m-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                  <span className="bg-white text-red-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Flash Sale</span>
                  <h2 className="text-xl font-bold mt-2">Up to 70% Off</h2>
                  <p className="text-xs opacity-90 mb-3">Ends in 02:14:55</p>
                  <button className="bg-brand-pink text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">Shop Now</button>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-20 transform rotate-12">
                  <ShoppingBag size={120} />
              </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-4 gap-2 px-4 mb-6">
              {[
                  { l: 'Free Ship', i: Truck, c: 'bg-green-100 text-green-600' },
                  { l: 'Coupons', i: CreditCard, c: 'bg-orange-100 text-orange-600' },
                  { l: 'New', i: Star, c: 'bg-blue-100 text-blue-600' },
                  { l: 'Categories', i: ChevronRight, c: 'bg-gray-100 text-gray-600' },
              ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded-full ${item.c} flex items-center justify-center`}>
                          <item.i size={20} />
                      </div>
                      <span className="text-[10px] font-medium text-gray-600">{item.l}</span>
                  </div>
              ))}
          </div>

          {/* Product Grid */}
          <div className="px-4">
              <h3 className="font-bold text-base mb-3">Recommended for You</h3>
              
              {isLoading ? (
                  <div className="flex justify-center py-10">
                      <Loader className="animate-spin text-brand-pink" />
                  </div>
              ) : products.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">No products found.</div>
              ) : (
                  <div className="grid grid-cols-2 gap-3">
                      {products.map(product => (
                          <div 
                            key={product.id} 
                            className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => onNavigate({ name: 'product-detail', product })}
                          >
                              <div className="aspect-square relative bg-gray-200">
                                  <img src={product.image} className="w-full h-full object-cover" />
                                  {product.originalPrice && (
                                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                          -{Math.round((1 - product.price/product.originalPrice) * 100)}%
                                      </div>
                                  )}
                              </div>
                              <div className="p-2">
                                  <h4 className="text-xs font-medium line-clamp-2 h-8 leading-tight mb-1">{product.name}</h4>
                                  <div className="flex items-center gap-1 mb-1">
                                      <span className="text-sm font-bold text-brand-pink">${product.price}</span>
                                      {product.originalPrice && (
                                          <span className="text-[10px] text-gray-400 line-through">${product.originalPrice}</span>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                      <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                      <span>{product.rating}</span>
                                      <span>•</span>
                                      <span>{formatNumber(product.soldCount)} sold</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};