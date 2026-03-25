import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetTopic, useCreateQuestion, useDeleteQuestion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TeacherTopicDetails() {
  const params = useParams();
  const topicId = Number(params.id);
  const { data: topic, isLoading } = useGetTopic(topicId);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [qType, setQType] = useState("mcq");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createQuestion = useCreateQuestion({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${topicId}`] });
        setIsAddOpen(false);
        toast({ title: "Question added" });
      }
    }
  });

  const deleteQuestion = useDeleteQuestion({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${topicId}`] });
        toast({ title: "Question deleted" });
      }
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    let options: string[] = [];
    if (qType === "mcq") {
      options = [
        fd.get("opt1") as string,
        fd.get("opt2") as string,
        fd.get("opt3") as string,
        fd.get("opt4") as string,
      ].filter(Boolean);
    } else {
      options = ["True", "False"];
    }

    createQuestion.mutate({
      data: {
        topicId,
        question: fd.get("question") as string,
        questionType: qType,
        options,
        correctAnswer: fd.get("correctAnswer") as string,
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading topic details...</div>;
  if (!topic) return <div className="p-8 text-center">Topic not found.</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/teacher/topics" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Topics
      </Link>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">{topic.title}</h1>
          <p className="text-muted-foreground mt-1">Manage test questions for this topic.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">New Question</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Input name="question" required className="rounded-xl" />
              </div>

              {qType === "mcq" && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                  <Label>Options</Label>
                  <Input name="opt1" placeholder="Option A" required className="rounded-xl bg-background" />
                  <Input name="opt2" placeholder="Option B" required className="rounded-xl bg-background" />
                  <Input name="opt3" placeholder="Option C" className="rounded-xl bg-background" />
                  <Input name="opt4" placeholder="Option D" className="rounded-xl bg-background" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                {qType === "mcq" ? (
                  <Input name="correctAnswer" placeholder="Must exactly match one option above" required className="rounded-xl" />
                ) : (
                  <Select name="correctAnswer" defaultValue="True">
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="True">True</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createQuestion.isPending} className="rounded-xl">
                  {createQuestion.isPending ? "Saving..." : "Add Question"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {topic.questions?.map((q, idx) => (
          <div key={q.id} className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="mt-1 bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-foreground mb-3">{q.question}</h3>
              {q.questionType === "mcq" && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, i) => (
                    <div key={i} className={`p-2 rounded-lg text-sm border ${opt === q.correctAnswer ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-muted/30 border-border'}`}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              {q.questionType === "true_false" && (
                <div className="text-sm font-medium text-primary bg-primary/10 inline-flex px-3 py-1 rounded-lg">
                  Correct Answer: {q.correctAnswer}
                </div>
              )}
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              onClick={() => {
                if (confirm("Delete this question?")) {
                  deleteQuestion.mutate({ id: q.id });
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {(!topic.questions || topic.questions.length === 0) && (
          <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No questions added to this topic yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
