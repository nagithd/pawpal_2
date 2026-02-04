import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const { commentId, content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Nội dung không được để trống" },
        { status: 400 },
      );
    }

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

    // Get comment and verify ownership
    const { data: comment, error: commentError } = await supabase
      .from("post_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Không tìm thấy bình luận" },
        { status: 404 },
      );
    }

    // Check if user owns the comment
    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn chỉ có thể chỉnh sửa bình luận của mình" },
        { status: 403 },
      );
    }

    // Update comment
    const { error: updateError } = await supabase
      .from("post_comments")
      .update({ content: content.trim() })
      .eq("id", commentId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update comment error:", error);
    return NextResponse.json(
      { error: error.message || "Không thể cập nhật bình luận" },
      { status: 500 },
    );
  }
}
