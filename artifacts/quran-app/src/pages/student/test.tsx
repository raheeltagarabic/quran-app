import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMyStudentProfile, useListTopics, useSubmitTestResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Clock, CheckCircle2, XCircle, Trophy, ChevronRight,
  ChevronLeft, RotateCcw, AlertTriangle, ListChecks,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Question = {
  id: number;
  topicId: number;
  question: string;
  questionType: string;
  options: string[] | null;
  correctAnswer: string;
};

type AnswerEntry = {
  questionId: number;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  correct: boolean;
};

type PastResult = {
  id: number;
  score: number;
  totalQuestions: number;
  date: string;
  topic: { id: number; title: string } | null;
};

// ─── Timer ────────────────────────────────────────────────────────────────────

function useCountdown(seconds: number, active: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    expiredRef.current = false;
    setRemaining(seconds);
  }, [active, seconds]);

  useEffect(() => {
    if (!active) return;
    if (remaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [active, remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 60;
  return { remaining, label: `${mins}:${secs.toString().padStart(2, "0")}`, urgent };
}

// ─── Fetch random questions ───────────────────────────────────────────────────

function useRandomQuestions(topicId: number | null) {
  return useQuery<Question[]>({
    queryKey: ["/api/topics", topicId, "questions/random"],
    queryFn: async () => {
      const res = await fetch(`/api/topics/${topicId}/questions/random`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load questions");
      return res.json();
    },
    enabled: topicId !== null,
    staleTime: 0,
  });
}

// ─── Fetch my past results ────────────────────────────────────────────────────

function useMyResults() {
  return useQuery<PastResult[]>({
    queryKey: ["/api/results/me"],
    queryFn: async () => {
      const res = await fetch("/api/results/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Phase = "select" | "test" | "result";

export default function StudentTest() {
  const { data: profile } = useGetMyStudentProfile();
  const { data: topics } = useListTopics();
  const { data: myResults, refetch: refetchResults } = useMyResults();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [resultData, setResultData] = useState<{ score: number; total: number; entries: AnswerEntry[] } | null>(null);

  const { data: fetchedQuestions, isLoading: loadingQ, refetch: refetchQ } = useRandomQuestions(
    phase === "test" ? selectedTopicId : null,
  );

  const submitResult = useSubmitTestResult();

  // Load questions when they arrive
  useEffect(() => {
    if (fetchedQuestions && fetchedQuestions.length > 0 && phase === "test" && questions.length === 0) {
      setQuestions(fetchedQuestions);
    }
  }, [fetchedQuestions, phase, questions.length]);

  // Timer expiry → auto-submit
  const handleAutoSubmit = useCallback(() => {
    if (phase !== "test" || questions.length === 0) return;
    toast({ title: "Time's up! Submitting your test…", variant: "destructive" });
    doSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questions, answers]);

  const timer = useCountdown(15 * 60, phase === "test" && questions.length > 0, handleAutoSubmit);

  const doSubmit = useCallback(() => {
    if (!profile || !selectedTopicId || questions.length === 0) return;
    let correct = 0;
    const entries: AnswerEntry[] = questions.map(q => {
      const selected = answers[q.id] ?? "";
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correct++;
      return {
        questionId: q.id,
        question: q.question,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        correct: isCorrect,
      };
    });
    submitResult.mutate(
      {
        data: {
          studentId: profile.id,
          topicId: selectedTopicId,
          score: correct,
          totalQuestions: questions.length,
          answers: entries.map(e => ({
            questionId: e.questionId,
            selectedAnswer: e.selectedAnswer,
            correct: e.correct,
          })),
        },
      },
      {
        onSuccess: () => {
          setResultData({ score: correct, total: questions.length, entries });
          setPhase("result");
          refetchResults();
        },
        onError: () => {
          toast({ title: "Failed to save result. Please try again.", variant: "destructive" });
        },
      },
    );
  }, [profile, selectedTopicId, questions, answers, submitResult, toast, refetchResults]);

  const startTest = (topicId: number) => {
    setSelectedTopicId(topicId);
    setPhase("test");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setResultData(null);
  };

  const resetToSelect = () => {
    setPhase("select");
    setSelectedTopicId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setResultData(null);
  };

  const selectedTopic = topics?.find(t => t.id === selectedTopicId);
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;

  // ── SELECT PHASE ────────────────────────────────────────────────────────────
  if (phase === "select") {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display">Islamic Basics Test</h1>
          <p className="text-muted-foreground mt-1">10 random questions · 15-minute timer · All attempts saved</p>
        </div>

        {/* Topic list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Choose a Topic</h2>
          {!topics?.length ? (
            <p className="text-muted-foreground text-sm">No topics available yet. Ask your teacher to add topics.</p>
          ) : (
            topics.map(t => (
              <button
                key={t.id}
                onClick={() => startTest(t.id)}
                className="w-full text-left rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all p-5 shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">10 random questions · 15 minutes</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Past results */}
        {myResults && myResults.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> My Past Results
            </h2>
            <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
              {myResults.slice(0, 5).map((r, i) => {
                const pct = Math.round((r.score / r.totalQuestions) * 100);
                return (
                  <div key={r.id} className={`flex items-center justify-between px-5 py-3 ${i !== 0 ? "border-t border-border/40" : ""}`}>
                    <div>
                      <p className="font-medium text-sm">{r.topic?.title ?? "Unknown Topic"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.date), "MMM d, yyyy · HH:mm")}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${pct >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
                        {r.score}/{r.totalQuestions}
                      </p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── TEST PHASE ──────────────────────────────────────────────────────────────
  if (phase === "test") {
    if (loadingQ || questions.length === 0) {
      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading questions…</p>
        </div>
      );
    }

    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{selectedTopic?.title}</p>
            <p className="font-semibold mt-0.5">
              Question <span className="text-primary">{currentIndex + 1}</span> / {questions.length}
            </p>
          </div>
          {/* Timer */}
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono font-bold text-sm ${
            timer.urgent
              ? "bg-destructive/10 text-destructive border border-destructive/30 animate-pulse"
              : "bg-muted text-foreground"
          }`}>
            <Clock className="w-4 h-4" />
            {timer.label}
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2 rounded-full" />

        {/* Question card */}
        <Card className="rounded-3xl shadow-xl border-border/50">
          <CardContent className="p-6 md:p-8 space-y-6">
            <p className="text-lg md:text-xl font-semibold leading-relaxed">{currentQ.question}</p>

            <div className="space-y-3">
              {(currentQ.options ?? ["True", "False"]).map((opt, i) => {
                const selected = answers[currentQ.id] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: opt }))}
                    className={`w-full text-left rounded-xl border-2 px-5 py-3.5 font-medium transition-all text-sm ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-3 ${
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {["A", "B", "C", "D"][i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(i => i - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>

          <span className="text-xs text-muted-foreground">
            {answeredCount}/{questions.length} answered
          </span>

          {currentIndex < questions.length - 1 ? (
            <Button
              className="rounded-xl"
              onClick={() => setCurrentIndex(i => i + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              disabled={answeredCount === 0 || submitResult.isPending}
              onClick={() => {
                if (!allAnswered) {
                  if (!confirm(`You have ${questions.length - answeredCount} unanswered question(s). Submit anyway?`)) return;
                } else {
                  if (!confirm("Are you ready to submit your test?")) return;
                }
                doSubmit();
              }}
            >
              {submitResult.isPending ? "Submitting…" : "Submit Test"}
            </Button>
          )}
        </div>

        {/* Answer dots overview */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                i === currentIndex
                  ? "bg-primary text-primary-foreground scale-110"
                  : answers[q.id]
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULT PHASE ────────────────────────────────────────────────────────────
  if (phase === "result" && resultData) {
    const pct = Math.round((resultData.score / resultData.total) * 100);
    const passed = pct >= 70;

    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Score card */}
        <Card className={`rounded-3xl shadow-xl border-2 ${passed ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{
              background: passed ? "rgb(209,250,229)" : "rgb(254,243,199)",
            }}>
              <Trophy className={`w-8 h-8 ${passed ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{selectedTopic?.title}</p>
              <p className={`text-6xl font-bold ${passed ? "text-emerald-600" : "text-amber-600"}`}>
                {pct}%
              </p>
              <p className="text-xl font-semibold mt-2">
                {resultData.score} / {resultData.total} correct
              </p>
            </div>
            <Badge className={`text-sm px-4 py-1 ${passed ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
              {passed ? "Excellent! Well done!" : "Keep practising — you can do it!"}
            </Badge>
          </CardContent>
        </Card>

        {/* Per-question review */}
        <div className="space-y-3">
          <h2 className="font-display text-lg">Answer Review</h2>
          {resultData.entries.map((entry, i) => (
            <div
              key={entry.questionId}
              className={`rounded-2xl border p-4 space-y-2 ${
                entry.correct
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {entry.correct
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                    {entry.question}
                  </p>
                  {!entry.correct && (
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="text-red-600">
                        Your answer: <strong>{entry.selectedAnswer || "— not answered —"}</strong>
                      </p>
                      <p className="text-emerald-700">
                        Correct answer: <strong>{entry.correctAnswer}</strong>
                      </p>
                    </div>
                  )}
                  {entry.correct && (
                    <p className="text-xs text-emerald-700 mt-1">
                      Correct: <strong>{entry.correctAnswer}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button variant="outline" className="rounded-xl flex-1" onClick={resetToSelect}>
            <RotateCcw className="w-4 h-4 mr-2" /> Back to Topics
          </Button>
          <Button className="rounded-xl flex-1" onClick={() => startTest(selectedTopicId!)}>
            Retake Test
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
