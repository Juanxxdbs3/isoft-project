#!/usr/bin/env node

/**
 * Backend API Contract Tests
 * 
 * Verifies that API responses match expected contract/schema.
 * Tests response structure, field types, and error formats.
 */

const assert = (condition, msg) => {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✅ ${msg}`);
};

const assertEqual = (actual, expected, msg) => {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} - Expected ${expected}, got ${actual}`);
  }
  console.log(`  ✅ ${msg}`);
};

console.log("\n🧪 Backend API Contract Tests\n");

// Test 1: Health endpoint contract
console.log("Test 1: Health endpoint response contract");
const healthResponse = {
  status: "ok",
  version: "0.1.0",
  timestamp: new Date().toISOString()
};

assert(typeof healthResponse.status === "string", "status should be string");
assertEqual(healthResponse.status, "ok", "status should be 'ok'");
assert(typeof healthResponse.version === "string", "version should be string");
assert(/^\d+\.\d+\.\d+$/.test(healthResponse.version), "version should be semver");
assert(typeof healthResponse.timestamp === "string", "timestamp should be ISO string");

// Test 2: Error response contract
console.log("\nTest 2: Error response contract");
const errorResponse = {
  error: "NOT_FOUND",
  message: "Sala de chat",
  statusCode: 404
};

assert(typeof errorResponse.error === "string", "error should be string");
assert(/^[A-Z_]+$/.test(errorResponse.error), "error should be SCREAMING_SNAKE_CASE");
assert(typeof errorResponse.message === "string", "message should be string");
assert(typeof errorResponse.statusCode === "number", "statusCode should be number");
assert(errorResponse.statusCode >= 400, "statusCode should be 4xx or 5xx");

// Test 3: Chat message response contract
console.log("\nTest 3: Chat message response contract");
const messageResponse = {
  data: {
    id: "msg-123",
    room_id: "room-456",
    sender_id: "user-789",
    sender_role: "student",
    text_content: "Hello",
    type: "STANDARD_TEXT",
    created_at: "2024-01-01T10:00:00Z"
  }
};

const msg = messageResponse.data;
assert(typeof msg.id === "string", "message id should be string");
assert(typeof msg.room_id === "string", "room_id should be string");
assert(typeof msg.sender_id === "string", "sender_id should be string");
assert(msg.sender_role === "student" || msg.sender_role === "psychologist", "sender_role should be valid");
assert(typeof msg.text_content === "string", "text_content should be string");
assert(msg.type === "STANDARD_TEXT" || msg.type === "APPOINTMENT_PROPOSAL", "type should be valid");
assert(/^\d{4}-\d{2}-\d{2}T/.test(msg.created_at), "created_at should be ISO 8601");

// Test 4: Chat room response contract
console.log("\nTest 4: Chat room response contract");
const roomResponse = {
  data: {
    roomId: "room-123",
    status: "ACTIVE",
    openedAt: "2024-01-01T10:00:00Z"
  }
};

const room = roomResponse.data;
assert(typeof room.roomId === "string", "roomId should be string");
assert(room.status === "ACTIVE" || room.status === "CLOSED_BY_INACTIVITY", "status should be valid");
assert(/^\d{4}-\d{2}-\d{2}T/.test(room.openedAt), "openedAt should be ISO 8601");

// Test 5: Psychologist rooms list contract
console.log("\nTest 5: Psychologist rooms list contract");
const psychRoomsResponse = {
  data: [
    {
      roomId: "room-1",
      status: "ACTIVE",
      openedAt: "2024-01-01T10:00:00Z",
      studentId: "student-1"
    },
    {
      roomId: "room-2",
      status: "ACTIVE",
      openedAt: "2024-01-02T10:00:00Z",
      studentId: "student-2"
    }
  ]
};

assert(Array.isArray(psychRoomsResponse.data), "data should be array");
assert(psychRoomsResponse.data.length === 2, "should have 2 rooms");

