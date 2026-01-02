import React, { useState, useEffect } from 'react';
import { ChevronLeft, Coins, CreditCard, Check, Loader, Smartphone, X, Lock, History, AlertCircle } from 'lucide-react';
import { backend } from '../services/backend';

interface WalletProps {
  currentBalance: number;
  onClose: () => void;
  onBuy: (amount: number, cost: string) => void;
}

const PACKAGES = [
  { coins: 5, cost: '$0.09' },
  { coins: 70, cost: '$0.99', popular: true },
  { coins: 350, cost: '$4.99' },
  { coins: 700, cost: '$9.99' },
  { coins: 1400, cost: '$19.99' },
  { coins: 3500, cost: '$49.99' },
  { coins: 7000, cost: '$99.99' },
];

export const Wallet: React.FC<WalletProps> = ({ currentBalance, onClose, onBuy }) => {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null); // Index
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');
  
  // Transaction History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
      if (activeTab === 'history') {
          fetchHistory();
      }
  }, [activeTab]);

  const fetchHistory = async () => {
      setLoadingHistory(true);
      const user = backend.auth.getCurrentUser();
      if (user) {
          const txs = await backend.wallet.getTransactions(user.id);
          setHistory(txs);
      }
      setLoadingHistory(false);
  };

  const initiateBuy = (idx: number) => {
      setSelectedPackage(idx);
      setShowPaymentSheet(true);
  };

  const processPayment = (method: 'mpesa' | 'card') => {
      setProcessingState('processing');
      
      // Simulate robust transaction verification with random failure chance for testing
      setTimeout(() => {
          if (Math.random() > 0.95) {
              setProcessingState('failed');
          } else {
              setProcessingState('success');
              if (selectedPackage !== null) {
                  const pkg = PACKAGES[selectedPackage];
                  onBuy(pkg.coins, pkg.cost);
              }
              // Close after success
              setTimeout(() => {
                  setProcessingState('idle');
                  setShowPaymentSheet(false);
                  setSelectedPackage(null);
                  if (activeTab === 'history') fetchHistory(); // Refresh history
              }, 1500);
          }
      }, 2500); // Realistic transaction delay
  };

  return (
    <div className="absolute inset-0 z-[60] bg-brand-dark text-white flex flex-col animate-slide-right">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-white/10 bg-brand-dark sticky top-0 z-10">
        <button onClick={onClose}><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center font-bold text-lg">My Wallet</h1>
        <button onClick={() => setActiveTab(activeTab === 'recharge' ? 'history' : 'recharge')}>
            {activeTab === 'recharge' ? <History size={20} /> : <Coins size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Balance Card */}
        <div className="bg-brand-indigo p-6 flex flex-col items-center justify-center gap-2 m-4 rounded-xl shadow-lg border border-white/5 relative overflow-hidden transition-all duration-300">
           <div className="absolute inset-0 bg-gradient-to-br from-brand-indigo via-brand-purple/20 to-brand-pink/10 opacity-50"></div>
           <span className="text-gray-400 text-sm font-medium z-10">Total Balance</span>
           <div className="flex items-center gap-2 z-10">
              <Coins size={28} className="text-brand-gold fill-brand-gold animate-pulse-slow" />
              <span className="text-4xl font-bold tracking-tight">{currentBalance.toLocaleString()}</span>
           </div>
        </div>

        {activeTab === 'recharge' ? (
            <div className="px-4 py-2 pb-24 animate-fade-in">
               <h2 className="font-bold mb-4 text-sm text-brand-pink uppercase tracking-wide">Coins Packages</h2>
               <div className="flex flex-col gap-2">
                  {PACKAGES.map((pkg, idx) => (
                     <button 
                       key={idx}
                       onClick={() => initiateBuy(idx)}
                       className="flex justify-between items-center p-4 border border-white/10 bg-white/5 rounded-lg active:bg-white/10 transition-all hover:border-brand-pink/50"
                     >
                        <div className="flex items-center gap-3">
                           <Coins size={20} className="text-brand-gold fill-brand-gold" />
                           <span className="font-bold text-lg">{pkg.coins.toLocaleString()}</span>
                           {pkg.popular && (
                              <span className="bg-brand-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg shadow-brand-pink/50">POPULAR</span>
                           )}
                        </div>
                        <div className="bg-brand-pink text-white hover:brightness-110 px-4 py-1.5 rounded font-bold text-sm min-w-[80px] flex items-center justify-center transition-all shadow-md">
                           {pkg.cost}
                        </div>
                     </button>
                  ))}
               </div>
               <div className="px-4 pb-8 text-center text-[10px] text-gray-500 leading-relaxed mt-6">
                  Transactions are secure and encrypted. <br/>
                  By recharging, you agree to our Terms of Use.
               </div>
            </div>
        ) : (
            <div className="px-4 pb-24 animate-fade-in">
                <h2 className="font-bold mb-4 text-sm text-gray-400 uppercase tracking-wide">Transaction History</h2>
                {loadingHistory ? (
                    <div className="flex justify-center py-10"><Loader className="animate-spin text-white" /></div>
                ) : history.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">No transactions found.</div>
                ) : (
                    <div className="flex flex-col gap-0">
                        {history.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center py-4 border-b border-white/5">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-white">{tx.type}</span>
                                    <span className="text-xs text-gray-500">{tx.date}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`font-bold text-sm ${tx.amount.startsWith('+') ? 'text-green-500' : 'text-white'}`}>
                                        {tx.amount}
                                    </span>
                                    <span className="text-[10px] text-gray-500">{tx.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* PAYMENT SHEET OVERLAY */}
      {showPaymentSheet && selectedPackage !== null && (
          <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => { if(processingState !== 'processing') setShowPaymentSheet(false); }}>
              <div 
                className="absolute bottom-0 w-full bg-gray-900 rounded-t-2xl p-6 pb-safe animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                 {processingState === 'processing' ? (
                     <div className="flex flex-col items-center justify-center py-10 gap-4">
                         <div className="relative">
                            <div className="w-16 h-16 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Lock size={20} className="text-brand-pink" />
                            </div>
                         </div>
                         <p className="text-white font-bold">Secure Payment Processing...</p>
                         <p className="text-gray-500 text-xs">Connecting to payment gateway</p>
                     </div>
                 ) : processingState === 'success' ? (
                     <div className="flex flex-col items-center justify-center py-10 gap-4">
                         <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                             <Check size={32} className="text-white" />
                         </div>
                         <p className="text-white font-bold text-xl">Payment Successful!</p>
                         <p className="text-gray-400 text-sm">Coins have been added to your wallet.</p>
                     </div>
                 ) : processingState === 'failed' ? (
                     <div className="flex flex-col items-center justify-center py-10 gap-4">
                         <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                             <X size={32} className="text-white" />
                         </div>
                         <p className="text-white font-bold text-xl">Transaction Failed</p>
                         <p className="text-gray-400 text-sm text-center">Your card was not charged. <br/>Please try again or contact support.</p>
                         <button 
                            onClick={() => setProcessingState('idle')}
                            className="bg-white/10 px-6 py-2 rounded-full font-bold text-sm mt-2"
                         >
                            Try Again
                         </button>
                     </div>
                 ) : (
                     <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white">Payment Method</h2>
                            <button onClick={() => setShowPaymentSheet(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        
                        <div className="mb-6 bg-white/5 rounded-lg p-4 flex justify-between items-center border border-white/5">
                            <div className="flex items-center gap-3">
                                <Coins className="text-brand-gold" />
                                <div>
                                    <p className="font-bold text-white">{PACKAGES[selectedPackage].coins} Coins</p>
                                    <p className="text-xs text-gray-400">Total to pay</p>
                                </div>
                            </div>
                            <span className="font-bold text-xl text-white">{PACKAGES[selectedPackage].cost}</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => processPayment('mpesa')}
                                className="flex items-center gap-4 p-4 bg-white rounded-lg active:scale-[0.98] transition-transform hover:bg-gray-100"
                            >
                                <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center shrink-0 shadow-sm">
                                    <Smartphone className="text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-black font-bold">M-Pesa</p>
                                    <p className="text-gray-500 text-xs">Mobile Money</p>
                                </div>
                                <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                            </button>

                            <button 
                                onClick={() => processPayment('card')}
                                className="flex items-center gap-4 p-4 bg-white rounded-lg active:scale-[0.98] transition-transform hover:bg-gray-100"
                            >
                                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center shrink-0 shadow-sm">
                                    <CreditCard className="text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-black font-bold">Credit / Debit Card</p>
                                    <p className="text-gray-500 text-xs">Visa, Mastercard, Amex</p>
                                </div>
                                <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                            </button>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs bg-black/20 p-2 rounded">
                            <Lock size={10} />
                            <span>100% Secured by HappyPay Encryption</span>
                        </div>
                     </>
                 )}
              </div>
          </div>
      )}
    </div>
  );
};