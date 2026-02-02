"use client";

import Image from "next/image";
import { format } from "date-fns";
import { useState } from "react";
import { IoArrowUndoOutline } from "react-icons/io5";
import ImageModal from "@/components/ImageModal";

interface Message {
  id: string;
  content: string | null;
  image_url: string | null;
  sender_pet_id: string;
  reply_to_message_id: string | null;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  replied_message?: {
    id: string;
    content: string | null;
    image_url: string | null;
    sender_pet_id: string;
    sender: {
      name: string;
    };
  } | null;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  currentUserId: string | null;
  reactions: Array<{ user_id: string; reaction: string }>;
  onReaction: (messageId: string, reaction: string) => void;
  onReply: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export default function MessageBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  showTimestamp = true,
  currentUserId,
  reactions,
  onReaction,
  onReply,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Group reactions by emoji
  const reactionCounts: Record<
    string,
    { count: number; userReacted: boolean }
  > = {};
  reactions.forEach((r) => {
    if (!reactionCounts[r.reaction]) {
      reactionCounts[r.reaction] = { count: 0, userReacted: false };
    }
    reactionCounts[r.reaction].count++;
    if (r.user_id === currentUserId) {
      reactionCounts[r.reaction].userReacted = true;
    }
  });

  const isCallMessage =
    message.content &&
    (message.content.includes("Video call") ||
      message.content.includes("Voice call"));

  // Render call message with avatar
  if (isCallMessage) {
    return (
      <div
        className={`flex items-end gap-2 ${showTimestamp ? "mb-4" : "mb-1"} ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwnMessage && showAvatar && (
          <Image
            src={message.sender.avatar_url || "https://via.placeholder.com/40"}
            alt={message.sender.name}
            width={40}
            height={40}
            className="rounded-full object-cover max-w-[40px] max-h-[40px] mb-5"
          />
        )}
        {!isOwnMessage && !showAvatar && <div className="w-10 h-10" />}

        <div className={`max-w-[70%]`}>
          <div
            className={`${
              isOwnMessage
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                : "bg-gray-100 text-gray-700"
            } px-4 py-3 rounded-2xl text-base`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{message.content}</span>
              {showTimestamp && (
                <span
                  className={`text-sm mt-1 ${
                    isOwnMessage ? "text-pink-100" : "text-gray-500"
                  }`}
                >
                  {format(new Date(message.created_at), "HH:mm")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 ${showTimestamp ? "mb-4" : "mb-1"} ${
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isOwnMessage && showAvatar && (
        <Image
          src={message.sender.avatar_url || "https://via.placeholder.com/40"}
          alt={message.sender.name}
          width={40}
          height={40}
          className="rounded-full object-cover max-w-[40px] max-h-[40px] mb-5"
        />
      )}
      {!isOwnMessage && !showAvatar && <div className="w-10 h-10" />}
      <div
        className={`max-w-[70%] ${
          isOwnMessage ? "items-end" : "items-start"
        } flex flex-col relative`}
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
      >
        {/* Reaction Picker */}
        {showReactions && (
          <div
            className={`absolute -top-8 ${isOwnMessage ? "right-0" : "left-0"} bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 border border-gray-200 z-10`}
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReaction(message.id, emoji)}
                className="hover:scale-125 transition-transform text-xl"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => onReply(message)}
              className="hover:scale-110 transition-transform text-gray-600 ml-1"
              title="Trả lời"
            >
              <IoArrowUndoOutline size={20} />
            </button>
          </div>
        )}

        {/* Chỉ có ảnh - không gradient */}
        {message.image_url && !message.content && !message.replied_message ? (
          <div
            className="rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setImageModalOpen(true)}
          >
            <Image
              src={message.image_url}
              alt="Attached image"
              width={300}
              height={300}
              className="rounded-2xl object-cover"
            />
          </div>
        ) : (
          <>
            {/* Ảnh riêng - không có background */}
            {message.image_url && (
              <div
                className="mb-2 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setImageModalOpen(true)}
              >
                <Image
                  src={message.image_url}
                  alt="Attached image"
                  width={300}
                  height={300}
                  className="rounded-lg object-cover"
                />
              </div>
            )}
            {/* Text hoặc reply - có background */}
            {(message.content || message.replied_message) && (
              <div
                className={`rounded-2xl px-4 py-3 ${
                  isOwnMessage
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                    : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                }`}
              >
                {/* Replied Message Preview */}
                {message.replied_message && (
                  <div
                    onClick={() =>
                      onScrollToMessage?.(message.reply_to_message_id!)
                    }
                    className={`mb-2 pl-3 border-l-2 ${
                      isOwnMessage ? "border-white/50" : "border-pink-500"
                    } py-1 cursor-pointer hover:opacity-80 transition-opacity`}
                  >
                    <p
                      className={`text-sm ${
                        isOwnMessage ? "text-white/80" : "text-gray-600"
                      } font-medium`}
                    >
                      {message.replied_message.sender.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {message.replied_message.image_url && (
                        <Image
                          src={message.replied_message.image_url}
                          alt="Replied image"
                          width={40}
                          height={40}
                          className="rounded object-cover min-w-[40px] min-h-[40px]"
                        />
                      )}
                      <p
                        className={`text-base ${
                          isOwnMessage ? "text-white/90" : "text-gray-700"
                        } truncate flex-1`}
                      >
                        {message.replied_message.content}
                      </p>
                    </div>
                  </div>
                )}
                {message.content && (
                  <p className="break-words whitespace-pre-wrap text-base">
                    {message.content}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div
            className={`flex gap-1 mt-1 ${
              isOwnMessage ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(reactionCounts).map(
              ([emoji, { count, userReacted }]) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm ${
                    userReacted
                      ? "bg-pink-100 border border-pink-300"
                      : "bg-gray-100 border border-gray-200"
                  } hover:scale-110 transition-transform`}
                >
                  <span>{emoji}</span>
                  <span className="text-gray-700">{count}</span>
                </button>
              ),
            )}
          </div>
        )}

        {showTimestamp && (
          <span className="text-sm text-gray-500 mt-1 px-2">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
        )}
      </div>

      {/* Image Modal */}
      {message.image_url && (
        <ImageModal
          isOpen={imageModalOpen}
          imageUrl={message.image_url}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}
