import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { studentsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  CreateStudentBody,
  UpdateStudentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Helper: find or create parent user and return their ID ──────────────────
async function resolveParentId(
  parentEmail: string,
  parentName?: string,
): Promise<string> {
  const trimEmail = parentEmail.trim().toLowerCase();

  // Split optional name into first/last
  const nameParts = parentName?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.slice(1).join(" ") || null;

  // Check if a user with this email already exists
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, trimEmail))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    // Ensure role is 'parent'
    if (user.role !== "parent") {
      await db
        .update(usersTable)
        .set({ role: "parent" })
        .where(eq(usersTable.id, user.id));
    }
    return user.id;
  }

  // Create a new parent user (no Replit auth yet; they'll log in later)
  const [newUser] = await db
    .insert(usersTable)
    .values({
      email: trimEmail,
      role: "parent",
      firstName,
      lastName,
    })
    .returning({ id: usersTable.id });

  return newUser.id;
}

// ─── GET /students ────────────────────────────────────────────────────────────
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
        parentId: studentsTable.parentId,
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

    // Fetch parent emails in a second pass (simple approach)
    const parentIds = students
      .map(s => s.parentId)
      .filter((id): id is string => !!id);

    let parentMap: Record<string, { email: string | null; firstName: string | null; lastName: string | null }> = {};
    if (parentIds.length > 0) {
      const parents = await db
        .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(inArray(usersTable.id, parentIds));
      for (const p of parents) {
        parentMap[p.id] = { email: p.email, firstName: p.firstName, lastName: p.lastName };
      }
    }

    const result = students.map(s => ({
      ...s,
      parent: s.parentId ? (parentMap[s.parentId] ?? null) : null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /students/me ─────────────────────────────────────────────────────────
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

// ─── POST /students ───────────────────────────────────────────────────────────
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
    const { parentEmail, parentName, ...studentData } = parsed.data;

    let parentId: string | undefined;
    if (parentEmail) {
      parentId = await resolveParentId(parentEmail, parentName);
    }

    const [student] = await db
      .insert(studentsTable)
      .values({ ...studentData, parentId })
      .returning();

    res.status(201).json({
      ...student,
      parentLinked: !!parentId,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /students/:id ────────────────────────────────────────────────────────
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

// ─── PUT /students/:id ────────────────────────────────────────────────────────
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
    const { parentEmail, parentName, ...studentData } = parsed.data;

    let updatePayload: Record<string, unknown> = { ...studentData };

    if (parentEmail && parentEmail.trim() !== "") {
      const parentId = await resolveParentId(parentEmail, parentName);
      updatePayload.parentId = parentId;
    } else if (parentEmail === "") {
      // Explicitly clear parent link
      updatePayload.parentId = null;
    }

    const [student] = await db
      .update(studentsTable)
      .set(updatePayload)
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

// ─── DELETE /students/:id ─────────────────────────────────────────────────────
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
