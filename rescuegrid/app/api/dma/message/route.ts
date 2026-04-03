import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelType = searchParams.get("channel_type");
  const channelId = searchParams.get("channel_id");

  const supabase = await createClient();

  try {
    if (channelType === "victim_thread" && channelId) {
      const { data: messages, error } = await supabase
        .from("message")
        .select("*")
        .eq("victim_report_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (messages && messages.length > 0) {
        const { data: victimReport } = await supabase
          .from("victim_report")
          .select("phone_no")
          .eq("id", channelId)
          .single();

        const phoneNo = victimReport?.phone_no || "Unknown";

        const messagesWithSender = messages.map((msg) => ({
          ...msg,
          sender_name: msg.sender_type === "victim" ? phoneNo : msg.sender_type === "dma" ? "DMA Command" : "Unknown",
        }));

        return NextResponse.json(messagesWithSender);
      }

      return NextResponse.json(messages || []);
    }

    if (channelType === "taskforce_room" && channelId) {
      const { data: messages, error } = await supabase
        .from("message")
        .select(`
          *,
          sender:volunteer(id, name, type)
        `)
        .eq("task_force_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (messages && messages.length > 0) {
        const messagesWithSender = messages.map((msg) => ({
          ...msg,
          sender_name: msg.sender_type === "dma" ? "DMA Command" : msg.sender?.name || "Unknown Volunteer",
        }));

        return NextResponse.json(messagesWithSender);
      }

      return NextResponse.json(messages || []);
    }

    if (channelType === "direct" && channelId) {
      const { data: messages, error } = await supabase
        .from("message")
        .select(`
          *,
          sender:volunteer(id, name, type)
        `)
        .or(`receiver_id.eq.${channelId},sender_id.eq.${channelId}`)
        .is("task_force_id", null)
        .is("victim_report_id", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (messages && messages.length > 0) {
        const messagesWithSender = messages.map((msg) => ({
          ...msg,
          sender_name: msg.sender_type === "dma" ? "DMA Command" : msg.sender?.name || "Unknown",
        }));

        return NextResponse.json(messagesWithSender);
      }

      return NextResponse.json(messages || []);
    }

    return NextResponse.json({ error: "Invalid channel parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { content, channel_type, task_force_id, victim_report_id, receiver_id } = body;

    if (!content || !channel_type) {
      return NextResponse.json(
        { error: "Content and channel_type are required" },
        { status: 400 }
      );
    }

    let insertData: Record<string, unknown> = {
      content,
      sender_type: "dma",
    };

    if (channel_type === "victim_thread" && victim_report_id) {
      insertData.victim_report_id = victim_report_id;
    } else if (channel_type === "taskforce_room" && task_force_id) {
      insertData.task_force_id = task_force_id;
      if (receiver_id) {
        insertData.receiver_id = receiver_id;
      }
    } else if (channel_type === "direct" && receiver_id) {
      insertData.receiver_id = receiver_id;
    } else {
      return NextResponse.json(
        { error: "Invalid channel configuration" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("message")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
