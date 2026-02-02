"use client";

import { useState, useEffect, useRef } from "react";
import ConversationList from "@/components/messages/ConversationList";
import ChatWindow from "@/components/messages/ChatWindow";
import { IoChatbubbles } from "react-icons/io5";
import { createClient } from "@/lib/supabase/client";

interface Match {
  matchId: string;
  otherPet: {
    id: string;
    name: string;
    avatar_url: string | null;
    owner_id: string;
  };
  lastMessage: {
    content: string | null;
    image_url: string | null;
    created_at: string;
    sender_pet_id: string;
  } | null;
  unreadCount: number;
  createdAt: string;
  isOnline: boolean;
  lastActive: string | null;
}

export default function MessagesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [currentPetId, setCurrentPetId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadMatches();
    subscribeToAllMessages();
    updatePresence();

    // Cập nhật presence mỗi 2 phút
    const presenceInterval = setInterval(
      () => {
        updatePresence();
      },
      2 * 60 * 1000,
    );

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      clearInterval(presenceInterval);
    };
  }, []);

  const updatePresence = async () => {
    try {
      await fetch("/api/presence/update", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await fetch("/api/messages/matches");
      const data = await response.json();
      if (data.matches) {
        setMatches(data.matches);
      }
      if (data.currentPetId) {
        setCurrentPetId(data.currentPetId);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToAllMessages = () => {
    channelRef.current = supabase
      .channel("all-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new;

          // Cập nhật matches với tin nhắn mới
          setMatches((prevMatches) => {
            const updatedMatches = prevMatches.map((match) => {
              if (match.matchId === newMessage.match_id) {
                // Chỉ tăng unreadCount nếu:
                // 1. Tin nhắn không phải từ mình (sender_pet_id !== currentPetId)
                // 2. Conversation này không đang được mở (matchId !== selectedMatchId)
                const shouldIncreaseUnread =
                  newMessage.sender_pet_id !== currentPetId &&
                  match.matchId !== selectedMatchId;

                return {
                  ...match,
                  lastMessage: {
                    content: newMessage.content,
                    image_url: newMessage.image_url,
                    created_at: newMessage.created_at,
                    sender_pet_id: newMessage.sender_pet_id,
                  },
                  unreadCount: shouldIncreaseUnread
                    ? match.unreadCount + 1
                    : match.unreadCount,
                };
              }
              return match;
            });

            // Sort lại: conversation có tin nhắn mới lên đầu
            const sorted = updatedMatches.sort((a, b) => {
              const timeA = a.lastMessage?.created_at || a.createdAt;
              const timeB = b.lastMessage?.created_at || b.createdAt;
              return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
            return sorted;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const updatedMessage = payload.new;

          // Nếu tin nhắn được đánh dấu đã đọc, cập nhật unread count
          if (updatedMessage.is_read) {
            // Reload matches để có count chính xác từ database
            loadMatches();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: "last_active=not.is.null",
        },
        async (payload) => {
          // Cập nhật online status khi user cập nhật last_active
          const updatedUserId = payload.new.id;
          const lastActive = payload.new.last_active;

          const isOnline = lastActive
            ? new Date().getTime() - new Date(lastActive).getTime() <
              5 * 60 * 1000
            : false;

          setMatches((prevMatches) =>
            prevMatches.map((match) => {
              // Check nếu pet thuộc user này
              if (match.otherPet.owner_id === updatedUserId) {
                return { ...match, isOnline };
              }
              return match;
            }),
          );
        },
      )
      .subscribe();
  };

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);

    // Reset unread count khi chọn conversation
    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.matchId === matchId ? { ...match, unreadCount: 0 } : match,
      ),
    );
  };

  const handleMessageSent = (matchId: string, message: any) => {
    // Update conversation list immediately
    setMatches((prevMatches) => {
      const updatedMatches = prevMatches.map((match) => {
        if (match.matchId === matchId) {
          return {
            ...match,
            lastMessage: {
              content: message.content,
              image_url: message.image_url,
              created_at: message.created_at,
              sender_pet_id: message.sender_pet_id,
            },
          };
        }
        return match;
      });

      // Sort lại: conversation mới nhất lên đầu
      return updatedMatches.sort((a, b) => {
        const timeA = a.lastMessage?.created_at || a.createdAt;
        const timeB = b.lastMessage?.created_at || b.createdAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
    });
  };

  const selectedMatch = matches.find((m) => m.matchId === selectedMatchId);

  if (isLoading) {
    return (
      <div className="h-[calc(125vh-65px)] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="h-[calc(125vh-65px)] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <IoChatbubbles className="text-8xl mb-6 mx-auto text-pink-500" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Chưa có cuộc trò chuyện
          </h1>
          <p className="text-gray-600 text-lg">
            Hãy match với các thú cưng khác để bắt đầu nhắn tin!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(125vh-65px)] bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <ConversationList
        matches={matches}
        selectedMatchId={selectedMatchId}
        onSelectMatch={handleSelectMatch}
        currentPetId={currentPetId}
      />
      <ChatWindow
        match={selectedMatch || null}
        currentPetId={currentPetId}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
