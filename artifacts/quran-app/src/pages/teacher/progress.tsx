import { useState } from "react";
import { useListStudents, useGetStudentResults } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function TeacherProgress() {
  const { data: students } = useListStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const { data: results, isLoading } = useGetStudentResults(selectedStudentId!, {
    query: { enabled: !!selectedStudentId }
  });

  const chartData = results?.map(r => ({
    name: r.topic?.title.substring(0, 15) + "...",
    scorePercentage: Math.round((r.score / r.totalQuestions) * 100),
    date: format(new Date(r.date!), 'MMM d')
  })) || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Student Progress</h1>
          <p className="text-muted-foreground mt-1">Review test scores and performance.</p>
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
          <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Please select a student to view their progress.</p>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center">Loading results...</div>
      ) : results?.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <p className="text-lg">No test results found for this student.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 rounded-3xl shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-display">
                <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="scorePercentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-lg border-border/50 h-fit">
            <CardHeader>
              <CardTitle className="text-xl font-display">Recent Tests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead>Topic</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.slice().reverse().map(r => (
                    <TableRow key={r.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-foreground">{r.topic?.title}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(r.date!), 'MMM d, yyyy')}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {r.score}/{r.totalQuestions}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
