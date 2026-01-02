
import React, { useState } from 'react';
import { ChevronLeft, Share2, ShoppingCart, Star, MessageCircle, Store, ChevronRight, Check, Loader } from 'lucide-react';
import { Product } from '../types';
import { formatNumber } from '../constants';
import { backend } from '../services/backend';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack }) => {
  const [selectedSku, setSelectedSku] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuy = async () => {
      setIsProcessing(true);
      const user = backend.auth.getCurrentUser();
      
      if (user) {
          try {
              // Real backend call
              await backend.shop.placeOrder(user.id, product.id);
              setShowCheckout(true);
          } catch (e) {
              console.error("Order failed", e);
              alert("Failed to place order. Please try again.");
          }
      } else {
          // If not logged in, prompt (in a real app this would trigger auth modal)
          alert("Please log in to purchase.");
      }
      setIsProcessing(false);
  };

  if (showCheckout) {
      return (
          <div className="absolute inset-0 z-[80] bg-white flex flex-col animate-slide-up">
              <div className="p-4 border-b flex items-center pt-safe">
                  <button onClick={() => setShowCheckout(false)}><ChevronLeft /></button>
                  <h2 className="flex-1 text-center font-bold">Order Summary</h2>
                  <div className="w-6"></div>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                      <Check size={40} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold">Order Placed!</h3>
                  <p className="text-gray-500 text-center text-sm px-8">
                      Thank you for shopping with Happy Africa. Your {product.name} is on the way!
                  </p>
                  <button onClick={onBack} className="bg-brand-pink text-white px-8 py-3 rounded-full font-bold">
                      Continue Shopping
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="absolute inset-0 z-[70] bg-gray-50 flex flex-col animate-slide-right text-black pb-safe">
       {/* Transparent Header */}
       <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 pt-safe">
           <button onClick={onBack} className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md">
               <ChevronLeft size={24} />
           </button>
           <div className="flex gap-2">
               <button className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md">
                   <Share2 size={20} />
               </button>
               <button className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md">
                   <ShoppingCart size={20} />
               </button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto pb-20">
           {/* Image Gallery */}
           <div className="aspect-square bg-white relative">
               <img src={product.image} className="w-full h-full object-cover" />
               <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                   1/5
               </div>
           </div>

           {/* Price Info */}
           <div className="bg-white p-4 mb-2">
               <div className="flex items-end gap-2 mb-2">
                   <span className="text-2xl font-bold text-brand-pink">${product.price}</span>
                   {product.originalPrice && (
                       <span className="text-sm text-gray-400 line-through mb-1">${product.originalPrice}</span>
                   )}
                   <span className="bg-brand-pink/10 text-brand-pink text-[10px] font-bold px-1.5 py-0.5 rounded mb-1.5">
                       Free Shipping
                   </span>
               </div>
               <h1 className="text-base font-medium leading-snug mb-3">{product.name}</h1>
               <div className="flex items-center gap-4 text-xs text-gray-500">
                   <div className="flex items-center gap-1">
                       <Star size={12} className="fill-yellow-400 text-yellow-400" />
                       <span className="text-black font-bold">{product.rating}</span>
                       <span>(1.2k reviews)</span>
                   </div>
                   <span>{formatNumber(product.soldCount)} sold</span>
               </div>
           </div>

           {/* Coupon */}
           <div className="bg-white px-4 py-3 mb-2 flex justify-between items-center">
               <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-brand-pink">Coupons</span>
                   <span className="bg-red-50 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-100">Save $2.00</span>
               </div>
               <ChevronRight size={16} className="text-gray-400" />
           </div>

           {/* Shop Info */}
           <div className="bg-white p-4 mb-2 flex items-center gap-3">
               <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                   <Store size={24} className="text-gray-500" />
               </div>
               <div className="flex-1">
                   <h4 className="font-bold text-sm">Happy Store Official</h4>
                   <p className="text-xs text-gray-500">98% Positive Feedback</p>
               </div>
               <button className="border border-brand-pink text-brand-pink text-xs font-bold px-4 py-1.5 rounded-full">
                   Visit
               </button>
           </div>

           {/* Description */}
           <div className="bg-white p-4 mb-2">
               <h3 className="font-bold text-sm mb-2">Description</h3>
               <p className="text-sm text-gray-600 leading-relaxed">
                   {product.description} <br/><br/>
                   High quality material, authentic design inspired by African heritage. Durable and stylish.
               </p>
           </div>
       </div>

       {/* Bottom Actions */}
       <div className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-2 pb-safe flex items-center gap-2 z-20 md:absolute">
           <div className="flex flex-col items-center px-4 gap-1 text-gray-500">
               <Store size={20} />
               <span className="text-[10px]">Shop</span>
           </div>
           <div className="flex flex-col items-center px-4 gap-1 text-gray-500 border-l border-gray-100">
               <MessageCircle size={20} />
               <span className="text-[10px]">Chat</span>
           </div>
           <button 
             className="flex-1 bg-white border-2 border-brand-pink text-brand-pink font-bold py-3 rounded-full text-sm hover:bg-brand-pink/5"
             onClick={handleBuy}
             disabled={isProcessing}
           >
               Add to Cart
           </button>
           <button 
             className="flex-1 bg-brand-pink text-white font-bold py-3 rounded-full text-sm flex items-center justify-center gap-2 disabled:opacity-70"
             onClick={handleBuy}
             disabled={isProcessing}
           >
               {isProcessing && <Loader size={16} className="animate-spin" />}
               Buy Now
           </button>
       </div>
    </div>
  );
};