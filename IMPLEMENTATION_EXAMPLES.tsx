/**
 * QUICK IMPLEMENTATION EXAMPLE
 * Copy and paste this into your app to get started quickly
 */

import React, { useState } from 'react';
import { uploadVideoAndCreatePost } from '../services/postUploadService';
import { PostsFeed } from '../components/PostsFeed';

/**
 * Example: Simple Upload Form
 */
export function SimpleUploadExample() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid video file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Get current user ID from your auth system
      const userId = 'your-user-id'; // Replace with actual user ID from auth

      const result = await uploadVideoAndCreatePost(file, {
        userId,
        description: 'Check out my video!',
        category: 'comedy',
        visibility: 'public',
        onProgress: (progress) => {
          setProgress(Math.round(progress));
        }
      });

      if (result.success) {
        alert('Video uploaded successfully!');
        setFile(null);
        setProgress(0);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upload Video</h2>
      
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="mb-4"
      />

      {file && (
        <div className="mb-4">
          <p>Selected: {file.name}</p>
          <p>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      )}

      {uploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-2">{progress}% uploaded</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload Video'}
      </button>
    </div>
  );
}

/**
 * Example: Integrated Upload + Feed
 */
export function IntegratedExample() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      {/* Upload Button */}
      <button
        onClick={() => setShowUpload(!showUpload)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center shadow-lg z-50"
      >
        <span className="text-white text-2xl">+</span>
      </button>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <SimpleUploadExample />
            <button
              onClick={() => setShowUpload(false)}
              className="mt-4 text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <PostsFeed
        onVideoClick={(url, post) => {
          console.log('Playing video:', url);
          // Open video player
        }}
      />
    </div>
  );
}

/**
 * Example: With User Authentication
 */
export function AuthenticatedUploadExample() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get user from your auth context/provider
  const getCurrentUserId = () => {
    // Example with Supabase Auth
    // const { data: { user } } = await supabase.auth.getUser();
    // return user?.id;
    
    // For now, return a placeholder
    return 'user-id-from-auth';
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const userId = getCurrentUserId();

      if (!userId) {
        alert('Please log in first');
        return;
      }

      const result = await uploadVideoAndCreatePost(file, {
        userId,
        description,
        category: 'comedy',
        visibility: 'public',
        onProgress: setProgress
      });

      if (result.success) {
        alert('Posted!');
        setFile(null);
        setDescription('');
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Create Post</h2>

      {/* File Input */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Select Video</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this video about?"
          className="w-full border rounded p-2 h-24"
          maxLength={500}
        />
      </div>

      {/* Progress */}
      {uploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
            <div
              className="bg-pink-500 h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center mt-2">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Post Video'}
      </button>
    </div>
  );
}

/**
 * Example: Get Public Video URL
 */
import { getVideoPublicUrl } from '../services/postUploadService';

function VideoPlayer({ videoPath }: { videoPath: string }) {
  const videoUrl = getVideoPublicUrl(videoPath);

  return (
    <video controls className="w-full">
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
}

/**
 * Example: Real-time Feed Updates
 */
import { useEffect } from 'react';
import { subscribeToNewPosts } from '../services/postUploadService';

function RealtimeFeedExample() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to new posts
    const unsubscribe = subscribeToNewPosts((newPost) => {
      console.log('New post received!', newPost);
      setPosts((prev) => [newPost, ...prev]);
      
      // Optional: Show notification
      if (Notification.permission === 'granted') {
        new Notification('New video posted!', {
          body: newPost.description,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id} className="border p-4 mb-4">
          <VideoPlayer videoPath={post.video_path} />
          <p>{post.description}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Example: Custom Upload Hook
 */
export function useVideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = async (file: File, userId: string, description: string) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadVideoAndCreatePost(file, {
        userId,
        description,
        category: 'comedy',
        visibility: 'public',
        onProgress: setProgress
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadVideo,
    uploading,
    progress,
    error
  };
}

// Usage:
function MyComponent() {
  const { uploadVideo, uploading, progress, error } = useVideoUpload();

  const handleUpload = async (file: File) => {
    try {
      await uploadVideo(file, 'user-id', 'My description');
      alert('Success!');
    } catch (err) {
      console.error(err);
    }
  };

  return <div>{/* Your UI */}</div>;
}
