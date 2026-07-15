import { z } from "zod";
import { eq, count, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, managerQuery } from "../auth";
import { getDb } from "../queries/connection";
import { departments, positions, employees } from "@db/schema";

export const orgRouter = createRouter({
  /* ---------------- Departments ---------------- */
  departments: authedQuery.query(async () => {
    const db = getDb();
    const depts = await db.select().from(departments).orderBy(asc(departments.name));
    const counts = await db
      .select({ departmentId: employees.departmentId, total: count() })
      .from(employees)
      .groupBy(employees.departmentId);
    const countMap = new Map(counts.map((c) => [c.departmentId, c.total]));
    return depts.map((d) => ({ ...d, employeeCount: countMap.get(d.id) ?? 0 }));
  }),

  createDepartment: managerQuery
    .input(z.object({ name: z.string().min(1).max(128), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db.select().from(departments).where(eq(departments.name, input.name)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Departemen sudah ada" });
      await db.insert(departments).values({ name: input.name, description: input.description || null });
      return { ok: true };
    }),

  updateDepartment: managerQuery
    .input(z.object({ id: z.number().int().positive(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      await getDb().update(departments).set({ name: input.name, description: input.description || null }).where(eq(departments.id, input.id));
      return { ok: true };
    }),

  deleteDepartment: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [c] = await db.select({ total: count() }).from(employees).where(eq(employees.departmentId, input.id));
      if (c.total > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Departemen masih memiliki karyawan" });
      await db.delete(positions).where(eq(positions.departmentId, input.id));
      await db.delete(departments).where(eq(departments.id, input.id));
      return { ok: true };
    }),

  /* ---------------- Positions ---------------- */
  positions: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ position: positions, departmentName: departments.name })
      .from(positions)
      .leftJoin(departments, eq(positions.departmentId, departments.id))
      .orderBy(asc(positions.title));
    return rows.map((r) => ({ ...r.position, departmentName: r.departmentName }));
  }),

  createPosition: managerQuery
    .input(
      z.object({
        title: z.string().min(1).max(128),
        departmentId: z.number().int().positive().optional(),
        level: z.enum(["Intern", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"]),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb().insert(positions).values({
        title: input.title,
        departmentId: input.departmentId ?? null,
        level: input.level,
      });
      return { ok: true };
    }),

  updatePosition: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).optional(),
        departmentId: z.number().int().positive().nullable().optional(),
        level: z.enum(["Intern", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb().update(positions).set(data).where(eq(positions.id, id));
      return { ok: true };
    }),

  deletePosition: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [c] = await db.select({ total: count() }).from(employees).where(eq(employees.positionId, input.id));
      if (c.total > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Jabatan masih dipakai karyawan" });
      await db.delete(positions).where(eq(positions.id, input.id));
      return { ok: true };
    }),
});
