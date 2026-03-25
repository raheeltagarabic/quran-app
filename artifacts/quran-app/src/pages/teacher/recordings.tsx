import { useState } from "react";
import { useListStudents, useGetStudentRecordings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, PlayCircle } from "lucide-react";

export default function TeacherRecordings() {
  const { data: students } = useListStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const { data: recordings, isLoading } = useGetStudentRecordings(selectedStudentId!, {
    query: { enabled: !!selectedStudentId }
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Student Recordings</h1>
          <p className="text-muted-foreground mt-1">Listen to audio submissions from Qaida classes.</p>
        </div>
        
        <div className="w-full sm:w-72">
          <Select 
            value={selectedStudentId?.toString()} 
            onValueChange={(val) => setSelectedStudentId(Number(val))}
          >
            <SelectTrigger className="rounded-xl shadow-sm bg-card">
              <SelectValue placeholder="Select a student..." />
            </SelectTrigger>
            <SelectContent>
              {students?.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.user?.firstName} {s.user?.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedStudentId ? (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <Mic className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Select a student to view their recordings.</p>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center">Loading recordings...</div>
      ) : recordings?.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <p className="text-lg">No recordings found for this student.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recordings?.slice().reverse().map(rec => (
            <Card key={rec.id} className="rounded-2xl shadow-sm border-border/50 overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-0 flex flex-col sm:flex-row items-center">
                <div className="p-6 bg-primary/5 sm:w-48 flex-shrink-0 flex flex-col justify-center items-center sm:items-start border-b sm:border-b-0 sm:border-r border-border/50">
                  <div className="text-sm text-muted-foreground mb-1">
                    {format(new Date(rec.createdAt!), 'MMM d, yyyy')}
                  </div>
                  <div className="font-display text-xl text-primary font-bold">
                    Lesson {rec.lesson}
                  </div>
                </div>
                <div className="p-6 flex-1 w-full flex items-center justify-center sm:justify-start gap-4">
                  <PlayCircle className="w-8 h-8 text-primary/40 hidden sm:block" />
                  <audio controls src={rec.audioUrl} className="w-full max-w-md h-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
