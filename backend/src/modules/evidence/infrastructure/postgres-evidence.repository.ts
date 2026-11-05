import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../../shared/db/client";
import { reviews } from "../../reviews/infrastructure/reviews.schema";
import type {
  EvidenceRepository,
  PendingReviewForEmbedding,
} from "../domain/evidence.repository";
import type {
  EvidenceSnippet,
  EvidenceSnippetDraft,
  FindEvidenceQuery,
} from "../domain/snippet";
import { evidenceSnippets } from "./evidence.schema";

export class PostgresEvidenceRepository implements EvidenceRepository {
  constructor(private readonly db: DatabaseClient) {}

  async saveSnippets(drafts: EvidenceSnippetDraft[]): Promise<void> {
    if (drafts.length === 0) return;

    for (const draft of drafts) {
      await this.db
        .insert(evidenceSnippets)
        .values({
          reviewId: draft.reviewId,
          chunkIndex: draft.chunkIndex,
          deviceId: draft.deviceId,
          aspect: draft.aspect,
          text: draft.text,
          sentiment: draft.sentiment,
          provider: draft.provider,
          publishedAt: draft.publishedAt,
          embedding: draft.embedding,
        })
        .onConflictDoUpdate({
          target: [evidenceSnippets.reviewId, evidenceSnippets.chunkIndex],
          set: {
            aspect: draft.aspect,
            text: draft.text,
            sentiment: draft.sentiment,
            embedding: draft.embedding,
          },
        });
    }
  }

  async findEvidence(query: FindEvidenceQuery): Promise<EvidenceSnippet[]> {
    const conditions = [eq(evidenceSnippets.deviceId, query.deviceId)];

    if (query.aspects && query.aspects.length > 0) {
      conditions.push(inArray(evidenceSnippets.aspect, query.aspects));
    }

    if (query.targetSentiment) {
      conditions.push(eq(evidenceSnippets.sentiment, query.targetSentiment));
    }

    let queryBuilder = this.db
      .select()
      .from(evidenceSnippets)
      .where(and(...conditions));

    if (query.queryEmbedding && query.queryEmbedding.length > 0) {
      const vectorLiteral = `[${query.queryEmbedding.join(",")}]`;
      const distanceSql = sql`${evidenceSnippets.embedding} <=> ${vectorLiteral}::halfvec`;
      queryBuilder = queryBuilder.orderBy(distanceSql) as any;
    } else {
      queryBuilder = queryBuilder.orderBy(
        desc(evidenceSnippets.publishedAt),
      ) as any;
    }

    const rows = await queryBuilder.limit(
      (query.aspects?.length ?? 5) * (query.limitPerAspect ?? 1) * 2,
    );

    // Filter to limitPerAspect in JS
    const limitPerAspect = query.limitPerAspect ?? 1;
    const aspectCounts = new Map<string, number>();
    const result: EvidenceSnippet[] = [];

    for (const row of rows) {
      const count = aspectCounts.get(row.aspect) ?? 0;
      if (count < limitPerAspect) {
        result.push({
          id: row.id,
          reviewId: row.reviewId,
          chunkIndex: row.chunkIndex,
          deviceId: row.deviceId,
          aspect: row.aspect,
          text: row.text,
          sentiment: row.sentiment as any,
          provider: row.provider,
          publishedAt: row.publishedAt ?? undefined,
          embedding: (row.embedding as number[]) ?? undefined,
          createdAt: row.createdAt,
        });
        aspectCounts.set(row.aspect, count + 1);
      }
    }

    return result;
  }

  async findPendingReviewsForEmbedding(
    limit: number,
  ): Promise<PendingReviewForEmbedding[]> {
    // Select analyzed reviews that do not have snippets yet
    const query = sql`
      SELECT r.id, r.device_id as "deviceId", r.provider, r.content, r.published_at as "publishedAt"
      FROM review r
      WHERE r.status = 'analyzed'
        AND r.content_purged_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM evidence_snippet es WHERE es.review_id = r.id
        )
      ORDER BY r.analyzed_at ASC
      LIMIT ${limit}
    `;

    const result = await this.db.execute(query);
    const rows = (Array.isArray(result) ? result : (result as any).rows ?? []) as any[];

    return rows.map((r) => ({
      id: r.id,
      deviceId: r.deviceId,
      provider: r.provider,
      content: r.content,
      publishedAt: r.publishedAt ? new Date(r.publishedAt) : undefined,
    }));
  }

  async pruneExcessSnippets(maxPerDeviceAspect: number): Promise<number> {
    const deleteQuery = sql`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER(
          PARTITION BY device_id, aspect
          ORDER BY published_at DESC NULLS LAST
        ) as rn
        FROM evidence_snippet
      )
      DELETE FROM evidence_snippet
      WHERE id IN (
        SELECT id FROM ranked WHERE rn > ${maxPerDeviceAspect}
      )
    `;

    const res = await this.db.execute(deleteQuery);
    return Number((res as any).rowCount ?? 0);
  }

  async countSnippets(): Promise<number> {
    const res = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(evidenceSnippets);
    return res[0]?.count ?? 0;
  }
}
