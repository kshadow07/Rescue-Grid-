import { NextResponse } from "next/server";
import { getVolunteerFromDb } from "@/lib/auth/getVolunteer";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const volunteer = await getVolunteerFromDb();
    
    if (!volunteer) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const supabase = await createClient();
    
    const { data: myAllocations } = await supabase
      .from("resource_allocation")
      .select(`
        *,
        resource:resource_id(name, type, unit, location),
        assignment:assignment_id(task)
      `)
      .eq("volunteer_id", volunteer.id)
      .in("status", ["allocated", "in_use"]);
    
    const { data: taskForces } = await supabase
      .from("task_force_member")
      .select("task_force_id")
      .eq("volunteer_id", volunteer.id);
    
    const taskForceIds = taskForces?.map(t => t.task_force_id) || [];
    
    let tfAllocations: unknown[] = [];
    if (taskForceIds.length > 0) {
      const { data } = await supabase
        .from("resource_allocation")
        .select(`
          *,
          resource:resource_id(name, type, unit, location),
          task_force:task_force_id(name)
        `)
        .in("task_force_id", taskForceIds)
        .in("status", ["allocated", "in_use"]);
      tfAllocations = data || [];
    }
    
    const { data: history } = await supabase
      .from("resource_allocation")
      .select(`
        *,
        resource:resource_id(name, type, unit)
      `)
      .eq("volunteer_id", volunteer.id)
      .in("status", ["consumed", "returned", "lost"])
      .order("updated_at", { ascending: false })
      .limit(20);
    
    return NextResponse.json({
      mine: myAllocations || [],
      taskForce: tfAllocations,
      history: history || [],
    });
  } catch (err) {
    console.error("Get volunteer resources error:", err);
    return NextResponse.json(
      { error: "Failed to get resources" },
      { status: 500 }
    );
  }
}
