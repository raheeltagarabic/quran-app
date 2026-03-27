import { pgTable, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    lessonNumber: integer("lesson_number").notNull(),
    completed: boolean("completed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uniq_student_lesson").on(table.studentId, table.lessonNumber),
  ],
);

export type LessonProgress = typeof lessonProgressTable.$inferSelect;
