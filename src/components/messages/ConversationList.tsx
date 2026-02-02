"use client";

import Image from "next/image";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";

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
  isOnline: boolean;
  lastActive: string | null;
}

interface ConversationListProps {
  matches: Match[];
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
  currentPetId: string;
}

export default function ConversationList({
  matches,
  selectedMatchId,
  onSelectMatch,
  currentPetId,
}: ConversationListProps) {
  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg">
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Chats</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No conversations yet</p>
            <p className="text-sm mt-2">
              Match with other pets to start chatting!
            </p>
          </div>
        ) : (
          matches.map((match) => (
            <div
              key={match.matchId}
              onClick={() => onSelectMatch(match.matchId)}
              className={`flex items-center p-5 hover:bg-gray-100 cursor-pointer transition-colors ${
                selectedMatchId === match.matchId ? "bg-gray-100" : ""
              }`}
            >
              <div className="relative">
                <Image
                  src={
                    match.otherPet.avatar_url ||
                    "https://via.placeholder.com/56"
                  }
                  alt={match.otherPet.name}
                  width={56}
                  height={56}
                  className="rounded-full object-cover max-w-[56px] max-h-[56px]"
                />
                {/* Online status indicator or last active */}
                {match.isOnline ? (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                ) : (
                  match.lastActive && (() => {
                    const timeDiff = new Date().getTime() - new Date(match.lastActive).getTime();
                    const oneDayMs = 24 * 60 * 60 * 1000;
                    if (timeDiff < oneDayMs) {
                      const minutes = Math.floor(timeDiff / (60 * 1000));
                      const hours = Math.floor(timeDiff / (60 * 60 * 1000));
                      return (
                        <div className="absolute -bottom-1 -right-1 bg-gray-700 text-green-500 text-[10px] px-1.5 rounded border border-white">
                          {hours > 0 ? `${hours}h` : `${minutes}m`}
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
                {/* Unread count badge */}
                {match.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center">
                    {match.unreadCount}
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate text-lg">
                    {match.otherPet.name}
                  </h3>
                  {match.lastMessage && (
                    <span className="text-sm text-gray-500 ml-2">
                      {differenceInSeconds(
                        new Date(),
                        new Date(match.lastMessage.created_at),
                      ) < 60
                        ? "just now"
                        : formatDistanceToNow(
                            new Date(match.lastMessage.created_at),
                            { addSuffix: true },
                          )}
                    </span>
                  )}
                </div>
                <p
                  className={`text-base truncate ${
                    match.unreadCount > 0
                      ? "text-gray-900 font-medium"
                      : "text-gray-600"
                  }`}
                >
                  {match.lastMessage
                    ? match.lastMessage.sender_pet_id === currentPetId
                      ? // Message from self
                        match.lastMessage.image_url
                        ? "You: Sent a photo"
                        : `You: ${match.lastMessage.content}`
                      : // Message from other
                        match.lastMessage.image_url
                        ? "Sent a photo"
                        : match.lastMessage.content
                    : "Start conversation"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
