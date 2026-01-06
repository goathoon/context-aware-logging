# Context-Aware Logging & RAG Observability System

> Turning logs from noisy text into truthful, queryable, and trustworthy data.

This project is an experimental observability system that incrementally evolves a traditional logging pipeline into a **context-aware, security-first, and RAG-powered analysis platform**.

Rather than treating logs as plain text for debugging, this system treats each request as a **first-class event** with rich context (Wide Event / Canonical Log Line), enabling analytics-grade debugging, secure retrieval, and AI-assisted reasoning — without sacrificing trust or auditability.

---

## 🚨 Motivation

Modern distributed systems suffer from a fundamental observability problem:

- Logs were designed for monolithic servers, not distributed services
- Context is fragmented across services, databases, caches, and queues
- String-based search (`grep`) cannot reason about structure or relationships
- AI-assisted systems (RAG) introduce new risks: **data leakage, hallucination, and loss of trust**

This project explores a different approach:

> **Logs should tell the truth — with context, structure, and accountability.**

---

## 🎯 Core Principles

- **Phase 1: Wide Event Logging**
  - One request → one context-rich event
- **Phase 1: Structured & High-Cardinality by Design**
  - Logs are optimized for querying, not writing
- **Phase 1: LLM is an Untrusted Entity**
  - Security and authorization must be enforced before and after AI usage
- **Phase 1: Security-by-Design & Privacy-by-Design**
  - Not retrofitted, but embedded from the first pipeline stage
- **Phase 1: End-to-End Traceability**
  - Every AI-generated answer must be auditable back to its source

---

## 🧭 Project Phases

| Phase   | Description                                         | Status |
| ------- | --------------------------------------------------- | ------ |
| Phase 1 | Context-aware logging with NestJS & local JSON logs | ✅     |
| Phase 2 | Persisting logs as queryable assets in MongoDB      | ✅     |
| Phase 3 | RAG-based semantic storage of summarized log events | ✅     |
| Phase 4 | RAG-powered log search & analysis system            | ✅     |
| Phase 5 | Production Hardening: MQ, Caching, Sampling         | ✅     |

---

## 🏗️ Architectural Philosophy (The "Hardening" Perspective)

In Phase 5, the project transitioned from a functional RAG pipeline to a **production-ready infrastructure**. The focus shifted to **Technical Control** and **Resilience**.

### 1. Infrastructure as a Means, Not an End

- **Kafka for Isolation**: Kafka is used not for its own sake, but as a buffer to **decouple logging overhead from business logic**. This ensures that even during a logging storage failure, the primary application remains responsive.
- **Redis for Statelessness**: Distributed caching enables the application to be **stateless and horizontally scalable**, allowing multiple instances to share session context without memory leaks or synchronization issues.

### 2. Engineering Trade-offs (Where We Stopped)

Real engineering is about knowing where to draw the line. We intentionally deferred the following to avoid unnecessary complexity (Over-engineering):

- **Self-Healing Buffers**: Replaced by a simple, predictable **Circuit Breaker** to avoid the "State Management Hell" of replaying logs.
- **Dynamic Sampling Policy**: Swapped for **Deterministic Hash-based Sampling** to ensure explainable and stable log volume control.

### 3. Validation by Experiment

We verify our system not just through unit tests, but through **Operational Scenarios**:

- **Audit 01 (Sampling)**: 2,000 request stress test to prove 80% cost reduction without losing error signals.
- **Audit 02 (Fallback)**: Simulating Kafka failure to prove zero-data-loss through direct-to-DB fallback.
- **Audit 03 (Distributed Cache)**: Verifying session persistence across infrastructure restarts.

---

## 🧱 Tech Stack

- **Backend**: NestJS, TypeScript
- **Observability**: Custom Context
- **Storage**: MongoDB, Vector DB
- **AI / RAG**: LLM + Embeddings
- **Infra (local, Phase 2 ~ 5)**: Docker Compose
- **Tooling**: Cursor, pnpm

---

## 🧠 What This Project Is (and Is Not)

✅ This project **is**:

- A deep exploration of observability, logging, and AI trust
- A system-design-focused portfolio project
- A demonstration of architectural thinking

❌ This project is **not**:

- A production-ready SaaS
- A UI-heavy application
- A generic CRUD demo

---

## 📚 Documentation

See `/docs` for detailed phase-by-phase design and implementation notes.

---

## ⚠️ Disclaimer

This project intentionally prioritizes **architecture, security, and observability principles** over scale or UI completeness.

---

## ✨ Author

### orca1001

Built as a solo systems design and engineering experiment.
