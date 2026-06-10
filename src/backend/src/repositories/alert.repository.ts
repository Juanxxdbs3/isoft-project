import { SupabaseClient } from "@supabase/supabase-js";
import { Alert, AlertStatus, UdecCampus } from "../types/domain.js";
import { IAlertRepository } from "./interfaces.js";

export class SupabaseAlertRepository implements IAlertRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Alert | null> {
    const { data, error } = await this.client
      .from("alert")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find alert by id: ${error.message}`);
    }

    return data as Alert | null;
  }

  async findByCampusAndStatus(campus: UdecCampus, status: AlertStatus): Promise<Alert[]> {
    const { data, error } = await this.client
      .from("alert")
      .select("*")
      .eq("campus", campus)
      .eq("status", status);

    if (error) {
      throw new Error(`Failed to find alerts by campus and status: ${error.message}`);
    }

    return (data as Alert[]) || [];
  }

  async findByPsychologistId(psychologistId: string): Promise<Alert[]> {
    const { data, error } = await this.client
      .from("alert")
      .select("*")
      .eq("assigned_psychologist_id", psychologistId);

    if (error) {
      throw new Error(`Failed to find alerts by psychologist: ${error.message}`);
    }

    return (data as Alert[]) || [];
  }

  async findPendingByCampus(campus: UdecCampus): Promise<Alert[]> {
    const { data, error } = await this.client
      .from("alert")
      .select("*")
      .eq("campus", campus)
      .in("status", ["PENDING", "COMPLEMENTARY"]);

    if (error) {
      throw new Error(`Failed to find pending alerts by campus: ${error.message}`);
    }

    return (data as Alert[]) || [];
  }

  async updateStatus(id: string, status: AlertStatus, psychologistId?: string): Promise<Alert> {
    const updateData: Record<string, unknown> = { status };

    if (psychologistId) {
      updateData.assigned_psychologist_id = psychologistId;
    }

    if (status === "ACCEPTED") {
      updateData.accepted_at = new Date().toISOString();
    }

    if (["SERVED", "FALSE_POSITIVE", "COMPLEMENTARY"].includes(status)) {
      updateData.closed_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from("alert")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update alert status: ${error.message}`);
    }

    return data as Alert;
  }
}
