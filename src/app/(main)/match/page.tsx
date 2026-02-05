"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import toast from "react-hot-toast";
import {
  IoHeart,
  IoClose,
  IoArrowUndo,
  IoFilter,
  IoLocationOutline,
} from "react-icons/io5";
import { FaRegHeart } from "react-icons/fa";

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  species: string;
  avatar_url: string | null;
  owner_id: string;
  bio?: string;
}

interface Match {
  id: string;
  pet_1_id: string;
  pet_2_id: string;
  created_at: string;
  pet?: Pet;
}

interface MatchRequest {
  id: string;
  from_pet_id: string;
  to_pet_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  pet?: Pet;
}

interface SwipeHistory {
  petId: string;
  action: "like" | "dislike" | "favorite";
}

export default function MatchPage() {
  const supabase = createClient();
  const { user } = useUser();
  const [currentUserPet, setCurrentUserPet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistory[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MatchRequest[]>([]);
  const [petSwipeStatus, setPetSwipeStatus] = useState<
    Record<string, "like" | "dislike">
  >({});

  // Pagination states
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PETS_PER_BATCH = 10; // Số pets mới mỗi lần load
  const FETCH_SIZE = 50; // Fetch nhiều hơn để đảm bảo có đủ sau khi filter
  const LOAD_MORE_THRESHOLD = 5;

  // Filters
  const [petTypeFilter, setPetTypeFilter] = useState<string>("dog");
  const [ageFilter, setAgeFilter] = useState<string[]>([]);
  const [distanceFilter, setDistanceFilter] = useState<number>(10);

  // Animation states
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentUserPet) {
      // Reset pagination when filters change
      setOffset(0);
      setPets([]);
      setCurrentIndex(0);
      setHasMore(true);
      fetchPets(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petTypeFilter, ageFilter, currentUserPet]);

  // Check if we need to load more pets
  useEffect(() => {
    const remainingPets = pets.length - currentIndex;
    if (
      remainingPets <= LOAD_MORE_THRESHOLD &&
      hasMore &&
      !isLoadingMore &&
      pets.length > 0
    ) {
      loadMorePets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, pets.length, hasMore, isLoadingMore]);

  const getAgeCategory = (age: number): string => {
    if (age < 1) return "puppy";
    if (age < 3) return "young";
    if (age < 8) return "adult";
    return "senior";
  };

  const fetchRecentMatches = async () => {
    try {
      if (!user) return;

      const { data: userPets } = await supabase
        .from("pets")
        .select("id")
        .eq("owner_id", user.id);

      if (!userPets || userPets.length === 0) return;

      const petIds = userPets.map((p) => p.id);

      // Try simpler query first
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (matchError) {
        console.error("Match query error:", matchError);
        return;
      }
      // Filter matches that involve user's pets
      const userMatches = matches?.filter(
        (match) =>
          petIds.includes(match.pet_1_id) || petIds.includes(match.pet_2_id),
      );

      if (userMatches && userMatches.length > 0) {
        const matchesWithPets = await Promise.all(
          userMatches.slice(0, 5).map(async (match) => {
            const otherPetId = petIds.includes(match.pet_1_id)
              ? match.pet_2_id
              : match.pet_1_id;
            const { data: pet } = await supabase
              .from("pets")
              .select("*")
              .eq("id", otherPetId)
              .single();
            return { ...match, pet };
          }),
        );
        setRecentMatches(matchesWithPets);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      if (!user) return;

      const { data: userPets } = await supabase
        .from("pets")
        .select("id")
        .eq("owner_id", user.id);

      if (!userPets || userPets.length === 0) return;

      const petIds = userPets.map((p) => p.id);

      // Get pending match requests where user's pet is the receiver
      const { data: requests } = await supabase
        .from("match_requests")
        .select("*")
        .in("to_pet_id", petIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requests && requests.length > 0) {
        const requestsWithPets = await Promise.all(
          requests.map(async (request) => {
            const { data: pet } = await supabase
              .from("pets")
              .select("*")
              .eq("id", request.from_pet_id)
              .single();
            return { ...request, pet };
          }),
        );
        setPendingRequests(requestsWithPets);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const handleAcceptMatch = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc("accept_match_request", {
        request_id: requestId,
      });

      if (error) throw error;

      toast.success("Đã chấp nhận match!");
      fetchPendingRequests();
      fetchRecentMatches();
    } catch (error: any) {
      console.error("Accept error:", error);
      toast.error("Không thể chấp nhận match");
    }
  };

  const handleRejectMatch = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("match_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Đã từ chối match");
      fetchPendingRequests();
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error("Không thể từ chối match");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!user) {
        toast.error("Vui lòng đăng nhập");
        return;
      }

      const { data: userPets } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (!userPets || userPets.length === 0) {
        toast.error("Bạn chưa có thú cưng nào");
        setLoading(false);
        return;
      }

      setCurrentUserPet(userPets[0]);

      await Promise.all([fetchRecentMatches(), fetchPendingRequests()]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchPets = async (
    currentOffset: number = 0,
    reset: boolean = false,
  ) => {
    if (!currentUserPet) return;

    if (!reset && isLoadingMore) return;

    if (!reset) {
      setIsLoadingMore(true);
    }

    try {
      const { data: swipes } = await supabase
        .from("swipes")
        .select("to_pet_id, action")
        .eq("from_pet_id", currentUserPet.id);

      // Tạo map swipe status
      const swipeStatusMap: Record<string, "like" | "dislike"> = {};
      swipes?.forEach((s) => {
        if (s.action === "like" || s.action === "dislike") {
          swipeStatusMap[s.to_pet_id] = s.action;
        }
      });
      setPetSwipeStatus(swipeStatusMap);

      // Get already swiped pet IDs
      const swipedPetIds = new Set<string>(
        swipes?.map((s) => s.to_pet_id) || [],
      );

      // Get matched pet IDs
      const { data: userMatches } = await supabase
        .from("matches")
        .select("pet_1_id, pet_2_id")
        .or(
          `pet_1_id.eq.${currentUserPet.id},pet_2_id.eq.${currentUserPet.id}`,
        );

      const matchedPetIds = new Set<string>();
      userMatches?.forEach((match) => {
        if (match.pet_1_id !== currentUserPet.id)
          matchedPetIds.add(match.pet_1_id);
        if (match.pet_2_id !== currentUserPet.id)
          matchedPetIds.add(match.pet_2_id);
      });

      // Combine excluded IDs
      const excludedIds = new Set([...swipedPetIds, ...matchedPetIds]);

      let query = supabase
        .from("pets")
        .select("*", { count: "exact" })
        .neq("owner_id", currentUserPet.owner_id)
        .eq("is_active", true);

      if (petTypeFilter !== "all") {
        query = query.eq("species", petTypeFilter);
      }

      // Fetch larger batch để đảm bảo có đủ pets sau khi filter
      const {
        data: availablePets,
        error,
        count,
      } = await query.range(currentOffset, currentOffset + FETCH_SIZE - 1);

      if (error) throw error;

      let filteredPets = availablePets || [];

      // Filter out excluded pets
      filteredPets = filteredPets.filter((pet) => !excludedIds.has(pet.id));

      // Apply age filter
      if (ageFilter.length > 0) {
        filteredPets = filteredPets.filter((pet) =>
          ageFilter.includes(getAgeCategory(pet.age)),
        );
      }

      // Chỉ lấy PETS_PER_BATCH pets đầu tiên
      const petsToAdd = filteredPets.slice(0, PETS_PER_BATCH);

      if (reset) {
        setPets(petsToAdd);
      } else {
        setPets((prev) => [...prev, ...petsToAdd]);
      }

      // Check if there are more pets to load
      // Nếu số pets filtered ít hơn PETS_PER_BATCH, nghĩa là đã hết
      const hasMorePets =
        filteredPets.length >= PETS_PER_BATCH &&
        (count ? currentOffset + FETCH_SIZE < count : false);
      setHasMore(hasMorePets);
      setOffset(currentOffset + FETCH_SIZE);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMorePets = async () => {
    if (!hasMore || isLoadingMore) return;
    await fetchPets(offset, false);
  };

  const handleSwipe = async (
    action: "like" | "dislike" | "favorite",
    animated: boolean = true,
  ) => {
    if (!currentUserPet || !pets[currentIndex]) return;

    const targetPet = pets[currentIndex];

    try {
      const { error: swipeError } = await supabase.from("swipes").insert({
        from_pet_id: currentUserPet.id,
        to_pet_id: targetPet.id,
        action: action === "favorite" ? "like" : action,
      });

      if (swipeError) throw swipeError;

      setSwipeHistory([
        ...swipeHistory,
        { petId: targetPet.id, action: action },
      ]);

      if (action === "like" || action === "favorite") {
        toast.success(`Đã gửi lời mời kết bạn đến ${targetPet.name}!`);
      }

      if (action === "favorite") {
        toast.success(`⭐ Đã lưu ${targetPet.name} vào yêu thích!`);
      }

      // Auto advance to next card
      if (animated && currentIndex < pets.length) {
        setIsAnimating(true);
        setSwipeDirection(
          action === "like" || action === "favorite" ? "right" : "left",
        );

        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
          setSwipeDirection(null);
          setIsAnimating(false);
        }, 800);
      } else if (!animated) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error: any) {
      console.error("Swipe error:", error);
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleUndo = async () => {
    if (swipeHistory.length === 0 || isAnimating || currentIndex === 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];

    try {
      // Delete the last swipe from database
      const { error } = await supabase
        .from("swipes")
        .delete()
        .eq("from_pet_id", currentUserPet?.id)
        .eq("to_pet_id", lastSwipe.petId);

      if (error) throw error;

      // Remove from history
      setSwipeHistory(swipeHistory.slice(0, -1));

      // Go back one card
      setCurrentIndex(currentIndex - 1);
    } catch (error: any) {
      console.error("Undo error:", error);
      toast.error("Không thể hoàn tác");
    }
  };

  // Drag handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (isAnimating) return;
    setIsDragging(true);
    setDragStartPos({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || isAnimating) return;

    const deltaX = clientX - dragStartPos.x;
    const deltaY = clientY - dragStartPos.y;

    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleDragEnd = () => {
    if (!isDragging || isAnimating) return;

    const swipeThreshold = 100;

    if (Math.abs(dragOffset.x) > swipeThreshold) {
      // Card đã vượt threshold - bay từ vị trí hiện tại
      setIsDragging(false);
      setIsAnimating(true);

      // Determine swipe direction based on drag
      const direction = dragOffset.x > 0 ? "right" : "left";
      const action = dragOffset.x > 0 ? "like" : "dislike";

      setSwipeDirection(direction);

      // Save to database and advance
      const saveSwipe = async () => {
        if (!currentUserPet || !pets[currentIndex]) return;
        const targetPet = pets[currentIndex];

        try {
          await supabase.from("swipes").upsert(
            {
              from_pet_id: currentUserPet.id,
              to_pet_id: targetPet.id,
              action: action,
            },
            { onConflict: "from_pet_id,to_pet_id" },
          );

          setSwipeHistory([
            ...swipeHistory,
            { petId: targetPet.id, action: action },
          ]);

          if (action === "like") {
            toast.success(`Đã gửi lời mời kết bạn đến ${targetPet.name}!`);
          }
        } catch (error) {
          console.error("Swipe error:", error);
        }
      };

      saveSwipe();

      // Wait for animation then advance
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setSwipeDirection(null);
        setIsAnimating(false);
        setDragOffset({ x: 0, y: 0 });
      }, 800);
    } else {
      // Không đủ threshold - reset về gốc
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const getDragRotation = () => {
    const maxRotation = 15;
    const rotation = (dragOffset.x / 500) * maxRotation;
    return rotation;
  };

  const getDragOpacity = () => {
    const maxDistance = 200;
    const opacity = 1 - Math.abs(dragOffset.x) / maxDistance;
    return Math.max(0.5, opacity);
  };

  const toggleAgeFilter = (category: string) => {
    if (ageFilter.includes(category)) {
      setAgeFilter(ageFilter.filter((c) => c !== category));
    } else {
      setAgeFilter([...ageFilter, category]);
    }
  };

  const currentPet = pets[currentIndex];

  if (loading) {
    return (
      <div className="min-h-[calc(125vh-65px)] bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          {/* 3-Column Layout Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar Skeleton */}
            <div className="lg:col-span-3 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
                  <div className="space-y-4">
                    <div className="h-12 bg-gray-200 rounded-xl"></div>
                    <div className="h-12 bg-gray-200 rounded-xl"></div>
                    <div className="h-12 bg-gray-200 rounded-xl"></div>
                  </div>
                  <div className="mt-6 h-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>

            {/* Center Column - Main Card Skeleton */}
            <div className="lg:col-span-6">
              <div className="text-center mb-8 animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="animate-pulse">
                  <div className="h-96 bg-gray-200"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="flex gap-4 mt-6">
                      <div className="flex-1 h-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 h-16 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar Skeleton */}
            <div className="lg:col-span-3 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-6"></div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(125vh-65px)] bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                <IoFilter className="text-pink-500" />
                Filters
              </h2>

              {/* Pet Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Pet Type
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "dog", label: "Dogs" },
                    { value: "cat", label: "Cats" },
                    { value: "other", label: "Others" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setPetTypeFilter(type.value)}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        petTypeFilter === type.value
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Distance
                </label>
                <select
                  value={distanceFilter}
                  onChange={(e) => setDistanceFilter(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-pink-500"
                >
                  <option value={5}>Within 5 miles</option>
                  <option value={10}>Within 10 miles</option>
                  <option value={20}>Within 20 miles</option>
                  <option value={50}>Within 50 miles</option>
                </select>
              </div>

              {/* Age Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Age
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "puppy", label: "<1 yrs" },
                    { value: "young", label: "1-3 yrs" },
                    { value: "adult", label: "3-8 yrs" },
                    { value: "senior", label: "8+ yrs" },
                  ].map((age) => (
                    <button
                      key={age.value}
                      onClick={() => toggleAgeFilter(age.value)}
                      className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                        ageFilter.includes(age.value)
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {age.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setPetTypeFilter("dog");
                  setAgeFilter([]);
                  setDistanceFilter(10);
                }}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Center Column - Main Pet Card */}
          <div className="lg:col-span-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Find Your Pet's New Friend
              </h1>
              <p className="text-gray-600">
                Swipe to find the perfect match for your pet
              </p>
            </div>

            {!currentPet ? (
              <div className="text-center py-20">
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  {isLoadingMore ? "Đang tải thêm..." : "No More Pets!"}
                </h2>
                <p className="text-gray-600 mb-6 text-lg">
                  {isLoadingMore
                    ? "Đang tìm kiếm thêm bạn mới..."
                    : "You've seen all available pets with current filters"}
                </p>
                {!isLoadingMore && (
                  <button
                    onClick={() => {
                      setOffset(0);
                      setPets([]);
                      setCurrentIndex(0);
                      setHasMore(true);
                      fetchData();
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:from-pink-600 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
                  >
                    Reload
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <style>{`
                  .swipe-card {
                    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                opacity 0.8s ease-out;
                  }
                  
                  .swipe-card.swiping-left {
                    animation: swipeLeft 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                  }
                  
                  .swipe-card.swiping-right {
                    animation: swipeRight 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                  }
                  
                  @keyframes swipeLeft {
                    0% {
                      transform: translateX(0) translateY(0) rotate(0deg) scale(1);
                      opacity: 1;
                    }
                    20% {
                      transform: translateX(-10%) translateY(5%) rotate(-3deg) scale(0.98);
                      opacity: 1;
                    }
                    100% {
                      transform: translateX(-150%) translateY(-30%) rotate(-35deg) scale(0.7);
                      opacity: 0;
                    }
                  }
                  
                  @keyframes swipeRight {
                    0% {
                      transform: translateX(0) translateY(0) rotate(0deg) scale(1);
                      opacity: 1;
                    }
                    20% {
                      transform: translateX(10%) translateY(5%) rotate(3deg) scale(0.98);
                      opacity: 1;
                    }
                    100% {
                      transform: translateX(150%) translateY(-30%) rotate(35deg) scale(0.7);
                      opacity: 0;
                    }
                  }
                  
                  .card-enter {
                    animation: cardEnter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                  }
                  
                  @keyframes cardEnter {
                    0% {
                      transform: scale(0.85) translateY(40px);
                      opacity: 0;
                    }
                    50% {
                      transform: scale(1.03) translateY(-8px);
                      opacity: 0.8;
                    }
                    100% {
                      transform: scale(1) translateY(0);
                      opacity: 1;
                    }
                  }
                `}</style>

                {/* Pet Card */}
                <div
                  key={`${currentIndex}-${currentPet.id}`}
                  className={`swipe-card card-enter bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 cursor-grab active:cursor-grabbing select-none ${
                    swipeDirection === "left" ? "swiping-left" : ""
                  } ${swipeDirection === "right" ? "swiping-right" : ""}`}
                  style={{
                    transform:
                      isDragging || swipeDirection
                        ? `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${getDragRotation()}deg)`
                        : undefined,
                    transition: isDragging
                      ? "none"
                      : swipeDirection
                        ? undefined
                        : "transform 0.3s ease-out",
                  }}
                  onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                  onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={(e) =>
                    handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
                  }
                  onTouchMove={(e) =>
                    handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
                  }
                  onTouchEnd={handleDragEnd}
                >
                  {/* Pet Image */}
                  <div className="relative h-[475px] bg-gradient-to-br from-gray-200 to-gray-300">
                    {currentPet.avatar_url ? (
                      <img
                        src={currentPet.avatar_url}
                        alt={currentPet.name}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable="false"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-9xl pointer-events-none">
                        {currentPet.species === "dog"
                          ? "🐕"
                          : currentPet.species === "cat"
                            ? "🐈"
                            : "🐾"}
                      </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

                    {/* Dynamic Drag Overlay - LIKE */}
                    {isDragging && dragOffset.x > 30 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          opacity: Math.min(Math.abs(dragOffset.x) / 100, 1),
                        }}
                      >
                        <div className="px-8 py-4 rounded-2xl border-4 border-green-500 text-green-500 font-black text-5xl rotate-12 bg-white/10 backdrop-blur-sm">
                          LIKE
                        </div>
                      </div>
                    )}

                    {/* Dynamic Drag Overlay - NOPE */}
                    {isDragging && dragOffset.x < -30 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          opacity: Math.min(Math.abs(dragOffset.x) / 100, 1),
                        }}
                      >
                        <div className="px-8 py-4 rounded-2xl border-4 border-red-500 text-red-500 font-black text-5xl -rotate-12 bg-white/10 backdrop-blur-sm">
                          NOPE
                        </div>
                      </div>
                    )}

                    {/* Pet Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                      <h2 className="text-4xl font-bold mb-2">
                        {currentPet.name}{" "}
                        <span className="text-3xl font-light">
                          · {currentPet.age} yrs
                        </span>
                      </h2>
                      <p className="text-xl text-gray-100 mb-2">
                        {currentPet.breed}
                      </p>
                      <p className="flex items-center gap-1 text-gray-200">
                        <IoLocationOutline className="text-lg" />
                        {distanceFilter} miles away
                      </p>
                    </div>
                  </div>

                  {/* Pet Bio */}
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-white pointer-events-none">
                    <p className="text-gray-700 text-center line-clamp-2">
                      {currentPet.bio ?? "..."}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-6">
                  {/* Dislike Button */}
                  <button
                    onClick={() => handleSwipe("dislike")}
                    disabled={isAnimating}
                    className={`group w-16 h-16 rounded-full bg-white border-2 flex items-center justify-center transition-all shadow-lg ${
                      isAnimating
                        ? "border-gray-300 cursor-not-allowed opacity-50"
                        : "border-red-400 hover:bg-red-50 hover:shadow-xl hover:scale-110"
                    }`}
                  >
                    <IoClose
                      className={`text-4xl transition-transform ${
                        isAnimating
                          ? "text-gray-400"
                          : "text-red-500 group-hover:scale-125"
                      }`}
                    />
                  </button>

                  {/* Undo Button */}
                  <button
                    onClick={handleUndo}
                    disabled={
                      swipeHistory.length === 0 ||
                      currentIndex === 0 ||
                      isAnimating
                    }
                    className={`group w-14 h-14 rounded-full bg-white border-2 flex items-center justify-center transition-all shadow-lg ${
                      swipeHistory.length === 0 ||
                      currentIndex === 0 ||
                      isAnimating
                        ? "border-gray-300 cursor-not-allowed opacity-50"
                        : "border-yellow-400 hover:bg-yellow-50 hover:shadow-xl hover:scale-110"
                    }`}
                  >
                    <IoArrowUndo
                      className={`text-3xl transition-transform ${
                        swipeHistory.length === 0 ||
                        currentIndex === 0 ||
                        isAnimating
                          ? "text-gray-400"
                          : "text-yellow-500 group-hover:scale-125 group-hover:-rotate-12"
                      }`}
                    />
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={() => handleSwipe("like")}
                    disabled={isAnimating}
                    className={`group w-16 h-16 rounded-full bg-white border-2 flex items-center justify-center transition-all ${
                      isAnimating
                        ? "border-gray-300 cursor-not-allowed opacity-50 shadow-lg"
                        : "border-red-400 hover:bg-red-50 shadow-xl hover:shadow-2xl hover:scale-110"
                    }`}
                  >
                    <FaRegHeart
                      className={`text-4xl transition-transform ${
                        isAnimating
                          ? "text-gray-400"
                          : "text-red-500 group-hover:scale-125"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Recent Matches */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 space-y-6">
              {/* Pending Match Requests */}
              {pendingRequests.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Match Requests
                  </h2>
                  <div className="space-y-3 mb-6">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="p-3 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {request.pet?.avatar_url ? (
                              <img
                                src={request.pet.avatar_url}
                                alt={request.pet.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xl">
                                {request.pet?.species === "dog" ? "🐕" : "🐈"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate">
                              {request.pet?.name || "Unknown"}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              muốn kết bạn
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptMatch(request.id)}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition"
                          >
                            Chấp nhận
                          </button>
                          <button
                            onClick={() => handleRejectMatch(request.id)}
                            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Matches */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Recent Matches
                </h2>

                {recentMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-3">💕</div>
                    <p className="text-gray-500 text-sm">
                      No matches yet.
                      <br />
                      Start swiping!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentMatches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {match.pet?.avatar_url ? (
                            <img
                              src={match.pet.avatar_url}
                              alt={match.pet.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">
                              {match.pet?.species === "dog" ? "🐕" : "🐈"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {match.pet?.name || "Unknown"}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {match.pet?.breed || "Unknown breed"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {recentMatches.length > 0 && (
                  <button className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg">
                    View All Matches
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
