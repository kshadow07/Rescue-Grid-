import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const digitsOnly = phone.replace(/\D/g, "");
    const last10 = digitsOnly.slice(-10);

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("victim_report")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (data || []).filter((r) => {
      const dbDigits = r.phone_no.replace(/\D/g, "");
      return dbDigits.endsWith(last10);
    });

    return NextResponse.json({ reports: filtered }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}