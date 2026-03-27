import { useState } from "react";
import { useListStudents, useGetStudentRecordings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, PlayCircle, Users } from "lucide-react";

function getStudentLabel(s: { id: number; user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null }) {
  const first = s.user?.firstName ?? "";
  const last = s.user?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || s.user?.email || `Student #${s.id}`;
}

export default function TeacherRecordings() {
  const { data: students } = useListStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const { data: recordings, isLoading } = useGetStudentRecordings(selectedStudentId!, {
    query: { enabled: !!selectedStudentId },
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Student Recordings</h1>
          <p className="text-muted-foreground mt-1">Listen to audio submissions from Qaida classes.</p>
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

      {/* Empty state — no student selected */}
      {!selectedStudentId && (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-foreground">Select a student above</p>
          <p className="text-sm mt-1">Their audio recordings will appear here.</p>
        </div>
      )}

      {/* Loading */}
      {selectedStudentId && isLoading && (
        <div className="py-20 text-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading recordings…</p>
        </div>
      )}

      {/* No recordings */}
      {selectedStudentId && !isLoading && recordings?.length === 0 && (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <Mic className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-foreground">No recordings yet</p>
          <p className="text-sm mt-1">This student hasn't submitted any audio recordings.</p>
        </div>
      )}

      {/* Recordings list */}
      {selectedStudentId && !isLoading && (recordings?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {recordings!.length} recording{recordings!.length !== 1 ? "s" : ""} found
          </p>
          {recordings!.slice().reverse().map(rec => (
            <Card key={rec.id} className="rounded-2xl shadow-sm border-border/50 overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
                {/* Left metadata panel */}
                <div className="p-5 bg-primary/5 sm:w-48 flex-shrink-0 flex flex-col justify-center items-center sm:items-start border-b sm:border-b-0 sm:border-r border-border/50 gap-1">
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs mb-1">
                    Lesson {rec.lesson}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedStudentId
                      ? getStudentLabel((students ?? []).find(s => s.id === selectedStudentId) ?? { id: selectedStudentId })
                      : `Student #${rec.studentId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rec.createdAt ? format(new Date(rec.createdAt), "MMM d, yyyy · h:mm a") : "—"}
                  </p>
                </div>

                {/* Audio player */}
                <div className="p-5 flex-1 flex items-center gap-3">
                  <PlayCircle className="w-7 h-7 text-primary/30 flex-shrink-0 hidden sm:block" />
                  <audio
                    controls
                    src={rec.audioUrl}
                    className="w-full h-11 rounded-xl"
                    preload="metadata"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
