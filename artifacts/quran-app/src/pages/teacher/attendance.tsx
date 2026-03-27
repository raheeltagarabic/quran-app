import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListStudents } from "@workspace/api-client-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, AlertTriangle, Users, TrendingUp, CheckCircle2, XCircle, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type TodayEntry = { id: number; name: string; status: "present" | "absent" | null };
type AttendanceRecord = { id: number; studentId: number; date: string; status: string; markedBy: string; createdAt: string };

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTodayAttendance() {
  return useQuery<TodayEntry[]>({
    queryKey: ["/api/attendance/today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

function useStudentAttendance(studentId: number | null) {
  return useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const res = await fetch(`/api/attendance/${studentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { studentId: number; date: string; status: "present" | "absent" }) => {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", variables.studentId] });
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStudentLabel(
  s: { id: number; user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null }
) {
  const full = `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim();
  return full || s.user?.email || `Student #${s.id}`;
}

function hasThreeConsecutiveAbsent(records: AttendanceRecord[]): boolean {
  const statusByDate: Record<string, string> = {};
  for (const r of records) statusByDate[r.date] = r.status;

  for (let i = 1; i <= 3; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (statusByDate[d] !== "absent") return false;
  }
  return true;
}

function calcMonthlyStats(records: AttendanceRecord[]) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = new Date() < endOfMonth(now) ? new Date() : endOfMonth(now);
  const allDays = eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));

  const statusByDate: Record<string, string> = {};
  for (const r of records) statusByDate[r.date] = r.status;

  const totalMarked = allDays.filter(d => statusByDate[d]).length;
  const presentDays = allDays.filter(d => statusByDate[d] === "present").length;
  const pct = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : null;
  return { presentDays, totalMarked, pct, allDays, statusByDate };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (status === "present") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Present
      </Badge>
    );
  }
  if (status === "absent") {
    return (
      <Badge className="bg-red-100 text-red-600 border-red-200 gap-1 font-medium">
        <XCircle className="w-3 h-3" /> Absent
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1 font-medium">
      <Minus className="w-3 h-3" /> Not Marked
    </Badge>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherAttendance() {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");

  const { data: students } = useListStudents();
  const { data: todayData = [], isLoading: todayLoading } = useTodayAttendance();
  const markAttendance = useMarkAttendance();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const { data: studentRecords = [], isLoading: recordsLoading } = useStudentAttendance(selectedStudentId);

  const handleMark = async (studentId: number, status: "present" | "absent") => {
    try {
      await markAttendance.mutateAsync({ studentId, date: today, status });
      toast({ title: `Marked as ${status}` });
    } catch {
      toast({ title: "Failed to mark attendance", variant: "destructive" });
    }
  };

  const selectedStudentName = students?.find(s => s.id === selectedStudentId);
  const monthlyStats = calcMonthlyStats(studentRecords);
  const consecutiveAbsent = hasThreeConsecutiveAbsent(studentRecords);
  const currentMonth = format(new Date(), "MMMM yyyy");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display">Attendance</h1>
        <p className="text-muted-foreground mt-1">{todayLabel}</p>
      </div>

      {/* ── Today's Attendance ──────────────────────────────────────────── */}
      <Card className="rounded-3xl shadow-lg border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-xl font-display">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todayLoading ? (
            <div className="animate-pulse h-24 m-6 bg-muted/50 rounded-2xl" />
          ) : todayData.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No students found. Add students first.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayData.map(entry => (
                  <TableRow key={entry.id} className="border-border/50 hover:bg-muted/20">
                    <TableCell className="pl-6 font-medium text-foreground">{entry.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant={entry.status === "present" ? "default" : "outline"}
                          className={`rounded-xl h-8 px-3 text-xs font-semibold transition-all
                            ${entry.status === "present"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                            }`}
                          disabled={markAttendance.isPending}
                          onClick={() => handleMark(entry.id, "present")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Present
                        </Button>
                        <Button
                          size="sm"
                          variant={entry.status === "absent" ? "destructive" : "outline"}
                          className={`rounded-xl h-8 px-3 text-xs font-semibold transition-all
                            ${entry.status === "absent"
                              ? ""
                              : "border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                            }`}
                          disabled={markAttendance.isPending}
                          onClick={() => handleMark(entry.id, "absent")}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly Attendance Detail ────────────────────────────────────── */}
      <Card className="rounded-3xl shadow-lg border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl font-display">
              <TrendingUp className="w-5 h-5 text-primary" />
              Monthly Detail — {currentMonth}
            </CardTitle>
            <div className="w-full sm:w-64">
              <Select
                value={selectedStudentId?.toString() ?? ""}
                onValueChange={(val) => setSelectedStudentId(Number(val))}
              >
                <SelectTrigger className="rounded-xl bg-card">
                  <SelectValue placeholder="Select a student…" />
                </SelectTrigger>
                <SelectContent>
                  {(students ?? []).map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {getStudentLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {!selectedStudentId && (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Select a student to view their monthly attendance.</p>
            </div>
          )}

          {selectedStudentId && recordsLoading && (
            <div className="animate-pulse h-20 bg-muted/50 rounded-2xl" />
          )}

          {selectedStudentId && !recordsLoading && (
            <>
              {/* Alert: 3 consecutive absent days */}
              {consecutiveAbsent && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-semibold text-sm">
                    {selectedStudentName ? getStudentLabel(selectedStudentName) : "This student"} has been absent for 3 consecutive days.
                  </p>
                </div>
              )}

              {/* Attendance percentage */}
              {monthlyStats.totalMarked === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No attendance recorded this month yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{monthlyStats.presentDays}</p>
                    <p className="text-xs text-emerald-600 mt-1">Days Present</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {monthlyStats.totalMarked - monthlyStats.presentDays}
                    </p>
                    <p className="text-xs text-red-500 mt-1">Days Absent</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{monthlyStats.pct}%</p>
                    <p className="text-xs text-primary/70 mt-1">Attendance</p>
                  </div>
                </div>
              )}

              {/* Date-wise table */}
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
                      <TableHead className="pl-5">Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-5">Marked By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyStats.allDays.slice().reverse().map(dateStr => {
                      const s = monthlyStats.statusByDate[dateStr];
                      const rec = studentRecords.find(r => r.date === dateStr);
                      return (
                        <TableRow
                          key={dateStr}
                          className={`border-border/40 transition-colors
                            ${s === "present" ? "bg-emerald-50/50 hover:bg-emerald-50" : ""}
                            ${s === "absent" ? "bg-red-50/50 hover:bg-red-50" : ""}
                            ${!s ? "hover:bg-muted/10" : ""}
                          `}
                        >
                          <TableCell className="pl-5 font-medium text-foreground tabular-nums">
                            {format(new Date(dateStr + "T12:00:00"), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(dateStr + "T12:00:00"), "EEEE")}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={s ?? null} />
                          </TableCell>
                          <TableCell className="text-right pr-5 text-xs text-muted-foreground">
                            {rec?.markedBy === "auto" ? (
                              <span className="italic text-primary/60">auto (recording)</span>
                            ) : rec?.markedBy === "teacher" ? (
                              "Teacher"
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
