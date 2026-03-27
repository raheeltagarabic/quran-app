import { Router } from "express";
import { db, feesTable, studentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/fees/:studentId — all fee records for one student
router.get("/fees/:studentId", async (req, res) => {
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
      .from(feesTable)
      .where(eq(feesTable.studentId, studentId))
      .orderBy(feesTable.month);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching fees");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/fees/set — create or update a monthly fee record
router.post("/fees/set", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { studentId, month, amount } = req.body as {
    studentId: number;
    month: string;
    amount: number;
  };
  if (!studentId || !month || amount == null) {
    res.status(400).json({ error: "studentId, month, amount are required" });
    return;
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(feesTable)
      .where(and(eq(feesTable.studentId, studentId), eq(feesTable.month, month)));

    let row;
    if (existing) {
      // Update amount, recalculate status
      const paid = parseFloat(String(existing.paidAmount));
      const newAmount = amount;
      const status =
        paid >= newAmount ? "paid" : paid > 0 ? "partial" : "unpaid";
      [row] = await db
        .update(feesTable)
        .set({ amount: String(newAmount), status })
        .where(eq(feesTable.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(feesTable)
        .values({ studentId, month, amount: String(amount), paidAmount: "0", status: "unpaid" })
        .returning();
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error setting fee");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/fees/pay — record a payment against a monthly fee
router.post("/fees/pay", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { studentId, month, paidAmount } = req.body as {
    studentId: number;
    month: string;
    paidAmount: number;
  };
  if (!studentId || !month || paidAmount == null || paidAmount <= 0) {
    res.status(400).json({ error: "studentId, month, paidAmount (> 0) are required" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(feesTable)
      .where(and(eq(feesTable.studentId, studentId), eq(feesTable.month, month)));

    if (!existing) {
      res.status(404).json({ error: "Fee record not found. Set a fee first." });
      return;
    }

    const totalAmount = parseFloat(String(existing.amount));
    const newPaid = Math.min(parseFloat(String(existing.paidAmount)) + paidAmount, totalAmount);
    const status =
      newPaid >= totalAmount ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    const today = new Date().toISOString().split("T")[0];

    const [row] = await db
      .update(feesTable)
      .set({
        paidAmount: String(newPaid),
        status,
        paymentDate: today,
      })
      .where(eq(feesTable.id, existing.id))
      .returning();

    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error processing payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
