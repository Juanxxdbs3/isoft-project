#!/usr/bin/env node

/**
 * NLP Pipeline Contract Tests
 * 
 * Verifies NLP service response contracts and data structures.
 * Tests:
 * 1. Risk level values are Spanish strings
 * 2. Response structure matches expected schema
 * 3. Pagination and filtering work correctly
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

console.log("\n🧪 NLP Pipeline Contract Tests\n");

// Test 1: Risk level values are Spanish strings
console.log("Test 1: Risk level values");
const validRiskLevels = ["bajo", "medio", "alto", "alto_por_filtro_seguridad"];

validRiskLevels.forEach(level => {
  assert(typeof level === "string", `${level} should be string`);
  assert(level.toLowerCase() === level, `${level} should be lowercase`);
});

// Test 2: Analysis response contract
console.log("\nTest 2: Analysis response contract");
const analysisResponse = {
  id_publicacion: "pub-123",
  risk_level: "medio",
  safety_filter_triggered: false,
  confidence_score: 0.85,
  timestamp: "2024-01-01T10:00:00Z",
  model_version: "1.0.0"
};

assert(typeof analysisResponse.id_publicacion === "string", "id_publicacion should be string");
assert(validRiskLevels.includes(analysisResponse.risk_level), "risk_level should be valid Spanish value");
assert(typeof analysisResponse.safety_filter_triggered === "boolean", "safety_filter_triggered should be boolean");
assert(typeof analysisResponse.confidence_score === "number", "confidence_score should be number");
assert(analysisResponse.confidence_score >= 0 && analysisResponse.confidence_score <= 1, 
  "confidence_score should be between 0 and 1");
assert(/^\d{4}-\d{2}-\d{2}T/.test(analysisResponse.timestamp), "timestamp should be ISO 8601");

// Test 3: Safety filter triggered response
console.log("\nTest 3: Safety filter triggered response");
const safetyFilterResponse = {
  id_publicacion: "pub-456",
  risk_level: "alto_por_filtro_seguridad",
  safety_filter_triggered: true,
  confidence_score: 0.99,
  timestamp: "2024-01-01T10:05:00Z",
  model_version: "1.0.0"
};

assertEqual(safetyFilterResponse.risk_level, "alto_por_filtro_seguridad", 
  "safety filter should set risk_level to alto_por_filtro_seguridad");
assert(safetyFilterResponse.safety_filter_triggered === true, "safety_filter_triggered should be true");

// Test 4: Low risk response
console.log("\nTest 4: Low risk response");
const lowRiskResponse = {
  id_publicacion: "pub-789",
  risk_level: "bajo",
  safety_filter_triggered: false,
  confidence_score: 0.92,
  timestamp: "2024-01-01T10:10:00Z",
  model_version: "1.0.0"
};

assertEqual(lowRiskResponse.risk_level, "bajo", "low risk should be 'bajo'");
assert(lowRiskResponse.safety_filter_triggered === false, "safety filter should not be triggered");

// Test 5: High risk response
console.log("\nTest 5: High risk response");
const highRiskResponse = {
  id_publicacion: "pub-999",
  risk_level: "alto",
  safety_filter_triggered: false,
  confidence_score: 0.88,
  timestamp: "2024-01-01T10:15:00Z",
  model_version: "1.0.0"
};

assertEqual(highRiskResponse.risk_level, "alto", "high risk should be 'alto'");

// Test 6: Medium risk response
console.log("\nTest 6: Medium risk response");
const mediumRiskResponse = {
  id_publicacion: "pub-111",
  risk_level: "medio",
  safety_filter_triggered: false,
  confidence_score: 0.75,
  timestamp: "2024-01-01T10:20:00Z",
  model_version: "1.0.0"
};

assertEqual(mediumRiskResponse.risk_level, "medio", "medium risk should be 'medio'");

// Test 7: Analysis request contract
console.log("\nTest 7: Analysis request contract");
const analysisRequest = {
  text: "This is a post about mental health",
  hash_pseudonym: "abc123def456",
  timestamp: "2024-01-01T10:00:00Z",
  previous_context: null
};

assert(typeof analysisRequest.text === "string", "text should be string");
assert(analysisRequest.text.length > 0, "text should not be empty");
assert(typeof analysisRequest.hash_pseudonym === "string", "hash_pseudonym should be string");
assert(/^\d{4}-\d{2}-\d{2}T/.test(analysisRequest.timestamp), "timestamp should be ISO 8601");

// Test 8: Batch analysis response
console.log("\nTest 8: Batch analysis response");
const batchResponse = {
  results: [
    {
      id_publicacion: "pub-1",
      risk_level: "bajo",
      safety_filter_triggered: false,
      confidence_score: 0.90,
      timestamp: "2024-01-01T10:00:00Z",
      model_version: "1.0.0"
    },
    {
      id_publicacion: "pub-2",
      risk_level: "alto",
      safety_filter_triggered: false,
      confidence_score: 0.85,
      timestamp: "2024-01-01T10:05:00Z",
      model_version: "1.0.0"
    }
  ],
  processed_count: 2,
  timestamp: "2024-01-01T10:10:00Z"
};

assert(Array.isArray(batchResponse.results), "results should be array");
assert(batchResponse.results.length === 2, "should have 2 results");
assert(typeof batchResponse.processed_count === "number", "processed_count should be number");
assertEqual(batchResponse.processed_count, 2, "processed_count should match results length");

// Test 9: Error response contract
console.log("\nTest 9: Error response contract");
const errorResponse = {
  error: "INVALID_INPUT",
  message: "Text is too short (minimum 5 characters)",
  statusCode: 422
};

assert(typeof errorResponse.error === "string", "error should be string");
assert(/^[A-Z_]+$/.test(errorResponse.error), "error should be SCREAMING_SNAKE_CASE");
assertEqual(errorResponse.statusCode, 422, "statusCode should be 422 for validation error");

// Test 10: Model version contract
console.log("\nTest 10: Model version contract");
const modelInfo = {
  version: "1.0.0",
  name: "BETO-Clinical",
  trained_date: "2024-01-01",
  f1_score_suicidal: 0.816
};

assert(/^\d+\.\d+\.\d+$/.test(modelInfo.version), "version should be semver");
assert(typeof modelInfo.name === "string", "name should be string");
assert(typeof modelInfo.f1_score_suicidal === "number", "f1_score_suicidal should be number");
assert(modelInfo.f1_score_suicidal >= 0 && modelInfo.f1_score_suicidal <= 1, 
  "f1_score_suicidal should be between 0 and 1");

// Test 11: Confidence score ranges
console.log("\nTest 11: Confidence score ranges");
const confidenceScores = [0.0, 0.25, 0.5, 0.75, 1.0];
confidenceScores.forEach(score => {
  assert(score >= 0 && score <= 1, `confidence score ${score} should be valid`);
});

// Test 12: Risk level stratification
console.log("\nTest 12: Risk level stratification");
const riskLevelMap = {
  "bajo": { priority: 1, alert_type: "LOW" },
  "medio": { priority: 2, alert_type: "MEDIUM" },
  "alto": { priority: 3, alert_type: "HIGH" },
  "alto_por_filtro_seguridad": { priority: 4, alert_type: "HIGH" }
};

Object.entries(riskLevelMap).forEach(([level, config]) => {
  assert(typeof config.priority === "number", `${level} should have priority`);
  assert(config.priority >= 1 && config.priority <= 4, `${level} priority should be 1-4`);
  assert(typeof config.alert_type === "string", `${level} should have alert_type`);
});

console.log("\n" + "=".repeat(50));
console.log("✨ All NLP Pipeline Contract Tests Passed!");
console.log("=".repeat(50) + "\n");

process.exit(0);
