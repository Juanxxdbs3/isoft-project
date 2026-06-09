import { SupabaseClient } from "@supabase/supabase-js";
import { Psychologist, UdecCampus, ShiftType } from "../types/domain.js";
import { IPsychologistRepository } from "./interfaces.js";

export class SupabasePsychologistRepository implements IPsychologistRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Psychologist | null> {
    const { data, error } = await this.client
      .from("psychologist")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find psychologist by id: ${error.message}`);
    }

    return data as Psychologist | null;
  }

  async findByCampus(campus: UdecCampus): Promise<Psychologist[]> {
    const { data, error } = await this.client
      .from("psychologist")
      .select("*")
      .eq("campus", campus);

    if (error) {
      throw new Error(`Failed to find psychologists by campus: ${error.message}`);
    }

    return (data as Psychologist[]) || [];
  }

  async findByCampusAndShift(campus: UdecCampus, shift: ShiftType): Promise<Psychologist[]> {
    const { data, error } = await this.client
      .from("psychologist")
      .select("*")
      .eq("campus", campus)
      .eq("shift", shift);

    if (error) {
      throw new Error(`Failed to find psychologists by campus and shift: ${error.message}`);
    }

    return (data as Psychologist[]) || [];
  }
}
