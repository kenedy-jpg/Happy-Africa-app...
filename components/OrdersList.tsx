
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Package, Clock, CheckCircle, Truck, MapPin, Box, X } from 'lucide-react';
import { backend } from '../services/backend';

interface OrdersListProps {
  onBack: () => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
      const fetchOrders = async () => {
          setIsLoading(true);
          const user = backend.auth.getCurrentUser();
          if (user) {
              try {
                  const data = await backend.shop.getOrders(user.id);
                  setOrders(data);
              } catch (e) {
                  console.error(e);
              }
          }
          setIsLoading(false);
      };
      fetchOrders();
  }, []);

  const TrackingStep = ({ active, label, date, icon: Icon, isLast }: any) => (
      <div className="flex gap-4">
          <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${active ? 'bg-brand-pink text-white' : 'bg-gray-200 text-gray-400'}`}>
                  <Icon size={16} />
              </div>
              {!isLast && <div className={`w-0.5 flex-1 my-1 ${active ? 'bg-brand-pink' : 'bg-gray-200'}`}></div>}
          </div>
          <div className="pb-8">
              <p className={`font-bold text-sm ${active ? 'text-black' : 'text-gray-400'}`}>{label}</p>
              {date && <p className="text-xs text-gray-500">{date}</p>}
          </div>
      </div>
  );

  return (
    <div className="absolute inset-0 z-[60] bg-gray-50 flex flex-col animate-slide-right text-black">
        <div className="p-4 bg-white shadow-sm flex items-center pt-safe sticky top-0 z-10">
            <button onClick={onBack}><ChevronLeft size={24} /></button>
            <h2 className="flex-1 text-center font-bold text-lg">My Orders</h2>
            <div className="w-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
                <div className="text-center py-10 text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
                    <Package size={48} strokeWidth={1} />
                    <p className="text-sm font-medium">No orders yet</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {orders.map((order) => (
                        <div 
                            key={order.id} 
                            onClick={() => setSelectedOrder(order)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
                                <span className="text-xs text-gray-500">Order #{order.id.toString().slice(0,8)}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    order.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                                    order.status === 'shipped' ? 'bg-blue-100 text-blue-600' :
                                    'bg-orange-100 text-orange-600'
                                }`}>
                                    {order.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0">
                                    <img src={order.product?.image} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm line-clamp-2 mb-1">{order.product?.name}</h4>
                                    <p className="text-brand-pink font-bold text-sm">${order.product?.price}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                {order.status === 'delivered' ? <CheckCircle size={14} className="text-green-500" /> : <Clock size={14} />}
                                <span>{order.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Detailed Tracking Sheet */}
        {selectedOrder && (
            <div className="absolute inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                <div 
                    className="absolute bottom-0 w-full h-[80%] bg-white rounded-t-2xl flex flex-col animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Track Order</h3>
                        <button onClick={() => setSelectedOrder(null)}><X size={20} className="text-gray-500" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex gap-4 mb-8 bg-gray-50 p-4 rounded-xl">
                            <img src={selectedOrder.product?.image} className="w-16 h-16 rounded-lg object-cover" />
                            <div>
                                <p className="font-bold text-sm line-clamp-1">{selectedOrder.product?.name}</p>
                                <p className="text-xs text-gray-500 mb-1">Qty: 1</p>
                                <p className="font-bold text-brand-pink">${selectedOrder.product?.price}</p>
                            </div>
                        </div>

                        <h4 className="font-bold text-sm mb-6 uppercase tracking-wide text-gray-400">Timeline</h4>
                        
                        <div className="flex flex-col">
                            <TrackingStep 
                                active={true} 
                                label="Order Placed" 
                                date={selectedOrder.date} 
                                icon={Box} 
                            />
                            <TrackingStep 
                                active={selectedOrder.status !== 'pending'} 
                                label="Processing" 
                                date={selectedOrder.status !== 'pending' ? 'Oct 25, 2:30 PM' : null} 
                                icon={Package} 
                            />
                            <TrackingStep 
                                active={selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered'} 
                                label="Shipped" 
                                date={selectedOrder.status === 'shipped' ? 'Oct 26, 9:00 AM' : null} 
                                icon={Truck} 
                            />
                            <TrackingStep 
                                active={selectedOrder.status === 'delivered'} 
                                label="Delivered" 
                                date={selectedOrder.status === 'delivered' ? 'Oct 28, 4:15 PM' : null} 
                                icon={MapPin} 
                                isLast
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
