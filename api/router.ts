import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./routers/authRouter";
import { orgRouter } from "./routers/orgRouter";
import { employeeRouter } from "./routers/employeeRouter";
import { recruitmentRouter } from "./routers/recruitmentRouter";
import { attendanceRouter } from "./routers/attendanceRouter";
import { leaveRouter } from "./routers/leaveRouter";
import { payrollRouter } from "./routers/payrollRouter";
import { reviewRouter } from "./routers/reviewRouter";
import { miscRouter } from "./routers/miscRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  org: orgRouter,
  employee: employeeRouter,
  recruitment: recruitmentRouter,
  attendance: attendanceRouter,
  leave: leaveRouter,
  payroll: payrollRouter,
  review: reviewRouter,
  misc: miscRouter,
});

export type AppRouter = typeof appRouter;
