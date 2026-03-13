"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import CreatePostModal from "@/components/CreatePostModal";
import PostCard from "@/components/PostCard";
import StoryBar from "@/components/StoryBar";
import {
  IoHeart,
  IoChatbubbles,
  IoShareSocial,
  IoTrendingUp,
} from "react-icons/io5";
import { GiPawHeart } from "react-icons/gi";

export default function HomePage() {
  const supabase = createClient();
  const { user: currentUser, userPet, loading: loadingUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPets, setTrendingPets] = useState<any[]>([]);
  const [suggestedPets, setSuggestedPets] = useState<any[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const backgroundLoadRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPostsProgressively();
    loadSidebar();
    
    return () => {
      // Cleanup background load on unmount
      if (backgroundLoadRef.current) {
        clearTimeout(backgroundLoadRef.current);
      }
    };
  }, []);

  const loadPostsProgressively = async () => {
    setLoadingPosts(true);

    // Cancel any pending background load
    if (backgroundLoadRef.current) {
      clearTimeout(backgroundLoadRef.current);
    }

    // Load first 5 posts immediately
    const { data: firstBatch } = await supabase
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
      .limit(5);

    if (firstBatch) {
      setPosts(firstBatch);
      setLoadingPosts(false);

      // Load remaining posts in background
      backgroundLoadRef.current = setTimeout(async () => {
        const { data: remainingPosts } = await supabase
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
          .range(5, 19);

        if (remainingPosts) {
          setPosts((prev) => {
            // Deduplicate posts by ID
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = remainingPosts.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }
        backgroundLoadRef.current = null;
      }, 500);
    } else {
      setLoadingPosts(false);
    }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    
    // Cancel any pending background load
    if (backgroundLoadRef.current) {
      clearTimeout(backgroundLoadRef.current);
      backgroundLoadRef.current = null;
    }
    
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
      .limit(20);

    if (postsData) {
      setPosts(postsData);
    }
    setLoadingPosts(false);
  };

  const loadSidebar = async () => {
    setLoadingSidebar(true);
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
    setLoadingSidebar(false);
  };

  const handlePostDeleted = (postId: string) => {
    // Remove post from state without reloading
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostCreated = () => {
    // Only reload posts, not sidebar
    loadPosts();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={handlePostCreated}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Story Bar */}
        <div className="lg:max-w-3xl mx-auto">
          <StoryBar />
        </div>

        {/* Nút tạo bài đăng */}
        <div className="mb-6">
          {loadingPosts ? (
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
                Share your pet's story...
              </span>
            </button>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Cột giữa - Feed bài đăng */}
          <div className="lg:max-w-3xl mx-auto">
            {loadingPosts || loadingUser ? (
              // Show 3 post skeletons
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="mb-6 bg-white rounded-xl shadow-lg overflow-hidden animate-pulse"
                  >
                    {/* Header Skeleton */}
                    <div className="p-4 flex items-center gap-3 border-b border-gray-200">
                      <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    {/* Content Skeleton */}
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    {/* Image Skeleton */}
                    <div className="w-full h-64 bg-gray-300"></div>
                    {/* Stats Skeleton */}
                    <div className="px-4 py-2 flex items-center gap-4">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                    {/* Actions Skeleton */}
                    <div className="px-4 py-3 border-t border-gray-200 flex gap-6">
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </>
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
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={handlePostDeleted}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
