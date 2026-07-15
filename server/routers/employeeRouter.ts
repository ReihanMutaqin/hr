import { z } from "zod";
import { eq, like, or, and, desc, asc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware.js";
import { authedQuery, managerQuery } from "../auth.js";
import { getDb } from "../queries/connection.js";
import { employees, departments, positions } from "../../db/schema.js";
import { rerankDocuments } from "../services/rerank.js";

const employeeInput = z.object({
  employeeNo: z.string().min(1).max(32),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().optional(), // YYYY-MM-DD
  address: z.string().optional(),
  departmentId: z.number().int().positive().optional(),
  positionId: z.number().int().positive().optional(),
  managerId: z.number().int().positive().nullable().optional(),
  hireDate: z.string().min(1),
  status: z.enum(["active", "probation", "resigned", "terminated"]),
  baseSalary: z.number().int().min(0),
  skills: z.string().optional(),
  bio: z.string().optional(),
});

export const employeeRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        search: z.string().optional(),
        departmentId: z.number().int().positive().optional(),
        status: z.enum(["active", "probation", "resigned", "terminated"]).optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.search) {
        const term = `%${input.search}%`;
        conditions.push(
          or(
            like(employees.fullName, term),
            like(employees.email, term),
            like(employees.employeeNo, term),
            like(employees.skills, term),
          ),
        );
      }
      if (input?.departmentId) conditions.push(eq(employees.departmentId, input.departmentId));
      if (input?.status) conditions.push(eq(employees.status, input.status));

      const rows = await db
        .select({
          employee: employees,
          departmentName: departments.name,
          positionTitle: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(employees.fullName));

      return rows.map((r) => ({
        ...r.employee,
        departmentName: r.departmentName,
        positionTitle: r.positionTitle,
      }));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select({
          employee: employees,
          departmentName: departments.name,
          positionTitle: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Karyawan tidak ditemukan" });
      return { ...row.employee, departmentName: row.departmentName, positionTitle: row.positionTitle };
    }),

  create: managerQuery.input(employeeInput).mutation(async ({ input }) => {
    const db = getDb();
    const [dup] = await db.select().from(employees).where(eq(employees.employeeNo, input.employeeNo)).limit(1);
    if (dup) throw new TRPCError({ code: "CONFLICT", message: "Nomor karyawan sudah dipakai" });
    await db.insert(employees).values({
      ...input,
      birthDate: input.birthDate || null,
      departmentId: input.departmentId ?? null,
      positionId: input.positionId ?? null,
      managerId: input.managerId ?? null,
      phone: input.phone || null,
      address: input.address || null,
      skills: input.skills || null,
      bio: input.bio || null,
    });
    return { ok: true };
  }),

  update: managerQuery
    .input(employeeInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const clean: Record<string, unknown> = { ...data };
      if (data.birthDate !== undefined) clean.birthDate = data.birthDate || null;
      await getDb().update(employees).set(clean).where(eq(employees.id, id));
      return { ok: true };
    }),

  delete: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(employees).where(eq(employees.id, input.id));
      return { ok: true };
    }),

  /* ---------------- AI semantic search ---------------- */
  aiSearch: managerQuery
    .input(z.object({ query: z.string().min(2).max(1000) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          employee: employees,
          departmentName: departments.name,
          positionTitle: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id));

      if (rows.length === 0) return { results: [], model: "", fallback: false };

      const documents = rows.map((r) =>
        [
          r.employee.fullName,
          r.positionTitle ?? "",
          r.departmentName ?? "",
          r.employee.skills ?? "",
          r.employee.bio ?? "",
          r.employee.status,
        ]
          .filter(Boolean)
          .join(". "),
      );

      const reranked = await rerankDocuments(input.query, documents, { feature: "employee-search" });

      const results = reranked.results.map((r) => ({
        score: r.score,
        employee: {
          ...rows[r.index].employee,
          departmentName: rows[r.index].departmentName,
          positionTitle: rows[r.index].positionTitle,
        },
      }));

      return { results, model: reranked.model, fallback: reranked.fallback };
    }),

  stats: authedQuery.query(async () => {
    const db = getDb();
    const [total] = await db.select({ total: count() }).from(employees);
    const byStatus = await db
      .select({ status: employees.status, total: count() })
      .from(employees)
      .groupBy(employees.status);
    const byDept = await db
      .select({ name: departments.name, total: count() })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .groupBy(departments.name)
      .orderBy(desc(count()));
    return { total: total.total, byStatus, byDept };
  }),
});
