import { z } from "zod";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware.js";
import { authedQuery, managerQuery } from "../auth.js";
import { getDb } from "../queries/connection.js";
import { attendanceRecords, employees } from "../../db/schema.js";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ShiftType = "pagi" | "siang" | "malam";

export const SHIFT_CONFIG: Record<ShiftType, { name: string; hours: string; startHour: number; startMin: number; graceMin: number }> = {
  pagi: { name: "Shift Pagi", hours: "08:00 – 16:00", startHour: 8, startMin: 0, graceMin: 15 },
  siang: { name: "Shift Siang", hours: "16:00 – 00:00", startHour: 16, startMin: 0, graceMin: 15 },
  malam: { name: "Shift Malam", hours: "00:00 – 08:00", startHour: 0, startMin: 0, graceMin: 15 },
};

export function calculateLateDuration(now: Date, shift: ShiftType) {
  const cfg = SHIFT_CONFIG[shift] || SHIFT_CONFIG.pagi;
  const target = new Date(now);
  target.setHours(cfg.startHour, cfg.startMin, 0, 0);

  // For night shift if checking in past midnight
  if (shift === "malam" && now.getHours() < 12) {
    target.setDate(target.getDate() - 1);
  }

  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  const isLate = diffMinutes > cfg.graceMin;

  let lateDurationStr = "";
  if (isLate) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours > 0) {
      lateDurationStr = `Terlambat ${hours} Jam ${mins} Menit`;
    } else {
      lateDurationStr = `Terlambat ${mins} Menit`;
    }
  }

  return {
    isLate,
    lateMinutes: isLate ? diffMinutes : 0,
    lateDurationStr,
    shiftName: cfg.name,
    shiftHours: cfg.hours,
  };
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
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.from) conditions.push(gte(attendanceRecords.date, input.from));
      if (input?.to) conditions.push(lte(attendanceRecords.date, input.to));

      // Role-based visibility enforcement:
      // Employees can ONLY view their own attendance records!
      // HR and Admin can view all or filter by employeeId.
      if (ctx.user.role === "employee") {
        if (!ctx.user.employeeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akun tidak terhubung dengan data karyawan" });
        }
        conditions.push(eq(attendanceRecords.employeeId, ctx.user.employeeId));
      } else if (input?.employeeId) {
        conditions.push(eq(attendanceRecords.employeeId, input.employeeId));
      }

      const rows = await db
        .select({ record: attendanceRecords, employeeName: employees.fullName, employeeNo: employees.employeeNo })
        .from(attendanceRecords)
        .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.id))
        .limit(500);

      return rows.map((r) => {
        let photoBase64: string | null = null;
        let latitude: number | null = null;
        let longitude: number | null = null;
        let locationAddress: string | null = null;

        let outPhotoBase64: string | null = null;
        let outLatitude: number | null = null;
        let outLongitude: number | null = null;
        let outLocationAddress: string | null = null;

        let shift: ShiftType | null = null;
        let shiftName: string | null = null;
        let shiftHours: string | null = null;
        let lateMinutes: number = 0;
        let lateDurationStr: string | null = null;

        let notesText: string | null = r.record.notes;

        if (r.record.notes) {
          try {
            if (r.record.notes.startsWith("{")) {
              const meta = JSON.parse(r.record.notes);
              photoBase64 = meta.photoBase64 || null;
              latitude = meta.latitude ?? null;
              longitude = meta.longitude ?? null;
              locationAddress = meta.locationAddress || null;

              outPhotoBase64 = meta.outPhotoBase64 || null;
              outLatitude = meta.outLatitude ?? null;
              outLongitude = meta.outLongitude ?? null;
              outLocationAddress = meta.outLocationAddress || null;

              shift = meta.shift || null;
              shiftName = meta.shiftName || null;
              shiftHours = meta.shiftHours || null;
              lateMinutes = meta.lateMinutes || 0;
              lateDurationStr = meta.lateDurationStr || null;

              notesText = meta.customNotes || null;
            }
          } catch (e) {
            // Raw text notes
          }
        }

        return {
          ...r.record,
          employeeName: r.employeeName,
          employeeNo: r.employeeNo,
          photoBase64,
          latitude,
          longitude,
          locationAddress,
          outPhotoBase64,
          outLatitude,
          outLongitude,
          outLocationAddress,
          shift,
          shiftName,
          shiftHours,
          lateMinutes,
          lateDurationStr,
          notesText,
        };
      });
    }),

  todaySummary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const today = todayStr();

    const [activeEmp] = await db
      .select({ total: count() })
      .from(employees)
      .where(eq(employees.status, "active"));

    // If employee, return summary of today for employee only
    const conditions = [eq(attendanceRecords.date, today)];
    if (ctx.user.role === "employee" && ctx.user.employeeId) {
      conditions.push(eq(attendanceRecords.employeeId, ctx.user.employeeId));
    }

    const byStatus = await db
      .select({ status: attendanceRecords.status, total: count() })
      .from(attendanceRecords)
      .where(and(...conditions))
      .groupBy(attendanceRecords.status);

    return { date: today, activeEmployees: activeEmp.total, byStatus };
  }),

  checkIn: authedQuery
    .input(
      z.object({
        employeeId: z.number().int().positive().optional(),
        shift: z.enum(["pagi", "siang", "malam"]).optional(),
        photoBase64: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationAddress: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const employeeId = input?.employeeId ?? ctx.user.employeeId;
      if (!employeeId) throw new Error("Akun tidak terhubung dengan data karyawan");

      const today = todayStr();
      const now = new Date();

      // Determine shift: selected or calculated automatically based on current hour
      let selectedShift: ShiftType = input?.shift || "pagi";
      if (!input?.shift) {
        const hour = now.getHours();
        if (hour >= 5 && hour < 13) selectedShift = "pagi";
        else if (hour >= 13 && hour < 21) selectedShift = "siang";
        else selectedShift = "malam";
      }

      // Calculate exact late duration & status based on chosen shift rules
      const lateCalc = calculateLateDuration(now, selectedShift);
      const status = lateCalc.isLate ? "late" : "present";

      const [existing] = await db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, today)))
        .limit(1);

      let existingMeta: any = {};
      if (existing?.notes) {
        try {
          if (existing.notes.startsWith("{")) existingMeta = JSON.parse(existing.notes);
        } catch (e) {}
      }

      const meta = {
        ...existingMeta,
        shift: selectedShift,
        shiftName: lateCalc.shiftName,
        shiftHours: lateCalc.shiftHours,
        lateMinutes: lateCalc.lateMinutes,
        lateDurationStr: lateCalc.lateDurationStr,
        photoBase64: input?.photoBase64 || existingMeta.photoBase64 || null,
        latitude: input?.latitude ?? existingMeta.latitude ?? null,
        longitude: input?.longitude ?? existingMeta.longitude ?? null,
        locationAddress: input?.locationAddress || existingMeta.locationAddress || (input?.latitude ? `GPS: ${input.latitude}, ${input.longitude}` : null),
        checkInTime: now.toISOString(),
      };

      const notesPayload = JSON.stringify(meta);

      if (existing) {
        await db
          .update(attendanceRecords)
          .set({ checkIn: now, status, notes: notesPayload })
          .where(eq(attendanceRecords.id, existing.id));
      } else {
        await db.insert(attendanceRecords).values({
          employeeId,
          date: today,
          checkIn: now,
          status,
          notes: notesPayload,
        });
      }
      return { 
        ok: true, 
        status, 
        shiftName: lateCalc.shiftName,
        shiftHours: lateCalc.shiftHours,
        lateDurationStr: lateCalc.lateDurationStr 
      };
    }),

  checkOut: authedQuery
    .input(
      z.object({
        employeeId: z.number().int().positive().optional(),
        photoBase64: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationAddress: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const employeeId = input?.employeeId ?? ctx.user.employeeId;
      if (!employeeId) throw new Error("Akun tidak terhubung dengan data karyawan");
      const today = todayStr();
      const now = new Date();

      const [existing] = await db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, today)))
        .limit(1);

      let existingMeta: any = {};
      if (existing?.notes) {
        try {
          if (existing.notes.startsWith("{")) existingMeta = JSON.parse(existing.notes);
        } catch (e) {}
      }

      const meta = {
        ...existingMeta,
        outPhotoBase64: input?.photoBase64 || existingMeta.outPhotoBase64 || null,
        outLatitude: input?.latitude ?? existingMeta.outLatitude ?? null,
        outLongitude: input?.longitude ?? existingMeta.outLongitude ?? null,
        outLocationAddress: input?.locationAddress || existingMeta.outLocationAddress || (input?.latitude ? `GPS: ${input.latitude}, ${input.longitude}` : null),
        checkOutTime: now.toISOString(),
      };

      const notesPayload = JSON.stringify(meta);

      await db
        .update(attendanceRecords)
        .set({ checkOut: now, notes: notesPayload })
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
