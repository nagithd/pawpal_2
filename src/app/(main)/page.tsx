"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CreatePostModal from "@/components/CreatePostModal";
import PostCard from "@/components/PostCard";
import {
  IoHeart,
  IoChatbubbles,
  IoShareSocial,
  IoTrendingUp,
} from "react-icons/io5";
import { GiPawHeart } from "react-icons/gi";

export default function HomePage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPets, setTrendingPets] = useState<any[]>([]);
  const [suggestedPets, setSuggestedPets] = useState<any[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Load posts with pet and user info
    const { data: postsData } = await supabase
      .from("posts")
      .select(
        `
        *,
        pets(id, name, breed, age, species, avatar_url, owner_id, users(full_name, avatar_url)),
        post_likes(count),
        post_comments(count)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (postsData) {
      setPosts(postsData);
    }

    // Load trending pets
    const { data: trendingData } = await supabase
      .from("pets")
      .select("*, users(full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (trendingData) {
      setTrendingPets(trendingData);
    }

    // Load suggested pets
    const { data: suggestedData } = await supabase
      .from("pets")
      .select("*, users(full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4);

    if (suggestedData) {
      setSuggestedPets(suggestedData);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[calc(125vh-65px)] bg-gradient-to-br from-gray-50 to-gray-100">
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={loadData}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Nút tạo bài đăng */}
        <div className="mb-6">
          {loading ? (
            <div className="w-full lg:max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-4">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreatePost(true)}
              className="w-full lg:max-w-3xl mx-auto flex items-center gap-3 bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition"
            >
              <span className="text-gray-500 text-left flex-1">
                Chia sẻ khoảnh khắc của thú cưng...
              </span>
            </button>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Cột giữa - Feed bài đăng */}
          <div className="lg:max-w-3xl mx-auto">
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <span className="text-6xl mb-4 block">📝</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Chưa có bài đăng nào
                </h3>
                <p className="text-gray-600">
                  Hãy là người đầu tiên chia sẻ về thú cưng của bạn!
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onPostUpdate={loadData} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
