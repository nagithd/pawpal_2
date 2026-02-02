import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, callType, duration, isIncoming } = await request.json();

    if (!matchId || !callType || duration === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get user's pet
    const { data: pet } = await supabase
      .from("pets")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // Get match to find other pet's name
    const { data: match } = await supabase
      .from("matches")
      .select(
        `
        pet_1_id,
        pet_2_id,
        pet1:pets!matches_pet_1_id_fkey(name),
        pet2:pets!matches_pet_2_id_fkey(name)
      `,
      )
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const otherPet =
      match.pet_1_id === pet.id ? match.pet2?.[0] : match.pet1?.[0];

    // Format duration
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    let durationText = "";
    if (minutes > 0) {
      durationText = `${minutes}min`;
      if (seconds > 0) {
        durationText += ` ${seconds}s`;
      }
    } else {
      durationText = `${seconds}s`;
    }

    // Create call message - only caller saves, so always show "You called"
    const callTypeText = callType === "video" ? "Video call" : "Voice call";
    let callMessage = `${callTypeText} - ${durationText}`;
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_pet_id: pet.id,
        content: callMessage,
        image_url: null,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error saving call history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
