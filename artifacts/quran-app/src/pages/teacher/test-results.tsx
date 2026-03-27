import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListStudents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Trophy, Target } from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnswerEntry = {
  questionId: number;
  selectedAnswer: string;
  correct: boolean;
};

type Result = {
  id: number;
  studentId: number;
  topicId: number;
  score: number;
  totalQuestions: number;
  answers: AnswerEntry[] | null;
  date: string;
  topic: { id: number; title: string } | null;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useAllResults() {
  return useQuery<Result[]>({
    queryKey: ["/api/results"],
    queryFn: async () => {
      const res = await fetch("/api/results", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
  });
}

// ─── Student name helper ──────────────────────────────────────────────────────

function studentName(r: Result) {
  const u = r.user;
  if (!u) return `Student #${r.studentId}`;
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.email || `Student #${r.studentId}`;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCards({ results }: { results: Result[] }) {
  const total = results.length;
  const avg = total === 0 ? 0 : Math.round(
    results.reduce((sum, r) => sum + Math.round((r.score / r.totalQuestions) * 100), 0) / total,
  );
  const passed = results.filter(r => Math.round((r.score / r.totalQuestions) * 100) >= 70).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: "Total Attempts", value: total, icon: Target, color: "text-primary" },
        { label: "Average Score", value: `${avg}%`, icon: Trophy, color: "text-amber-500" },
        { label: "Pass Rate (≥70%)", value: `${total === 0 ? 0 : Math.round((passed / total) * 100)}%`, icon: CheckCircle2, color: "text-emerald-600" },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherTestResults() {
  const { data: results, isLoading, error } = useAllResults();
  const { data: students } = useListStudents();
  const [filterStudentId, setFilterStudentId] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getDisplayName = (student: NonNullable<typeof students>[number]) => {
    const full = `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim();
    return full || student.user?.email || `Student #${student.id}`;
  };

  const filtered = (results ?? []).filter(r =>
    filterStudentId === "all" || String(r.studentId) === filterStudentId,
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Test Results</h1>
          <p className="text-muted-foreground mt-1">View all student test attempts and scores.</p>
        </div>
        <Select value={filterStudentId} onValueChange={setFilterStudentId}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Filter by student" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            {(students ?? []).map(s => (
              <SelectItem key={s.id} value={String(s.id)}>
                {getDisplayName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <SummaryCards results={filtered} />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load results: {(error as Error).message}
        </div>
      )}

      {/* Results table */}
      <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading results…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No test results yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(r => {
                const pct = Math.round((r.score / r.totalQuestions) * 100);
                const passed = pct >= 70;
                const expanded = expandedId === r.id;

                return (
                  <>
                    <TableRow key={r.id} className={expanded ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium">{studentName(r)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.topic?.title ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`font-bold text-lg ${passed ? "text-emerald-600" : "text-amber-600"}`}>
                          {r.score}/{r.totalQuestions}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs gap-1 ${
                          passed
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`} variant="outline">
                          {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {pct}% {passed ? "Pass" : "Needs work"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(r.date), "MMM d, yyyy")}
                        <br />
                        <span className="text-xs">{format(new Date(r.date), "HH:mm")}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.answers && r.answers.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl h-8 px-3 text-xs"
                            onClick={() => setExpandedId(expanded ? null : r.id)}
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {expanded ? "Hide" : "View"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded answer detail */}
                    {expanded && r.answers && (
                      <TableRow key={`${r.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/10 p-0">
                          <div className="p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Answer Breakdown
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {r.answers.map((a, i) => (
                                <div
                                  key={a.questionId}
                                  className={`rounded-xl border px-4 py-2.5 flex items-center gap-3 text-sm ${
                                    a.correct
                                      ? "border-emerald-200 bg-emerald-50"
                                      : "border-red-200 bg-red-50"
                                  }`}
                                >
                                  {a.correct
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  }
                                  <span className="text-muted-foreground font-medium">Q{i + 1}:</span>
                                  <span className={a.correct ? "text-emerald-700" : "text-red-700"}>
                                    {a.selectedAnswer || "— not answered —"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
