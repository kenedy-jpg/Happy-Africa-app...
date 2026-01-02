
import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, User as UserIcon, Loader } from 'lucide-react';
import { User } from '../types';
import { backend } from '../services/backend';

interface EditProfileProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({ user, onSave, onCancel }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedFile(file);
          // Show preview
          const newUrl = URL.createObjectURL(file);
          setAvatarUrl(newUrl);
      }
  };

  const handleSave = async () => {
    setIsUploading(true);
    let finalAvatarUrl = avatarUrl;

    if (selectedFile) {
        try {
            finalAvatarUrl = await backend.content.uploadImage(selectedFile, 'images');
        } catch (e) {
            console.error("Failed to upload avatar", e);
            // Fallback to current if upload fails, or show error logic
        }
    }

    onSave({
        ...user,
        displayName,
        username,
        bio,
        avatarUrl: finalAvatarUrl
    });
    setIsUploading(false);
  };

  return (
    <div className="absolute inset-0 z-[50] bg-brand-indigo flex flex-col animate-slide-up">
       <div className="flex justify-between items-center p-4 border-b border-white/10 pt-safe">
          <button onClick={onCancel} className="text-white text-sm font-medium">Cancel</button>
          <h2 className="text-white font-bold">Edit Profile</h2>
          <button onClick={handleSave} disabled={isUploading} className="text-brand-pink font-bold text-sm disabled:opacity-50 flex items-center gap-1">
              {isUploading && <Loader size={12} className="animate-spin" />}
              Save
          </button>
       </div>

       <div className="flex-1 overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex flex-col items-center py-8">
              <div 
                className="relative cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
              >
                  <img src={avatarUrl} className="w-24 h-24 rounded-full border border-white/10 object-cover" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <Camera size={24} className="text-white" />
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
              </div>
              <span className="text-xs text-brand-pink font-medium mt-3">Change photo</span>
          </div>

          {/* Form Fields */}
          <div className="px-4 flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                 <label className="text-xs text-gray-400 font-medium">About you</label>
                 
                 <div className="flex justify-between items-center py-3 border-b border-white/10 group">
                    <span className="text-sm font-medium w-24">Name</span>
                    <input 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-transparent text-white text-sm outline-none flex-1 text-right placeholder-gray-600"
                      placeholder="Name"
                    />
                 </div>
                 
                 <div className="flex justify-between items-center py-3 border-b border-white/10 group">
                    <span className="text-sm font-medium w-24">Username</span>
                    <input 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-transparent text-white text-sm outline-none flex-1 text-right placeholder-gray-600"
                      placeholder="Username"
                    />
                 </div>
                 
                 <div className="flex justify-between items-start py-3 border-b border-white/10 group">
                    <span className="text-sm font-medium w-24 pt-1">Bio</span>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="bg-transparent text-white text-sm outline-none flex-1 text-right placeholder-gray-600 resize-none h-20"
                      placeholder="Add a bio to your profile"
                      maxLength={80}
                    />
                 </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                 <label className="text-xs text-gray-400 font-medium">Social</label>
                 
                 {['Instagram', 'YouTube'].map(social => (
                     <div key={social} className="flex justify-between items-center py-3 border-b border-white/10 active:bg-white/5 transition-colors cursor-pointer">
                        <span className="text-sm font-medium">{social}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                           Add {social} <ChevronLeft size={14} className="rotate-180" />
                        </span>
                     </div>
                 ))}
              </div>

          </div>
       </div>
    </div>
  );
};
