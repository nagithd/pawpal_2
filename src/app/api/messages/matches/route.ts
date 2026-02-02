import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Lấy user hiện tại
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lấy pet đầu tiên của user (theo yêu cầu)
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

    // Lấy tất cả matches của pet này
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        pet_1_id,
        pet_2_id,
        created_at,
        pet_1:pets!matches_pet_1_id_fkey(id, name, avatar_url, owner_id),
        pet_2:pets!matches_pet_2_id_fkey(id, name, avatar_url, owner_id)
      `,
      )
      .or(`pet_1_id.eq.${userPetId},pet_2_id.eq.${userPetId}`)
      .order("created_at", { ascending: false });

    if (matchesError) {
      return NextResponse.json(
        { error: matchesError.message },
        { status: 500 },
      );
    }

    // Lấy tin nhắn cuối cùng cho mỗi match
    const matchesWithLastMessage = await Promise.all(
      (matches || []).map(async (match) => {
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, image_url, created_at, sender_pet_id")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Xác định pet còn lại (không phải pet của user)
        const rawOtherPet =
          match.pet_1_id === userPetId ? match.pet_2 : match.pet_1;
        const otherPet = Array.isArray(rawOtherPet)
          ? rawOtherPet[0]
          : rawOtherPet;

        // Lấy thông tin owner để check online status
        const { data: ownerData } = await supabase
          .from("users")
          .select("last_active")
          .eq("id", otherPet.owner_id)
          .single();

        // User được coi là online nếu last_active trong vòng 5 phút
        const isOnline = ownerData?.last_active
          ? new Date().getTime() - new Date(ownerData.last_active).getTime() <
            5 * 60 * 1000
          : false;

        // Đếm số tin nhắn chưa đọc từ người kia
        // Chỉ đếm từ tin nhắn cuối cùng của mình đến tin nhắn mới nhất
        let unreadCount = 0;
        if (lastMessage && lastMessage.sender_pet_id !== userPetId) {
          // Tìm tin nhắn cuối cùng của user
          const { data: lastUserMessage } = await supabase
            .from("messages")
            .select("created_at")
            .eq("match_id", match.id)
            .eq("sender_pet_id", userPetId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Đếm tin nhắn chưa đọc sau tin nhắn cuối của user
          if (lastUserMessage) {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("match_id", match.id)
              .eq("is_read", false)
              .neq("sender_pet_id", userPetId)
              .gt("created_at", lastUserMessage.created_at);
            unreadCount = count || 0;
          } else {
            // Nếu user chưa gửi tin nhắn nào, đếm tất cả tin nhắn chưa đọc
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("match_id", match.id)
              .eq("is_read", false)
              .neq("sender_pet_id", userPetId);
            unreadCount = count || 0;
          }
        }

        return {
          matchId: match.id,
          otherPet,
          lastMessage,
          unreadCount: unreadCount,
          createdAt: match.created_at,
          isOnline,
          lastActive: ownerData?.last_active || null,
        };
      }),
    );

    // Sắp xếp theo thời gian tin nhắn gần nhất
    const sortedMatches = matchesWithLastMessage.sort((a, b) => {
      const timeA = a.lastMessage?.created_at || a.createdAt;
      const timeB = b.lastMessage?.created_at || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    return NextResponse.json({
      matches: sortedMatches,
      currentPetId: userPetId,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
