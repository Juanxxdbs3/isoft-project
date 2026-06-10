import { SupabaseClient } from "@supabase/supabase-js";
import { ClinicalCase, CaseStatus } from "../types/domain.js";
import { ICaseRepository } from "./interfaces.js";

export class SupabaseCaseRepository implements ICaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<ClinicalCase | null> {
    const { data, error } = await this.client
      .from("clinical_case")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find case by id: ${error.message}`);
    }

    return data as ClinicalCase | null;
  }

  async findByStudentId(studentId: string): Promise<ClinicalCase[]> {
    const { data, error } = await this.client
      .from("clinical_case")
      .select("*")
      .eq("student_id", studentId);

    if (error) {
      throw new Error(`Failed to find cases by student: ${error.message}`);
    }

    return (data as ClinicalCase[]) || [];
  }

  async findByPsychologistId(psychologistId: string): Promise<ClinicalCase[]> {
    const { data, error } = await this.client
      .from("clinical_case")
      .select("*")
      .eq("assigned_psychologist_id", psychologistId);

    if (error) {
      throw new Error(`Failed to find cases by psychologist: ${error.message}`);
    }

    return (data as ClinicalCase[]) || [];
  }

  async findByStatus(status: CaseStatus): Promise<ClinicalCase[]> {
    const { data, error } = await this.client
      .from("clinical_case")
      .select("*")
      .eq("status", status);

    if (error) {
      throw new Error(`Failed to find cases by status: ${error.message}`);
    }

    return (data as ClinicalCase[]) || [];
  }

  async create(data: Partial<ClinicalCase>): Promise<ClinicalCase> {
    const { data: created, error } = await this.client
      .from("clinical_case")
      .insert(data)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create case: ${error.message}`);
    }

    return created as ClinicalCase;
  }

  async update(id: string, data: Partial<ClinicalCase>): Promise<ClinicalCase> {
    const { data: updated, error } = await this.client
      .from("clinical_case")
      .update(data)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update case: ${error.message}`);
    }

    return updated as ClinicalCase;
  }
}
