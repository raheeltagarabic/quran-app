import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateQuestionBody, UpdateQuestionBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ─── GET 10 random questions for a topic (student test mode) ─────────────────
router.get("/topics/:id/questions/random", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const topicId = parseInt(req.params.id);
  if (isNaN(topicId)) {
    res.status(400).json({ error: "Invalid topic id" });
    return;
  }
  try {
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.topicId, topicId))
      .orderBy(sql`RANDOM()`)
      .limit(10);
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Error fetching random questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/questions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [question] = await db.insert(questionsTable).values(parsed.data).returning();
    res.status(201).json(question);
  } catch (err) {
    req.log.error({ err }, "Error creating question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/questions/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [question] = await db.update(questionsTable).set(parsed.data).where(eq(questionsTable.id, id)).returning();
    if (!question) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(question);
  } catch (err) {
    req.log.error({ err }, "Error updating question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/questions/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(questionsTable).where(eq(questionsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting question");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
