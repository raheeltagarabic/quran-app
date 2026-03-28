import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user?.role !== "teacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
      })
      .from(usersTable)
      .orderBy(usersTable.email);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Error listing users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/promote", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user?.role !== "teacher") {
    res.status(403).json({ error: "Forbidden: teacher only" });
    return;
  }

  const { email, role } = req.body as { email?: string; role?: string };

  if (!email || !role || !["teacher", "student", "parent"].includes(role)) {
    res.status(400).json({ error: "Invalid email or role" });
    return;
  }

  if (email === req.user.email) {
    res.status(400).json({ error: "You cannot change your own role" });
    return;
  }

  try {
    const result = await db
      .update(usersTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(usersTable.email, email))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      });

    if (result.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ success: true, user: result[0] });
  } catch (err) {
    req.log.error({ err }, "Error promoting user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
