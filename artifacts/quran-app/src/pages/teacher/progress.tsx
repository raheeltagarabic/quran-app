import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListStudents, useGetStudentResults } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, BookOpen, CheckCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStudentLabel(
  s: { id: number; user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null }
) {
  const full = `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim();
  return full || s.user?.email || `Student #${s.id}`;
}

type ProgressRow = { id: number; studentId: number; lessonNumber: number; completed: boolean; createdAt: string };

function useStudentProgress(studentId: number | null) {
  return useQuery<ProgressRow[]>({
    queryKey: ["/api/progress", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const res = await fetch(`/api/progress/${studentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherProgress() {
  const { data: students } = useListStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const { data: results, isLoading: resultsLoading } = useGetStudentResults(selectedStudentId!, {
    query: { enabled: !!selectedStudentId },
  });

  const { data: progressRows = [], isLoading: progressLoading } = useStudentProgress(selectedStudentId);

  const selectedStudent = students?.find(s => s.id === selectedStudentId);
  const totalLessons = selectedStudent?.currentLesson ?? 0;
  const completedCount = progressRows.filter(r => r.completed).length;
  const remainingCount = Math.max(0, totalLessons - completedCount);
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const chartData = results?.map(r => ({
    name: (r.topic?.title ?? "").substring(0, 15) + (r.topic?.title && r.topic.title.length > 15 ? "…" : ""),
    scorePercentage: Math.round((r.score / r.totalQuestions) * 100),
    date: format(new Date(r.date!), "MMM d"),
  })) ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header + Student selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Student Progress</h1>
          <p className="text-muted-foreground mt-1">Review Qaida lesson progress and Islamic Basics test scores.</p>
        </div>
        <div className="w-full sm:w-72">
          <Select
            value={selectedStudentId?.toString() ?? ""}
            onValueChange={(val) => setSelectedStudentId(Number(val))}
          >
            <SelectTrigger className="rounded-xl shadow-sm bg-card">
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

      {/* Empty state */}
      {!selectedStudentId && (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Select a student to view their progress.</p>
        </div>
      )}

      {selectedStudentId && (
        <div className="space-y-8">

          {/* ── Qaida Lesson Progress ─────────────────────────────────────── */}
          <Card className="rounded-3xl shadow-lg border-border/50">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-xl font-display">
                <BookOpen className="w-5 h-5 text-primary" />
                Qaida Lesson Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {progressLoading ? (
                <div className="animate-pulse h-20 bg-muted/50 rounded-2xl" />
              ) : totalLessons === 0 ? (
                <p className="text-muted-foreground text-sm">No lesson data available.</p>
              ) : (
                <div className="space-y-5">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Overall completion</span>
                      <span className="font-bold text-primary">{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="h-3 rounded-full" />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/10">
                      <p className="text-2xl font-bold text-primary">{completedCount}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Completed
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-2xl p-4 text-center border border-border/50">
                      <p className="text-2xl font-bold text-foreground">{remainingCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Remaining</p>
                    </div>
                    <div className="bg-muted/40 rounded-2xl p-4 text-center border border-border/50">
                      <p className="text-2xl font-bold text-foreground">{totalLessons}</p>
                      <p className="text-xs text-muted-foreground mt-1">Current Lesson</p>
                    </div>
                  </div>

                  {/* No progress message */}
                  {completedCount === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No lessons completed yet — the student hasn't marked any lessons as done.
                    </p>
                  )}

                  {/* Completed lessons list */}
                  {completedCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {progressRows
                        .filter(r => r.completed)
                        .sort((a, b) => a.lessonNumber - b.lessonNumber)
                        .map(r => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            <CheckCheck className="w-3 h-3" /> Lesson {r.lessonNumber}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Test Results ─────────────────────────────────────────────── */}
          {resultsLoading ? (
            <div className="animate-pulse h-60 bg-muted/50 rounded-3xl" />
          ) : results?.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg">No test results yet for this student.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 rounded-3xl shadow-lg border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-display">
                    <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                    Test Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Bar dataKey="scorePercentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-lg border-border/50 h-fit">
                <CardHeader>
                  <CardTitle className="text-xl font-display">Recent Tests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead>Topic</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results?.slice().reverse().map(r => (
                        <TableRow key={r.id} className="border-border/50">
                          <TableCell>
                            <div className="font-medium text-foreground">{r.topic?.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(r.date!), "MMM d, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                              {r.score}/{r.totalQuestions}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
