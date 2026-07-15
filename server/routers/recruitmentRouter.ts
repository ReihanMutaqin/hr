import { z } from "zod";
import { eq, desc, count, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware.js";
import { authedQuery, managerQuery } from "../auth.js";
import { getDb } from "../queries/connection.js";
import { jobPostings, candidates, interviews, departments } from "../../db/schema.js";
import { rerankDocuments } from "../services/rerank.js";
import { evaluateCandidateCV } from "../services/cvReader.js";

export const recruitmentRouter = createRouter({
  /* ---------------- Public Job Endpoints ---------------- */
  publicJob: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [job] = await db
        .select({ job: jobPostings, departmentName: departments.name })
        .from(jobPostings)
        .leftJoin(departments, eq(jobPostings.departmentId, departments.id))
        .where(eq(jobPostings.id, input.id))
        .limit(1);
      if (!job || job.job.status !== "open") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lowongan tidak ditemukan atau sudah ditutup" });
      }
      return {
        ...job.job,
        departmentName: job.departmentName,
      };
    }),

  publicApplyJob: publicQuery
    .input(
      z.object({
        jobId: z.number().int().positive(),
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        cvText: z.string().min(10),
        cvFileBase64: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, input.jobId)).limit(1);
      if (!job || job.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Lowongan tidak tersedia" });
      }
      await db.insert(candidates).values({
        jobId: input.jobId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        cvText: input.cvText,
        cvFileBase64: input.cvFileBase64 || null,
        source: "Public Job Board",
      });
      return { ok: true };
    }),

  /* ---------------- Job postings ---------------- */
  jobs: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ job: jobPostings, departmentName: departments.name })
      .from(jobPostings)
      .leftJoin(departments, eq(jobPostings.departmentId, departments.id))
      .orderBy(desc(jobPostings.createdAt));
    const counts = await db
      .select({ jobId: candidates.jobId, total: count() })
      .from(candidates)
      .groupBy(candidates.jobId);
    const countMap = new Map(counts.map((c) => [c.jobId, c.total]));
    return rows.map((r) => ({
      ...r.job,
      departmentName: r.departmentName,
      candidateCount: countMap.get(r.job.id) ?? 0,
    }));
  }),

  createJob: managerQuery
    .input(
      z.object({
        title: z.string().min(1),
        departmentId: z.number().int().positive().optional(),
        description: z.string().min(1),
        requirements: z.string().optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
        location: z.string().min(1),
        salaryMin: z.number().int().min(0),
        salaryMax: z.number().int().min(0),
        status: z.enum(["open", "closed", "draft"]),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb().insert(jobPostings).values({
        ...input,
        departmentId: input.departmentId ?? null,
        requirements: input.requirements || null,
      });
      return { ok: true };
    }),

  updateJob: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).optional(),
        departmentId: z.number().int().positive().nullable().optional(),
        description: z.string().min(1).optional(),
        requirements: z.string().optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
        location: z.string().optional(),
        salaryMin: z.number().int().min(0).optional(),
        salaryMax: z.number().int().min(0).optional(),
        status: z.enum(["open", "closed", "draft"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb().update(jobPostings).set(data).where(eq(jobPostings.id, id));
      return { ok: true };
    }),

  deleteJob: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const cands = await db.select({ id: candidates.id }).from(candidates).where(eq(candidates.jobId, input.id));
      for (const c of cands) {
        await db.delete(interviews).where(eq(interviews.candidateId, c.id));
      }
      await db.delete(candidates).where(eq(candidates.jobId, input.id));
      await db.delete(jobPostings).where(eq(jobPostings.id, input.id));
      return { ok: true };
    }),

  /* ---------------- Candidates ---------------- */
  candidates: authedQuery
    .input(z.object({ jobId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const q = db
        .select({ candidate: candidates, jobTitle: jobPostings.title })
        .from(candidates)
        .leftJoin(jobPostings, eq(candidates.jobId, jobPostings.id))
        .orderBy(desc(candidates.aiScore), desc(candidates.appliedAt));
      const rows = input?.jobId ? await q.where(eq(candidates.jobId, input.jobId)) : await q;
      return rows.map((r) => ({ ...r.candidate, jobTitle: r.jobTitle }));
    }),

  createCandidate: managerQuery
    .input(
      z.object({
        jobId: z.number().int().positive(),
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        cvText: z.string().min(10),
        cvFileBase64: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [job] = await getDb().select().from(jobPostings).where(eq(jobPostings.id, input.jobId)).limit(1);
      if (!job) throw new TRPCError({ code: "BAD_REQUEST", message: "Lowongan tidak ditemukan" });
      await getDb().insert(candidates).values({
        jobId: input.jobId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        cvText: input.cvText,
        cvFileBase64: input.cvFileBase64 || null,
        source: input.source || "Website",
      });
      return { ok: true };
    }),

  updateCandidateStatus: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["new", "screening", "interview", "offer", "hired", "rejected"]),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb().update(candidates).set({ status: input.status }).where(eq(candidates.id, input.id));
      return { ok: true };
    }),

  deleteCandidate: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(interviews).where(eq(interviews.candidateId, input.id));
      await db.delete(candidates).where(eq(candidates.id, input.id));
      return { ok: true };
    }),

  /* ---------------- AI rerank CVs vs job description ---------------- */
  rerankCandidates: managerQuery
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [job] = await db
        .select({ job: jobPostings, departmentName: departments.name })
        .from(jobPostings)
        .leftJoin(departments, eq(jobPostings.departmentId, departments.id))
        .where(eq(jobPostings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Lowongan tidak ditemukan" });

      const cands = await db
        .select()
        .from(candidates)
        .where(eq(candidates.jobId, input.jobId))
        .orderBy(asc(candidates.id));

      if (cands.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Belum ada kandidat untuk lowongan ini" });
      }

      const query = [
        `Posisi: ${job.job.title}`,
        job.departmentName ? `Departemen: ${job.departmentName}` : "",
        `Deskripsi: ${job.job.description}`,
        `Persyaratan: ${job.job.requirements ?? ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      const reranked = await rerankDocuments(
        query,
        cands.map((c) => c.cvText),
        { feature: "cv-rerank" },
      );

      // persist scores + rank back to DB
      for (const r of reranked.results) {
        const cand = cands[r.index];
        await db
          .update(candidates)
          .set({
            aiScore: r.score.toFixed(2),
            aiNote: r.reasoning || `AI rerank (${reranked.fallback ? "fallback keyword" : "Nemotron"}): relevansi ${r.score}/100 terhadap lowongan "${job.job.title}"`,
            aiRankedAt: new Date(),
          })
          .where(eq(candidates.id, cand.id));
      }

      return {
        jobTitle: job.job.title,
        model: reranked.model,
        fallback: reranked.fallback,
        results: reranked.results.map((r, i) => ({
          candidate: cands[r.index],
          rank: i + 1,
          score: r.score,
          rawScore: r.rawScore,
          reasoning: r.reasoning,
        })),
      };
    }),

  evaluateCandidateAI: managerQuery
    .input(z.object({ candidateId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [cand] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, input.candidateId))
        .limit(1);
      if (!cand) throw new TRPCError({ code: "NOT_FOUND", message: "Kandidat tidak ditemukan" });

      const [job] = await db
        .select({ job: jobPostings, departmentName: departments.name })
        .from(jobPostings)
        .leftJoin(departments, eq(jobPostings.departmentId, departments.id))
        .where(eq(jobPostings.id, cand.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Lowongan tidak ditemukan" });

      const jobDetails = [
        `Posisi: ${job.job.title}`,
        job.departmentName ? `Departemen: ${job.departmentName}` : "",
        `Tipe: ${job.job.employmentType}`,
        `Deskripsi: ${job.job.description}`,
        `Persyaratan: ${job.job.requirements ?? ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      const aiResponse = await evaluateCandidateCV(jobDetails, cand.cvText);

      await db
        .update(candidates)
        .set({ aiNote: aiResponse.opinion })
        .where(eq(candidates.id, cand.id));

      return {
        ok: true,
        opinion: aiResponse.opinion,
        model: aiResponse.model,
      };
    }),

  batchCreateCandidates: managerQuery
    .input(
      z.object({
        jobId: z.number().int().positive(),
        candidates: z.array(
          z.object({
            fullName: z.string().min(1),
            email: z.string().email(),
            cvText: z.string().min(10),
            cvFileBase64: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.candidates.length === 0) return { count: 0 };
      
      const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, input.jobId)).limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Lowongan tidak ditemukan" });

      const values = input.candidates.map(cand => ({
        jobId: input.jobId,
        fullName: cand.fullName,
        email: cand.email,
        cvText: cand.cvText,
        cvFileBase64: cand.cvFileBase64 || null,
        source: "Batch Upload",
      }));

      await db.insert(candidates).values(values);

      return { count: values.length, ok: true };
    }),

  /* ---------------- Interviews ---------------- */
  interviews: authedQuery
    .input(z.object({ candidateId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const q = db
        .select({ interview: interviews, candidateName: candidates.fullName })
        .from(interviews)
        .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
        .orderBy(desc(interviews.scheduledAt));
      const rows = input?.candidateId
        ? await q.where(eq(interviews.candidateId, input.candidateId))
        : await q;
      return rows.map((r) => ({ ...r.interview, candidateName: r.candidateName }));
    }),

  createInterview: managerQuery
    .input(
      z.object({
        candidateId: z.number().int().positive(),
        interviewerName: z.string().min(1),
        scheduledAt: z.string().min(1), // ISO
        location: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(interviews).values({
        candidateId: input.candidateId,
        interviewerName: input.interviewerName,
        scheduledAt: new Date(input.scheduledAt),
        location: input.location || "Online (Google Meet)",
        notes: input.notes || null,
      });
      await db.update(candidates).set({ status: "interview" }).where(eq(candidates.id, input.candidateId));
      return { ok: true };
    }),

  updateInterviewResult: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        result: z.enum(["pending", "pass", "fail"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb()
        .update(interviews)
        .set({ result: input.result, notes: input.notes ?? undefined })
        .where(eq(interviews.id, input.id));
      return { ok: true };
    }),

  deleteInterview: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(interviews).where(eq(interviews.id, input.id));
      return { ok: true };
    }),

  getCandidateFile: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [cand] = await db
        .select({ cvFileBase64: candidates.cvFileBase64 })
        .from(candidates)
        .where(eq(candidates.id, input.id))
        .limit(1);
      if (!cand) throw new TRPCError({ code: "NOT_FOUND", message: "Kandidat tidak ditemukan" });
      return { cvFileBase64: cand.cvFileBase64 };
    }),
});
