import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const { postId } = await request.json();

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

    // Get post and verify ownership
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("pet_id, pets!inner(owner_id)")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Không tìm thấy bài viết" },
        { status: 404 },
      );
    }

    // Check if user owns the pet
    if ((post.pets as any).owner_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa bài viết này" },
        { status: 403 },
      );
    }

    // Delete post (comments will be cascade deleted if database has ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: error.message || "Không thể xóa bài viết" },
      { status: 500 },
    );
  }
}
