import { pgTable, integer, varchar, numeric, date, timestamp, unique } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const feesTable = pgTable(
  "fees",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 7 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    status: varchar("status", { length: 10 }).notNull().default("unpaid"),
    paymentDate: date("payment_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uniq_student_month").on(table.studentId, table.month),
  ],
);

export type Fee = typeof feesTable.$inferSelect;
