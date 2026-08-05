import { z } from "zod";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { createRouter } from "../middleware.js";
import { authedQuery, managerQuery } from "../auth.js";
import { getDb } from "../queries/connection.js";
import { attendanceRecords, employees } from "../../db/schema.js";

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

      return rows.map((r) => {
        let photoBase64: string | null = null;
        let latitude: number | null = null;
        let longitude: number | null = null;
        let locationAddress: string | null = null;
        let notesText: string | null = r.record.notes;

        if (r.record.notes) {
          try {
            if (r.record.notes.startsWith("{")) {
              const meta = JSON.parse(r.record.notes);
              photoBase64 = meta.photoBase64 || null;
              latitude = meta.latitude ?? null;
              longitude = meta.longitude ?? null;
              locationAddress = meta.locationAddress || null;
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
          notesText,
        };
      });
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
      const late = now.getHours() >= 9; // check-in after 09:00 counts as late

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
          .set({ checkIn: now, status: late ? "late" : "present", notes: notesPayload })
          .where(eq(attendanceRecords.id, existing.id));
      } else {
        await db.insert(attendanceRecords).values({
          employeeId,
          date: today,
          checkIn: now,
          status: late ? "late" : "present",
          notes: notesPayload,
        });
      }
      return { ok: true, status: late ? "late" : "present" };
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
