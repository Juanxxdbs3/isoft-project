import { FastifyReply } from "fastify";

export interface AppError {
  error: string;
  message: string;
  statusCode: number;
}

export function createError(
  code: string,
  message: string,
  statusCode: number
): AppError {
  return { error: code, message, statusCode };
}

export const Errors = {
  INTERNAL_SERVER_ERROR: (message = "Error interno del servidor") =>
    createError("INTERNAL_SERVER_ERROR", message, 500),
  VALIDATION_ERROR: (message = "Datos de entrada inválidos") =>
    createError("VALIDATION_ERROR", message, 422),
  NOT_FOUND: (resource = "Recurso") =>
    createError("NOT_FOUND", `${resource} no encontrado`, 404),
  UNAUTHORIZED: (message = "No autenticado") =>
    createError("UNAUTHORIZED", message, 401),
  FORBIDDEN: (message = "Acceso denegado") =>
    createError("FORBIDDEN", message, 403),
  CONFLICT: (code: string, message: string) =>
    createError(code, message, 409),
  BAD_REQUEST: (message = "Solicitud inválida") =>
    createError("BAD_REQUEST", message, 400),
  PSEUDONYM_ALREADY_TAKEN: () =>
    createError("PSEUDONYM_ALREADY_TAKEN", "El seudónimo ya está en uso", 409),
  STUDENT_CODE_ALREADY_REGISTERED: () =>
    createError(
      "STUDENT_CODE_ALREADY_REGISTERED",
      "Este código estudiantil ya está registrado",
      409
    ),
  TERMS_NOT_ACCEPTED: () =>
    createError(
      "TERMS_NOT_ACCEPTED",
      "Debes aceptar los términos y condiciones",
      400
    ),
  AGE_DECLARATION_REQUIRED: () =>
    createError(
      "AGE_DECLARATION_REQUIRED",
      "Debes declarar que eres mayor de edad",
      400
    ),
  INVALID_CREDENTIALS: () =>
    createError("INVALID_CREDENTIALS", "Credenciales inválidas", 401),
  ACCOUNT_SUSPENDED: () =>
    createError("ACCOUNT_SUSPENDED", "La cuenta está suspendida", 403),
  ACCOUNT_DELETED: (msg?: string) =>
    createError("ACCOUNT_DELETED", msg ?? "La cuenta ha sido desactivada", 409),
} as const;

export function sendError(reply: FastifyReply, err: AppError): void {
  reply.status(err.statusCode).send({
    error: err.error,
    message: err.message,
    statusCode: err.statusCode,
  });
}
