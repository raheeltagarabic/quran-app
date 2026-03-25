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
import { Video, Mic, SquareSquare, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Schedule logic
function getMode(scheduleType: string, day: number) {
  if (scheduleType === "A") {
    if ([1,2,3].includes(day)) return "qaida";
    if ([4,5].includes(day)) return "test";
  } else if (scheduleType === "B") {
    if ([4,5,6].includes(day)) return "qaida";
    if ([0,1].includes(day)) return "test";
  }
  return "rest";
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function StudentToday() {
  const { data: profile, isLoading } = useGetMyStudentProfile();
  
  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading class data...</div>;
  if (!profile) return <div className="p-8 text-center text-destructive">Profile not found. Please contact your teacher.</div>;

  const day = new Date().getDay();
  const mode = getMode(profile.scheduleType, day);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-4xl font-display mb-2">Welcome, {profile.user?.firstName}!</h1>
        <p className="text-lg text-muted-foreground">Here is your class schedule for today.</p>
      </div>

      {mode === "qaida" && <QaidaView profile={profile} />}
      {mode === "test" && <TestModeView studentId={profile.id} />}
      {mode === "rest" && (
        <div className="bg-card rounded-3xl p-12 text-center border border-border/50 shadow-xl shadow-black/5">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-display text-foreground mb-2">It's a Rest Day!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You don't have any classes scheduled for today based on your Schedule Type {profile.scheduleType}. 
            Rest well and revise your previous lessons.
          </p>
        </div>
      )}
    </div>
  );
}

function QaidaView({ profile }: { profile: any }) {
  const { isRecording, startRecording, stopRecording, audioBlob, clearAudio, recordingTime } = useAudioRecorder();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
          audioUrl: res.url
        }
      });
      toast({ title: "Recording submitted successfully!" });
      clearAudio();
      queryClient.invalidateQueries({ queryKey: ["/api/students/me"] });
    } catch (err) {
      toast({ title: "Failed to upload recording", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Badge className="px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
        <BookOpenIcon className="w-4 h-4 mr-2" /> Qaida Mode
      </Badge>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 rounded-3xl shadow-lg border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/50">
            <CardTitle className="font-display">Lesson {profile.currentLesson}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="aspect-[3/4] bg-muted/30 rounded-2xl border border-dashed border-border/60 flex items-center justify-center relative overflow-hidden group">
              {/* Unsplash placeholder for lesson page image */}
              {/* qaida lesson page open book islamic arabic calligraphy */}
              <img 
                src="https://pixabay.com/get/g1bd72356ea63581111d08800429872961b1d592cbce0f7e0e18bafda5a9278cc7671b583ae3920426da271bb95fc1e08be1f13667d7b0a83d21e193ab3d92aae_1280.jpg" 
                alt={`Lesson ${profile.currentLesson}`}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="relative z-10 text-center p-6 bg-background/80 backdrop-blur-md rounded-2xl shadow-xl">
                <h3 className="text-2xl font-display font-bold text-primary mb-2">Current Page</h3>
                <p className="text-sm text-muted-foreground">Follow along with your teacher</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl shadow-lg border-border/50 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h3 className="font-display text-xl font-bold mb-2">Live Class</h3>
              <p className="text-primary-foreground/80 text-sm mb-6">Join your scheduled 1-on-1 Zoom session now.</p>
              <Button 
                onClick={() => window.open('https://zoom.us/start', '_blank')}
                className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold hover-elevate"
              >
                Join Zoom
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display">Audio Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Record yourself reciting Lesson {profile.currentLesson} for review.</p>
              
              {!audioBlob ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="text-2xl font-mono tabular-nums text-foreground">
                    {formatTime(recordingTime)}
                  </div>
                  <Button 
                    size="lg" 
                    variant={isRecording ? "destructive" : "default"}
                    className={`w-full rounded-xl transition-all ${isRecording ? 'animate-pulse' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? <SquareSquare className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={clearAudio}>Retry</Button>
                    <Button 
                      className="flex-1 rounded-xl" 
                      onClick={handleUpload}
                      disabled={uploadRecording.isPending || createRecording.isPending}
                    >
                      {(uploadRecording.isPending || createRecording.isPending) ? "Sending..." : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {profile.notes && (
             <Card className="rounded-3xl shadow-lg border-border/50 bg-secondary/10">
               <CardContent className="p-6">
                 <h4 className="font-display font-bold text-secondary-foreground mb-2">Teacher Notes</h4>
                 <p className="text-sm text-secondary-foreground/80 leading-relaxed">{profile.notes}</p>
               </CardContent>
             </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TestModeView({ studentId }: { studentId: number }) {
  const { data: topics, isLoading } = useListTopics();
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  if (isLoading) return <div className="animate-pulse h-40 bg-muted/50 rounded-3xl" />;

  if (selectedTopicId) {
    return <TestQuiz studentId={studentId} topicId={selectedTopicId} onBack={() => setSelectedTopicId(null)} />;
  }

  return (
    <div className="space-y-6">
      <Badge className="px-4 py-2 text-sm bg-secondary/10 text-secondary-foreground border-secondary/20 hover:bg-secondary/20 transition-colors">
        <TargetIcon className="w-4 h-4 mr-2" /> Test Mode
      </Badge>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {topics?.map(topic => (
          <Card 
            key={topic.id} 
            className="rounded-3xl cursor-pointer hover:shadow-xl hover:border-secondary/50 hover:-translate-y-1 transition-all duration-300 border-border/50 bg-card overflow-hidden group"
            onClick={() => setSelectedTopicId(topic.id)}
          >
            <div className="h-2 w-full bg-gradient-to-r from-secondary to-secondary/50 opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <h3 className="font-display text-xl font-bold text-foreground mb-3">{topic.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-6">{topic.content}</p>
              <div className="flex items-center text-sm font-semibold text-secondary group-hover:translate-x-1 transition-transform">
                Start Test <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
        {topics?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No topics available for testing right now.
          </div>
        )}
      </div>
    </div>
  );
}

function TestQuiz({ studentId, topicId, onBack }: { studentId: number, topicId: number, onBack: () => void }) {
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
        <p className="mb-4 text-muted-foreground">No questions available for this topic.</p>
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
      questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) correct++;
      });
      setScore(correct);
      setSubmitted(true);
      await submitResult.mutateAsync({
        data: {
          studentId,
          topicId,
          score: correct,
          totalQuestions: questions.length
        }
      });
    }
  };

  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;
    
    return (
      <Card className="max-w-md mx-auto text-center rounded-3xl overflow-hidden shadow-2xl border-border/50">
        <div className={`h-3 w-full ${passed ? 'bg-primary' : 'bg-secondary'}`} />
        <CardContent className="p-10">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner ${passed ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
            <span className="text-3xl font-bold">{percentage}%</span>
          </div>
          <h2 className="text-3xl font-display mb-2">{passed ? "MashaAllah! Great Job" : "Keep Trying!"}</h2>
          <p className="text-muted-foreground mb-8">
            You scored {score} out of {questions.length} correct.
          </p>
          <Button onClick={onBack} size="lg" className="rounded-xl w-full">Return to Topics</Button>
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
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>

      <Card className="rounded-3xl shadow-xl border-border/50">
        <CardContent className="p-8 md:p-10">
          <div className="w-full h-1.5 bg-muted rounded-full mb-10 overflow-hidden">
            <div 
              className="h-full bg-secondary transition-all duration-500 ease-out" 
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
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
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 hover-elevate font-medium text-lg
                    ${isSelected 
                      ? 'border-secondary bg-secondary/5 text-secondary-foreground shadow-sm' 
                      : 'border-border/60 bg-card hover:border-border text-foreground'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center
                      ${isSelected ? 'border-secondary' : 'border-muted-foreground/30'}
                    `}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-secondary rounded-full" />}
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
            className="w-full h-14 rounded-xl text-lg bg-foreground text-background hover:bg-foreground/90 shadow-lg"
          >
            {isLast ? "Submit Test" : "Next Question"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Icons
function BookOpenIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}
function TargetIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
