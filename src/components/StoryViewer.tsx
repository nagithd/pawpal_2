"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import { IoClose, IoChevronBack, IoChevronForward, IoEye, IoTrash } from "react-icons/io5";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  pet_id: string;
  story_views?: { count: number }[];
}

interface StoryGroup {
  petId: string;
  petName: string;
  petAvatar: string | null;
  ownerUserId: string;
  stories: Story[];
}

interface Props {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryDeleted?: (storyId: string, petId: string) => void;
}

const STORY_DURATION = 5000;

export default function StoryViewer({ groups, initialGroupIndex, onClose, onStoryDeleted }: Props) {
  const supabase = createClient();
  const { user } = useUser();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  const markViewed = useCallback(async (storyId: string) => {
    if (!user) return;
    await supabase.from("story_views").upsert(
      { story_id: storyId, viewer_user_id: user.id },
      { onConflict: "story_id,viewer_user_id" }
    );
  }, [user]);

  const loadViewCount = useCallback(async (storyId: string) => {
    const { count } = await supabase
      .from("story_views")
      .select("*", { count: "exact", head: true })
      .eq("story_id", storyId);
    setViewCounts(prev => ({ ...prev, [storyId]: count ?? 0 }));
  }, []);

  const goNextStory = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(i => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup, groups, onClose]);

  const goPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  }, [storyIndex, groupIndex, groups]);

  // Timer logic
  useEffect(() => {
    if (!currentStory) return;
    elapsedRef.current = 0;
    setProgress(0);
    markViewed(currentStory.id);
    if (currentGroup.ownerUserId === user?.id) {
      loadViewCount(currentStory.id);
    }
  }, [currentStory?.id]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 50;
    startTimeRef.current = Date.now() - elapsedRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = elapsed;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= STORY_DURATION) {
        clearInterval(timerRef.current!);
        goNextStory();
      }
    }, interval);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, currentStory?.id, goNextStory]);

  const handleDelete = async () => {
    if (!currentStory) return;
    const path = new URL(currentStory.media_url).pathname.split("/storage/v1/object/public/stories/")[1];
    await supabase.storage.from("stories").remove([path]);
    await supabase.from("stories").delete().eq("id", currentStory.id);
    onStoryDeleted?.(currentStory.id, currentGroup.petId);
    goNextStory();
  };

  if (!currentGroup || !currentStory) return null;

  const isOwner = user?.id === currentGroup.ownerUserId;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Story container */}
      <div
        className="relative w-full max-w-sm h-full max-h-[90vh] bg-black rounded-xl overflow-hidden select-none"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {currentGroup.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-10 flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white">
              {currentGroup.petAvatar ? (
                <img src={currentGroup.petAvatar} alt={currentGroup.petName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-sm">🐾</div>
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{currentGroup.petName}</p>
              <p className="text-white/70 text-xs">
                {new Date(currentStory.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <div className="flex items-center gap-1 text-white/80 text-xs">
                  <IoEye />
                  <span>{viewCounts[currentStory.id] ?? 0}</span>
                </div>
                <button onClick={handleDelete} className="text-white/80 hover:text-red-400 transition">
                  <IoTrash className="text-lg" />
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white hover:opacity-70 transition">
              <IoClose className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {currentStory.media_type === "video" ? (
            <video
              key={currentStory.id}
              src={currentStory.media_url}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              key={currentStory.id}
              src={currentStory.media_url}
              alt="story"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-8 left-0 right-0 px-4 pb-4 z-10 bg-gradient-to-t from-black/60 to-transparent pt-8">
            <p className="text-white text-sm text-center">{currentStory.caption}</p>
          </div>
        )}

        {/* Tap zones */}
        <button
          className="absolute left-0 top-0 h-full w-1/3 z-20"
          onClick={goPrevStory}
        />
        <button
          className="absolute right-0 top-0 h-full w-1/3 z-20"
          onClick={goNextStory}
        />
      </div>

      {/* Prev/Next group arrows */}
      {groupIndex > 0 && (
        <button
          onClick={() => { setGroupIndex(g => g - 1); setStoryIndex(0); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition z-30"
        >
          <IoChevronBack className="text-2xl" />
        </button>
      )}
      {groupIndex < groups.length - 1 && (
        <button
          onClick={() => { setGroupIndex(g => g + 1); setStoryIndex(0); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition z-30"
        >
          <IoChevronForward className="text-2xl" />
        </button>
      )}
    </div>
  );
}
