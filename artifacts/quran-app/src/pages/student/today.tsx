import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetMyStudentProfile,
  useListTopics,
  useGetTopic,
  useSubmitTestResult,
  useUploadRecording,
  useCreateRecording,
} from "@workspace/api-client-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Video, Mic, SquareSquare, CheckCircle2, ChevronRight, BookOpen,
  Target, Moon, ChevronLeft, CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Schedule logic ─────────────────────────────────────────────────────────

function getMode(schedule: string): "qaida" | "test" | "off" {
  const day = new Date().getDay();
  if (schedule === "A") {
    if ([1, 2, 3].includes(day)) return "qaida";
    if ([4, 5].includes(day)) return "test";
  }
  if (schedule === "B") {
    if ([4, 5, 6].includes(day)) return "qaida";
    if ([0, 1].includes(day)) return "test";
  }
  return "off";
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Progress hooks ──────────────────────────────────────────────────────────

type ProgressRow = { id: number; studentId: number; lessonNumber: number; completed: boolean; createdAt: string };

function useMyProgress() {
  return useQuery<ProgressRow[]>({
    queryKey: ["/api/progress/me"],
    queryFn: async () => {
      const res = await fetch("/api/progress/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
  });
}

function useMarkLessonComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonNumber: number) => {
      const res = await fetch("/api/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lessonNumber }),
      });
      if (!res.ok) throw new Error("Failed to mark lesson complete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress/me"] });
    },
  });
}

// ─── Root page ───────────────────────────────────────────────────────────────

export default function StudentToday() {
  const { data: profile, isLoading } = useGetMyStudentProfile();
  const { data: progressRows = [] } = useMyProgress();

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading your class data…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-20">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-display mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground text-sm">
          Your teacher hasn't set up your student profile yet. Please contact them to get started.
        </p>
      </div>
    );
  }

  const mode = getMode(profile.scheduleType);
  const today = DAY_NAMES[new Date().getDay()];
  const displayName = profile.user?.firstName ?? profile.user?.email?.split("@")[0] ?? "Student";

  const completedLessons = new Set(progressRows.filter(r => r.completed).map(r => r.lessonNumber));
  const totalLessons = profile.currentLesson;
  const completedCount = completedLessons.size;
  const remainingCount = Math.max(0, totalLessons - completedCount);
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-700 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-display mb-1">
          Assalamu Alaikum, {displayName}!
        </h1>
        <p className="text-muted-foreground">{today} · Schedule Type {profile.scheduleType}</p>
      </div>

      {/* Qaida Progress Summary */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2 w-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">Qaida Lesson Progress</span>
              <span className="text-sm font-bold text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 rounded-full" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                <strong className="text-foreground">{completedCount}</strong> completed
              </span>
              <span>·</span>
              <span><strong className="text-foreground">{remainingCount}</strong> remaining</span>
              <span>·</span>
              <span>On lesson <strong className="text-foreground">{totalLessons}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Banner */}
      {mode === "qaida" && (
        <div className="flex items-center gap-4 rounded-2xl px-6 py-4 bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Today: Qaida Class</p>
            <p className="text-primary-foreground/80 text-sm">
              Open your Qaida book to page {profile.currentLesson} and join your teacher.
            </p>
          </div>
        </div>
      )}

      {mode === "test" && (
        <div className="flex items-center gap-4 rounded-2xl px-6 py-4 bg-amber-500 text-white shadow-lg shadow-amber-500/30">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Today: Test Day</p>
            <p className="text-white/80 text-sm">Choose an Islamic Basics topic below and take your test.</p>
          </div>
        </div>
      )}

      {mode === "off" && (
        <div className="flex items-center gap-4 rounded-2xl px-6 py-4 bg-muted text-muted-foreground border border-border/50">
          <div className="w-10 h-10 rounded-full bg-muted-foreground/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight text-foreground">Today: Rest Day</p>
            <p className="text-sm">No class scheduled today. Revise your previous lessons and rest well.</p>
          </div>
        </div>
      )}

      {/* Mode Content */}
      {mode === "qaida" && (
        <QaidaView profile={profile} completedLessons={completedLessons} />
      )}
      {mode === "test" && <TestModeView studentId={profile.id} />}
      {mode === "off" && (
        <RestDayView profile={profile} completedLessons={completedLessons} />
      )}
    </div>
  );
}

