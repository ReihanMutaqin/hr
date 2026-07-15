import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware.js";
import { authedQuery, managerQuery } from "../auth.js";
import { getDb } from "../queries/connection.js";
import { performanceReviews, employees, departments } from "../../db/schema.js";
import { rerankDocuments } from "../services/rerank.js";

export const reviewRouter = createRouter({
  list: authedQuery
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const q = db
        .select({
          review: performanceReviews,
          employeeName: employees.fullName,
          employeeNo: employees.employeeNo,
          departmentName: departments.name,
        })
        .from(performanceReviews)
        .leftJoin(employees, eq(performanceReviews.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .orderBy(desc(performanceReviews.aiScore), desc(performanceReviews.createdAt));
      let rows;
      if (ctx.user.role === "employee") {
        if (!ctx.user.employeeId) return [];
        rows = await q.where(eq(performanceReviews.employeeId, ctx.user.employeeId));
      } else if (input?.period) {
        rows = await q.where(eq(performanceReviews.period, input.period));
      } else {
        rows = await q;
      }
      return rows.map((r) => ({
        ...r.review,
        employeeName: r.employeeName,
        employeeNo: r.employeeNo,
        departmentName: r.departmentName,
      }));
    }),

  periods: authedQuery.query(async () => {
    const rows = await getDb()
      .selectDistinct({ period: performanceReviews.period })
      .from(performanceReviews)
      .orderBy(desc(performanceReviews.period));
    return rows.map((r) => r.period);
  }),

  create: managerQuery
    .input(
      z.object({
        employeeId: z.number().int().positive(),
        reviewerName: z.string().min(1),
        period: z.string().min(1),
        goals: z.string().min(1),
        achievements: z.string().min(1),
        reviewerScore: z.number().int().min(0).max(100),
        status: z.enum(["draft", "submitted", "reviewed"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb().insert(performanceReviews).values({
        ...input,
        status: input.status ?? "submitted",
      });
      return { ok: true };
    }),

  update: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        reviewerName: z.string().optional(),
        goals: z.string().optional(),
        achievements: z.string().optional(),
        reviewerScore: z.number().int().min(0).max(100).optional(),
        status: z.enum(["draft", "submitted", "reviewed"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb().update(performanceReviews).set(data).where(eq(performanceReviews.id, id));
      return { ok: true };
    }),

  delete: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(performanceReviews).where(eq(performanceReviews.id, input.id));
      return { ok: true };
    }),

  /* ---------------- AI rerank reviews vs excellence criteria ---------------- */
  aiRank: managerQuery
    .input(
      z.object({
        period: z.string().optional(),
        criteria: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const q = db
        .select({ review: performanceReviews, employeeName: employees.fullName })
        .from(performanceReviews)
        .leftJoin(employees, eq(performanceReviews.employeeId, employees.id))
        .orderBy(asc(performanceReviews.id));
      const rows = input.period
        ? await q.where(eq(performanceReviews.period, input.period))
        : await q;

      if (rows.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Belum ada review untuk dianalisis" });
      }

      const query =
        input.criteria?.trim() ||
        "Kriteria penilaian kinerja karyawan terbaik: pencapaian target, produktivitas, kualitas kerja, inisiatif, kolaborasi tim, ketepatan waktu, dan kontribusi terhadap pertumbuhan perusahaan.";

      const documents = rows.map((r) =>
        [`Karyawan: ${r.employeeName}`, `Goals: ${r.review.goals}`, `Pencapaian: ${r.review.achievements}`].join("\n"),
      );

      const reranked = await rerankDocuments(query, documents, { feature: "performance-rank" });

      for (const r of reranked.results) {
        const row = rows[r.index];
        await db
          .update(performanceReviews)
          .set({
            aiScore: r.score.toFixed(2),
            aiSummary: `Skor AI rerank ${r.score}/100 (${reranked.fallback ? "fallback keyword" : "Nemotron"}) terhadap kriteria penilaian kinerja`,
            aiRankedAt: new Date(),
          })
          .where(eq(performanceReviews.id, row.review.id));
      }

      return {
        model: reranked.model,
        fallback: reranked.fallback,
        results: reranked.results.map((r, i) => ({
          rank: i + 1,
          score: r.score,
          review: rows[r.index].review,
          employeeName: rows[r.index].employeeName,
        })),
      };
    }),
});
