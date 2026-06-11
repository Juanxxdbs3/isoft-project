import {
  Psychologist,
  UdecCampus,
  ShiftType,
  Alert,
  AlertStatus,
  ClinicalCase,
  CaseStatus,
  ChatRoom,
  ChatStatus,
  ChatMessage,
} from "../types/domain.js";

export interface IPsychologistRepository {
  findById(id: string): Promise<Psychologist | null>;
  findByCampus(campus: UdecCampus): Promise<Psychologist[]>;
  findByCampusAndShift(campus: UdecCampus, shift: ShiftType): Promise<Psychologist[]>;
}

export interface IAlertRepository {
  findById(id: string): Promise<Alert | null>;
  findByCampusAndStatus(campus: UdecCampus, status: AlertStatus): Promise<Alert[]>;
  findByPsychologistId(psychologistId: string): Promise<Alert[]>;
  findPendingByCampus(campus: UdecCampus): Promise<Alert[]>;
  updateStatus(id: string, status: AlertStatus, psychologistId?: string): Promise<Alert>;
}

export interface ICaseRepository {
  findById(id: string): Promise<ClinicalCase | null>;
  findByStudentId(studentId: string): Promise<ClinicalCase[]>;
  findByPsychologistId(psychologistId: string): Promise<ClinicalCase[]>;
  findByStatus(status: CaseStatus): Promise<ClinicalCase[]>;
  findActiveByStudent(studentId: string): Promise<{ id: string; status: string } | null>;
  create(data: Partial<ClinicalCase>): Promise<ClinicalCase>;
  update(id: string, data: Partial<ClinicalCase>): Promise<ClinicalCase>;
}

export interface IChatRepository {
  findRoomById(id: string): Promise<ChatRoom | null>;
  findRoomsByPsychologistId(psychologistId: string): Promise<ChatRoom[]>;
  findRoomsByCaseId(caseId: string): Promise<ChatRoom[]>;
  createRoom(data: Partial<ChatRoom>): Promise<ChatRoom>;
  findMessagesByRoomId(roomId: string, cursor?: string, limit?: number): Promise<ChatMessage[]>;
  createMessage(data: Partial<ChatMessage>): Promise<ChatMessage>;
  updateRoomStatus(id: string, status: ChatStatus): Promise<ChatRoom>;
}