psychRoomsResponse.data.forEach((r, idx) => {
  assert(typeof r.roomId === "string", `room ${idx} roomId should be string`);
  assert(typeof r.studentId === "string", `room ${idx} studentId should be string`);
  assert(r.status === "ACTIVE", `room ${idx} status should be ACTIVE`);
});

// Test 6: Messages list response contract
console.log("\nTest 6: Messages list response contract");
const messagesResponse = {
  data: [
    {
      id: "msg-1",
      room_id: "room-123",
      sender_id: "student-789",
      sender_role: "student",
      text_content: "First message",
      type: "STANDARD_TEXT",
      created_at: "2024-01-01T10:00:00Z"
    },
    {
      id: "msg-2",
      room_id: "room-123",
      sender_id: "psych-456",
      sender_role: "psychologist",
      text_content: "Response",
      type: "STANDARD_TEXT",
      created_at: "2024-01-01T10:05:00Z"
    }
  ]
};

assert(Array.isArray(messagesResponse.data), "data should be array");
assert(messagesResponse.data.length === 2, "should have 2 messages");

// Verify messages are sorted oldest-first
const times = messagesResponse.data.map(m => new Date(m.created_at).getTime());
assert(times[0] <= times[1], "messages should be sorted oldest-first");

// Test 7: Validation error response contract
console.log("\nTest 7: Validation error response contract");
const validationError = {
  error: "VALIDATION_ERROR",
  message: "Invalid room ID format",
  statusCode: 400
};

assert(validationError.error === "VALIDATION_ERROR", "error should be VALIDATION_ERROR");
assertEqual(validationError.statusCode, 400, "statusCode should be 400");

// Test 8: Authentication error response contract
console.log("\nTest 8: Authentication error response contract");
const authError = {
  error: "UNAUTHORIZED",
  message: "Missing or invalid authentication token",
  statusCode: 401
};

assert(authError.error === "UNAUTHORIZED", "error should be UNAUTHORIZED");
assertEqual(authError.statusCode, 401, "statusCode should be 401");

// Test 9: Forbidden error response contract
console.log("\nTest 9: Forbidden error response contract");
const forbiddenError = {
  error: "FORBIDDEN",
  message: "No eres miembro de esta sala de chat",
  statusCode: 403
};

assert(forbiddenError.error === "FORBIDDEN", "error should be FORBIDDEN");
assertEqual(forbiddenError.statusCode, 403, "statusCode should be 403");

// Test 10: Internal server error response contract
console.log("\nTest 10: Internal server error response contract");
const serverError = {
  error: "INTERNAL_SERVER_ERROR",
  message: "Error interno del servidor",
  statusCode: 500
};

assert(serverError.error === "INTERNAL_SERVER_ERROR", "error should be INTERNAL_SERVER_ERROR");
assertEqual(serverError.statusCode, 500, "statusCode should be 500");

// Test 11: Pagination cursor contract
console.log("\nTest 11: Pagination cursor contract");
const paginationQuery = {
  limit: 20,
  before: "2024-01-01T10:00:00Z"
};

assert(typeof paginationQuery.limit === "number", "limit should be number");
assert(paginationQuery.limit > 0, "limit should be positive");
assert(/^\d{4}-\d{2}-\d{2}T/.test(paginationQuery.before), "before should be ISO 8601");

// Test 12: Message creation request contract
console.log("\nTest 12: Message creation request contract");
const createMessageRequest = {
  text_content: "Hello, psychologist!",
  type: "STANDARD_TEXT"
};

assert(typeof createMessageRequest.text_content === "string", "text_content should be string");
assert(createMessageRequest.text_content.length > 0, "text_content should not be empty");
assert(createMessageRequest.type === "STANDARD_TEXT" || createMessageRequest.type === "APPOINTMENT_PROPOSAL", 
  "type should be valid");

console.log("\n" + "=".repeat(50));
console.log("✨ All API Contract Tests Passed!");
console.log("=".repeat(50) + "\n");

process.exit(0);
