import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const { commentId } = await request.json();

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 401 },
      );
    }

    // Get comment and post info
    const { data: comment, error: commentError } = await supabase
      .from("post_comments")
      .select("id, user_id, post_id, posts!inner(pet_id, pets!inner(owner_id))")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Không tìm thấy bình luận" },
        { status: 404 },
      );
    }

    // Check if user owns the comment OR owns the post
    const isCommentOwner = comment.user_id === user.id;
    const isPostOwner = (comment.posts as any).pets.owner_id === user.id;

    if (!isCommentOwner && !isPostOwner) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa bình luận này" },
        { status: 403 },
      );
    }

    // Delete comment (replies will be cascade deleted if database has ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: error.message || "Không thể xóa bình luận" },
      { status: 500 },
    );
  }
}
