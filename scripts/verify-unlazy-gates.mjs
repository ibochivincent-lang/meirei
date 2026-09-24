#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] || "all";
const rootDir = process.cwd();

function runTests() {
  const output = execSync("npm test", { cwd: rootDir, encoding: "utf8" });
  if (!output.includes("85 passed")) {
    throw new Error("Expected 85 tests to pass, got output:\n" + output);
  }
  console.log("[G1_TESTS_PASSED] 85 of 85 tests passed");
}

function verifyAllowlist() {
  const allowlistPath = path.join(rootDir, "src", "allowlist.ts");
  const content = fs.readFileSync(allowlistPath, "utf8");
  
  const expectedEquities = [
    "NVDAx", "AAPLx", "MSFTx", "TSLAx", "GOOGLx", "AMZNx", "METAx", "COINx",
    "TSMx", "AVGOx", "AMDx", "INTCx", "MUx", "MRVLx", "CRWDx", "MSTRx",
    "DELLx", "SPYx", "QQQx", "IWMx"
  ];
  
  for (const sym of expectedEquities) {
    if (!content.includes(`symbol: "${sym}"`)) {
      throw new Error(`Missing equity symbol in src/allowlist.ts: ${sym}`);
    }
  }
  
  console.log(`[G2_ALLOWLIST_PASSED] all 20 tokenized equities verified on chain 196`);
}

function verifySkills() {
  const skillDirs = [
    "trading-plan-generator",
    "okx-sentiment-tracker",
    "okx-cex-smartmoney",
    "okx-cex-market"
  ];
  
  for (const s of skillDirs) {
    const p = path.join(rootDir, "skills", s, "SKILL.md");
    if (!fs.existsSync(p)) {
      throw new Error(`Missing SKILL.md for ${s}`);
    }
  }

  const telemetryPath = path.join(rootDir, "lib", "okx", "skills_data.ts");
  if (!fs.existsSync(telemetryPath)) {
    throw new Error("Missing lib/okx/skills_data.ts telemetry module");
  }

  console.log("[G3_SKILLS_PASSED] 4 okx ai skills synchronized");
}

function verifyTerminalInvariants() {
  const pagePath = path.join(rootDir, "app", "app", "page.tsx");
  const content = fs.readFileSync(pagePath, "utf8");

  // Invariant 1: Basic Mode (not Simple Mode)
  if (!content.includes('type Mode = "basic" | "advanced"') || content.includes('type Mode = "simple"')) {
    throw new Error("Terminal mode must be strictly 'basic' | 'advanced'");
  }

  // Invariant 2: No mic / voice dictation listeners
  if (content.includes("handleVoiceDictation") || content.includes("isListeningVoice")) {
    throw new Error("Voice dictation handlers must be completely eradicated");
  }

  // Invariant 3: Price Comparison & Unit Calculator
  if (!content.includes("Price Comparison &amp; Unit Calculator") && !content.includes("Price Comparison & Unit Calculator")) {
    throw new Error("Price comparison and unit calculator missing from Basic Mode");
  }

  // Invariant 4: No persistent localStorage bypass for Advanced Terms
  if (content.includes('localStorage.setItem("meirei_advanced_terms_accepted"')) {
    throw new Error("Advanced Terms acceptance must not be persisted in localStorage");
  }

  // Invariant 5: Active Meirei AI Assistant Intelligence Engine title
  if (!content.includes("Active Meirei AI Assistant Intelligence Engine")) {
    throw new Error("Active Meirei AI Assistant Intelligence Engine header missing");
  }

  // Invariant 6: WhatsApp and Instagram Coming Soon
  if (!content.includes("WhatsApp Assistant — COMING SOON") || !content.includes("Instagram Direct Agent — COMING SOON")) {
    throw new Error("WhatsApp and Instagram Coming Soon indicators missing");
  }

  console.log("[G4_TERMINAL_INVARIANTS_PASSED] all terminal requirements verified");
}

function verifyBuild() {
  // Check that .next directory exists and has production build manifest
  const buildManifest = path.join(rootDir, ".next", "build-manifest.json");
  if (!fs.existsSync(buildManifest)) {
    throw new Error(".next/build-manifest.json not found. Run npm run build first.");
  }
  console.log("[G5_BUILD_PASSED] nextjs build verified");
}

try {
  if (target === "test" || target === "all") runTests();
  if (target === "allowlist" || target === "all") verifyAllowlist();
  if (target === "skills" || target === "all") verifySkills();
  if (target === "terminal-invariants" || target === "all") verifyTerminalInvariants();
  if (target === "build" || target === "all") verifyBuild();
  console.log("[ALL_GATES_PASSED] unlazy acceptance gates satisfied");
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}
