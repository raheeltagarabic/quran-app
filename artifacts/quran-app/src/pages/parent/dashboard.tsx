import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, CalendarCheck, Target, DollarSign, FileText,
  CheckCircle2, AlertTriangle, Wallet, Share2, GraduationCap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = {
  studentName: string;
  currentLesson: number;
  scheduleType: string;
  teacherNotes: string | null;
  progress: { completedCount: number; totalLessons: number; progressPct: number };
  attendance: { presentDays: number; totalMarked: number; attendancePct: number | null; month: string };
  results: Array<{ id: number; score: number; totalQuestions: number; date: string; topicTitle: string | null }>;
  latestFee: { month: string; amount: string; paidAmount: string; status: string } | null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useParentDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["/api/parent/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/parent/dashboard", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to load dashboard");
      }
      return res.json();
    },
  });
}

// ─── Fee Status Badge ─────────────────────────────────────────────────────────

function FeeBadge({ status }: { status: string }) {
  if (status === "paid") return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Paid
    </Badge>
  );
  if (status === "partial") return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
      <Wallet className="w-3 h-3" /> Partial
    </Badge>
  );
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
      <AlertTriangle className="w-3 h-3" /> Unpaid
    </Badge>
  );
}

// ─── WhatsApp Share ───────────────────────────────────────────────────────────

function buildWhatsAppMessage(data: DashboardData): string {
  const lastResult = data.results[0];
  const lastScore = lastResult
    ? `${lastResult.score}/${lastResult.totalQuestions}`
    : "N/A";
  const att = data.attendance.attendancePct != null
    ? `${data.attendance.attendancePct}%`
    : "N/A";
  return (
    `Assalamu Alaikum! Here is ${data.studentName}'s latest update:\n` +
    `📖 Lesson: ${data.currentLesson}\n` +
    `✅ Qaida Progress: ${data.progress.progressPct}%\n` +
    `📅 Attendance (${data.attendance.month}): ${att}\n` +
    `📝 Last Test: ${lastScore}\n` +
    (data.latestFee ? `💷 Fee (${data.latestFee.month}): ${data.latestFee.status}` : "")
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { data, isLoading, error } = useParentDashboard();

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading your child's progress…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-20">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-display mb-2">Not Linked Yet</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {error?.message ?? "Your account hasn't been linked to a student yet."}{" "}
          Please contact the teacher and ask them to link your parent account.
        </p>
      </div>
    );
  }

  const { studentName, currentLesson, teacherNotes, progress, attendance, results, latestFee } = data;
  const whatsappText = encodeURIComponent(buildWhatsAppMessage(data));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-700 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display">
            Assalamu Alaikum!
          </h1>
          <p className="text-muted-foreground mt-1">
            Viewing progress for <span className="font-semibold text-foreground">{studentName}</span>
          </p>
        </div>
        <Button
          className="rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2 flex-shrink-0"
          onClick={() => window.open(`https://api.whatsapp.com/send?text=${whatsappText}`, "_blank")}
        >
          <Share2 className="w-4 h-4" />
          Share Progress
        </Button>
      </div>

      {/* Child Info Banner */}
      <div className="flex items-center gap-4 rounded-2xl px-6 py-4 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-xl leading-tight">{studentName}</p>
          <p className="text-primary-foreground/80 text-sm">
            Currently on Lesson {currentLesson} · Schedule Type {data.scheduleType}
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Progress Card */}
        <Card className="rounded-3xl shadow-lg border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <BookOpen className="w-5 h-5 text-primary" /> Qaida Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-primary">{progress.progressPct}%</span>
              <span className="text-sm text-muted-foreground">
                {progress.completedCount} of {progress.totalLessons} lessons
              </span>
            </div>
            <Progress value={progress.progressPct} className="h-3 rounded-full" />
            {progress.completedCount === 0 && (
              <p className="text-xs text-muted-foreground">No lessons marked as completed yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card className="rounded-3xl shadow-lg border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <CalendarCheck className="w-5 h-5 text-emerald-600" /> Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{attendance.month}</p>
            {attendance.totalMarked === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance recorded this month yet.</p>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-bold text-emerald-600">{attendance.attendancePct}%</span>
                  <span className="text-sm text-muted-foreground">
                    {attendance.presentDays} of {attendance.totalMarked} days
                  </span>
                </div>
                <Progress
                  value={attendance.attendancePct ?? 0}
                  className="h-3 rounded-full [&>div]:bg-emerald-500"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Test Results Card */}
        <Card className="rounded-3xl shadow-lg border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <Target className="w-5 h-5 text-amber-500" /> Recent Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tests taken yet.</p>
            ) : (
              <div className="space-y-3">
                {results.map(r => {
                  const pct = Math.round((r.score / r.totalQuestions) * 100);
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.topicTitle ?? "Islamic Basics"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${pct >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
                          {r.score}/{r.totalQuestions}
                        </span>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Card */}
        <Card className="rounded-3xl shadow-lg border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <DollarSign className="w-5 h-5 text-violet-500" /> Latest Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!latestFee ? (
              <p className="text-sm text-muted-foreground">No fee records yet.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {format(parse(latestFee.month, "yyyy-MM", new Date()), "MMMM yyyy")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-2xl p-3 text-center">
                    <p className="text-lg font-bold text-foreground">
                      £{parseFloat(latestFee.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">
                      £{parseFloat(latestFee.paidAmount).toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">Paid</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <FeeBadge status={latestFee.status} />
                </div>
                {parseFloat(latestFee.amount) - parseFloat(latestFee.paidAmount) > 0 && (
                  <div className="text-xs text-muted-foreground text-center bg-muted/30 rounded-xl p-2">
                    Remaining: <strong className="text-foreground">
                      £{(parseFloat(latestFee.amount) - parseFloat(latestFee.paidAmount)).toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teacher Notes */}
      {teacherNotes && (
        <Card className="rounded-3xl shadow-lg border-border/50 bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <FileText className="w-5 h-5 text-primary" /> Teacher Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{teacherNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
