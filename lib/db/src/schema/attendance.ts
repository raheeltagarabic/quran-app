import { pgTable, integer, varchar, date, timestamp, unique } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const attendanceTable = pgTable(
  "attendance",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: varchar("status", { length: 10 }).notNull(),
    markedBy: varchar("marked_by", { length: 50 }).notNull().default("teacher"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uniq_student_date").on(table.studentId, table.date),
  ],
);

export type Attendance = typeof attendanceTable.$inferSelect;
