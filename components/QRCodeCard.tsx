
import React, { useRef } from 'react';
import { User } from '../types';
import { X, Download, Share2, Scan } from 'lucide-react';

interface QRCodeCardProps {
  user: User;
  onClose: () => void;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ user, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // 1. Create a high-res canvas
    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 800;
    const scale = 2; // Retina quality
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.scale(scale, scale);

        // 2. Draw Background Gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#FF4F9A'); // Pink
        gradient.addColorStop(1, '#FFD700'); // Gold
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 3. Draw Card Rect
        ctx.fillStyle = '#FFFFFF';
        ctx.roundRect(40, 60, width - 80, height - 120, 30);
        ctx.fill();
        
        // 4. Draw Avatar (Placeholder Circle if image cross-origin fails without proxy)
        // Note: Real `user.avatarUrl` might need CORS proxy or base64 to drawImage properly.
        // We will draw a stylistic placeholder for robustness in this demo environment.
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, 160, 60, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Try to draw actual image if possible (might fail CORS locally)
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = user.avatarUrl;
        
        // Fallback or Image logic
        ctx.fillStyle = '#1A0B2E'; 
        ctx.fillRect(width/2 - 60, 100, 120, 120);
        
        // Simple User Initial as fallback
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(user.username.charAt(0).toUpperCase(), width / 2, 160);
        
        ctx.restore();

        // 5. Draw Avatar Border
        ctx.beginPath();
        ctx.arc(width / 2, 160, 60, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        // 6. Draw Text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`@${user.username}`, width / 2, 260);
        
        ctx.fillStyle = '#666666';
        ctx.font = '18px Arial';
        ctx.fillText(`Happy Africa`, width / 2, 290);

        // 7. Draw QR Code Placeholder (Central Box)
        // Background for QR
        ctx.fillStyle = '#F5F5F5';
        ctx.roundRect(width/2 - 120, 340, 240, 240, 20);
        ctx.fill();
        
        // "QR Data" Blocks simulation
        ctx.fillStyle = '#000000';
        // Corners
        ctx.fillRect(width/2 - 100, 360, 60, 60);
        ctx.fillRect(width/2 + 40, 360, 60, 60);
        ctx.fillRect(width/2 - 100, 500, 60, 60);
        // Random center bits
        for(let i=0; i<30; i++) {
            const rx = (width/2 - 100) + Math.random() * 200;
            const ry = 360 + Math.random() * 200;
            ctx.fillRect(rx, ry, 15, 15);
        }
        
        // Logo in Center of QR
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(width/2, 460, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#FF4F9A';
        ctx.font = '20px Arial';
        ctx.fillText("🌍", width/2, 466);

        // 8. Bottom text
        ctx.fillStyle = '#999999';
        ctx.font = '16px Arial';
        ctx.fillText("Scan to follow me", width / 2, 620);
        
        // 9. Trigger Download
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `tikcode-${user.username}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error("Canvas export failed (likely CORS)", e);
            alert("Could not generate image due to browser security restrictions on the avatar image.");
        }
    }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-brand-indigo flex flex-col animate-slide-up">
       <div className="flex justify-between items-center p-4 pt-safe">
          <button onClick={onClose}><X className="text-white" size={28} /></button>
          <h2 className="font-bold text-white">TikCode</h2>
          <button><Scan className="text-white" size={24} /></button>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center p-8">
           {/* Card Container */}
           <div 
             ref={cardRef}
             className="w-full max-w-[300px] bg-gradient-to-br from-brand-pink via-brand-orange to-brand-gold rounded-3xl p-1 shadow-2xl relative overflow-hidden transform transition-transform hover:scale-105"
           >
              <div className="bg-white rounded-[20px] flex flex-col items-center p-8 relative overflow-hidden h-[420px]">
                 
                 {/* Decorative background circles */}
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl"></div>
                 <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-pink/10 rounded-full blur-2xl"></div>

                 {/* Avatar */}
                 <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-brand-pink to-brand-gold mb-3 z-10">
                    <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover border-2 border-white" />
                 </div>
                 
                 <h3 className="font-bold text-black text-xl mb-1 z-10">@{user.username}</h3>
                 <p className="text-gray-500 text-xs mb-6 z-10">Happy Africa</p>

                 {/* Simulated QR Code */}
                 <div className="w-48 h-48 relative mb-2 bg-gray-50 rounded-lg p-2 flex items-center justify-center">
                    <div className="absolute top-2 left-2 w-10 h-10 border-4 border-black rounded-lg bg-transparent z-10">
                        <div className="absolute inset-2 bg-black rounded-sm"></div>
                    </div>
                    <div className="absolute top-2 right-2 w-10 h-10 border-4 border-black rounded-lg bg-transparent z-10">
                        <div className="absolute inset-2 bg-black rounded-sm"></div>
                    </div>
                    <div className="absolute bottom-2 left-2 w-10 h-10 border-4 border-black rounded-lg bg-transparent z-10">
                        <div className="absolute inset-2 bg-black rounded-sm"></div>
                    </div>
                    
                    {/* Random Pattern Simulation */}
                    <div className="w-full h-full opacity-80" style={{backgroundImage: 'radial-gradient(black 40%, transparent 41%)', backgroundSize: '12px 12px'}}></div>
                    
                    {/* Logo Center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <span className="text-2xl">🌍</span>
                       </div>
                    </div>
                 </div>

                 <p className="text-[10px] text-gray-400 mt-4 font-medium uppercase tracking-wide">Scan to follow me</p>
              </div>
           </div>
           
           <p className="text-gray-400 text-sm mt-8 text-center max-w-xs px-6">
              Show this code to a friend so they can scan it and follow you instantly!
           </p>
       </div>

       <div className="p-8 pb-safe flex justify-center gap-12">
           <div onClick={handleDownload} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group">
               <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-brand-pink transition-colors">
                  <Download size={24} />
               </div>
               <span className="text-xs text-gray-300 font-medium">Save Image</span>
           </div>
           <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group">
               <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-brand-gold group-hover:text-black transition-colors">
                  <Share2 size={24} />
               </div>
               <span className="text-xs text-gray-300 font-medium">Share Link</span>
           </div>
       </div>
    </div>
  );
};
