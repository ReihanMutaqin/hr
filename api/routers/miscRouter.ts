import { z } from "zod";
import { eq, desc, count, sum, gte } from "drizzle-orm";
import { createRouter } from "../middleware";
import { authedQuery, managerQuery } from "../auth";
import { getDb } from "../queries/connection";
import {
  announcements,
  employees,
  departments,
  jobPostings,
  candidates,
  attendanceRecords,
  leaveRequests,
  payslips,
  aiLogs,
} from "@db/schema";

export const miscRouter = createRouter({
  /* ---------------- Announcements ---------------- */
  announcements: authedQuery.query(async () => {
    return getDb().select().from(announcements).orderBy(desc(announcements.pinned), desc(announcements.createdAt));
  }),

  createAnnouncement: managerQuery
    .input(z.object({ title: z.string().min(1), content: z.string().min(1), pinned: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      await getDb().insert(announcements).values({
        title: input.title,
        content: input.content,
        pinned: input.pinned ?? false,
      });
      return { ok: true };
    }),

  deleteAnnouncement: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(announcements).where(eq(announcements.id, input.id));
      return { ok: true };
    }),

  /* ---------------- Dashboard stats ---------------- */
  dashboard: authedQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

    const [empTotal] = await db.select({ total: count() }).from(employees).where(eq(employees.status, "active"));
    const [deptTotal] = await db.select({ total: count() }).from(departments);
    const [openJobs] = await db.select({ total: count() }).from(jobPostings).where(eq(jobPostings.status, "open"));
    const [candTotal] = await db.select({ total: count() }).from(candidates);
    const [pendingLeave] = await db
      .select({ total: count() })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "pending"));
    const [presentToday] = await db
      .select({ total: count() })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, today));
    // latest payroll period total
    const latestPeriodRows = await db
      .select({ period: payslips.period })
      .from(payslips)
      .groupBy(payslips.period)
      .orderBy(desc(payslips.period))
      .limit(1);
    const latestPeriod = latestPeriodRows[0]?.period ?? monthStart.slice(0, 7);
    const [payrollMonth] = await db
      .select({ total: sum(payslips.netSalary) })
      .from(payslips)
      .where(gte(payslips.period, latestPeriod));

    const byDept = await db
      .select({ name: departments.name, total: count() })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .groupBy(departments.name)
      .orderBy(desc(count()));

    const candidatesByStatus = await db
      .select({ status: candidates.status, total: count() })
      .from(candidates)
      .groupBy(candidates.status);

    const payrollByPeriod = await db
      .select({ period: payslips.period, totalNet: sum(payslips.netSalary) })
      .from(payslips)
      .groupBy(payslips.period)
      .orderBy(desc(payslips.period))
      .limit(6);

    const recentCandidates = await db
      .select({ candidate: candidates, jobTitle: jobPostings.title })
      .from(candidates)
      .leftJoin(jobPostings, eq(candidates.jobId, jobPostings.id))
      .orderBy(desc(candidates.appliedAt))
      .limit(5);

    const recentLeaves = await db
      .select({ leave: leaveRequests, employeeName: employees.fullName })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(5);

    const attendanceToday = await db
      .select({ status: attendanceRecords.status, total: count() })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, today))
      .groupBy(attendanceRecords.status);

    return {
      counts: {
        employees: empTotal.total,
        departments: deptTotal.total,
        openJobs: openJobs.total,
        candidates: candTotal.total,
        pendingLeave: pendingLeave.total,
        presentToday: presentToday.total,
      },
      payrollMonthTotal: Number(payrollMonth.total ?? 0),
      byDept,
      candidatesByStatus,
      payrollByPeriod: payrollByPeriod.reverse(),
      recentCandidates: recentCandidates.map((r) => ({ ...r.candidate, jobTitle: r.jobTitle })),
      recentLeaves: recentLeaves.map((r) => ({ ...r.leave, employeeName: r.employeeName })),
      attendanceToday,
    };
  }),

  /* ---------------- AI logs ---------------- */
  aiLogs: managerQuery.query(async () => {
    return getDb().select().from(aiLogs).orderBy(desc(aiLogs.createdAt)).limit(50);
  }),
});
