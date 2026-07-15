import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import {
  authedQuery,
  adminQuery,
  managerQuery,
  hashPassword,
  verifyPassword,
  createSessionCookie,
  clearSessionCookie,
} from "../auth";
import { getDb } from "../queries/connection";
import { users, employees } from "@db/schema";

export const authRouter = createRouter({
  me: publicQuery.query(({ ctx }) => ctx.user),

  login: publicQuery
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username.trim().toLowerCase()))
        .limit(1);

      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Username atau password salah" });
      }
      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Akun dinonaktifkan" });
      }

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      ctx.resHeaders.append("Set-Cookie", createSessionCookie(user.id, user.role));

      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      };
    }),

  logout: publicQuery.mutation(({ ctx }) => {
    ctx.resHeaders.append("Set-Cookie", clearSessionCookie());
    return { ok: true };
  }),

  /* ------------------------------------------------------------------ */
  /* User listing                                                         */
  /* Admin: see all users                                                 */
  /* HR: see only employee-role users                                     */
  /* ------------------------------------------------------------------ */
  listUsers: managerQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    const safeRows = rows.map(({ passwordHash: _pw, ...u }) => u);

    // HR can only see employee accounts, admin sees all
    if (ctx.user.role === "hr") {
      return safeRows.filter((u) => u.role === "employee");
    }
    return safeRows;
  }),

  /* ------------------------------------------------------------------ */
  /* Create user                                                          */
  /* Admin: can create admin / hr / employee accounts                     */
  /* HR: can only create employee accounts                                */
  /* ------------------------------------------------------------------ */
  createUser: managerQuery
    .input(
      z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6),
        fullName: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        role: z.enum(["admin", "hr", "employee"]),
        employeeId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // HR can only create employee accounts
      if (ctx.user.role === "hr" && input.role !== "employee") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "HR hanya dapat membuat akun dengan role Karyawan",
        });
      }

      const username = input.username.trim().toLowerCase();
      const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Username sudah digunakan" });
      }
      if (input.employeeId) {
        const [emp] = await db
          .select()
          .from(employees)
          .where(eq(employees.id, input.employeeId))
          .limit(1);
        if (!emp) throw new TRPCError({ code: "BAD_REQUEST", message: "Karyawan tidak ditemukan" });
      }
      await db.insert(users).values({
        username,
        passwordHash: hashPassword(input.password),
        fullName: input.fullName,
        email: input.email || null,
        role: input.role,
        employeeId: input.employeeId ?? null,
      });
      return { ok: true };
    }),

  /* ------------------------------------------------------------------ */
  /* Update user                                                          */
  /* Admin: can update all fields on any user                             */
  /* HR: can only update employee accounts (not change role away from employee) */
  /* ------------------------------------------------------------------ */
  updateUser: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")),
        role: z.enum(["admin", "hr", "employee"]).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
        employeeId: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Check the target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pengguna tidak ditemukan" });
      }

      // HR restrictions: can only manage employee accounts
      if (ctx.user.role === "hr") {
        if (targetUser.role !== "employee") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "HR hanya dapat mengubah akun Karyawan",
          });
        }
        if (input.role && input.role !== "employee") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "HR tidak dapat mengubah role akun",
          });
        }
      }

      const { id, password, ...rest } = input;
      const data: Record<string, unknown> = {};
      if (rest.fullName !== undefined) data.fullName = rest.fullName;
      if (rest.email !== undefined) data.email = rest.email || null;
      if (rest.role !== undefined) data.role = rest.role;
      if (rest.isActive !== undefined) data.isActive = rest.isActive;
      if (rest.employeeId !== undefined) data.employeeId = rest.employeeId;
      if (password) data.passwordHash = hashPassword(password);
      await db.update(users).set(data).where(eq(users.id, id));
      return { ok: true };
    }),

  /* ------------------------------------------------------------------ */
  /* Delete user                                                          */
  /* Admin: can delete any user (except themselves)                       */
  /* HR: can only delete employee accounts                                */
  /* ------------------------------------------------------------------ */
  deleteUser: managerQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak bisa menghapus akun sendiri" });
      }

      const db = getDb();
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pengguna tidak ditemukan" });
      }

      // HR can only delete employee accounts
      if (ctx.user.role === "hr" && targetUser.role !== "employee") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "HR hanya dapat menghapus akun Karyawan",
        });
      }

      await db.delete(users).where(eq(users.id, input.id));
      return { ok: true };
    }),

  /* ------------------------------------------------------------------ */
  /* Change own password                                                  */
  /* ------------------------------------------------------------------ */
  changePassword: authedQuery
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user || !verifyPassword(input.currentPassword, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Password saat ini salah" });
      }
      await db
        .update(users)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(users.id, user.id));
      return { ok: true };
    }),

  /* ------------------------------------------------------------------ */
  /* Admin: reset password for any user                                   */
  /* HR: can reset password for employee accounts only                    */
  /* ------------------------------------------------------------------ */
  resetPassword: managerQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pengguna tidak ditemukan" });
      }

      if (ctx.user.role === "hr" && targetUser.role !== "employee") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "HR hanya dapat mereset password akun Karyawan",
        });
      }

      await db
        .update(users)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(users.id, input.id));
      return { ok: true };
    }),
});
