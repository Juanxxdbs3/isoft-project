import { SupabaseClient } from "@supabase/supabase-js";
import { ChatRoom, ChatStatus, ChatMessage } from "../types/domain.js";
import { IChatRepository } from "./interfaces.js";

export class SupabaseChatRepository implements IChatRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findRoomById(id: string): Promise<ChatRoom | null> {
    const { data, error } = await this.client
      .from("chat_room")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find chat room by id: ${error.message}`);
    }

    return data as ChatRoom | null;
  }

  async findRoomsByPsychologistId(psychologistId: string): Promise<ChatRoom[]> {
    const { data, error } = await this.client
      .from("chat_room")
      .select("*")
      .eq("psychologist_id", psychologistId);

    if (error) {
      throw new Error(`Failed to find rooms by psychologist: ${error.message}`);
    }

    return (data as ChatRoom[]) || [];
  }

  async findRoomsByCaseId(caseId: string): Promise<ChatRoom[]> {
    const { data, error } = await this.client
      .from("chat_room")
      .select("*")
      .eq("case_id", caseId);

    if (error) {
      throw new Error(`Failed to find rooms by case: ${error.message}`);
    }

    return (data as ChatRoom[]) || [];
  }

  async createRoom(data: Partial<ChatRoom>): Promise<ChatRoom> {
    const { data: created, error } = await this.client
      .from("chat_room")
      .insert(data)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create chat room: ${error.message}`);
    }

    return created as ChatRoom;
  }

  async findMessagesByRoomId(
    roomId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChatMessage[]> {
    let query = this.client
      .from("chat_message")
      .select("*")
      .eq("chat_room_id", roomId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("sent_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find messages by room: ${error.message}`);
    }

    return (data as ChatMessage[]) || [];
  }

  async createMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
    const { data: created, error } = await this.client
      .from("chat_message")
      .insert(data)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create chat message: ${error.message}`);
    }

    return created as ChatMessage;
  }

  async updateRoomStatus(id: string, status: ChatStatus): Promise<ChatRoom> {
    const updateData: Record<string, unknown> = { status };

    if (status === "CLOSED_BY_INACTIVITY" || status === "ARCHIVED") {
      updateData.closed_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from("chat_room")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update chat room status: ${error.message}`);
    }

    return data as ChatRoom;
  }
}
