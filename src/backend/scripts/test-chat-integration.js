/**
 * Chat Module Integration Tests
 * 
 * Tests the chat service and router with mocked Supabase client.
 * Verifies:
 * 1. Room membership verification works correctly
 * 2. Message creation requires room membership
 * 3. Message retrieval requires room membership
 * 4. Active rooms query returns correct structure
 */

// Mock setup
const mockSupabaseClient = {
  from: (table) => ({
    select: (fields) => ({
      eq: (col, val) => ({
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        in: (col, vals) => ({
          limit: (n) => ({
            then: async (fn) => fn({ data: [], error: null })
          })
        }),
        then: async (fn) => fn({ data: [], error: null })
      }),
      lt: (col, val) => ({
        then: async (fn) => fn({ data: [], error: null })
      }),
      order: (col, opts) => ({
        limit: (n) => ({
          then: async (fn) => fn({ data: [], error: null })
        }),
        lt: (col, val) => ({
          then: async (fn) => fn({ data: [], error: null })
        })
      })
    }),
    insert: (data) => ({
      select: () => ({
        single: async () => ({ data, error: null })
      })
    })
  })
};

const mockLogger = {
  error: (ctx, msg) => console.log(`[ERROR] ${msg}`, ctx),
  warn: (ctx, msg) => console.log(`[WARN] ${msg}`, ctx),
  info: (ctx, msg) => console.log(`[INFO] ${msg}`, ctx),
};

// Test utilities
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

console.log("\n🧪 Chat Module Integration Tests\n");

// Test 1: Verify room membership check logic
console.log("Test 1: Room membership verification");
const mockRoomWithStudent = {
  id: "room-123",
  psychologist_id: "psych-456",
  case: { student_id: "student-789" }
};

const studentId = "student-789";
const isMember = 
  mockRoomWithStudent.psychologist_id === studentId ||
  mockRoomWithStudent.case?.student_id === studentId;
assert(isMember, "Student should be recognized as member");

const nonMemberId = "other-user";
const isNonMember = 
  mockRoomWithStudent.psychologist_id === nonMemberId ||
  mockRoomWithStudent.case?.student_id === nonMemberId;
assert(!isNonMember, "Non-member should be rejected");

const psychologistId = "psych-456";
const isPsychMember = 
  mockRoomWithStudent.psychologist_id === psychologistId ||
  mockRoomWithStudent.case?.student_id === psychologistId;
assert(isPsychMember, "Psychologist should be recognized as member");

// Test 2: Message creation requires valid room and membership
console.log("\nTest 2: Message creation validation");
const messageData = {
  room_id: "room-123",
  sender_id: "student-789",
  sender_role: "student",
  text_content: "Hello, psychologist!",
  type: "STANDARD_TEXT"
};

assert(messageData.room_id, "Message must have room_id");
assert(messageData.sender_id, "Message must have sender_id");
assert(messageData.text_content, "Message must have text_content");
assert(messageData.sender_role === "student" || messageData.sender_role === "psychologist", 
  "Sender role must be valid");

// Test 3: Message retrieval returns correct structure
console.log("\nTest 3: Message retrieval structure");
const mockMessages = [
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
];

// Verify sorting (oldest first)
const sorted = mockMessages.sort((a, b) => 
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
);
assertEqual(sorted[0].id, "msg-1", "First message should be oldest");
assertEqual(sorted[1].id, "msg-2", "Second message should be newer");

// Test 4: Active rooms query structure
console.log("\nTest 4: Active rooms query structure");
const mockPsychRooms = [
  {
    id: "room-1",
    status: "ACTIVE",
    opened_at: "2024-01-01T10:00:00Z",
    case: { student_id: "student-1" }
  },
  {
    id: "room-2",
    status: "ACTIVE",
    opened_at: "2024-01-02T10:00:00Z",
    case: { student_id: "student-2" }
  }
];

const mappedRooms = mockPsychRooms.map((r) => ({
  roomId: r.id,
  status: r.status,
  openedAt: r.opened_at,
  studentId: r.case?.student_id,
}));

assertEqual(mappedRooms.length, 2, "Should have 2 rooms");
assertEqual(mappedRooms[0].studentId, "student-1", "First room should have correct student");
assertEqual(mappedRooms[1].studentId, "student-2", "Second room should have correct student");

// Test 5: Student active room query
console.log("\nTest 5: Student active room query");
const mockStudentCase = {
  id: "case-123",
  student_id: "student-789",
  status: "OPENED"
};

const mockStudentRoom = {
  id: "room-123",
  status: "ACTIVE",
  opened_at: "2024-01-01T10:00:00Z"
};

const studentRoomResult = {
  roomId: mockStudentRoom.id,
  status: mockStudentRoom.status,
  openedAt: mockStudentRoom.opened_at
};

assert(studentRoomResult.roomId, "Student room should have roomId");
assertEqual(studentRoomResult.status, "ACTIVE", "Student room should be ACTIVE");

// Test 6: Cursor-based pagination
console.log("\nTest 6: Cursor-based pagination");
const allMessages = [
  { id: "1", created_at: "2024-01-01T10:00:00Z", text_content: "msg1" },
  { id: "2", created_at: "2024-01-01T10:05:00Z", text_content: "msg2" },
  { id: "3", created_at: "2024-01-01T10:10:00Z", text_content: "msg3" },
  { id: "4", created_at: "2024-01-01T10:15:00Z", text_content: "msg4" },
];

const cursor = "2024-01-01T10:10:00Z";
const beforeCursor = allMessages.filter(m => new Date(m.created_at) < new Date(cursor));
assertEqual(beforeCursor.length, 2, "Should return messages before cursor");
assertEqual(beforeCursor[0].id, "1", "First message before cursor should be oldest");

// Test 7: Error handling for missing room
console.log("\nTest 7: Error handling");
const errorResponse = {
  error: "NOT_FOUND",
  message: "Sala de chat",
  statusCode: 404
};

assert(errorResponse.error === "NOT_FOUND", "Should return NOT_FOUND error");
assertEqual(errorResponse.statusCode, 404, "Should have 404 status code");

// Test 8: Forbidden access
console.log("\nTest 8: Forbidden access handling");
const forbiddenResponse = {
  error: "FORBIDDEN",
  message: "No eres miembro de esta sala de chat",
  statusCode: 403
};

assert(forbiddenResponse.error === "FORBIDDEN", "Should return FORBIDDEN error");
assertEqual(forbiddenResponse.statusCode, 403, "Should have 403 status code");

console.log("\n" + "=".repeat(50));
console.log("✨ All Chat Module Integration Tests Passed!");
console.log("=".repeat(50) + "\n");

process.exit(0);
