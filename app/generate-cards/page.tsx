"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { CardGrid } from './components/CardGrid';

export default function GenerateCardsPage() {
  const router = useRouter();

  const handleBackToMain = () => {
    router.push('/'); // Change this to the path of your main page if different
  };

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          文章内容提炼
        </h1>
        <CardGrid />
        <div className="text-center mt-8">
          <button
            onClick={handleBackToMain}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}