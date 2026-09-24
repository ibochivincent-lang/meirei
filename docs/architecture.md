# Meirei Protocol — Rendered Architecture

Network: OKX X Layer Mainnet (Chain ID 196)  
Protocol: OKX Onchain OS AI Mandate Protocol  

Meirei is an autonomous, non-custodial AI investment mandate execution platform for tokenized equities on OKX X Layer. It coordinates conversational interfaces, zero-database in-memory security gates, the OKX Onchain OS protocol suite, and OKX DEX Aggregation.

---

## 1. End-to-End System Architecture (Rendered Flowchart)

```mermaid
flowchart TD
    subgraph ClientChannels["1. Conversational Client Channels"]
        TG["Telegram Bot\n(@MeireiXLayerBot)"]
        WA["Meta WhatsApp Bot\n(Cloud API Webhook)"]
        WEB["Trading Terminal\n(Web & Mobile Viewport)"]
        WALLET["OKX Wallet Signer\n(EIP-1193 / EIP-712)"]
    end

    subgraph SecurityLayer["2. Zero-Database In-Memory Security & Gateway"]
        AUTH["Deterministic Identity\n(SHA-256 Channel Anchor)"]
        RATE["Token-Bucket Rate Limiter\n(Read vs Trade Tiers)"]
        IDEMP["Idempotency Engine\n(HMAC Replay Guard)"]
        FREEZE["Emergency Circuit Breaker\n(/freeze & /unfreeze code)"]
    end

    subgraph MandateEngine["3. AI Mandate & Advisory Engine"]
        NLP["Natural Language Parser\n(mag7, custom weights, DCA)"]
        DIFF["Convex Rebalance Optimizer\n(Dead-band & dust filter)"]
        BAL["Live Balance Analyzer\n(ERC-20 & USDG Holdings)"]
        ADV["Institutional Advisory Studio\n(Tactical vs Blue-chip Horizons)"]
    end

    subgraph TwoFactorGate["4. Cryptographic 2FA & Signing Barrier"]
        OTP["6-Digit OTP Generator\n(crypto.randomInt)"]
        HMAC["HMAC-SHA256 Token Mint\n(10-min validity horizon)"]
        PASSKEY["WebAuthn Hardware Biometrics\n(Navigator Credentials Enclave)"]
        TIMING["Constant-Time Verification\n(crypto.timingSafeEqual)"]
    end

    subgraph OKXOnchainOS["5. OKX Onchain OS Protocol Bridge"]
        DEX["OKX DEX Aggregator\n(Multi-pool swap quotes)"]
        PAYMASTER["OKX Paymaster / Gas Station\n(100% Gas Sponsored in USDG)"]
        ROUTER["Atomic Router\n(Slippage bounds <= 1.0%)"]
    end

    subgraph XLayerSettlement["6. OKX X Layer Mainnet (Chain ID 196)"]
        NVDA["NVDAx (0x1960...0001)"]
        AAPL["AAPLx (0x1960...0002)"]
        MSFT["MSFTx (0x1960...0003)"]
        META["METAx (0x1960...0006)"]
        GOOGL["GOOGLx (0x1960...0004)"]
        AMZN["AMZNx (0x1960...0005)"]
        TSLA["TSLAx (0x1960...0007)"]
        USDG["USDG / USDC Settlement"]
    end

    TG --> AUTH
    WA --> AUTH
    WEB --> AUTH
    WALLET --> AUTH

    AUTH --> RATE
    RATE --> IDEMP
    IDEMP --> FREEZE

    FREEZE --> NLP
    NLP --> DIFF
    DIFF --> BAL
    BAL --> ADV

    ADV --> OTP
    OTP --> HMAC
    HMAC --> PASSKEY
    PASSKEY --> TIMING

    TIMING --> DEX
    DEX --> PAYMASTER
    PAYMASTER --> ROUTER

    ROUTER --> NVDA
    ROUTER --> AAPL
    ROUTER --> MSFT
    ROUTER --> META
    ROUTER --> GOOGL
    ROUTER --> AMZN
    ROUTER --> TSLA
    ROUTER --> USDG
```

---

