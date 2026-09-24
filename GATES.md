# Gates: Meirei OKX X Layer Autonomous Mandate Terminal

OWNS: app/**, components/**, lib/**, src/**, skills/**, scripts/**

Scope: Autonomous AI investment mandate terminal on OKX X Layer with 20 allowlisted equities, 4 OKX AI skills, Basic and Advanced modes, and non-custodial multi-channel gateways

- [x] G1: all unit and invariant test suites pass
  CHECK: node scripts/verify-unlazy-gates.mjs test
  EXPECT: [G1_TESTS_PASSED]
  EVIDENCE: automatic-evidence=v1; definition-sha256=289ab25f8fcd5a9e639326bc11812bc30b76c7fe531f5599364988d503669ccd; exit=0; EXPECT=matched; output-sha256=a8af696a3d9518327c43430b230fdf5da947261087eb00142f336c8d310675d3; output-bytes=93; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\User\.gemini\antigravity-ide\scratch\meirei; path=3558d7afb448/49 entries

- [x] G2: all 20 allowlisted tokenized equities verified on chain 196
  CHECK: node scripts/verify-unlazy-gates.mjs allowlist
  EXPECT: [G2_ALLOWLIST_PASSED]
  EVIDENCE: automatic-evidence=v1; definition-sha256=8bdbbaae505a10362c0db2834662d42e318ca8488a0bcb449ae562c80f29697b; exit=0; EXPECT=matched; output-sha256=bc8edb79ad6f5f7d3e28ecd2ad8b1ba5a351c49c6d0376c09ce17bd07df2399d; output-bytes=123; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\User\.gemini\antigravity-ide\scratch\meirei; path=3558d7afb448/49 entries

- [x] G3: all 4 okx ai skills documented and synchronized with telemetry engine
  CHECK: node scripts/verify-unlazy-gates.mjs skills
  EXPECT: [G3_SKILLS_PASSED]
  EVIDENCE: automatic-evidence=v1; definition-sha256=099337a066fd14c5ea92134ad07a9acfb1a01e0c243a34c1a4bd22de69bc11a6; exit=0; EXPECT=matched; output-sha256=8f4ab9ff3d991002572cb737839673e85b66faba9d3dc7085d20a56880154149; output-bytes=101; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\User\.gemini\antigravity-ide\scratch\meirei; path=3558d7afb448/49 entries

- [x] G4: terminal invariants, modes, and gateway requirements verified
  CHECK: node scripts/verify-unlazy-gates.mjs terminal-invariants
  EXPECT: [G4_TERMINAL_INVARIANTS_PASSED]
  EVIDENCE: automatic-evidence=v1; definition-sha256=d4e51f093acdc819726d4550e931e016e2e7739ac26ee61701576184faf6d0ca; exit=0; EXPECT=matched; output-sha256=83368deeb0abf5c59acd040be52039609525a6c32c21c33a3e3aa2b21d735d04; output-bytes=120; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\User\.gemini\antigravity-ide\scratch\meirei; path=3558d7afb448/49 entries

- [x] G5: nextjs production build and route compilation passes
  CHECK: node scripts/verify-unlazy-gates.mjs build
  EXPECT: [G5_BUILD_PASSED]
  EVIDENCE: automatic-evidence=v1; definition-sha256=f962faf3bdc3e7918d4b7d54746eec14dd59a1dc3f4b38a862d585d13f1ef9cc; exit=0; EXPECT=matched; output-sha256=b8851abef99f2ca7b16efa206dcc823855bcacab891a88e90d0112b311f77a0f; output-bytes=93; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\User\.gemini\antigravity-ide\scratch\meirei; path=3558d7afb448/49 entries
