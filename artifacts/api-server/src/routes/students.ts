import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { studentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateStudentBody,
  UpdateStudentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/students", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const students = await db
      .select({
        id: studentsTable.id,
        userId: studentsTable.userId,
        scheduleType: studentsTable.scheduleType,
        currentLesson: studentsTable.currentLesson,
        notes: studentsTable.notes,
        createdAt: studentsTable.createdAt,
        updatedAt: studentsTable.updatedAt,
        user: {
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          profileImageUrl: usersTable.profileImageUrl,
        },
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id));
    res.json(students);
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: studentsTable.id,
        userId: studentsTable.userId,
        scheduleType: studentsTable.scheduleType,
        currentLesson: studentsTable.currentLesson,
        notes: studentsTable.notes,
        createdAt: studentsTable.createdAt,
        updatedAt: studentsTable.updatedAt,
        user: {
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          profileImageUrl: usersTable.profileImageUrl,
        },
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
      .where(eq(studentsTable.userId, req.user.id));
    if (rows.length === 0) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Error getting student profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/students", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [student] = await db.insert(studentsTable).values(parsed.data).returning();
    res.status(201).json(student);
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/:id", async (req, res) => {
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
    const rows = await db
      .select({
        id: studentsTable.id,
        userId: studentsTable.userId,
        scheduleType: studentsTable.scheduleType,
        currentLesson: studentsTable.currentLesson,
        notes: studentsTable.notes,
        createdAt: studentsTable.createdAt,
        updatedAt: studentsTable.updatedAt,
        user: {
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          profileImageUrl: usersTable.profileImageUrl,
        },
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
      .where(eq(studentsTable.id, id));
    if (rows.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Error getting student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/students/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [student] = await db
      .update(studentsTable)
      .set(parsed.data)
      .where(eq(studentsTable.id, id))
      .returning();
    if (!student) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(student);
  } catch (err) {
    req.log.error({ err }, "Error updating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/students/:id", async (req, res) => {
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
    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting student");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
