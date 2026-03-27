import { useState } from "react";
import {
  useListStudents, useCreateStudent, useDeleteStudent, useListUsers, useUpdateStudent,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, Pencil, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Student = NonNullable<ReturnType<typeof useListStudents>["data"]>[number];

export default function TeacherStudents() {
  const { data: students, isLoading, error } = useListStudents();
  const { data: users } = useListUsers();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createStudent = useCreateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        setIsAddOpen(false);
        toast({ title: "Student created successfully" });
      },
    },
  });

  const updateStudent = useUpdateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        setEditingStudent(null);
        toast({ title: "Student updated" });
      },
    },
  });

  const deleteStudent = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        toast({ title: "Student deleted" });
      },
    },
  });

  const getDisplayName = (student: Student) => {
    const full = `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim();
    return full || student.user?.email || `Student #${student.id}`;
  };

  const getUserLabel = (u: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null }) => {
    const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return full ? `${full} (${u.email ?? u.id})` : (u.email ?? u.id);
  };

  const parentUsers = (users ?? []).filter(u => u.role === "parent");

  const filteredStudents = (students ?? []).filter(s => {
    if (!search) return true;
    const name = getDisplayName(s).toLowerCase();
    const email = (s.user?.email ?? "").toLowerCase();
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createStudent.mutate({
      data: {
        userId: fd.get("userId") as string,
        scheduleType: fd.get("scheduleType") as string,
        currentLesson: Number(fd.get("currentLesson")),
        notes: fd.get("notes") as string,
      },
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;
    const fd = new FormData(e.currentTarget);
    const parentId = fd.get("parentId") as string;
    updateStudent.mutate({
      id: editingStudent.id,
      data: {
        scheduleType: fd.get("scheduleType") as string,
        currentLesson: Number(fd.get("currentLesson")),
        notes: fd.get("notes") as string,
        parentId: parentId === "__none__" || !parentId ? null : parentId,
      },
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Manage Students</h1>
          <p className="text-muted-foreground mt-1">Add, update, or remove student profiles.</p>
        </div>

        {/* Add Student Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select name="userId" required>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose a user account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users ?? []).filter(u => u.role !== "teacher").map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {getUserLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select name="scheduleType" defaultValue="A">
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Schedule A (Qaida: Mon/Tue/Wed)</SelectItem>
                    <SelectItem value="B">Schedule B (Qaida: Thu/Fri/Sat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Lesson</Label>
                <Input type="number" name="currentLesson" defaultValue={1} min={1} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" placeholder="Initial assessment notes..." className="rounded-xl resize-none" />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createStudent.isPending} className="rounded-xl">
                  {createStudent.isPending ? "Saving..." : "Save Student"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load students: {(error as Error).message}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground ml-2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 px-2 font-medium"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading students...</TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search ? "No students match your search." : "No students yet. Click \"Add Student\" to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map(student => {
                  const linkedParent = (users ?? []).find(u => u.id === (student as any).parentId);
                  return (
                    <TableRow key={student.id} className="group">
                      <TableCell className="font-medium">{getDisplayName(student)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{student.user?.email ?? "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          Type {student.scheduleType}
                        </span>
                      </TableCell>
                      <TableCell>Page {student.currentLesson}</TableCell>
                      <TableCell>
                        {linkedParent ? (
                          <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                            <UserCheck className="w-3 h-3" />
                            {getUserLabel(linkedParent).split("(")[0].trim()}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{student.notes || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                            onClick={() => setEditingStudent(student)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this student?")) {
                                deleteStudent.mutate({ id: student.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Student Dialog */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={open => !open && setEditingStudent(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Edit Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select name="scheduleType" defaultValue={editingStudent.scheduleType}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Schedule A (Qaida: Mon/Tue/Wed)</SelectItem>
                    <SelectItem value="B">Schedule B (Qaida: Thu/Fri/Sat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Lesson</Label>
                <Input
                  type="number"
                  name="currentLesson"
                  defaultValue={editingStudent.currentLesson}
                  min={1}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Teacher Notes</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingStudent.notes ?? ""}
                  placeholder="Notes visible to parent..."
                  className="rounded-xl resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Link Parent Account
                </Label>
                <Select
                  name="parentId"
                  defaultValue={(editingStudent as any).parentId ?? "__none__"}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No parent linked —</SelectItem>
                    {(users ?? []).filter(u => u.role === "parent").map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {getUserLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Parent must log in once to create their account, then you can link them here.
                </p>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStudent.isPending} className="rounded-xl">
                  {updateStudent.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
