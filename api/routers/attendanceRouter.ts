import { z } from "zod";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { createRouter } from "../middleware";
import { authedQuery, managerQuery } from "../auth";
import { getDb } from "../queries/connection";
import { attendanceRecords, employees } from "@db/schema";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const attendanceRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        from: z.string().optional(), // YYYY-MM-DD
        to: z.string().optional(),
        employeeId: z.number().int().positive().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.from) conditions.push(gte(attendanceRecords.date, input.from));
      if (input?.to) conditions.push(lte(attendanceRecords.date, input.to));
      if (input?.employeeId) conditions.push(eq(attendanceRecords.employeeId, input.employeeId));

      const rows = await db
        .select({ record: attendanceRecords, employeeName: employees.fullName, employeeNo: employees.employeeNo })
        .from(attendanceRecords)
        .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.id))
        .limit(500);

      return rows.map((r) => ({ ...r.record, employeeName: r.employeeName, employeeNo: r.employeeNo }));
    }),

  todaySummary: authedQuery.query(async () => {
    const db = getDb();
    const today = todayStr();
    const [activeEmp] = await db
      .select({ total: count() })
      .from(employees)
      .where(eq(employees.status, "active"));
    const byStatus = await db
      .select({ status: attendanceRecords.status, total: count() })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, today))
      .groupBy(attendanceRecords.status);
    return { date: today, activeEmployees: activeEmp.total, byStatus };
  }),

  checkIn: authedQuery
    .input(z.object({ employeeId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const employeeId = input?.employeeId ?? ctx.user.employeeId;
      if (!employeeId) throw new Error("Akun tidak terhubung dengan data karyawan");
      const today = todayStr();
      const now = new Date();
      const late = now.getHours() >= 9; // check-in after 09:00 counts as late
      const [existing] = await db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, today)))
        .limit(1);
      if (existing) {
        await db
          .update(attendanceRecords)
          .set({ checkIn: now, status: late ? "late" : "present" })
          .where(eq(attendanceRecords.id, existing.id));
      } else {
        await db.insert(attendanceRecords).values({
          employeeId,
          date: today,
          checkIn: now,
          status: late ? "late" : "present",
        });
      }
      return { ok: true, status: late ? "late" : "present" };
    }),

  checkOut: authedQuery
    .input(z.object({ employeeId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const employeeId = input?.employeeId ?? ctx.user.employeeId;
      if (!employeeId) throw new Error("Akun tidak terhubung dengan data karyawan");
      const today = todayStr();
      await db
        .update(attendanceRecords)
        .set({ checkOut: new Date() })
        .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, today)));
      return { ok: true };
    }),

  mark: managerQuery
    .input(
      z.object({
        employeeId: z.number().int().positive(),
        date: z.string().min(1),
        status: z.enum(["present", "late", "absent", "leave", "sick", "holiday"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, input.employeeId), eq(attendanceRecords.date, input.date)))
        .limit(1);
      if (existing) {
        await db
          .update(attendanceRecords)
          .set({ status: input.status, notes: input.notes || null })
          .where(eq(attendanceRecords.id, existing.id));
      } else {
        await db.insert(attendanceRecords).values({
          employeeId: input.employeeId,
          date: input.date,
          status: input.status,
          notes: input.notes || null,
        });
      }
      return { ok: true };
    }),

  delete: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(attendanceRecords).where(eq(attendanceRecords.id, input.id));
      return { ok: true };
    }),
});
