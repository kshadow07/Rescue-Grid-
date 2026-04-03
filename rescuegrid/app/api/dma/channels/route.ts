import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  try {
    const channels: Array<{
      id: string;
      type: "victim_thread" | "taskforce_room" | "direct";
      label: string;
      subtitle: string;
      last_message?: string;
      last_message_time?: string;
      unread_count: number;
      is_flagged: boolean;
    }> = [];

    const { data: victimReports, error: vrError } = await supabase
      .from("victim_report")
      .select("id, phone_no, situation, city, district, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (vrError) throw vrError;

    if (victimReports) {
      for (const vr of victimReports) {
        const { data: lastMsg } = await supabase
          .from("message")
          .select("content, created_at, is_flagged_for_dma")
          .eq("victim_report_id", vr.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from("message")
          .select("*", { count: "exact", head: true })
          .eq("victim_report_id", vr.id)
          .is("read_at", null)
          .neq("sender_type", "dma");

        channels.push({
          id: vr.id,
          type: "victim_thread",
          label: `REPORT #KL-${new Date(vr.created_at).getFullYear()}-${vr.id.slice(0, 4).toUpperCase()}`,
          subtitle: `${vr.situation} · ${vr.city || vr.district || "Unknown"}`,
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.created_at,
          unread_count: unreadCount || 0,
          is_flagged: lastMsg?.is_flagged_for_dma || false,
        });
      }
    }

    const { data: taskForces, error: tfError } = await supabase
      .from("task_force")
      .select("id, name, status")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (tfError) throw tfError;

    if (taskForces) {
      for (const tf of taskForces) {
        const { data: lastMsg } = await supabase
          .from("message")
          .select("content, created_at, is_flagged_for_dma")
          .eq("task_force_id", tf.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from("message")
          .select("*", { count: "exact", head: true })
          .eq("task_force_id", tf.id)
          .is("read_at", null)
          .neq("sender_type", "dma");

        const { data: members } = await supabase
          .from("task_force_member")
          .select("volunteer_id")
          .eq("task_force_id", tf.id);

        channels.push({
          id: tf.id,
          type: "taskforce_room",
          label: `TF · ${tf.name}`,
          subtitle: `${members?.length || 0} members`,
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.created_at,
          unread_count: unreadCount || 0,
          is_flagged: lastMsg?.is_flagged_for_dma || false,
        });
      }
    }

    const { data: volunteers, error: volError } = await supabase
      .from("volunteer")
      .select("id, name, type, status")
      .order("name", { ascending: true })
      .limit(20);

    if (volError) throw volError;

    if (volunteers) {
      for (const vol of volunteers) {
        const { data: lastMsg } = await supabase
          .from("message")
          .select("content, created_at, is_flagged_for_dma, read_at")
          .or(`receiver_id.eq.${vol.id},sender_id.eq.${vol.id}`)
          .is("task_force_id", null)
          .is("victim_report_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from("message")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", vol.id)
          .is("task_force_id", null)
          .is("victim_report_id", null)
          .is("read_at", null);

        channels.push({
          id: vol.id,
          type: "direct",
          label: vol.name,
          subtitle: `${vol.type || "Individual"} · ${vol.status === "active" ? "Ready" : "Offline"}`,
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.created_at,
          unread_count: unreadCount || 0,
          is_flagged: lastMsg?.is_flagged_for_dma || false,
        });
      }
    }

    channels.sort((a, b) => {
      if (a.is_flagged && !b.is_flagged) return -1;
      if (!a.is_flagged && b.is_flagged) return 1;
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error("Error fetching channels:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}
