import { Injectable, Logger } from "@nestjs/common";
import { SearchUseCase } from "@embeddings/in-ports";
import {
  EmbeddingPort,
  RerankPort,
  SynthesisPort,
  LogStoragePort,
} from "@embeddings/out-ports";
import { AnalysisResult, AnalysisIntent } from "@embeddings/domain";
import {
  STATISTIC_KEYWORDS,
  SEMANTIC_KEYWORDS,
  AGGREGATION_KEYWORDS,
} from "@embeddings/value-objects/filter";
import { QueryPreprocessorService } from "./query-preprocessor.service";
import { AggregationService } from "./aggregation.service";
import { SessionCacheService } from "./session-cache.service";
import { QueryReformulationService } from "./query-reformulation.service";
import { ContextCompressionService } from "./context-compression.service";
import { SemanticCacheService } from "./semantic-cache.service";

@Injectable()
export class SearchService extends SearchUseCase {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly embeddingPort: EmbeddingPort,
    private readonly rerankPort: RerankPort,
    private readonly synthesisPort: SynthesisPort,
    private readonly logStoragePort: LogStoragePort,
    private readonly queryPreprocessor: QueryPreprocessorService,
    private readonly aggregation: AggregationService,
    private readonly sessionCache: SessionCacheService,
    private readonly queryReformulation: QueryReformulationService,
    private readonly contextCompression: ContextCompressionService,
    private readonly semanticCache: SemanticCacheService,
  ) {
    super();
  }

  /**
   * Performs a full RAG (Retrieval-Augmented Generation) search.
   * @param query The user's natural language question.
   * @param sessionId The session ID for chat history.
   * @returns The analysis result containing the answer, confidence, and source.
   */
  async ask(query: string, sessionId?: string): Promise<AnalysisResult> {
    this.logger.log(
      `Processing RAG query: "${query}" (Session: ${sessionId || "none"})`,
    );

    try {
      const metadata = await this.synthesisPort.extractMetadata(query);
      const intent = this.classifyIntent(query);
      this.logger.log(`Extracted metadata: ${JSON.stringify(metadata)}`);
      this.logger.log(`Detected intent: ${intent}`);

      // Route to statistical or semantic handler
      if (intent === AnalysisIntent.STATISTICAL) {
        return await this.handleStatisticalQuery(query, metadata, sessionId);
      }

      // Default to semantic query handling
      return await this.handleSemanticQuery(query, metadata, sessionId);
    } catch (error) {
      this.logger.error(`RAG process failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handles semantic queries using vector search + rerank + synthesis.
   */
  private async handleSemanticQuery(
    query: string,
    metadata: any,
    sessionId?: string,
  ): Promise<AnalysisResult> {
    const intent = AnalysisIntent.SEMANTIC;

    let history: AnalysisResult[] = [];
    if (sessionId) {
      history = await this.sessionCache.getHistory(sessionId);
      this.logger.debug(
        `Retrieved ${history.length} history turns for session ${sessionId}`,
      );
    }

    const reformulatedQuery = await this.queryReformulation.reformulateQuery(
      query,
      history,
    );

    const compressedHistory =
      history.length > 10
        ? await this.contextCompression.compressHistory(history)
        : history;

    const structuredQuery = this.queryPreprocessor.preprocessQuery(
      reformulatedQuery,
      metadata,
    );
    this.logger.log(
      `\n\n 
        Original query: "${query}" \n\n
        -> Structured query: "${structuredQuery}" \n\n`,
    );

    const { embedding } =
      await this.embeddingPort.createEmbedding(structuredQuery);

    this.logger.log(
      `Performing vector search with embedding (dimension: ${embedding.length}), metadata: ${JSON.stringify(metadata)}`,
    );

    // Check semantic cache first
    let vectorResults = this.semanticCache.getCachedResults(
      embedding,
      metadata,
    );

    if (vectorResults) {
      this.logger.log(
        `Semantic cache hit! Using cached vector results (${vectorResults.length} results)`,
      );
    } else {
      // Cache miss - perform vector search
      this.logger.log("Semantic cache miss, performing vector search");
      vectorResults = await this.logStoragePort.vectorSearch(
        embedding,
        10,
        metadata,
      );

      // Cache the results for future similar queries
      if (vectorResults && vectorResults.length > 0) {
        this.semanticCache.setCachedResults(embedding, metadata, vectorResults);
      }
    }

    this.logger.log(
      `Vector search returned ${vectorResults?.length || 0} results`,
    );

    if (!vectorResults || vectorResults.length === 0) {
      this.logger.warn(
        `No vector search results found. This could mean:
          1. No embeddings exist in wide_events_embedded collection
          2. Service filter is too strict (filtering by: ${metadata.service || "none"})
          3. Vector search index may not be properly configured
          Consider running: POST /embeddings/batch?limit=100 to create embeddings`,
      );
      return this.createEmptyResult(query, intent, sessionId);
    }

    if (vectorResults.length > 0) {
      this.logger.log(
        `Top 3 vector search results:\n${vectorResults
          .slice(0, 3)
          .map(
            (r, i) =>
              `  ${i + 1}. Score: ${r.score?.toFixed(4) || "N/A"}, Summary: ${r.summary?.substring(0, 100) || "N/A"}`,
          )
          .join("\n")}`,
      );
    }

    const documentsForRerank = vectorResults.map((res) => res.summary);
    const rerankedIndices = await this.rerankPort.rerank(
      query,
      documentsForRerank,
      5,
    );
    this.logger.log(
      `Reranked indices: ${JSON.stringify(rerankedIndices, null, 2)}`,
    );
    const topResults = rerankedIndices.map((item) => vectorResults[item.index]);

    this.logger.log(`Top results: ${JSON.stringify(topResults, null, 2)}`);

    const eventIds = topResults.map((res) => res.eventId);

    let fullLogs = await this.logStoragePort.getLogsByEventIds(eventIds);
    this.logger.log(`Full logs: ${JSON.stringify(fullLogs, null, 2)}`);
    if (metadata.hasError || metadata.errorCode) {
      fullLogs = fullLogs.filter((log) => {
        if (metadata.hasError && !log.error) {
          return false;
        }
        if (metadata.errorCode && log.error?.code !== metadata.errorCode) {
          return false;
        }
        return true;
      });
      this.logger.log(`Filtered logs: ${JSON.stringify(fullLogs, null, 2)}`);
      if (fullLogs.length === 0) {
        this.logger.warn(
          `Post-filtering removed all results. Original count: ${eventIds.length}, Filtered: 0`,
        );
      }
    }

    const requestIds = fullLogs.map((log) => log.requestId).filter(Boolean);

    const { answer, confidence } = await this.synthesisPort.synthesize(
      reformulatedQuery,
      fullLogs,
      compressedHistory,
    );

    // Grounding Verification: Fact-check the answer against grounding context
    let finalAnswer = answer;
    let finalConfidence = confidence;
    try {
      const verification = await this.synthesisPort.verifyGrounding(
        reformulatedQuery,
        answer,
        fullLogs,
      );

      this.logger.log(
        `Grounding verification: ${verification.status}, action: ${verification.action}`,
      );

      // Apply verification results
      if (verification.action === "REJECT_ANSWER") {
        finalAnswer = "Not enough evidence to provide a reliable answer.";
        finalConfidence = 0;
        this.logger.warn(
          `Answer rejected due to insufficient grounding. Unverified claims: ${verification.unverifiedClaims.join(", ")}`,
        );
      } else if (verification.action === "ADJUST_CONFIDENCE") {
        // Adjust confidence based on verification result
        finalConfidence = Math.min(
          confidence,
          confidence * verification.confidenceAdjustment,
        );
        if (verification.unverifiedClaims.length > 0) {
          finalAnswer = `${answer}\n\n[Note: Some claims could not be fully verified: ${verification.unverifiedClaims.join(", ")}]`;
        }
        this.logger.log(
          `Confidence adjusted from ${confidence} to ${finalConfidence} based on verification`,
        );
      }
      // If action is "KEEP_ANSWER", use original answer and confidence
    } catch (error) {
      this.logger.error(
        `Grounding verification failed, using original answer: ${error.message}`,
      );
      // On verification error, use original answer but log the issue
    }

    const result: AnalysisResult = {
      question: query,
      intent,
      answer: finalAnswer,
      sources: requestIds,
      confidence: finalConfidence,
      sessionId,
    };

    if (sessionId) {
      await this.sessionCache.updateSession(sessionId, result);
    }

    return result;
  }

  /**
   * Handles statistical/aggregation queries using MongoDB aggregation pipelines.
   */
  private async handleStatisticalQuery(
    query: string,
    metadata: any,
    sessionId?: string,
  ): Promise<AnalysisResult> {
    const intent = AnalysisIntent.STATISTICAL;
    this.logger.log(`Handling statistical query: "${query}"`);

    try {
      let history: AnalysisResult[] = [];
      if (sessionId) {
        history = await this.sessionCache.getHistory(sessionId);
        this.logger.debug(
          `Retrieved ${history.length} history turns for session ${sessionId}`,
        );
      }

      const reformulatedQuery = await this.queryReformulation.reformulateQuery(
        query,
        history,
      );

      const compressedHistory =
        history.length > 10
          ? await this.contextCompression.compressHistory(history)
          : history;

      const { templateId, params } =
        await this.synthesisPort.analyzeStatisticalQuery(
          reformulatedQuery,
          metadata,
        );
      this.logger.log(
        `LLM detected template: ${templateId}, params: ${JSON.stringify(params)}`,
      );

      const aggregationResults = await this.aggregation.executeTemplate(
        templateId,
        params,
      );

      let contextLogs: any[] = [];
      if (aggregationResults && aggregationResults.length > 0) {
        const { embedding } =
          await this.embeddingPort.createEmbedding(reformulatedQuery);
        const searchMetadata = params.metadata || metadata;

        // Check semantic cache first
        contextLogs = this.semanticCache.getCachedResults(
          embedding,
          searchMetadata,
        );

        if (contextLogs.length > 0) {
          this.logger.log(
            `Semantic cache hit for statistical query context logs (${contextLogs.length} results)`,
          );
          // Limit to 5 as requested
          contextLogs = contextLogs.slice(0, 5);
        } else {
          // Cache miss - perform vector search
          this.logger.log(
            "Semantic cache miss for statistical query, performing vector search",
          );
          contextLogs = await this.logStoragePort.vectorSearch(
            embedding,
            5,
            searchMetadata,
          );

          // Cache the results for future similar queries
          if (contextLogs && contextLogs.length > 0) {
            this.semanticCache.setCachedResults(
              embedding,
              searchMetadata,
              contextLogs,
            );
          }
        }
      }

      const synthesisContext = {
        aggregationResults,
        contextLogs: contextLogs.slice(0, 5),
      };

      const { answer, confidence } = await this.synthesisPort.synthesize(
        reformulatedQuery,
        [synthesisContext],
        compressedHistory,
      );

      // Grounding Verification: Fact-check the answer against grounding context
      let finalAnswer = answer;
      let finalConfidence = confidence;
      try {
        // Prepare grounding context for verification (aggregation results + context logs)
        const verificationContext = [
          ...(aggregationResults || []),
          ...(contextLogs.slice(0, 5) || []),
        ];

        const verification = await this.synthesisPort.verifyGrounding(
          reformulatedQuery,
          answer,
          verificationContext,
        );

        this.logger.log(
          `Grounding verification: ${verification.status}, action: ${verification.action}`,
        );

        // Apply verification results
        if (verification.action === "REJECT_ANSWER") {
          finalAnswer = "Not enough evidence to provide a reliable answer.";
          finalConfidence = 0;
          this.logger.warn(
            `Answer rejected due to insufficient grounding. Unverified claims: ${verification.unverifiedClaims.join(", ")}`,
          );
        } else if (verification.action === "ADJUST_CONFIDENCE") {
          // Adjust confidence based on verification result
          finalConfidence = Math.min(
            confidence,
            confidence * verification.confidenceAdjustment,
          );
          if (verification.unverifiedClaims.length > 0) {
            finalAnswer = `${answer}\n\n[Note: Some claims could not be fully verified: ${verification.unverifiedClaims.join(", ")}]`;
          }
          this.logger.log(
            `Confidence adjusted from ${confidence} to ${finalConfidence} based on verification`,
          );
        }
        // If action is "KEEP_ANSWER", use original answer and confidence
      } catch (error) {
        this.logger.error(
          `Grounding verification failed, using original answer: ${error.message}`,
        );
        // On verification error, use original answer but log the issue
      }

      const requestIds = aggregationResults
        ? aggregationResults
            .flatMap((result: any) =>
              result.examples
                ? result.examples.map((ex: any) => ex.requestId)
                : [],
            )
            .filter(Boolean)
        : [];

      const result: AnalysisResult = {
        question: query,
        intent,
        answer: finalAnswer,
        sources: requestIds,
        confidence: finalConfidence,
        sessionId,
      };

      if (sessionId) {
        await this.sessionCache.updateSession(sessionId, result);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Statistical query handling failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getChatHistory(sessionId: string): Promise<AnalysisResult[]> {
    return this.sessionCache.getHistory(sessionId);
  }

  private classifyIntent(query: string): AnalysisIntent {
    const lowerQuery = query.toLowerCase();
    const statisticalKeywords = STATISTIC_KEYWORDS;
    const semanticKeywords = SEMANTIC_KEYWORDS;

    const aggregationKeywords = AGGREGATION_KEYWORDS;

    if (
      aggregationKeywords.some((k) => lowerQuery.includes(k)) ||
      statisticalKeywords.some((k) => lowerQuery.includes(k))
    ) {
      return AnalysisIntent.STATISTICAL;
    } else if (semanticKeywords.some((k) => lowerQuery.includes(k))) {
      return AnalysisIntent.SEMANTIC;
    }

    return AnalysisIntent.UNKNOWN;
  }

  /**
   * Creates an empty result for a query.
   * @param question The query.
   * @param intent The intent.
   * @param sessionId The session ID.
   * @returns The empty result.
   */
  private createEmptyResult(
    question: string,
    intent: AnalysisIntent,
    sessionId?: string,
  ): AnalysisResult {
    return {
      question,
      intent,
      answer: "Not enough evidence.",
      sources: [],
      sessionId,
      confidence: 0,
    };
  }
}
