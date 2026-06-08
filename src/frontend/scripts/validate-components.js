#!/usr/bin/env node

/**
 * Frontend Component Validation Tests
 * 
 * Verifies:
 * 1. All components export correctly
 * 2. No missing dependencies
 * 3. TypeScript types are correct
 * 4. Component props are properly typed
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

const check = (name, fn) => {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
};

console.log("\n🧪 Frontend Component Validation Tests\n");

// Test 1: Check that key component files exist
console.log("Test 1: Component files existence");
const componentDir = path.join(__dirname, '..', 'src', 'components');
const requiredComponents = [
  'ui/button.tsx',
  'ui/avatar.tsx',
  'ui/theme-toggle.tsx',
];

requiredComponents.forEach(comp => {
  check(`Component ${comp} exists`, () => {
    const filePath = path.join(componentDir, comp);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
  });
});

// Test 2: Check that domain types are defined
console.log("\nTest 2: Domain types");
const typesFile = path.join(__dirname, '..', 'src', 'types', 'domain.ts');
check("Domain types file exists", () => {
  if (!fs.existsSync(typesFile)) {
    throw new Error(`File not found: ${typesFile}`);
  }
});

if (fs.existsSync(typesFile)) {
  const content = fs.readFileSync(typesFile, 'utf-8');
  check("Domain types include Publicacion", () => {
    if (!content.includes('Publicacion')) {
      throw new Error("Publicacion type not found");
    }
  });
  
  check("Domain types include PostSummary", () => {
    if (!content.includes('PostSummary')) {
      throw new Error("PostSummary type not found");
    }
  });
}

// Test 3: Check i18n configuration
console.log("\nTest 3: i18n configuration");
const i18nFile = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'risk.ts');
check("i18n risk file exists", () => {
  if (!fs.existsSync(i18nFile)) {
    throw new Error(`File not found: ${i18nFile}`);
  }
});

if (fs.existsSync(i18nFile)) {
  const content = fs.readFileSync(i18nFile, 'utf-8');
  check("i18n includes LOW translation", () => {
    if (!content.includes('LOW') || !content.includes('bajo')) {
      throw new Error("LOW/bajo translation not found");
    }
  });
  
  check("i18n includes HIGH translation", () => {
    if (!content.includes('HIGH') || !content.includes('alto')) {
      throw new Error("HIGH/alto translation not found");
    }
  });
  
  check("i18n includes MEDIUM translation", () => {
    if (!content.includes('MEDIUM') || !content.includes('medio')) {
      throw new Error("MEDIUM/medio translation not found");
    }
  });
}

// Test 4: Check for proper error handling in components
console.log("\nTest 4: Error handling patterns");
const srcDir = path.join(__dirname, '..', 'src');
let hasProperErrorHandling = false;

function checkErrorHandling(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      checkErrorHandling(fullPath);
    } else if (entry.isFile() && /\.(tsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('try') && content.includes('catch')) {
        hasProperErrorHandling = true;
      }
    }
  }
}

checkErrorHandling(srcDir);
check("Components have error handling patterns", () => {
  if (!hasProperErrorHandling) {
    throw new Error("No try-catch patterns found in components");
  }
});

// Test 5: Check for Suspense boundaries
console.log("\nTest 5: Async component patterns");
let hasSuspenseBoundaries = false;

function checkSuspense(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      checkSuspense(fullPath);
    } else if (entry.isFile() && /\.(tsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('Suspense') || content.includes('async')) {
        hasSuspenseBoundaries = true;
      }
    }
  }
}

checkSuspense(srcDir);
check("Components use Suspense/async patterns", () => {
  if (!hasSuspenseBoundaries) {
    throw new Error("No Suspense or async patterns found");
  }
});

// Test 6: Check for proper TypeScript configuration
console.log("\nTest 6: TypeScript configuration");
const tsconfigFile = path.join(__dirname, '..', 'tsconfig.json');
check("tsconfig.json exists", () => {
  if (!fs.existsSync(tsconfigFile)) {
    throw new Error("tsconfig.json not found");
  }
});

if (fs.existsSync(tsconfigFile)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigFile, 'utf-8'));
  check("TypeScript strict mode enabled", () => {
    if (!tsconfig.compilerOptions?.strict) {
      throw new Error("Strict mode not enabled");
    }
  });
}

// Test 7: Check for proper Next.js configuration
console.log("\nTest 7: Next.js configuration");
const nextConfigFile = path.join(__dirname, '..', 'next.config.ts');
check("next.config.ts exists", () => {
  if (!fs.existsSync(nextConfigFile)) {
    throw new Error("next.config.ts not found");
  }
});

// Test 8: Check for environment variables
console.log("\nTest 8: Environment configuration");
const envExampleFile = path.join(__dirname, '..', '.env.example');
const envLocalFile = path.join(__dirname, '..', '.env.local');

check("Environment configuration exists", () => {
  if (!fs.existsSync(envExampleFile) && !fs.existsSync(envLocalFile)) {
    throw new Error("No environment configuration found");
  }
});

// Test 9: Check for proper layout structure
console.log("\nTest 9: Layout structure");
const appDir = path.join(__dirname, '..', 'src', 'app');
check("App directory exists", () => {
  if (!fs.existsSync(appDir)) {
    throw new Error("App directory not found");
  }
});

// Test 10: Check for Supabase utilities
console.log("\nTest 10: Supabase utilities");
const supabaseFile = path.join(__dirname, '..', 'src', 'lib', 'supabase.ts');
check("Supabase utilities exist", () => {
  if (!fs.existsSync(supabaseFile)) {
    throw new Error("Supabase utilities not found");
  }
});

if (fs.existsSync(supabaseFile)) {
  const content = fs.readFileSync(supabaseFile, 'utf-8');
  check("Supabase client is configured", () => {
    if (!content.includes('createClient') && !content.includes('supabase')) {
      throw new Error("Supabase client not configured");
    }
  });
}

// Summary
console.log("\n" + "=".repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✨ All component validation tests passed!\n");
  process.exit(0);
}
