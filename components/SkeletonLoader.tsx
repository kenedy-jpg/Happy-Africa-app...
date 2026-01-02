
import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-900 relative animate-pulse flex flex-col justify-end p-4 pb-20">
      {/* Right Sidebar Skeleton */}
      <div className="absolute right-2 bottom-[100px] flex flex-col items-center gap-5 w-14">
        <div className="w-12 h-12 bg-gray-800 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
        <div className="w-12 h-12 bg-gray-800 rounded-full mt-2"></div>
      </div>

      {/* Metadata Skeleton */}
      <div className="w-[75%] flex flex-col gap-3 mb-4">
        <div className="w-32 h-4 bg-gray-800 rounded"></div>
        <div className="w-full h-3 bg-gray-800 rounded"></div>
        <div className="w-2/3 h-3 bg-gray-800 rounded"></div>
        <div className="w-40 h-3 bg-gray-800 rounded mt-2"></div>
      </div>
    </div>
  );
};
