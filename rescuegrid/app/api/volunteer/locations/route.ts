import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("volunteer")
      .select("id, name, mobile_no, latitude, longitude, status, type, skills, equipment, last_seen")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}
