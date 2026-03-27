import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resultsTable, topicsTable, studentsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitTestResultBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ─── GET /results/me — student's own results ──────────────────────────────────
router.get("/results/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const students = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.userId, req.user.id))
      .limit(1);
    if (students.length === 0) {
      res.json([]);
      return;
    }
    const studentId = students[0].id;
    const results = await db
      .select({
        id: resultsTable.id,
        studentId: resultsTable.studentId,
        topicId: resultsTable.topicId,
        score: resultsTable.score,
        totalQuestions: resultsTable.totalQuestions,
        answers: resultsTable.answers,
        date: resultsTable.date,
        topic: { id: topicsTable.id, title: topicsTable.title },
      })
      .from(resultsTable)
      .leftJoin(topicsTable, eq(resultsTable.topicId, topicsTable.id))
      .where(eq(resultsTable.studentId, studentId))
      .orderBy(desc(resultsTable.date));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error getting my results");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /results — all results (teacher view) ────────────────────────────────
router.get("/results", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: resultsTable.id,
        studentId: resultsTable.studentId,
        topicId: resultsTable.topicId,
        score: resultsTable.score,
        totalQuestions: resultsTable.totalQuestions,
        answers: resultsTable.answers,
        date: resultsTable.date,
        topic: { id: topicsTable.id, title: topicsTable.title },
        user: {
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        },
      })
      .from(resultsTable)
      .leftJoin(topicsTable, eq(resultsTable.topicId, topicsTable.id))
      .leftJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
      .orderBy(desc(resultsTable.date));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error getting all results");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/:id/results", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const studentId = parseInt(req.params.id);
  if (isNaN(studentId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const results = await db
      .select({
        id: resultsTable.id,
        studentId: resultsTable.studentId,
        topicId: resultsTable.topicId,
        score: resultsTable.score,
        totalQuestions: resultsTable.totalQuestions,
        answers: resultsTable.answers,
        date: resultsTable.date,
        topic: { id: topicsTable.id, title: topicsTable.title },
      })
      .from(resultsTable)
      .leftJoin(topicsTable, eq(resultsTable.topicId, topicsTable.id))
      .where(eq(resultsTable.studentId, studentId))
      .orderBy(desc(resultsTable.date));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error getting student results");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/results", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = SubmitTestResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const { answers, ...rest } = parsed.data;
    const [result] = await db
      .insert(resultsTable)
      .values({ ...rest, answers: answers ?? null })
      .returning();
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Error saving result");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
