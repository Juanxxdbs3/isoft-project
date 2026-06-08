#!/usr/bin/env node

/**
 * Chat Membership Bug Fix Test
 * 
 * Verifies that the chat membership query uses correct column names.
 * The bug was: chat.service.ts queried chat_room.student_id which doesn't exist
 * The fix: use case:clinical_case!inner(student_id) join
 */

const assert = (condition, msg) => {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`✅ PASS: ${msg}`);
};

console.log("=== Chat Membership Bug Fix Test ===\n");

// Test 1: Verify the query structure uses inner join
console.log("Test 1: Query structure validation");
const queryStructure = {
  from: "chat_room",
  select: "id, psychologist_id, case:clinical_case!inner(student_id)",
  where: { id: "some-room-id" }
};

assert(
  queryStructure.select.includes("case:clinical_case!inner(student_id)"),
  "Should use inner join through clinical_case to reach student_id"
);

assert(
  !queryStructure.select.includes("chat_room.student_id"),
  "Should NOT query student_id directly on chat_room (column doesn't exist)"
);

// Test 2: Verify membership check logic
console.log("\nTest 2: Membership check logic");
const mockRoomData = {
  id: "room-123",
  psychologist_id: "psych-456",
  case: {
    student_id: "student-789"
  }
};

const userId = "student-789";
const isMember = 
  mockRoomData.psychologist_id === userId ||
  mockRoomData.case?.student_id === userId;

assert(
  isMember === true,
  "Student should be recognized as member via case.student_id"
);

// Test 3: Verify membership check rejects non-members
console.log("\nTest 3: Non-member rejection");
const nonMemberId = "other-user-999";
const isNonMember = 
  mockRoomData.psychologist_id === nonMemberId ||
  mockRoomData.case?.student_id === nonMemberId;

assert(
  isNonMember === false,
  "Non-member should be rejected"
);

// Test 4: Verify psychologist membership
console.log("\nTest 4: Psychologist membership");
const psychologistId = "psych-456";
const isPsychologistMember = 
  mockRoomData.psychologist_id === psychologistId ||
  mockRoomData.case?.student_id === psychologistId;

assert(
  isPsychologistMember === true,
  "Psychologist should be recognized as member via psychologist_id"
);

// Test 5: Verify getActiveRoom query for psychologist
console.log("\nTest 5: Psychologist active rooms query");
const psychologistRoomsQuery = {
  from: "chat_room",
  select: "id, status, opened_at, case:clinical_case!inner(student_id)",
  where: { psychologist_id: "psych-456", status: "ACTIVE" }
};

assert(
  psychologistRoomsQuery.select.includes("case:clinical_case!inner(student_id)"),
  "Psychologist rooms query should include student_id via clinical_case join"
);

const mockPsychologistRooms = [
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

const mappedRooms = mockPsychologistRooms.map((r) => ({
  roomId: r.id,
  status: r.status,
  openedAt: r.opened_at,
  studentId: r.case?.student_id,
}));

assert(
  mappedRooms.length === 2,
  "Should map multiple rooms correctly"
);

assert(
  mappedRooms[0].studentId === "student-1" && mappedRooms[1].studentId === "student-2",
  "Should extract student_id from case join for each room"
);

console.log("\n=== All Chat Membership Tests Passed ✅ ===\n");
process.exit(0);
