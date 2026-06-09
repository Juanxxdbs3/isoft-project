import { Psychologist, UdecCampus, ShiftType } from "../types/domain.js";

export interface IPsychologistRepository {
  findById(id: string): Promise<Psychologist | null>;
  findByCampus(campus: UdecCampus): Promise<Psychologist[]>;
  findByCampusAndShift(campus: UdecCampus, shift: ShiftType): Promise<Psychologist[]>;
}
