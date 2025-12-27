# Phase 4 — RAG-Powered Log Search: Intent-Based Analysis

## Goal

Replace traditional log grep with **Intent-Based Multi-modal Analysis**. Enable the system to decide whether to perform a statistical calculation (Structured) or a root-cause investigation (Semantic).

## Hybrid Query Architecture (Pattern 3)

The system acts as a **Query Planner** to route user questions to the appropriate engine:

### 1. Intent Classification

- **Statistical Intent**: "What is the p95 latency for /payments over the last hour?"
- **Exploratory Intent**: "Why did we see a spike in 500 errors this morning?"

### 2. Multi-modal Execution

- **Path A (Structured)**: NL → LLM → **Mongo Aggregation Pipeline** → Graph/Table.
- **Path B (Semantic)**: NL → Embedding → **Vector Similarity Search** → RAG Summary.
- **Path C (Hybrid)**: Use Semantic search to find the most common error types, then use Structured query to count their occurrences.

## Example Scenarios

| Question                         | Strategy        | Execution                                 |
| :------------------------------- | :-------------- | :---------------------------------------- |
| "Show me the error rate trend"   | **Structured**  | Mongo Aggregation + Visualization         |
| "Why are premium users failing?" | **Hybrid**      | Vector Search (find logs) + LLM Synthesis |
| "Is the system healthy?"         | **Statistical** | Multi-metric health check query           |

## Guardrails & Reliability

- **Source Citation**: Every AI-generated answer must link back to specific `requestId`s.
- **Confidence Scoring**: If the LLM is unsure about the intent or the query result, fallback to raw log display.
- **Query Validation**: Sandbox and validate LLM-generated Mongo queries before execution to prevent data leaks or performance hits.

## Success Criteria

1. Users can query both "Metrics" and "Meanings" using natural language.
2. AI-generated answers include direct links to original MongoDB documents.
3. System accurately distinguishes between "How many?" and "Why?".
