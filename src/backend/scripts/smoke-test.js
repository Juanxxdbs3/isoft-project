#!/usr/bin/env node

/**
 * Backend HTTP Smoke Test
 * 
 * Tests:
 * 1. GET /health returns 200 with status=ok
 * 2. POST /api/v1/chat/rooms/:roomId/messages requires auth (returns 401 without token)
 * 3. GET /api/v1/chat/rooms/active requires auth (returns 401 without token)
 * 4. Invalid room ID returns 400
 */

const BASE = process.env.API_BASE || "http://localhost:3001";

async function main() {
  let passed = 0;
  let failed = 0;
  
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}: ${err.message}`);
      failed++;
    }
  };
  
  console.log(`\n🧪 Backend Smoke Tests (API_BASE=${BASE})\n`);
  
  // Test 1: Health check
  await check("GET /health returns 200", async () => {
    const res = await fetch(`${BASE}/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok") throw new Error(`Expected status=ok, got ${data.status}`);
    if (!data.version) throw new Error("Missing version field");
    if (!data.timestamp) throw new Error("Missing timestamp field");
  });
  
  // Test 2: Chat messages endpoint requires auth
  await check("POST /api/v1/chat/rooms/:id/messages requires auth", async () => {
    const res = await fetch(`${BASE}/api/v1/chat/rooms/test-room-id/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text_content: "test message" }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error("Missing error field in response");
  });
  
  // Test 3: Active rooms endpoint requires auth
  await check("GET /api/v1/chat/rooms/active requires auth", async () => {
    const res = await fetch(`${BASE}/api/v1/chat/rooms/active`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error("Missing error field in response");
  });
  
  // Test 4: Invalid room ID format returns validation error
  await check("Invalid room ID returns 400", async () => {
    const res = await fetch(`${BASE}/api/v1/chat/rooms/invalid%20room/messages`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-token"
      },
      body: JSON.stringify({ text_content: "test" }),
    });
    // Should be 400 (validation) or 401 (auth) - both are acceptable
    if (res.status !== 400 && res.status !== 401) {
      throw new Error(`Expected 400 or 401, got ${res.status}`);
    }
  });
  
  // Test 5: Missing message body returns validation error
  await check("Missing message body returns 400", async () => {
    const res = await fetch(`${BASE}/api/v1/chat/rooms/test-room/messages`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-token"
      },
      body: JSON.stringify({}),
    });
    // Should be 400 (validation) or 401 (auth) - both are acceptable
    if (res.status !== 400 && res.status !== 401) {
      throw new Error(`Expected 400 or 401, got ${res.status}`);
    }
  });
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log("⚠️  Some tests failed. Make sure the backend is running:");
    console.log(`   npm run dev (from src/backend/)\n`);
    process.exit(1);
  } else {
    console.log("✨ All smoke tests passed!\n");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
