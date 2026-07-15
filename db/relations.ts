import { relations } from "drizzle-orm";
import {
  users,
  departments,
  positions,
  employees,
  jobPostings,
  candidates,
  interviews,
  attendanceRecords,
  leaveRequests,
  payslips,
  performanceReviews,
} from "./schema.js";

export const departmentsRelations = relations(departments, ({ many }) => ({
  positions: many(positions),
  employees: many(employees),
  jobs: many(jobPostings),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  department: one(departments, {
    fields: [positions.departmentId],
    references: [departments.id],
  }),
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),
  attendance: many(attendanceRecords),
  leaveRequests: many(leaveRequests),
  payslips: many(payslips),
  reviews: many(performanceReviews),
}));

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
}));

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  department: one(departments, {
    fields: [jobPostings.departmentId],
    references: [departments.id],
  }),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  job: one(jobPostings, {
    fields: [candidates.jobId],
    references: [jobPostings.id],
  }),
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id],
  }),
}));

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
}));

export const leaveRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
}));

export const reviewsRelations = relations(performanceReviews, ({ one }) => ({
  employee: one(employees, {
    fields: [performanceReviews.employeeId],
    references: [employees.id],
  }),
}));
