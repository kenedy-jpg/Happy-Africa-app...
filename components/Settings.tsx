
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, User, Lock, Moon, Share2, Info, LogOut, Trash2, Shield, Bell, Check, Eye, Globe, RefreshCw, Radio, CheckCircle2, AlertCircle, Terminal, Activity, Database, HardDrive, ShieldAlert, Copy, ExternalLink, Smartphone, Server } from 'lucide-react';
import { User as UserType } from '../types';
import { backend } from '../services/backend';
import { supabase } from '../services/supabaseClient';

interface SettingsProps {
  user: UserType;
  onBack: () => void;
  onLogout: () => void;
  isDataSaver: boolean;
  onToggleDataSaver: () => void;
}

const TABLES_TO_CHECK = [
    'messages', 'notifications', 'comments', 'profiles', 'videos', 'likes', 'follows'
];

const BUCKETS_TO_CHECK = ['videos', 'images'];

export const Settings: React.FC<SettingsProps> = ({ user, onBack, onLogout, isDataSaver, onToggleDataSaver }) => {
  const [cacheSize, setCacheSize] = useState('24MB');
  const [profileViewsEnabled, setProfileViewsEnabled] = useState(user.profileViewsEnabled !== false); 
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [logs, setLogs] = useState<{t: string, m: string, id: number}[]>([]);
  const [tableStatus, setTableStatus] = useState<Record<string, 'active' | 'waiting' | 'error'>>({});
  const [storageStatus, setStorageStatus] = useState<Record<string, 'public' | 'private' | 'missing' | 'checking'>>({});
  const [copied, setCopied] = useState(false);
  
  const siteUrl = window.location.origin;
  const isLocalhost = siteUrl.includes('localhost');

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addLog = (table: string, event: string) => {
      setLogs(prev => [{
          id: Date.now() + Math.random(),
          t: new Date().toLocaleTimeString(),
          m: `[SYNC] ${table.toUpperCase()} detected ${event}`
      }, ...prev].slice(0, 50));
  };

  useEffect(() => {
      if (showAnalysis) {
          const channels: any[] = [];
          
          TABLES_TO_CHECK.forEach(table => {
              const channel = supabase.channel(`ianalyze_${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
                    addLog(table, payload.eventType);
                })
                .subscribe((status) => {
                    setTableStatus(prev => ({ ...prev, [table]: status === 'SUBSCRIBED' ? 'active' : 'waiting' }));
                });
              channels.push(channel);
          });

          const checkStorage = async () => {
              for (const bucket of BUCKETS_TO_CHECK) {
                  setStorageStatus(prev => ({ ...prev, [bucket]: 'checking' }));
                  try {
                      const { data, error } = await supabase.storage.getBucket(bucket);
                      if (error) {
                          setStorageStatus(prev => ({ ...prev, [bucket]: 'missing' }));
                          addLog('STORAGE', `ERROR: Bucket '${bucket}' not found!`);
                      } else {
                          const status = data.public ? 'public' : 'private';
                          setStorageStatus(prev => ({ ...prev, [bucket]: status }));
                          addLog('STORAGE', `Bucket '${bucket}' is ONLINE (${status})`);
                      }
                  } catch (e) {
                      setStorageStatus(prev => ({ ...prev, [bucket]: 'missing' }));
                  }
              }
          };
          checkStorage();

          return () => {
              channels.forEach(ch => supabase.removeChannel(ch));
          };
      }
  }, [showAnalysis]);

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Manage account' },
        { icon: Lock, label: 'Privacy' },
        { icon: Shield, label: 'Security' },
      ]
    },
    {
      title: 'Content & Display',
      items: [
        { icon: Bell, label: 'Notifications' },
        { icon: Globe, label: 'Language' },
        { icon: Smartphone, label: 'Data Saver', toggle: true, active: isDataSaver, onToggle: onToggleDataSaver },
      ]
    }
  ];

  return (
    <div className="absolute inset-0 z-[50] bg-brand-indigo flex flex-col animate-slide-right">
      <div className="flex items-center justify-between p-4 border-b border-white/10 pt-safe bg-brand-indigo/95 backdrop-blur z-10 sticky top-0">
         <button onClick={onBack}><ChevronLeft size={24} className="text-white" /></button>
         <h2 className="font-bold text-white text-md">Settings and privacy</h2>
         <div className="w-6"></div>
      </div>

      <div className="flex-1 overflow-y-auto pb-safe">
         
         {/* SUPABASE CONFIG HELPER */}
         <div className="mx-4 mt-6 bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-blue-500/30 p-5 shadow-xl">
             <div className="flex items-center gap-2 mb-2">
                 <Database size={18} className="text-blue-400" />
                 <h3 className="font-black text-xs uppercase tracking-widest text-white">Supabase Configuration</h3>
             </div>
             
             {isLocalhost && (
                 <div className="flex items-center gap-2 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                     <Server size={14} className="text-blue-400 shrink-0" />
                     <span className="text-[9px] font-black text-blue-300 uppercase tracking-tighter">Local Development Detected</span>
                 </div>
             )}

             <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                 To fix "Unable to reach authentication service" or CORS errors, paste the URL below into your <b>Supabase Dashboard</b> under <b>Authentication > URL Configuration</b> as your <b>Site URL</b>.
             </p>
             
             <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between group">
                 <span className="text-[11px] font-mono text-blue-300 truncate mr-2">{siteUrl}</span>
                 <button 
                    onClick={handleCopyUrl}
                    className={`shrink-0 p-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                 >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                 </button>
             </div>

             <div className="mt-4 flex gap-2">
                 <a 
                    href="https://supabase.com/dashboard/project/_/auth/url-configuration" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 transition-colors"
                 >
                    Update Dashboard <ExternalLink size={12} />
                 </a>
             </div>
         </div>
         
         {/* iAnalyze PROBE SECTION */}
         <div className="mx-4 mt-6 bg-[#0c0c14] rounded-2xl border border-brand-pink/30 p-5 shadow-[0_0_20px_rgba(255,79,154,0.1)] overflow-hidden">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                     <Terminal size={18} className="text-brand-pink" />
                     <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white">iAnalyze Happy Africa</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">System Scan</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                 </div>
             </div>

             {!showAnalysis ? (
                 <button 
                    onClick={() => setShowAnalysis(true)}
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black tracking-widest text-brand-gold hover:bg-brand-pink/10 transition-all flex items-center justify-center gap-2"
                 >
                    <Activity size={14} /> ANALYZE DATA & STORAGE
                 </button>
             ) : (
                <div className="flex flex-col gap-3 animate-fade-in">
                    <div className="grid grid-cols-4 gap-1.5">
                        {TABLES_TO_CHECK.map(t => (
                            <div key={t} className={`flex flex-col items-center p-1.5 rounded-lg border ${tableStatus[t] === 'active' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                <span className="text-[7px] text-gray-400 uppercase font-black">{t}</span>
                                {tableStatus[t] === 'active' ? <CheckCircle2 size={10} className="text-green-500 mt-1" /> : <RefreshCw size={10} className="text-gray-600 animate-spin mt-1" />}
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive size={12} className="text-brand-gold" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Storage Buckets</span>
                        </div>
                        <div className="flex gap-4">
                            {BUCKETS_TO_CHECK.map(b => (
                                <div key={b} className="flex flex-1 items-center justify-between bg-black/40 px-3 py-2 rounded-lg">
                                    <span className="text-[10px] font-bold text-gray-300 capitalize">{b}</span>
                                    {storageStatus[b] === 'public' ? (
                                        <div className="flex items-center gap-1 text-[9px] text-green-400 font-bold"><Check size={10}/> Public</div>
                                    ) : storageStatus[b] === 'private' ? (
                                        <div className="flex items-center gap-1 text-[9px] text-orange-400 font-bold"><Lock size={10}/> Private</div>
                                    ) : storageStatus[b] === 'missing' ? (
                                        <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold"><ShieldAlert size={10}/> Missing</div>
                                    ) : <RefreshCw size={10} className="animate-spin text-gray-600" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/60 rounded-xl p-3 h-32 overflow-y-auto no-scrollbar border border-white/5 font-mono">
                        {logs.length === 0 && <p className="text-[10px] text-gray-600 animate-pulse">Scanning infrastructure...</p>}
                        {logs.map(log => (
                            <div key={log.id} className="text-[9px] mb-1 flex gap-2">
                                <span className="text-brand-pink/60 shrink-0">{log.t}</span>
                                <span className="text-green-400 break-all">{log.m}</span>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => { setShowAnalysis(false); setLogs([]); setStorageStatus({}); }}
                        className="text-[9px] font-bold text-gray-500 uppercase hover:text-white"
                    >
                        Reset Console
                    </button>
                </div>
             )}
         </div>

         {sections.map((section, idx) => (
            <div key={idx} className="mb-6">
               <h3 className="text-xs font-bold text-gray-500 uppercase px-4 mb-2 mt-4">{section.title}</h3>
               <div className="flex flex-col">
                  {section.items.map((item, i) => (
                     <div 
                        key={i} 
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors"
                        onClick={() => item.onToggle && item.onToggle()}
                     >
                        <item.icon size={20} className="text-gray-400" />
                        <span className="flex-1 text-sm font-medium text-white">{item.label}</span>
                        {item.toggle ? (
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${item.active ? 'bg-brand-pink' : 'bg-gray-600'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'right-0.5' : 'left-0.5'}`}></div>
                            </div>
                        ) : (
                            <ChevronLeft size={16} className="text-gray-600 rotate-180" />
                        )}
                     </div>
                  ))}
               </div>
            </div>
         ))}

         <div className="px-4 mt-8 mb-12">
            <button onClick={onLogout} className="w-full py-3 bg-white/10 text-white font-bold rounded-sm text-sm hover:bg-white/20 flex items-center justify-center gap-2">
               <LogOut size={16} /> Log out
            </button>
            <p className="text-center text-[10px] text-gray-600 mt-4">Happy Africa iAnalyze v2.1.0</p>
         </div>
      </div>
    </div>
  );
};
