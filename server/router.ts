import { createRouter, publicQuery } from "./middleware.js";
import { authRouter } from "./routers/authRouter.js";
import { orgRouter } from "./routers/orgRouter.js";
import { employeeRouter } from "./routers/employeeRouter.js";
import { recruitmentRouter } from "./routers/recruitmentRouter.js";
import { attendanceRouter } from "./routers/attendanceRouter.js";
import { leaveRouter } from "./routers/leaveRouter.js";
import { payrollRouter } from "./routers/payrollRouter.js";
import { reviewRouter } from "./routers/reviewRouter.js";
import { miscRouter } from "./routers/miscRouter.js";

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
