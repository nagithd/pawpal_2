import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { setupCompleted: false, authenticated: false },
        { status: 200 },
      );
    }

    // Check if user has at least one pet (means setup completed)
    const { data: pets, error: petError } = await supabase
      .from("pets")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);

    if (petError) {
      return NextResponse.json(
        { setupCompleted: false, authenticated: true },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        setupCompleted: pets && pets.length > 0,
        authenticated: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Check setup error:", error);
    return NextResponse.json(
      { setupCompleted: false, authenticated: false },
      { status: 200 },
    );
  }
}
