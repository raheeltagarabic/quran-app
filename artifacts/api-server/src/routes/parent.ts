import { Router } from "express";
import { db, studentsTable, usersTable, lessonProgressTable, attendanceTable, resultsTable, feesTable, topicsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { format, startOfMonth, endOfMonth } from "date-fns";

const router = Router();

// GET /api/parent/dashboard — full child summary for a logged-in parent
router.get("/parent/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = (req.user as { id: string }).id;

  try {
    // 1. Find student linked to this parent
    const [student] = await db
      .select({
        id: studentsTable.id,
        currentLesson: studentsTable.currentLesson,
        scheduleType: studentsTable.scheduleType,
        notes: studentsTable.notes,
        studentUserId: studentsTable.userId,
      })
      .from(studentsTable)
      .where(eq(studentsTable.parentId, userId));

    if (!student) {
      res.status(404).json({ error: "No child linked to this parent account. Please ask the teacher to link your account." });
      return;
    }

    // 2. Student display name
    const [studentUser] = await db
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, student.studentUserId));

    const nameRaw = `${studentUser?.firstName ?? ""} ${studentUser?.lastName ?? ""}`.trim();
    const studentName = nameRaw || studentUser?.email || `Student #${student.id}`;

    // 3. Progress
    const progressRows = await db
      .select()
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.studentId, student.id));
    const completedCount = progressRows.filter(r => r.completed).length;
    const totalLessons = student.currentLesson;
    const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    // 4. Current-month attendance
    const now = new Date();
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const attendanceRows = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.studentId, student.id),
          gte(attendanceTable.date, monthStart),
          lte(attendanceTable.date, monthEnd),
        )
      );
    const presentDays = attendanceRows.filter(r => r.status === "present").length;
    const totalMarked = attendanceRows.length;
    const attendancePct = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : null;

    // 5. Last 5 test results with topic name
    const results = await db
      .select({
        id: resultsTable.id,
        score: resultsTable.score,
        totalQuestions: resultsTable.totalQuestions,
        date: resultsTable.date,
        topicTitle: topicsTable.title,
      })
      .from(resultsTable)
      .leftJoin(topicsTable, eq(resultsTable.topicId, topicsTable.id))
      .where(eq(resultsTable.studentId, student.id))
      .orderBy(desc(resultsTable.date))
      .limit(5);

    // 6. Latest fee record
    const [latestFee] = await db
      .select()
      .from(feesTable)
      .where(eq(feesTable.studentId, student.id))
      .orderBy(desc(feesTable.month))
      .limit(1);

    res.json({
      studentName,
      currentLesson: student.currentLesson,
      scheduleType: student.scheduleType,
      teacherNotes: student.notes || null,
      progress: {
        completedCount,
        totalLessons,
        progressPct,
      },
      attendance: {
        presentDays,
        totalMarked,
        attendancePct,
        month: format(now, "MMMM yyyy"),
      },
      results,
      latestFee: latestFee ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching parent dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
