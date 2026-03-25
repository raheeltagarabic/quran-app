import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { topicsTable, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTopicBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/topics", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const topics = await db.select().from(topicsTable).orderBy(topicsTable.id);
    res.json(topics);
  } catch (err) {
    req.log.error({ err }, "Error listing topics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/topics", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateTopicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [topic] = await db.insert(topicsTable).values(parsed.data).returning();
    res.status(201).json(topic);
  } catch (err) {
    req.log.error({ err }, "Error creating topic");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/topics/:id", async (req, res) => {
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
    const topics = await db.select().from(topicsTable).where(eq(topicsTable.id, id));
    if (topics.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.topicId, id));
    res.json({ ...topics[0], questions });
  } catch (err) {
    req.log.error({ err }, "Error getting topic");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/topics/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = CreateTopicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [topic] = await db.update(topicsTable).set(parsed.data).where(eq(topicsTable.id, id)).returning();
    if (!topic) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(topic);
  } catch (err) {
    req.log.error({ err }, "Error updating topic");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/topics/:id", async (req, res) => {
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
    await db.delete(topicsTable).where(eq(topicsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting topic");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
