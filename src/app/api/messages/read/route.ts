import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 },
      );
    }

    // Lấy user hiện tại
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lấy pet đầu tiên của user
    const { data: pets, error: petsError } = await supabase
      .from("pets")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1);

    if (petsError || !pets || pets.length === 0) {
      return NextResponse.json(
        { error: "No active pets found" },
        { status: 404 },
      );
    }

    const userPetId = pets[0].id;


    // Mark ALL unread messages from other pet as read
    // Simple: just mark all messages in this match that are NOT from current user and are unread
    const { data, error: updateError } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("match_id", matchId)
      .eq("is_read", false)
      .neq("sender_pet_id", userPetId)
      .select();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedCount: data?.length });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
