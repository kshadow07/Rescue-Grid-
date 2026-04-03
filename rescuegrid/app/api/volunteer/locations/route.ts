import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("volunteer")
      .select("id, name, latitude, longitude, status, type, last_seen")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}
