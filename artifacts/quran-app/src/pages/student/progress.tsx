import { useGetMyStudentProfile, useGetStudentResults } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Award, Target } from "lucide-react";

export default function StudentProgress() {
  const { data: profile } = useGetMyStudentProfile();
  const { data: results, isLoading } = useGetStudentResults(profile?.id || 0, {
    query: { enabled: !!profile?.id }
  });

  const chartData = results?.map(r => ({
    name: r.topic?.title.substring(0, 15) + "...",
    scorePercentage: Math.round((r.score / r.totalQuestions) * 100),
    date: format(new Date(r.date!), 'MMM d')
  })) || [];

  const averageScore = results?.length 
    ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / results.length * 100) 
    : 0;

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading progress...</div>;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-display mb-2">My Progress</h1>
        <p className="text-lg text-muted-foreground">Track your Islamic Basics test scores.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl shadow-lg border-border/50 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
            <Award className="w-12 h-12 mb-4 opacity-90" />
            <div className="text-5xl font-bold font-display mb-2">{averageScore}%</div>
            <p className="text-primary-foreground/80 font-medium">Average Test Score</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 rounded-3xl shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-display">
              <Target className="w-5 h-5 mr-2 text-primary" />
              Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results?.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No tests completed yet.
              </div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="scorePercentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-lg border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-display">Detailed Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-3xl">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right pr-6">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results?.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
              )}
              {results?.slice().reverse().map(r => (
                <TableRow key={r.id} className="border-border/50">
                  <TableCell className="pl-6 text-muted-foreground">
                    {format(new Date(r.date!), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{r.topic?.title}</TableCell>
                  <TableCell className="text-right pr-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                      {r.score} / {r.totalQuestions}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
