import { z } from "zod";
import { eq, and, desc, sum, count, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware.js";
import { authedQuery, managerQuery } from "../auth.js";
import { getDb } from "../queries/connection.js";
import { payslips, employees, attendanceRecords } from "../../db/schema.js";

function calcPayslip(baseSalary: number, presentDays: number, workDays: number) {
  // pro-rate deduction for absences, 10% allowance, 5% tax (PPh21 simplified)
  const attendanceRatio = workDays > 0 ? presentDays / workDays : 1;
  const deduction = Math.round(baseSalary * (1 - attendanceRatio));
  const allowance = Math.round(baseSalary * 0.1);
  const gross = baseSalary + allowance - deduction;
  const tax = Math.round(gross * 0.05);
  const netSalary = gross - tax;
  return { allowance, deduction, tax, netSalary };
}

export const payrollRouter = createRouter({
  list: authedQuery
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [];
      if (input?.period) conditions.push(eq(payslips.period, input.period));
      // employees can only see their own payslips
      if (ctx.user.role === "employee") {
        if (!ctx.user.employeeId) return [];
        conditions.push(eq(payslips.employeeId, ctx.user.employeeId));
      }
      const rows = await db
        .select({
          slip: payslips,
          employeeName: employees.fullName,
          employeeNo: employees.employeeNo,
        })
        .from(payslips)
        .leftJoin(employees, eq(payslips.employeeId, employees.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(payslips.period), desc(payslips.id))
        .limit(500);
      return rows.map((r) => ({ ...r.slip, employeeName: r.employeeName, employeeNo: r.employeeNo }));
    }),

  periods: authedQuery.query(async () => {
    const rows = await getDb()
      .selectDistinct({ period: payslips.period })
      .from(payslips)
      .orderBy(desc(payslips.period));
    return rows.map((r) => r.period);
  }),

  generate: managerQuery
    .input(z.object({ period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [y, m] = input.period.split("-").map(Number);
      const from = `${input.period}-01`;
      const to = new Date(y, m, 0).toISOString().slice(0, 10); // last day of month
      const workDays = 22; // standard working days assumption

      const emps = await db
        .select()
        .from(employees)
        .where(eq(employees.status, "active"));
      if (emps.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak ada karyawan aktif" });

      let created = 0;
      for (const emp of emps) {
        const [dup] = await db
          .select({ id: payslips.id })
          .from(payslips)
          .where(and(eq(payslips.employeeId, emp.id), eq(payslips.period, input.period)))
          .limit(1);
        if (dup) continue;

        // count present + late days within this month (date stored as YYYY-MM-DD string)
        const [present] = await db
          .select({ total: count() })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, emp.id),
              eq(attendanceRecords.status, "present"),
              gte(attendanceRecords.date, from),
              lte(attendanceRecords.date, to),
            ),
          );
        const [late] = await db
          .select({ total: count() })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, emp.id),
              eq(attendanceRecords.status, "late"),
              gte(attendanceRecords.date, from),
              lte(attendanceRecords.date, to),
            ),
          );

        const presentDays = Math.min(workDays, (present?.total ?? 0) + (late?.total ?? 0));
        const calc = calcPayslip(emp.baseSalary, presentDays, workDays);
        await db.insert(payslips).values({
          employeeId: emp.id,
          period: input.period,
          baseSalary: emp.baseSalary,
          ...calc,
        });
        created += 1;
      }
      return { ok: true, created, total: emps.length };
    }),

  markPaid: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().update(payslips).set({ status: "paid", paidAt: new Date() }).where(eq(payslips.id, input.id));
      return { ok: true };
    }),

  markAllPaid: managerQuery
    .input(z.object({ period: z.string() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(payslips)
        .set({ status: "paid", paidAt: new Date() })
        .where(and(eq(payslips.period, input.period), eq(payslips.status, "draft")));
      return { ok: true };
    }),

  delete: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(payslips).where(eq(payslips.id, input.id));
      return { ok: true };
    }),

  summary: authedQuery
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.period ? [eq(payslips.period, input.period)] : [];
      const [totals] = await db
        .select({
          totalNet: sum(payslips.netSalary),
          totalTax: sum(payslips.tax),
          count: count(),
        })
        .from(payslips)
        .where(conditions.length ? and(...conditions) : undefined);
      const byPeriod = await db
        .select({ period: payslips.period, totalNet: sum(payslips.netSalary) })
        .from(payslips)
        .groupBy(payslips.period)
        .orderBy(desc(payslips.period))
        .limit(12);
      return { totals, byPeriod: byPeriod.reverse() };
    }),
});
