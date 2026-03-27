import { Router } from "express";
import { db, lessonProgressTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/progress/me — current student's own progress (must be BEFORE /:studentId)
router.get("/progress/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const userId = (req.user as { id: string }).id;
    const [student] = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.userId, userId));
    if (!student) {
      res.status(404).json({ error: "Student record not found" });
      return;
    }
    const rows = await db
      .select()
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.studentId, student.id))
      .orderBy(lessonProgressTable.lessonNumber);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching own progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/progress/:studentId — stats for teacher progress page
router.get("/progress/:studentId", async (req, res) => {
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
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.studentId, studentId))
      .orderBy(lessonProgressTable.lessonNumber);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/progress/complete — mark a lesson complete (idempotent)
router.post("/progress/complete", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { lessonNumber } = req.body as { lessonNumber: number };
  if (typeof lessonNumber !== "number" || lessonNumber < 1) {
    res.status(400).json({ error: "lessonNumber must be a positive integer" });
    return;
  }
  try {
    const userId = (req.user as { id: string }).id;
    const [student] = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.userId, userId));
    if (!student) {
      res.status(404).json({ error: "Student record not found" });
      return;
    }
    const [row] = await db
      .insert(lessonProgressTable)
      .values({ studentId: student.id, lessonNumber, completed: true })
      .onConflictDoNothing()
      .returning();
    res.json({ success: true, alreadyCompleted: !row });
  } catch (err) {
    req.log.error({ err }, "Error marking lesson complete");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
