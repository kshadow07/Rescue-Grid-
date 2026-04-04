import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    
    const { quantity } = body;
    
    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: "Valid quantity (>= 0) is required" },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from("resource")
      .update({ 
        quantity,
        updated_at: new Date().toISOString() 
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error("Update resource error:", err);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}
