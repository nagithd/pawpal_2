"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import { IoAdd } from "react-icons/io5";
import StoryViewer from "./StoryViewer";
import StoryUpload from "./StoryUpload";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  pet_id: string;
}

interface StoryGroup {
  petId: string;
  petName: string;
  petAvatar: string | null;
  ownerUserId: string;
  stories: Story[];
  hasUnviewed: boolean;
}

interface UserPet {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function StoryBar() {
  const supabase = createClient();
  const { user } = useUser();

  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadStories = useCallback(async () => {
    // Load active stories (not expired)
    const { data: storiesData } = await supabase
      .from("stories")
      .select(`
        id, media_url, media_type, caption, created_at, user_id, pet_id,
        pets(id, name, avatar_url, owner_id)
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!storiesData) return;

    // Load viewed story IDs for current user
    if (user) {
      const { data: viewsData } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_user_id", user.id);
      if (viewsData) {
        setViewedStoryIds(new Set(viewsData.map((v: any) => v.story_id)));
      }
    }

    // Group by pet
    const groupMap = new Map<string, StoryGroup>();
    for (const story of storiesData as any[]) {
      const pet = story.pets;
      if (!pet) continue;
      if (!groupMap.has(pet.id)) {
        groupMap.set(pet.id, {
          petId: pet.id,
          petName: pet.name,
          petAvatar: pet.avatar_url,
          ownerUserId: pet.owner_id,
          stories: [],
          hasUnviewed: false,
        });
      }
      groupMap.get(pet.id)!.stories.push({
        id: story.id,
        media_url: story.media_url,
        media_type: story.media_type,
        caption: story.caption,
        created_at: story.created_at,
        user_id: story.user_id,
        pet_id: story.pet_id,
      });
    }

    // Mark hasUnviewed
    const groupList = Array.from(groupMap.values()).map(g => ({
      ...g,
      hasUnviewed: g.stories.some(s => !viewedStoryIds.has(s.id)),
    }));

    // Sort: current user's pets first, then others
    groupList.sort((a, b) => {
      if (a.ownerUserId === user?.id) return -1;
      if (b.ownerUserId === user?.id) return 1;
      return 0;
    });

    setGroups(groupList);
  }, [user]);

  const loadUserPets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pets")
      .select("id, name, avatar_url")
      .eq("owner_id", user.id)
      .eq("is_active", true);
    if (data) setUserPets(data);
  }, [user]);

  useEffect(() => {
    loadStories();
    loadUserPets();
  }, [loadStories, loadUserPets]);

  const handleStoryDeleted = (storyId: string, petId: string) => {
    setGroups(prev =>
      prev
        .map(g =>
          g.petId === petId
            ? { ...g, stories: g.stories.filter(s => s.id !== storyId) }
            : g
        )
        .filter(g => g.stories.length > 0)
    );
  };

  const openStory = (index: number) => {
    setViewerGroupIndex(index);
    // After opening, refresh viewed state
    setTimeout(() => loadStories(), 2000);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Add Story button */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center hover:opacity-90 transition shadow">
              <IoAdd className="text-white text-2xl" />
            </div>
            <span className="text-xs text-gray-600 w-16 text-center truncate">
              Thêm story
            </span>
          </button>

          {/* Story groups */}
          {groups.map((group, index) => (
            <button
              key={group.petId}
              onClick={() => openStory(index)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div
                className={`w-14 h-14 rounded-full p-[2.5px] hover:opacity-90 transition ${
                  group.hasUnviewed
                    ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400"
                    : "bg-gray-300"
                }`}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  {group.petAvatar ? (
                    <img
                      src={group.petAvatar}
                      alt={group.petName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-xl">
                      🐾
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 w-16 text-center truncate">
                {group.petName}
              </span>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="flex items-center text-xs text-gray-400 py-2 pl-2">
              Chưa có story nào. Hãy là người đầu tiên!
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer */}
      {viewerGroupIndex !== null && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => { setViewerGroupIndex(null); loadStories(); }}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* Story Upload */}
      {showUpload && (
        <StoryUpload
          pets={userPets}
          onClose={() => setShowUpload(false)}
          onUploaded={loadStories}
        />
      )}
    </>
  );
}
