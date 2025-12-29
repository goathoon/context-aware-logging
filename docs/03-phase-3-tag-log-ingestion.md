# Phase 3 — Deterministic Semantic Enrichment for Wide Events

## Goal

Create deterministic, explainable, and embedding-friendly semantic representations from Wide Events, while preserving lossless ingestion and minimizing operational risk.

This phase intentionally avoids inference-time intelligence and focuses on producing stable semantic artifacts that can be reliably indexed, embedded, and queried.

## Key Ideas

- **Wide Event is the Canonical Context**: Do NOT embed raw, noisy logs or transient runtime data. All semantic processing must be derived from the structured WideEvent, which acts as the single source of truth.
- **Determinism over Intelligence**: Semantic enrichment at this phase must be deterministic, reproducible, and explainable. No speculative inference, interpretation, or root-cause guessing is performed at ingest time.
- **Separation of Concerns**: Ingestion path focuses on durability, speed, and losslessness. Semantic enrichment is asynchronous, retryable, and replaceable.

## Semantic Enrichment Strategy

### What We Do

- Serialize structured log context into a canonical semantic text.
- Generate a `_summary` field without using LLMs.
- Prepare embedding-ready text that is stable across time and environments.

### What We Explicitly Do NOT Do

- Root cause analysis.
- Intent inference.
- Cross-event reasoning.
- LLM-based summarization.
  (Those belong to query-time or later phases.)

## Semantic Serialization (`_summary`)

A deterministic `_summary` field is generated using existing Wide Event data. This summary is not a human narrative, but a semantic descriptor optimized for vector embedding, semantic similarity, and explainable retrieval.

### Summary Construction Example

```ts
const summary = `Outcome: ${error ? 'FAILED' : 'SUCCESS'}
   Service: ${service}
   Route: ${route}
   Error: ${error?.code ?? 'NONE'},
   ErrorMessage: ${error?.message ?? 'NONE'}
   UserRole: ${user?.role ?? 'ANONYMOUS'}
   LatencyBucket: ${bucket(durationMs)}`
```

### Design Notes

- **Fixed Field Order**: Ensures consistency for embedding models.
- **Controlled Vocabulary**: Uses stable terms rather than free-form text.
- **Structural Stability**: Values change, but the structure does not.
- **Bucketing**: Numeric values (like duration) are bucketed to improve semantic stability.

## Implementation Notes

### Revised Hybrid Ingestion Pipeline

- **Structured Ingestion**: Persist WideEvent immediately and durably with no external dependencies in the write path.
- **Deterministic Semantic Serialization**: Generate `_summary` from the stored Wide Event (no LLM, no inference).
- **Embedding Preparation (Deferred)**: `_summary` serves as the canonical embedding input; actual vector generation is performed asynchronously in Phase 4.

### Security & Integrity

- **PII Scrubbing**: Sensitive fields are removed or masked before summary generation. No raw PII is included in `_summary`.
- **Grounding Integrity**: `requestId` is always preserved so semantic results can be traced back to the original structured event.
- **Deterministic Semantics**: No inferred or probabilistic content is introduced at ingest time, supporting auditability.

## Success Criteria

1. Every persisted Wide Event contains a deterministic `_summary`.
2. `_summary` is generated without LLMs or external inference.
3. Embedding inputs are stable, canonical, and reproducible.
4. Semantic search results remain explainable and traceable.
5. Ingestion latency and reliability are unaffected by semantic processing.
6. The Time Series Collection is immutable. Embedding progress is tracked externally using a high-watermark strategy and derived collections.

## Phase Boundary Clarification

Phase 3 defines **semantic form**, not semantic meaning. Meaning extraction, clustering, and insight generation are intentionally deferred to query-time (Phase 4+). This keeps ingestion simple, reliable, and future-proof.
