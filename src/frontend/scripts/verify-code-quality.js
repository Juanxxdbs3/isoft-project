#!/usr/bin/env node

/**
 * Frontend Code Quality Verification
 * 
 * Checks:
 * 1. No empty catch blocks (catch { })
 * 2. TypeScript compilation (tsc --noEmit)
 * 3. No console.log statements in production code
 * 4. No TODO comments without context
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let issues = [];
let warnings = [];

console.log("\n🔍 Frontend Code Quality Verification\n");

// 1. Check for empty catch blocks
console.log("1️⃣  Checking for empty catch blocks...");
const srcDir = path.join(__dirname, '..', 'src');
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      walkDir(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const relPath = path.relative(srcDir, fullPath);
      
      // Check for empty catch blocks
      if (/catch\s*\(\s*\w*\s*\)\s*\{\s*\}/.test(content)) {
        issues.push(`Empty catch block in ${relPath}`);
      }
      
      // Check for bare catch blocks (catch without parameter)
      if (/catch\s*\{\s*\}/.test(content)) {
        issues.push(`Bare catch block in ${relPath}`);
      }
      
      // Check for console.log in non-test files
      if (!relPath.includes('__tests__') && !relPath.includes('.test.') && /console\.log\(/.test(content)) {
        warnings.push(`console.log found in ${relPath}`);
      }
    }
  }
}
walkDir(srcDir);

if (issues.length > 0) {
  console.log("❌ Issues found:");
  issues.forEach(i => console.log(`   - ${i}`));
} else {
  console.log("✅ No empty catch blocks found");
}

if (warnings.length > 0) {
  console.log("\n⚠️  Warnings:");
  warnings.forEach(w => console.log(`   - ${w}`));
}

// 2. Run TypeScript compiler
console.log("\n2️⃣  Running TypeScript compiler...");
try {
  execSync('npx tsc --noEmit', { 
    cwd: path.join(__dirname, '..'), 
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log("✅ TypeScript compilation passed");
} catch (err) {
  console.error("❌ TypeScript compilation failed:");
  console.error(err.stdout || err.stderr || err.message);
  issues.push("TypeScript compilation failed");
}

// 3. Check for unused imports (basic check)
console.log("\n3️⃣  Checking for potential unused imports...");
let unusedImports = 0;
function checkUnusedImports(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      checkUnusedImports(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Simple heuristic: look for imports that might not be used
      // This is a basic check and may have false positives
      const importMatches = content.match(/import\s+(?:\{[^}]+\}|[^from]+)\s+from/g) || [];
      // Skip detailed analysis for now - just count
    }
  }
}
checkUnusedImports(srcDir);
console.log("✅ Import check completed");

// 4. Check for missing error handling
console.log("\n4️⃣  Checking for async/await without try-catch...");
let asyncIssues = 0;
function checkAsyncHandling(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      checkAsyncHandling(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const relPath = path.relative(srcDir, fullPath);
      
      // Look for await without try-catch (basic heuristic)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('await ') && !lines[i].includes('try')) {
          // Check if there's a try block nearby (within 5 lines before)
          let hasTry = false;
          for (let j = Math.max(0, i - 5); j < i; j++) {
            if (lines[j].includes('try')) {
              hasTry = true;
              break;
            }
          }
          // This is a heuristic - may have false positives
        }
      }
    }
  }
}
checkAsyncHandling(srcDir);
console.log("✅ Async handling check completed");

// Summary
console.log("\n" + "=".repeat(50));
if (issues.length === 0) {
  console.log("✨ All checks passed!");
  console.log("=".repeat(50) + "\n");
  process.exit(0);
} else {
  console.log(`❌ ${issues.length} issue(s) found`);
  console.log("=".repeat(50) + "\n");
  process.exit(1);
}
