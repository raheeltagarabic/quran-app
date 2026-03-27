import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { recordingsTable, studentsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { CreateRecordingBody } from "@workspace/api-zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { autoMarkPresent } from "./attendance";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads", "recordings");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Returns distinct students who have at least one recording, with display name
router.get("/recordings/students", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    // Get distinct student_ids from recordings
    const rows = await db
      .selectDistinct({ studentId: recordingsTable.studentId })
      .from(recordingsTable);

    if (rows.length === 0) {
      res.json([]);
      return;
    }

    const studentIds = rows.map(r => r.studentId);

    // Fetch student + user info for those ids
    const students = await db
      .select({
        id: studentsTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
      .where(inArray(studentsTable.id, studentIds));

    const result = students.map(s => {
      const full = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
      return {
        id: s.id,
        name: full || s.email || `Student #${s.id}`,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting recording students");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/:id/recordings", async (req, res) => {
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
    const recordings = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.studentId, studentId))
      .orderBy(recordingsTable.createdAt);
    res.json(recordings);
  } catch (err) {
    req.log.error({ err }, "Error getting recordings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/recordings/upload", upload.single("audio"), (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/api/recordings/files/${req.file.filename}`;
  res.json({ url });
});

router.use("/recordings/files", (req, res, next) => {
  const filePath = path.join(uploadDir, path.basename(req.path));
  res.sendFile(filePath, (err) => {
    if (err) next(err);
  });
});

router.post("/recordings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateRecordingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [recording] = await db.insert(recordingsTable).values(parsed.data).returning();
    // Auto-mark student as present for today when they submit a recording
    autoMarkPresent(parsed.data.studentId).catch(() => {});
    res.status(201).json(recording);
  } catch (err) {
    req.log.error({ err }, "Error creating recording" );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
