import { useState } from "react";
import { 
  useGetMyStudentProfile, 
  useListTopics, 
  useGetTopic, 
  useSubmitTestResult,
  useUploadRecording,
  useCreateRecording
} from "@workspace/api-client-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Mic, SquareSquare, CheckCircle2, ChevronRight, BookOpen, Target, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Schedule logic per requirements
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

export default function StudentToday() {
  const { data: profile, isLoading } = useGetMyStudentProfile();

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
        <p className="text-muted-foreground text-sm">Your teacher hasn't set up your student profile yet. Please contact them to get started.</p>
      </div>
    );
  }

  const mode = getMode(profile.scheduleType);
  const today = DAY_NAMES[new Date().getDay()];
  const displayName = profile.user?.firstName ?? profile.user?.email?.split("@")[0] ?? "Student";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-700 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-display mb-1">
          Assalamu Alaikum, {displayName}!
        </h1>
        <p className="text-muted-foreground">{today} · Schedule Type {profile.scheduleType}</p>
      </div>

      {/* Day Banner */}
      {mode === "qaida" && (
        <div className="flex items-center gap-4 rounded-2xl px-6 py-4 bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Today: Qaida Class</p>
            <p className="text-primary-foreground/80 text-sm">Open your Qaida book to page {profile.currentLesson} and join your teacher.</p>
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
      {mode === "qaida" && <QaidaView profile={profile} />}
      {mode === "test"  && <TestModeView studentId={profile.id} />}
    </div>
  );
}

// ─── Qaida View ──────────────────────────────────────────────────────────────

function QaidaView({ profile }: { profile: any }) {
  const { isRecording, startRecording, stopRecording, audioBlob, clearAudio, recordingTime } = useAudioRecorder();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imgError, setImgError] = useState(false);

  const uploadRecording = useUploadRecording();
  const createRecording = useCreateRecording();

  const lessonImgSrc = imgError
    ? null
    : `/lessons/page_${profile.currentLesson}.png`;

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Lesson Image */}
      <Card className="md:col-span-2 rounded-3xl shadow-lg border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-xl">Lesson {profile.currentLesson}</CardTitle>
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
              <BookOpen className="w-3 h-3 mr-1" /> Qaida Mode
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="aspect-[3/4] bg-muted/30 rounded-2xl border border-dashed border-border/60 flex items-center justify-center relative overflow-hidden">
            {lessonImgSrc ? (
              <img
                src={lessonImgSrc}
                alt={`Qaida Page ${profile.currentLesson}`}
                className="absolute inset-0 w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <p className="font-display text-2xl text-primary font-bold mb-1">Page {profile.currentLesson}</p>
                <p className="text-sm text-muted-foreground">Open your physical Qaida book to this page</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

// ─── Test Mode View ───────────────────────────────────────────────────────────

function TestModeView({ studentId }: { studentId: number }) {
  const { data: topics, isLoading } = useListTopics();
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  if (isLoading) return <div className="animate-pulse h-40 bg-muted/50 rounded-3xl" />;

  if (selectedTopicId) {
    return <TestQuiz studentId={studentId} topicId={selectedTopicId} onBack={() => setSelectedTopicId(null)} />;
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
        <Button variant="outline" onClick={onBack} className="rounded-xl">
          Go Back
        </Button>
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
      questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) correct++;
      });
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
          {/* Progress bar */}
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
