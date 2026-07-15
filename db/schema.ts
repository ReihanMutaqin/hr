import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  mediumtext,
  int,
  decimal,
  boolean,
  date,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

/* ------------------------------------------------------------------ */
/* Auth & Users                                                        */
/* ------------------------------------------------------------------ */
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["admin", "hr", "employee"]).notNull().default("employee"),
  employeeId: bigint("employee_id", { mode: "number", unsigned: true }),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Organization                                                        */
/* ------------------------------------------------------------------ */
export const departments = mysqlTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const positions = mysqlTable(
  "positions",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 128 }).notNull(),
    departmentId: bigint("department_id", { mode: "number", unsigned: true }),
    level: mysqlEnum("level", ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"])
      .notNull()
      .default("Junior"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("pos_dept_idx").on(t.departmentId)],
);

export const employees = mysqlTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    employeeNo: varchar("employee_no", { length: 32 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    phone: varchar("phone", { length: 32 }),
    gender: mysqlEnum("gender", ["male", "female"]).notNull().default("male"),
    birthDate: date("birth_date", { mode: "string" }),
    address: text("address"),
    departmentId: bigint("department_id", { mode: "number", unsigned: true }),
    positionId: bigint("position_id", { mode: "number", unsigned: true }),
    managerId: bigint("manager_id", { mode: "number", unsigned: true }),
    hireDate: date("hire_date", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["active", "probation", "resigned", "terminated"])
      .notNull()
      .default("active"),
    baseSalary: int("base_salary").notNull().default(0),
    skills: text("skills"),
    bio: text("bio"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("emp_dept_idx").on(t.departmentId),
    index("emp_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Recruitment / ATS                                                   */
/* ------------------------------------------------------------------ */
export const jobPostings = mysqlTable(
  "job_postings",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    departmentId: bigint("department_id", { mode: "number", unsigned: true }),
    description: text("description").notNull(),
    requirements: text("requirements"),
    employmentType: mysqlEnum("employment_type", [
      "full-time",
      "part-time",
      "contract",
      "internship",
    ])
      .notNull()
      .default("full-time"),
    location: varchar("location", { length: 128 }).notNull().default("Jakarta"),
    salaryMin: int("salary_min").notNull().default(0),
    salaryMax: int("salary_max").notNull().default(0),
    status: mysqlEnum("status", ["open", "closed", "draft"]).notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("job_status_idx").on(t.status)],
);

export const candidates = mysqlTable(
  "candidates",
  {
    id: serial("id").primaryKey(),
    jobId: bigint("job_id", { mode: "number", unsigned: true }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    cvText: text("cv_text").notNull(),
    cvFileBase64: mediumtext("cv_file_base64"),
    source: varchar("source", { length: 64 }).default("Website"),
    status: mysqlEnum("status", [
      "new",
      "screening",
      "interview",
      "offer",
      "hired",
      "rejected",
    ])
      .notNull()
      .default("new"),
    aiScore: decimal("ai_score", { precision: 5, scale: 2 }),
    aiNote: text("ai_note"),
    aiRankedAt: timestamp("ai_ranked_at"),
    appliedAt: timestamp("applied_at").notNull().defaultNow(),
  },
  (t) => [index("cand_job_idx").on(t.jobId), index("cand_status_idx").on(t.status)],
);

export const interviews = mysqlTable(
  "interviews",
  {
    id: serial("id").primaryKey(),
    candidateId: bigint("candidate_id", { mode: "number", unsigned: true }).notNull(),
    interviewerName: varchar("interviewer_name", { length: 255 }).notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    location: varchar("location", { length: 255 }).default("Online (Google Meet)"),
    notes: text("notes"),
    result: mysqlEnum("result", ["pending", "pass", "fail"]).notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("intv_cand_idx").on(t.candidateId)],
);

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */
export const attendanceRecords = mysqlTable(
  "attendance_records",
  {
    id: serial("id").primaryKey(),
    employeeId: bigint("employee_id", { mode: "number", unsigned: true }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    checkIn: timestamp("check_in"),
    checkOut: timestamp("check_out"),
    status: mysqlEnum("status", ["present", "late", "absent", "leave", "sick", "holiday"])
      .notNull()
      .default("present"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("att_emp_date_uniq").on(t.employeeId, t.date),
    index("att_date_idx").on(t.date),
  ],
);

/* ------------------------------------------------------------------ */
/* Leave                                                               */
/* ------------------------------------------------------------------ */
export const leaveRequests = mysqlTable(
  "leave_requests",
  {
    id: serial("id").primaryKey(),
    employeeId: bigint("employee_id", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["annual", "sick", "maternity", "unpaid", "other"])
      .notNull()
      .default("annual"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    days: int("days").notNull().default(1),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
    approverName: varchar("approver_name", { length: 255 }),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("leave_emp_idx").on(t.employeeId), index("leave_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ */
/* Payroll                                                             */
/* ------------------------------------------------------------------ */
export const payslips = mysqlTable(
  "payslips",
  {
    id: serial("id").primaryKey(),
    employeeId: bigint("employee_id", { mode: "number", unsigned: true }).notNull(),
    period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
    baseSalary: int("base_salary").notNull().default(0),
    allowance: int("allowance").notNull().default(0),
    overtime: int("overtime").notNull().default(0),
    bonus: int("bonus").notNull().default(0),
    deduction: int("deduction").notNull().default(0),
    tax: int("tax").notNull().default(0),
    netSalary: int("net_salary").notNull().default(0),
    status: mysqlEnum("status", ["draft", "paid"]).notNull().default("draft"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pay_emp_period_uniq").on(t.employeeId, t.period),
    index("pay_period_idx").on(t.period),
  ],
);

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */
export const performanceReviews = mysqlTable(
  "performance_reviews",
  {
    id: serial("id").primaryKey(),
    employeeId: bigint("employee_id", { mode: "number", unsigned: true }).notNull(),
    reviewerName: varchar("reviewer_name", { length: 255 }).notNull(),
    period: varchar("period", { length: 16 }).notNull(), // e.g. 2026-Q2
    goals: text("goals").notNull(),
    achievements: text("achievements").notNull(),
    reviewerScore: int("reviewer_score").notNull().default(0), // 0-100
    status: mysqlEnum("status", ["draft", "submitted", "reviewed"]).notNull().default("submitted"),
    aiScore: decimal("ai_score", { precision: 5, scale: 2 }),
    aiSummary: text("ai_summary"),
    aiRankedAt: timestamp("ai_ranked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("perf_emp_idx").on(t.employeeId),
    index("perf_period_idx").on(t.period),
  ],
);

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */
export const announcements = mysqlTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* AI rerank audit log                                                 */
/* ------------------------------------------------------------------ */
export const aiLogs = mysqlTable("ai_logs", {
  id: serial("id").primaryKey(),
  feature: varchar("feature", { length: 64 }).notNull(),
  queryText: text("query_text").notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  docCount: int("doc_count").notNull().default(0),
  fallback: boolean("fallback").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
