import { useState } from "react";
import { Link } from "wouter";
import { useListTopics, useCreateTopic, useDeleteTopic } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowRight, BookMarked } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TeacherTopics() {
  const { data: topics, isLoading } = useListTopics();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTopic = useCreateTopic({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
        setIsAddOpen(false);
        toast({ title: "Topic created" });
      }
    }
  });

  const deleteTopic = useDeleteTopic({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
        toast({ title: "Topic deleted" });
      }
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTopic.mutate({
      data: {
        title: fd.get("title") as string,
        content: fd.get("content") as string,
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Islamic Basics Topics</h1>
          <p className="text-muted-foreground mt-1">Manage topics and questions for Test Days.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> New Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Create Topic</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Topic Title</Label>
                <Input name="title" placeholder="e.g., How to perform Wudu" required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Study Content / Summary</Label>
                <Textarea name="content" placeholder="Brief notes for students..." className="rounded-xl min-h-[120px]" />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createTopic.isPending} className="rounded-xl">
                  {createTopic.isPending ? "Saving..." : "Create Topic"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics?.map((topic) => (
            <Card key={topic.id} className="rounded-2xl shadow-md shadow-black/5 border-border/50 flex flex-col hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <BookMarked className="w-5 h-5 text-primary" />
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-2"
                    onClick={() => {
                      if (confirm("Delete this topic and all its questions?")) {
                        deleteTopic.mutate({ id: topic.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-xl font-display">{topic.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {topic.content || "No content provided."}
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border/50">
                <Link href={`/teacher/topics/${topic.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-between hover-elevate rounded-xl text-primary hover:text-primary hover:bg-primary/5">
                    Manage Questions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
          {topics?.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
              <BookMarked className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No topics created yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
