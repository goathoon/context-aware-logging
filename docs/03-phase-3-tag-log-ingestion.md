# Phase 3 — RAG-Based Log Ingestion: Semantic Enrichment

## Goal

Transform raw Wide Events into **Hybrid-ready semantic artifacts**. Move beyond simple storage to "meaning-aware" data that bridges the gap between structured logs and natural language understanding.

## Key Insights

- **Wide Event is the Context**: Do NOT embed raw, noisy logs. Use the structured Wide Event as the primary material for the LLM's context window.
- **Metadata-First Embedding**: To maximize search accuracy, embed a combination of core metadata (`service`, `route`, `errorCode`) and the semantic summary.
- **Ingest-Time Intelligence**: Analyze and summarize logs at the point of ingestion to reduce latency during the query phase.

## Hybrid Ingestion Pipeline

1. **Structured Ingestion**: Capture the `WideEvent` (Phase 2 legacy).
2. **Semantic Tagging (LLM)**:
   - Generate a `_semanticSummary` (e.g., "Payment failed due to timeout with external gateway").
   - Extract hidden intent or root cause hints.
3. **Metadata-First Embedding**:
   - Construct string: `[Service: ${service}][Route: ${route}][Error: ${errorCode}] ${summary}`.
   - Generate vector embedding using the constructed string.
4. **Dual Persistence**:
   - **MongoDB**: Store the full `WideEvent` for structured queries (Pattern 2).
   - **Vector DB**: Store the vector + `groundingId` (requestId) for semantic search (Pattern 1).

## Security & Redaction

- **PII Scrubbing**: Automatic redaction of sensitive data (emails, cards) before sending to LLM/Embedding providers.
- **Grounding Integrity**: Always preserve the `requestId` to allow jumping from a semantic "feeling" back to the original structured data.

## Success Criteria

1. Logs in MongoDB are enriched with a human-readable `_semanticSummary`.
2. Vector database is populated with metadata-rich embeddings.
3. Search latency for semantic queries is kept under 500ms.
