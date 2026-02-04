"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/UserContext";
import {
  IoHeart,
  IoChatbubbles,
  IoShareSocial,
  IoSend,
  IoEllipsisHorizontal,
  IoTrash,
  IoCreate,
} from "react-icons/io5";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  pets: {
    name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

interface PostCardProps {
  post: any;
  onPostDeleted?: (postId: string) => void;
}

export default function PostCard({ post, onPostDeleted }: PostCardProps) {
  const supabase = createClient();
  const { user: currentUser, userPet: userPetProp } = useUser();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.post_likes?.[0]?.count || 0);
  const [commentCount, setCommentCount] = useState(
    post.post_comments?.[0]?.count || 0,
  );
  const [shareCount] = useState(0); // Static for now
  const [comments, setComments] = useState<Comment[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    currentUser?.id || null,
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const replyFormRef = useRef<HTMLDivElement>(null);
  const [userPet, setUserPet] = useState<any>(userPetProp || null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const pet = post.pets;
  const DEFAULT_COMMENTS_LIMIT = 5;

  useEffect(() => {
    getCurrentUser();
  }, [post.id, currentUser]);

  useEffect(() => {
    if (currentUserId) {
      loadPostData();
    }
  }, [currentUserId, post.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        replyFormRef.current &&
        !replyFormRef.current.contains(event.target as Node)
      ) {
        setReplyingTo(null);
        setReplyContent("");
      }
    };

    if (replyingTo) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [replyingTo]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setShowPostMenu(false);
        setShowCommentMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCurrentUser = async () => {
    if (currentUser) {
      setCurrentUserId(currentUser.id);
      if (userPetProp) {
        setUserPet(userPetProp);
      }
      // Check if user is the post owner
      if (post.pets?.owner_id === currentUser.id) {
        setIsPostOwner(true);
      }
    }
    setIsLoading(false);
  };

  const loadPostData = async () => {
    // Only fetch user-specific like status
    if (currentUserId) {
      const { data: likeData } = await supabase
        .from("post_likes")
        .select("*")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      setIsLiked(!!likeData);
    }

    // Load comments immediately
    await loadComments();
  };

  const loadComments = async () => {
    // Allow reload when showing all comments or when explicitly called (after add/edit)
    if (commentsLoaded && !showAllComments) {
      setCommentsLoaded(false); // Reset flag to allow reload
    }

    const { data: commentsData } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", post.id)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: true })
      .limit(showAllComments ? 1000 : DEFAULT_COMMENTS_LIMIT);

    if (commentsData) {
      const commentUserIds = [...new Set(commentsData.map((c) => c.user_id))];

      // Get first pet for each user who commented
      const { data: commentPets } = await supabase
        .from("pets")
        .select("owner_id, name, avatar_url")
        .in("owner_id", commentUserIds)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      // Create map of user_id to their first pet
      const commentPetsMap = new Map();
      commentPets?.forEach((pet) => {
        if (!commentPetsMap.has(pet.owner_id)) {
          commentPetsMap.set(pet.owner_id, pet);
        }
      });

      // Load replies for each comment
      const commentsWithReplies = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: replies } = await supabase
            .from("post_comments")
            .select("*")
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          let repliesWithPets = [];
          if (replies && replies.length > 0) {
            const replyUserIds = [...new Set(replies.map((r) => r.user_id))];
            const { data: replyPets } = await supabase
              .from("pets")
              .select("owner_id, name, avatar_url")
              .in("owner_id", replyUserIds)
              .eq("is_active", true)
              .order("created_at", { ascending: true });

            const replyPetsMap = new Map();
            replyPets?.forEach((pet) => {
              if (!replyPetsMap.has(pet.owner_id)) {
                replyPetsMap.set(pet.owner_id, pet);
              }
            });

            repliesWithPets = replies.map((reply) => ({
              ...reply,
              pets: replyPetsMap.get(reply.user_id),
            }));
          }

          return {
            ...comment,
            pets: commentPetsMap.get(comment.user_id),
            replies: repliesWithPets,
          };
        }),
      );

      setComments(commentsWithReplies);
      setCommentsLoaded(true);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    if (isLiked) {
      // Unlike
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);

      setIsLiked(false);
      setLikeCount((prev: number) => prev - 1);
    } else {
      // Like
      await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: currentUserId });

      setIsLiked(true);
      setLikeCount((prev: number) => prev + 1);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Vui lòng nhập nội dung bình luận");
      return;
    }

    setLoadingComment(true);

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      setCommentCount((prev: number) => prev + 1);
      await loadComments();
      toast.success("Đã thêm bình luận");
    } catch (error) {
      console.error("Comment error:", error);
      toast.error("Không thể thêm bình luận");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();

    if (!currentUserId) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    if (!replyContent.trim()) {
      toast.error("Vui lòng nhập nội dung trả lời");
      return;
    }

    setLoadingComment(true);

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: replyContent.trim(),
        parent_comment_id: parentId,
      });

      if (error) throw error;

      setReplyContent("");
      setReplyingTo(null);
      setCommentCount((prev: number) => prev + 1);
      await loadComments();
      toast.success("Đã trả lời");
    } catch (error) {
      console.error("Reply error:", error);
      toast.error("Không thể trả lời");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleLoadMore = async () => {
    setShowAllComments(true);
    await loadComments();
  };

  const confirmDeletePost = () => {
    setConfirmMessage("You are sure you want to delete this post?");
    setConfirmAction(() => executeDeletePost);
    setShowConfirmModal(true);
  };

  const executeDeletePost = async () => {
    try {
      const response = await fetch("/api/posts/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (!response.ok) throw new Error("Failed to delete post");

      toast.success("Deleted post successfully");
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (error) {
      console.error("Delete post error:", error);
      toast.error("Failed to delete post");
    }
  };

  const confirmDeleteComment = (commentId: string) => {
    setConfirmMessage("Are you sure you want to delete this comment?");
    setConfirmAction(() => () => executeDeleteComment(commentId));
    setShowConfirmModal(true);
  };

  const executeDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch("/api/comments/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      // Calculate count decrease before updating state
      const topLevelComment = comments.find((c) => c.id === commentId);
      let countDecrease = 1;

      if (topLevelComment) {
        // Top-level comment: decrease by 1 + number of replies
        countDecrease = 1 + (topLevelComment.replies?.length || 0);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        // It's a reply
        setComments((prev) =>
          prev.map((comment) => ({
            ...comment,
            replies: comment.replies?.filter((r) => r.id !== commentId) || [],
          })),
        );
      }

      // Update count separately
      setCommentCount((count: number) => count - countDecrease);

      toast.success("Deleted comment successfully");
    } catch (error) {
      console.error("Delete comment error:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    try {
      const response = await fetch("/api/comments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content: editingCommentContent }),
      });

      if (!response.ok) throw new Error("Failed to update comment");

      toast.success("Updated comment successfully");
      setEditingCommentId(null);
      setEditingCommentContent("");
      await loadComments();
    } catch (error) {
      console.error("Update comment error:", error);
      toast.error("Failed to update comment");
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
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
        {post.images && post.images.length > 0 && (
          <div className="w-full h-64 bg-gray-300"></div>
        )}
        {/* Actions Skeleton */}
        <div className="px-4 py-3 border-t border-gray-200 flex gap-6">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Pet Info Header */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-200">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
          {pet?.avatar_url ? (
            <img
              src={pet.avatar_url}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            pet?.name?.[0] || "P"
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">
            {pet?.name || "Pet"}
            {isPostOwner && (
              <span className="text-gray-500 font-normal ml-2">(you)</span>
            )}
          </h3>
          <p className="text-lg text-gray-600">{getTimeAgo(post.created_at)}</p>
        </div>
        {isPostOwner && (
          <div className="relative">
            <button
              onClick={() => setShowPostMenu(!showPostMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <IoEllipsisHorizontal className="text-xl text-gray-600" />
            </button>
            {showPostMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setShowPostMenu(false);
                    confirmDeletePost();
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                >
                  <IoTrash /> Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="p-4">
          <p className="text-lg text-gray-800 whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      )}

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div
          className="bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden cursor-pointer"
          onClick={() => {
            setSelectedImage(post.images[0]);
            setShowImageModal(true);
          }}
        >
          <img
            src={post.images[0]}
            loading="lazy"
            decoding="async"
            alt="Post"
            className="w-full h-auto object-contain hover:opacity-95 transition"
          />
        </div>
      )}

      {/* Video */}
      {post.video && (
        <div className="bg-black overflow-hidden">
          <video
            src={post.video}
            controls
            className="w-full h-auto max-h-96 object-contain"
            preload="metadata"
          />
        </div>
      )}

      {/* Interaction Summary */}
      <div className="px-4 py-2 flex items-center gap-4 text-lg text-gray-600">
        <span>{likeCount} Likes</span>
        <span>·</span>
        <span>{commentCount} Comments</span>
        {shareCount > 0 && (
          <>
            <span>·</span>
            <span>{shareCount} Shares</span>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-b border-gray-200 flex items-center gap-6">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition hover:bg-pink-50 px-3 py-1 rounded-lg ${
            isLiked ? "text-pink-500" : "text-gray-600"
          }`}
        >
          <IoHeart className={`text-xl ${isLiked ? "fill-current" : ""}`} />
          <span className="text-lg font-medium">
            {isLiked ? "Liked" : "Like"}
          </span>
        </button>
        <button
          onClick={() => {
            if (!commentsLoaded) loadComments();
            document.getElementById(`comment-input-${post.id}`)?.focus();
          }}
          className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-1 rounded-lg transition"
        >
          <IoChatbubbles className="text-xl" />
          <span className="text-lg font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-1 rounded-lg transition">
          <IoShareSocial className="text-xl" />
          <span className="text-lg font-medium">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      <div className="px-4 py-3">
        {/* Load comments on first interaction */}
        {!commentsLoaded && commentCount > 0 && (
          <button
            onClick={loadComments}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            See {commentCount} comments
          </button>
        )}

        {/* Comments List */}
        {comments.length > 0 && (
          <div className="space-y-3 mb-4">
            {comments.map((comment) => (
              <div key={comment.id}>
                <div
                  className="flex gap-2 group"
                  onMouseEnter={() => setHoveredCommentId(comment.id)}
                  onMouseLeave={() => {
                    setHoveredCommentId(null);
                    if (showCommentMenu !== comment.id)
                      setShowCommentMenu(null);
                  }}
                >
                  <div className="w-8 h-8 mt-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                    {comment.pets?.avatar_url ? (
                      <img
                        src={comment.pets.avatar_url}
                        alt={comment.pets.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{comment.pets?.name?.[0] || "P"}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    {editingCommentId === comment.id ? (
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <p className="font-semibold text-lg text-gray-900 mb-2">
                          {comment.pets?.name || "Pet"}
                        </p>
                        <input
                          type="text"
                          value={editingCommentContent}
                          onChange={(e) =>
                            setEditingCommentContent(e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-lg"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentContent("");
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                          <p className="font-semibold text-lg text-gray-900">
                            {comment.pets?.name || "Pet"}
                          </p>
                          <p className="text-lg text-gray-700">
                            {comment.content}
                          </p>
                        </div>
                        {hoveredCommentId === comment.id &&
                          (currentUserId === comment.user_id ||
                            isPostOwner) && (
                            <div className="absolute top-2 right-2">
                              <button
                                onClick={() =>
                                  setShowCommentMenu(
                                    showCommentMenu === comment.id
                                      ? null
                                      : comment.id,
                                  )
                                }
                                className="p-1 hover:bg-gray-200 rounded-full transition"
                              >
                                <IoEllipsisHorizontal className="text-lg text-gray-600" />
                              </button>
                              {showCommentMenu === comment.id && (
                                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                  {currentUserId === comment.user_id && (
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentContent(
                                          comment.content,
                                        );
                                        setShowCommentMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                                    >
                                      <IoCreate /> Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setShowCommentMenu(null);
                                      confirmDeleteComment(comment.id);
                                    }}
                                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm rounded-lg"
                                  >
                                    <IoTrash /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 ml-3 text-xs text-gray-500">
                      <span>{getTimeAgo(comment.created_at)}</span>
                      <button
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id,
                          )
                        }
                        className="hover:text-gray-400 font-medium"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <div ref={replyFormRef}>
                        <form
                          onSubmit={(e) => handleReply(e, comment.id)}
                          className="flex gap-2 mt-2"
                        >
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Comment your reply..."
                            id={`reply-input-${comment.id}`}
                            className="flex-1 px-3 py-1.5 flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-full text-md text-gray-900 placeholder-gray-500 focus:outline-none focus:border-pink-400"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={loadingComment || !replyContent.trim()}
                            className="px-4 py-2 text-black rounded-full disabled:cursor-not-allowed"
                          >
                            <IoSend />
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-2 ml-4 border-l-2 border-gray-200 pl-3">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="flex gap-2 group"
                            onMouseEnter={() => setHoveredCommentId(reply.id)}
                            onMouseLeave={() => {
                              setHoveredCommentId(null);
                              if (showCommentMenu !== reply.id)
                                setShowCommentMenu(null);
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                              {reply.pets?.avatar_url ? (
                                <img
                                  src={reply.pets.avatar_url}
                                  alt={reply.pets.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{reply.pets?.name?.[0] || "P"}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              {editingCommentId === reply.id ? (
                                <div className="bg-gray-100 rounded-lg px-2 py-1.5">
                                  <p className="font-semibold text-xs text-gray-900 mb-1">
                                    {reply.pets?.name || "Pet"}
                                  </p>
                                  <input
                                    type="text"
                                    value={editingCommentContent}
                                    onChange={(e) =>
                                      setEditingCommentContent(e.target.value)
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() =>
                                        handleEditComment(reply.id)
                                      }
                                      className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentContent("");
                                      }}
                                      className="px-2 py-0.5 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <div className="bg-gray-100 rounded-lg px-2 py-1.5">
                                    <p className="font-semibold text-xs text-gray-900">
                                      {reply.pets?.name || "Pet"}
                                    </p>
                                    <p className="text-xs text-gray-700">
                                      {reply.content}
                                    </p>
                                  </div>
                                  {hoveredCommentId === reply.id &&
                                    (currentUserId === reply.user_id ||
                                      isPostOwner) && (
                                      <div className="absolute top-1 right-1">
                                        <button
                                          onClick={() =>
                                            setShowCommentMenu(
                                              showCommentMenu === reply.id
                                                ? null
                                                : reply.id,
                                            )
                                          }
                                          className="p-0.5 hover:bg-gray-200 rounded-full transition"
                                        >
                                          <IoEllipsisHorizontal className="text-sm text-gray-600" />
                                        </button>
                                        {showCommentMenu === reply.id && (
                                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                            {currentUserId ===
                                              reply.user_id && (
                                              <button
                                                onClick={() => {
                                                  setEditingCommentId(reply.id);
                                                  setEditingCommentContent(
                                                    reply.content,
                                                  );
                                                  setShowCommentMenu(null);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-xs"
                                              >
                                                <IoCreate className="text-sm" />{" "}
                                                Edit
                                              </button>
                                            )}
                                            <button
                                              onClick={() => {
                                                setShowCommentMenu(null);
                                                confirmDeleteComment(reply.id);
                                              }}
                                              className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 text-xs rounded-lg"
                                            >
                                              <IoTrash className="text-sm" />{" "}
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  <p className="text-xs text-gray-500 mt-0.5 ml-2">
                                    {getTimeAgo(reply.created_at)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Comments */}
        {!showAllComments && commentCount > DEFAULT_COMMENTS_LIMIT && (
          <button
            onClick={handleLoadMore}
            className="text-lg text-gray-400 hover:text-gray-300 mb-3"
          >
            Load more comments ({commentCount - DEFAULT_COMMENTS_LIMIT}{" "}
            remaining)
          </button>
        )}

        {/* Comment Input */}
        <form onSubmit={handleComment} className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
            {userPet?.avatar_url ? (
              <img
                src={userPet.avatar_url}
                alt={userPet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{userPet?.name?.[0] || "P"}</span>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              id={`comment-input-${post.id}`}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Comment..."
              className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-full text-md text-gray-900 placeholder-gray-500 focus:outline-none focus:border-pink-400"
              disabled={loadingComment}
            />
            <button
              type="submit"
              disabled={loadingComment || !newComment.trim()}
              className="px-4 py-2 bg-gradient-to-r  text-black rounded-full  disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IoSend />
            </button>
          </div>
        </form>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50  bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm</h3>
            <p className="text-gray-700 mb-6">{confirmMessage}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmAction) confirmAction();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