// ─── Lesson Viewer ───────────────────────────────────────────────────────────

function LessonViewer({
  initialLesson,
  badge,
  completedLessons,
  onMarkComplete,
}: {
  initialLesson: number;
  badge: ReactNode;
  completedLessons: Set<number>;
  onMarkComplete: (lessonNumber: number) => void;
}) {
  const [lesson, setLesson] = useState(initialLesson);
  const [imgError, setImgError] = useState(false);
  const isCompleted = completedLessons.has(lesson);

  const handlePrev = () => { setLesson(l => l - 1); setImgError(false); };
  const handleNext = () => { setLesson(l => l + 1); setImgError(false); };

  return (
    <Card className="md:col-span-2 rounded-3xl shadow-lg border-border/50 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-xl">Lesson {lesson}</CardTitle>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Lesson image */}
        <div className="aspect-[3/4] bg-muted/30 rounded-2xl border border-dashed border-border/60 flex items-center justify-center relative overflow-hidden">
          {!imgError ? (
            <img
              key={lesson}
              src={`/lessons/page_${lesson}.png`}
              alt={`Qaida Page ${lesson}`}
              className="absolute inset-0 w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="font-display text-xl font-bold text-muted-foreground mb-1">Lesson not available</p>
              <p className="text-sm text-muted-foreground">No image found for page {lesson}</p>
            </div>
          )}
        </div>

        {/* Mark as Completed button */}
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
            <CheckCheck className="w-4 h-4" />
            Lesson {lesson} Completed
          </div>
        ) : (
          <Button
            className="w-full rounded-xl"
            variant="outline"
            onClick={() => onMarkComplete(lesson)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Lesson {lesson} as Completed
          </Button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={handlePrev}
            disabled={lesson <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm font-semibold text-muted-foreground tabular-nums w-16 text-center">
            Page {lesson}
          </span>
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={handleNext}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Qaida View ──────────────────────────────────────────────────────────────

function QaidaView({
  profile,
  completedLessons,
}: {
  profile: any;
  completedLessons: Set<number>;
}) {
  const { isRecording, startRecording, stopRecording, audioBlob, clearAudio, recordingTime } = useAudioRecorder();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const markComplete = useMarkLessonComplete();

  const uploadRecording = useUploadRecording();
  const createRecording = useCreateRecording();

  const handleUpload = async () => {
    if (!audioBlob) return;
    try {
      const res = await uploadRecording.mutateAsync({ data: { audio: audioBlob } });
      await createRecording.mutateAsync({
        data: {
          studentId: profile.id,
          lesson: profile.currentLesson,
          audioUrl: res.url,
        },
      });
      toast({ title: "Recording submitted successfully!" });
      clearAudio();
      queryClient.invalidateQueries({ queryKey: ["/api/students/me"] });
    } catch {
      toast({ title: "Failed to upload recording", variant: "destructive" });
    }
  };

  const handleMarkComplete = async (lessonNumber: number) => {
    try {
      const result = await markComplete.mutateAsync(lessonNumber);
      if (result.alreadyCompleted) {
        toast({ title: `Lesson ${lessonNumber} was already marked as completed.` });
      } else {
        toast({ title: `Lesson ${lessonNumber} marked as completed!` });
      }
    } catch {
      toast({ title: "Failed to mark lesson as completed.", variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <LessonViewer
        initialLesson={profile.currentLesson}
        completedLessons={completedLessons}
        onMarkComplete={handleMarkComplete}
        badge={
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            <BookOpen className="w-3 h-3 mr-1" /> Qaida Mode
          </Badge>
        }
      />

      {/* Side Panel */}
      <div className="space-y-6">
        {/* Join Zoom */}
        <Card className="rounded-3xl shadow-lg border-border/50 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-8 text-center">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="font-display text-xl font-bold mb-2">Live Class</h3>
            <p className="text-primary-foreground/80 text-sm mb-6">Join your 1-on-1 Zoom session with your teacher.</p>
            <Button
              onClick={() => window.open("https://zoom.us/start", "_blank")}
              className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold"
            >
              <Video className="w-4 h-4 mr-2" /> Join Zoom
            </Button>
          </CardContent>
        </Card>

        {/* Record Recitation */}
        <Card className="rounded-3xl shadow-lg border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Record Recitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Record yourself reciting Lesson {profile.currentLesson} and submit to your teacher.
            </p>

            {!audioBlob ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="text-3xl font-mono tabular-nums text-foreground">
                  {formatTime(recordingTime)}
                </div>
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className={`w-full rounded-xl transition-all ${isRecording ? "animate-pulse" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <><SquareSquare className="w-5 h-5 mr-2" /> Stop Recording</>
                  ) : (
                    <><Mic className="w-5 h-5 mr-2" /> Record Recitation</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10" />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={clearAudio}>
                    Retry
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    onClick={handleUpload}
                    disabled={uploadRecording.isPending || createRecording.isPending}
                  >
                    {uploadRecording.isPending || createRecording.isPending ? "Sending…" : "Submit"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher Notes */}
        {profile.notes && (
          <Card className="rounded-3xl shadow-lg border-border/50 bg-secondary/5">
            <CardContent className="p-6">
              <h4 className="font-display font-bold text-foreground mb-2">Teacher Notes</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Rest Day View ───────────────────────────────────────────────────────────

function RestDayView({
  profile,
  completedLessons,
}: {
  profile: any;
  completedLessons: Set<number>;
}) {
  const [practicing, setPracticing] = useState(false);
  const markComplete = useMarkLessonComplete();
  const { toast } = useToast();

  const handleMarkComplete = async (lessonNumber: number) => {
    try {
      const result = await markComplete.mutateAsync(lessonNumber);
      if (result.alreadyCompleted) {
        toast({ title: `Lesson ${lessonNumber} was already marked as completed.` });
      } else {
        toast({ title: `Lesson ${lessonNumber} marked as completed!` });
      }
    } catch {
      toast({ title: "Failed to mark lesson as completed.", variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <LessonViewer
        initialLesson={profile.currentLesson}
        completedLessons={completedLessons}
        onMarkComplete={handleMarkComplete}
        badge={
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 bg-muted/20">
            <BookOpen className="w-3 h-3 mr-1" /> Revision
          </Badge>
        }
      />

      {/* Side Panel */}
      <div className="space-y-6">
        <Card className="rounded-3xl shadow-lg border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold mb-1">Revise Your Lesson</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                It's a rest day — no live class or test. Use this time to go over Lesson{" "}
                {profile.currentLesson} on your own.
              </p>
            </div>
            <Button size="lg" className="w-full rounded-xl" onClick={() => setPracticing(true)}>
              <BookOpen className="w-4 h-4 mr-2" /> Practice Lesson
            </Button>
          </CardContent>
        </Card>

        {practicing && (
          <Card className="rounded-3xl shadow-lg border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardContent className="p-6 space-y-3">
              <h4 className="font-display font-bold text-foreground">Practice Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed list-none">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Read each letter aloud slowly</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Repeat each line 3 times</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Focus on pronunciation of each Makharij</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Review any rules taught by your teacher</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {profile.notes && (
          <Card className="rounded-3xl shadow-lg border-border/50 bg-secondary/5">
            <CardContent className="p-6">
              <h4 className="font-display font-bold text-foreground mb-2">Teacher Notes</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Test Mode View ───────────────────────────────────────────────────────────

function TestModeView({ studentId }: { studentId: number }) {
  const { data: topics, isLoading } = useListTopics();
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  if (isLoading) return <div className="animate-pulse h-40 bg-muted/50 rounded-3xl" />;

  if (selectedTopicId) {
    return (
      <TestQuiz
        studentId={studentId}
        topicId={selectedTopicId}
        onBack={() => setSelectedTopicId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Islamic Basics Topics</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(topics ?? []).map(topic => (
          <Card
            key={topic.id}
            className="rounded-3xl cursor-pointer hover:shadow-xl hover:border-amber-400/50 hover:-translate-y-1 transition-all duration-300 border-border/50 bg-card overflow-hidden group"
            onClick={() => setSelectedTopicId(topic.id)}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-300 opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <h3 className="font-display text-xl font-bold text-foreground mb-2">{topic.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-5">{topic.content}</p>
              <div className="flex items-center text-sm font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
                Start Test <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
        {(topics ?? []).length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No topics available for testing right now.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Test Quiz ────────────────────────────────────────────────────────────────

function TestQuiz({ studentId, topicId, onBack }: { studentId: number; topicId: number; onBack: () => void }) {
  const { data: topic, isLoading } = useGetTopic(topicId);
  const submitResult = useSubmitTestResult();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (isLoading) return <div className="animate-pulse h-60 bg-muted/50 rounded-3xl" />;

  if (!topic || !topic.questions || topic.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="mb-4 text-muted-foreground">No questions available for this topic yet.</p>
        <Button variant="outline" onClick={onBack} className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  const questions = topic.questions;
  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  const handleNext = async () => {
    if (!isLast) {
      setCurrentIndex(prev => prev + 1);
    } else {
      let correct = 0;
      questions.forEach(q => { if (answers[q.id] === q.correctAnswer) correct++; });
      setScore(correct);
      setSubmitted(true);
      await submitResult.mutateAsync({
        data: { studentId, topicId, score: correct, totalQuestions: questions.length },
      });
    }
  };

  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;
    return (
      <Card className="max-w-md mx-auto text-center rounded-3xl overflow-hidden shadow-2xl border-border/50">
        <div className={`h-3 w-full ${passed ? "bg-primary" : "bg-amber-400"}`} />
        <CardContent className="p-10">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner ${passed ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-600"}`}>
            <span className="text-3xl font-bold">{percentage}%</span>
          </div>
          <h2 className="text-3xl font-display mb-2">{passed ? "MashaAllah! 🌟" : "Keep Trying!"}</h2>
          <p className="text-muted-foreground mb-8">
            You scored <strong>{score}</strong> out of <strong>{questions.length}</strong> correct.
          </p>
          <Button onClick={onBack} size="lg" className="rounded-xl w-full">
            Return to Topics
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground rounded-lg">
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back
        </Button>
        <div className="text-sm font-semibold text-muted-foreground">
          Question {currentIndex + 1} / {questions.length}
        </div>
      </div>

      <Card className="rounded-3xl shadow-xl border-border/50">
        <CardContent className="p-8 md:p-10">
          <div className="w-full h-1.5 bg-muted rounded-full mb-10 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${(currentIndex / questions.length) * 100}%` }}
            />
          </div>

          <h2 className="text-2xl md:text-3xl font-medium text-foreground mb-8 leading-snug">
            {currentQ.question}
          </h2>

          <div className="space-y-3 mb-10">
            {currentQ.options?.map((opt, i) => {
              const isSelected = answers[currentQ.id] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 font-medium text-lg
                    ${isSelected
                      ? "border-amber-400 bg-amber-50 text-amber-900 shadow-sm"
                      : "border-border/60 bg-card hover:border-border text-foreground"
                    }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center
                      ${isSelected ? "border-amber-500" : "border-muted-foreground/30"}`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                    </div>
                    {opt}
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleNext}
            disabled={!answers[currentQ.id]}
            size="lg"
            className="w-full h-14 rounded-xl text-lg"
          >
            {isLast ? "Submit Test" : "Next Question"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