## 2. Transaction Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Investor / Trader
    participant Channel as Chat / Terminal (TG/WA/Web)
    participant API as Meirei API (/api/chat)
    participant Engine as Mandate & Diff Engine
    participant Gate as 2FA OTP & WebAuthn Gate
    participant OnchainOS as OKX Onchain OS Router
    participant XLayer as OKX X Layer (Chain 196)

    User->>Channel: "Buy 250 USDG of NVDAx" or "60% mag7, 20% USDG"
    Channel->>API: POST /api/chat { message, walletAddress }
    API->>API: Check Rate Limits & In-Memory Circuit Breaker (/freeze check)
    API->>Engine: parseMandate() & fetchBalances()
    Engine->>Engine: computeDiff() & query DEX Aggregator quote
    Engine-->>API: Preview Quote (Input USDG, Expected Units, Price Impact)
    API-->>Channel: Interactive Confirmation Prompt

    User->>Channel: "confirm" / "yes"
    Channel->>API: POST /api/chat { confirm: true, walletAddress }
    API->>Gate: Trigger 2FA Challenge (OTP or Passkey Biometric)
    Gate-->>Channel: 6-Digit Challenge Issued
    User->>Channel: Input 6-Digit OTP / WebAuthn Hardware Touch
    Channel->>API: Verify Security Token (HMAC-SHA256 constant-time check)

    alt 2FA Verified
        API->>OnchainOS: Execute Swap Batch via OKX DEX Aggregator
        OnchainOS->>XLayer: Atomic Settlement on Chain ID 196
        XLayer-->>OnchainOS: Confirmed Transaction Receipt (0x...)
        OnchainOS-->>API: Tx Hash & Explorer URL
        API-->>Channel: Execution Confirmed with X Layer Explorer Link
        Channel-->>User: Live Receipt & Updated Portfolio NAV
    else 2FA Failed or Timed Out
        API-->>Channel: Execution Aborted (Zero Funds Moved)
    end
```

---

## 3. Component Architecture Matrix

| Layer | Component | Responsibility | Input | Output |
|---|---|---|---|---|
| **Conversational Frontend** | `src/cli.ts` & `app/app/page.tsx` | Accepts mandate directives, renders interactive tables and charts | Text string | Structured mandate payload |
| **Parsing Engine** | `src/mandate/parse.ts` | Normalizes freeform input into target weight distributions | Natural language string | `Mandate { targets, cashSymbol, band }` |
| **Convex Diff Optimizer** | `src/portfolio/diff.ts` | Calculates minimal-trade rebalance legs with dust filters | `Mandate` + `Holding[]` | `Leg[] (side, symbol, notionalUsd)` |
| **Balance Analytics** | `src/portfolio/balances.ts` | Aggregates on-chain balances and portfolio valuation | Wallet address | `Holding[]` + Total NAV |
| **Onchain OS Bridge** | `src/onchainos/index.ts` | Dispatches swap quotes and execution via OKX protocol | `onchainos` CLI / RPC | `Quote[]` and on-chain tx hashes |
| **Security & Identity** | `lib/auth/user_identity.ts` | In-memory deterministic identity resolution without databases | Email / Chat handle | Non-custodial session profile |
| **2FA Verification** | `lib/auth/otp.ts` | Issues & validates constant-time HMAC-SHA256 OTP tokens | 6-digit code | Verified execution token |
| **Hardware Biometrics** | `components/wallet/web3_signing_modal.tsx` | Native WebAuthn biometric hardware signing | Hardware biometric | Digest signature reference |
| **DEX Routing** | OKX DEX Aggregator | Best-execution routing on X Layer | Source/destination tokens | On-chain settlement |
| **Settlement Rails** | OKX X Layer (Chain 196) | Final settlement of tokenized equities | Smart contract call | Immutable block receipt |

---

## 4. Allowlisted xStocks Asset Universe

All assets settle natively against `USDG` on OKX X Layer (Chain ID 196):

```mermaid
graph LR
    subgraph LiquidCash["Cash Anchor"]
        USDG["USDG (Native Stablecoin)"]
        USDC["USDC (Bridged Stablecoin)"]
    end

    subgraph Equities["Tokenized Equities (xStocks)"]
        NVDAx["NVDAx (NVIDIA Corp)"]
        AAPLx["AAPLx (Apple Inc.)"]
        MSFTx["MSFTx (Microsoft Corp)"]
        METAx["METAx (Meta Platforms)"]
        GOOGLx["GOOGLx (Alphabet Inc.)"]
        AMZNx["AMZNx (Amazon.com Inc.)"]
        TSLAx["TSLAx (Tesla Inc.)"]
    end

    USDG <-->|OKX DEX Aggregator| NVDAx
    USDG <-->|OKX DEX Aggregator| AAPLx
    USDG <-->|OKX DEX Aggregator| MSFTx
    USDG <-->|OKX DEX Aggregator| METAx
    USDG <-->|OKX DEX Aggregator| GOOGLx
    USDG <-->|OKX DEX Aggregator| AMZNx
    USDG <-->|OKX DEX Aggregator| TSLAx
```

---

## 5. Security & Circuit Breaker Model

- **Zero-Database Operation**: Identity and security token records operate completely in-memory with deterministic SHA-256 derivation.
- **Emergency Panic Directive**: Sending `/freeze` from Telegram, WhatsApp, or Web immediately revokes active authorization tokens.
- **Cryptographic Unfreeze**: Restoring active trading status requires providing the exact 6-digit recovery code generated during freezing (`/unfreeze <code>`).
- **Gas Sponsorship**: All swap gas costs are sponsored via the OKX Paymaster / Gas Station on X Layer.
