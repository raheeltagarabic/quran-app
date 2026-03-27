import { Router } from "express";
import { db, attendanceTable, studentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/attendance/today — all students with today's attendance status
router.get("/attendance/today", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const today = new Date().toISOString().split("T")[0];

    const students = await db
      .select({
        id: studentsTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id));

    const todayRecords = await db
      .select()
      .from(attendanceTable)
      .where(eq(attendanceTable.date, today));

    const statusMap: Record<number, string> = {};
    for (const r of todayRecords) {
      statusMap[r.studentId] = r.status;
    }

    const result = students.map(s => {
      const full = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
      return {
        id: s.id,
        name: full || s.email || `Student #${s.id}`,
        status: statusMap[s.id] ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error fetching today attendance");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/attendance/:studentId — all records for one student
router.get("/attendance/:studentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(attendanceTable)
      .where(eq(attendanceTable.studentId, studentId))
      .orderBy(attendanceTable.date);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching attendance");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/attendance/mark — upsert attendance (teacher manual mark)
router.post("/attendance/mark", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { studentId, date, status, markedBy } = req.body as {
    studentId: number;
    date: string;
    status: "present" | "absent";
    markedBy?: string;
  };
  if (!studentId || !date || !status) {
    res.status(400).json({ error: "studentId, date, status are required" });
    return;
  }
  if (!["present", "absent"].includes(status)) {
    res.status(400).json({ error: "status must be 'present' or 'absent'" });
    return;
  }
  try {
    const [row] = await db
      .insert(attendanceTable)
      .values({ studentId, date, status, markedBy: markedBy ?? "teacher" })
      .onConflictDoUpdate({
        target: [attendanceTable.studentId, attendanceTable.date],
        set: { status, markedBy: markedBy ?? "teacher" },
      })
      .returning();
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error marking attendance");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

// Helper: auto-mark a student as present (used by recordings route)
export async function autoMarkPresent(studentId: number) {
  const today = new Date().toISOString().split("T")[0];
  try {
    await db
      .insert(attendanceTable)
      .values({ studentId, date: today, status: "present", markedBy: "auto" })
      .onConflictDoNothing();
  } catch {
    // Non-critical — swallow silently
  }
}
