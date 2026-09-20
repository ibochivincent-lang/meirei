# PostgreSQL & X Layer Data Backup & Disaster Recovery Architecture

**Author:** IboTV  
**System:** Meirei Protocol (Chain ID 196)  
**Classification:** Operational Security & Business Continuity Runbook  

---

## 1. Backup Strategy Overview

Meirei maintains a dual-tier data resilience policy:
1. **On-Chain Immutability:** All final settlement trades, transaction hashes, and fee disbursements are permanently sealed in X Layer blocks (anchored to Ethereum via Polygon CDK ZK proofs).
2. **Off-Chain Relational State:** Mandate configurations, user chat links, and portfolio snapshots stored in PostgreSQL are backed up using continuous archiving and automated snapshots.

---

## 2. Backup Tiers & Cadence

| Tier | Backup Type | Frequency | Retention | Storage Destination |
|---|---|---|---|---|
| **Tier 1: Continuous WAL** | Write-Ahead Logging (WAL) stream | Real-time (continuous) | 30 Days | Encrypted Geo-Replicated Object Store |
| **Tier 2: Daily Full** | `pg_dump` physical base snapshot | Every 24h at 02:00 UTC | 90 Days | Off-site Cold Storage (Multi-region) |
| **Tier 3: Pre-Migration** | Full schema + data dump | Triggered before DDL | Indefinite | Air-gapped Release Vault |

---

## 3. Recovery Time & Point Objectives (RTO / RPO)

- **Recovery Point Objective (RPO):** < 60 seconds (utilizing continuous WAL archiving).
- **Recovery Time Objective (RTO):** < 15 minutes to complete restore and DNS failover.

---

## 4. Manual Restoration Runbook

In the event of database failover:

```bash
# 1. Fetch latest verified base backup
aws s3 cp s3://meirei-backups-secure/daily/meirei_prod_latest.sql.gz ./meirei_restore.sql.gz

# 2. Decompress and verify SHA-256 signature
gzip -d meirei_restore.sql.gz
sha256sum -c meirei_restore.sql.sha256

# 3. Restore schema and data into standby node
psql "$STANDBY_DATABASE_URL" < meirei_restore.sql

# 4. Replay WAL up to target timestamp
pg_waldump /var/lib/postgresql/wal | psql "$STANDBY_DATABASE_URL"
```

---

## 5. Verification & Integrity Checks

- Automated restore test runs on the 1st of every month to an isolated staging environment.
- Health monitor (`/api/health`) continuously verifies active pool connections.
