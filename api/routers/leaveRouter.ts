import { z } from "zod";
import { eq, desc, count } from "drizzle-orm";
import { createRouter } from "../middleware";
import { authedQuery, managerQuery } from "../auth";
import { getDb } from "../queries/connection";
import { leaveRequests, employees } from "@db/schema";

export const leaveRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const q = db
        .select({
          leave: leaveRequests,
          employeeName: employees.fullName,
          employeeNo: employees.employeeNo,
        })
        .from(leaveRequests)
        .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .orderBy(desc(leaveRequests.createdAt));
      const rows = input?.status
        ? await q.where(eq(leaveRequests.status, input.status))
        : await q;
      return rows.map((r) => ({ ...r.leave, employeeName: r.employeeName, employeeNo: r.employeeNo }));
    }),

  create: authedQuery
    .input(
      z.object({
        employeeId: z.number().int().positive().optional(),
        type: z.enum(["annual", "sick", "maternity", "unpaid", "other"]),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = input.employeeId ?? ctx.user.employeeId;
      if (!employeeId) throw new Error("Akun tidak terhubung dengan data karyawan");
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      await getDb().insert(leaveRequests).values({
        employeeId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        reason: input.reason,
      });
      return { ok: true };
    }),

  decide: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(leaveRequests)
        .set({ status: input.status, approverName: ctx.user.fullName, decidedAt: new Date() })
        .where(eq(leaveRequests.id, input.id));
      return { ok: true };
    }),

  delete: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(leaveRequests).where(eq(leaveRequests.id, input.id));
      return { ok: true };
    }),

  summary: authedQuery.query(async () => {
    const db = getDb();
    const byStatus = await db
      .select({ status: leaveRequests.status, total: count() })
      .from(leaveRequests)
      .groupBy(leaveRequests.status);
    return byStatus;
  }),
});
