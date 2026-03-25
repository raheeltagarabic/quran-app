import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resultsTable, topicsTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitTestResultBody } from "@workspace/api-zod";

const router: IRouter = Router();

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
        date: resultsTable.date,
        topic: {
          id: topicsTable.id,
          title: topicsTable.title,
          content: topicsTable.content,
          createdAt: topicsTable.createdAt,
        },
      })
      .from(resultsTable)
      .leftJoin(topicsTable, eq(resultsTable.topicId, topicsTable.id))
      .where(eq(resultsTable.studentId, studentId))
      .orderBy(resultsTable.date);
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
    const [result] = await db.insert(resultsTable).values(parsed.data).returning();
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Error saving result");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
