import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListStudents } from "@workspace/api-client-react";
import { format, parse, isBefore, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DollarSign, PlusCircle, CheckCircle2, AlertTriangle, Wallet, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeeRecord = {
  id: number;
  studentId: number;
  month: string;
  amount: string;
  paidAmount: string;
  status: string;
  paymentDate: string | null;
  createdAt: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useStudentFees(studentId: number | null) {
  return useQuery<FeeRecord[]>({
    queryKey: ["/api/fees", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const res = await fetch(`/api/fees/${studentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fees");
      return res.json();
    },
  });
}

function useSetFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { studentId: number; month: string; amount: number }) => {
      const res = await fetch("/api/fees/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to set fee");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fees", variables.studentId] });
    },
  });
}

function usePayFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { studentId: number; month: string; paidAmount: number }) => {
      const res = await fetch("/api/fees/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to process payment");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fees", variables.studentId] });
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStudentLabel(
  s: { id: number; user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null }
) {
  const full = `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim();
  return full || s.user?.email || `Student #${s.id}`;
}

function fmt(n: string | number) {
  return `£${parseFloat(String(n)).toFixed(2)}`;
}

function isOverdue(fee: FeeRecord): boolean {
  if (fee.status === "paid") return false;
  const monthStart = startOfMonth(parse(fee.month, "yyyy-MM", new Date()));
  const now = startOfMonth(new Date());
  return isBefore(monthStart, now);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ fee }: { fee: FeeRecord }) {
  if (fee.status === "paid") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </Badge>
    );
  }
  if (isOverdue(fee)) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
        <AlertTriangle className="w-3 h-3" /> Overdue
      </Badge>
    );
  }
  if (fee.status === "partial") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <Wallet className="w-3 h-3" /> Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      Unpaid
    </Badge>
  );
}

// ─── Set Fee Dialog ───────────────────────────────────────────────────────────

function SetFeeDialog({
  studentId,
  open,
  onClose,
}: {
  studentId: number;
  open: boolean;
  onClose: () => void;
}) {
  const setFee = useSetFee();
  const { toast } = useToast();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      await setFee.mutateAsync({ studentId, month, amount: parsed });
      toast({ title: "Fee set successfully" });
      setAmount("");
      onClose();
    } catch {
      toast({ title: "Failed to set fee", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Set Monthly Fee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Month</Label>
            <Input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (£)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={setFee.isPending}>
              {setFee.isPending ? "Saving…" : "Set Fee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Payment Dialog ───────────────────────────────────────────────────────

function AddPaymentDialog({
  fee,
  open,
  onClose,
}: {
  fee: FeeRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const payFee = usePayFee();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  if (!fee) return null;

  const remaining = parseFloat(fee.amount) - parseFloat(fee.paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      await payFee.mutateAsync({ studentId: fee.studentId, month: fee.month, paidAmount: parsed });
      toast({ title: "Payment recorded!" });
      setAmount("");
      onClose();
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Payment</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1 text-sm text-muted-foreground">
          <p>Month: <span className="font-semibold text-foreground">{format(parse(fee.month, "yyyy-MM", new Date()), "MMMM yyyy")}</span></p>
          <p>Total: <span className="font-semibold text-foreground">{fmt(fee.amount)}</span></p>
          <p>Already paid: <span className="font-semibold text-foreground">{fmt(fee.paidAmount)}</span></p>
          <p>Remaining: <span className="font-semibold text-primary">{fmt(remaining)}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount (£)</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              max={remaining}
              placeholder={`Up to ${fmt(remaining)}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={payFee.isPending}>
              {payFee.isPending ? "Processing…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark Paid helper ─────────────────────────────────────────────────────────

function MarkPaidButton({ fee, studentId }: { fee: FeeRecord; studentId: number }) {
  const payFee = usePayFee();
  const { toast } = useToast();

  const remaining = parseFloat(fee.amount) - parseFloat(fee.paidAmount);
  if (remaining <= 0 || fee.status === "paid") return null;

  return (
    <Button
      size="sm"
      className="rounded-xl h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
      disabled={payFee.isPending}
      onClick={async () => {
        try {
          await payFee.mutateAsync({ studentId, month: fee.month, paidAmount: remaining });
          toast({ title: "Marked as fully paid!" });
        } catch {
          toast({ title: "Failed to mark paid", variant: "destructive" });
        }
      }}
    >
      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Paid
    </Button>
  );
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function FeeSummary({ fees }: { fees: FeeRecord[] }) {
  const total = fees.reduce((s, f) => s + parseFloat(f.amount), 0);
  const paid = fees.reduce((s, f) => s + parseFloat(f.paidAmount), 0);
  const due = total - paid;
  const overdue = fees.filter(isOverdue).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-card rounded-2xl border border-border/50 p-4 text-center shadow-sm">
        <p className="text-xl font-bold text-foreground">{fmt(total)}</p>
        <p className="text-xs text-muted-foreground mt-1">Total Billed</p>
      </div>
      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center shadow-sm">
        <p className="text-xl font-bold text-emerald-700">{fmt(paid)}</p>
        <p className="text-xs text-emerald-600 mt-1">Total Paid</p>
      </div>
      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center shadow-sm">
        <p className="text-xl font-bold text-amber-700">{fmt(due)}</p>
        <p className="text-xs text-amber-600 mt-1">Outstanding</p>
      </div>
      <div className={`rounded-2xl border p-4 text-center shadow-sm ${overdue > 0 ? "bg-red-50 border-red-100" : "bg-muted/40 border-border/50"}`}>
        <p className={`text-xl font-bold ${overdue > 0 ? "text-red-600" : "text-foreground"}`}>{overdue}</p>
        <p className={`text-xs mt-1 ${overdue > 0 ? "text-red-500" : "text-muted-foreground"}`}>Overdue Months</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherFees() {
  const { data: students } = useListStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const { data: fees = [], isLoading } = useStudentFees(selectedStudentId);

  const [setFeeOpen, setSetFeeOpen] = useState(false);
  const [payFee, setPayFee] = useState<FeeRecord | null>(null);

  const selectedStudent = students?.find(s => s.id === selectedStudentId);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Fee Management</h1>
          <p className="text-muted-foreground mt-1">Track monthly fees and payments for each student.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Select
              value={selectedStudentId?.toString() ?? ""}
              onValueChange={val => setSelectedStudentId(Number(val))}
            >
              <SelectTrigger className="rounded-xl bg-card shadow-sm">
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
          {selectedStudentId && (
            <Button
              className="rounded-xl flex-shrink-0"
              onClick={() => setSetFeeOpen(true)}
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Set Fee
            </Button>
          )}
        </div>
      </div>

      {/* Empty — no student selected */}
      {!selectedStudentId && (
        <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Select a student to manage their fees.</p>
        </div>
      )}

      {/* Student selected */}
      {selectedStudentId && (
        <>
          {isLoading ? (
            <div className="animate-pulse h-32 bg-muted/50 rounded-3xl" />
          ) : fees.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">No fees set yet</p>
              <p className="text-sm mb-6">Click "Set Fee" to add a monthly fee for {selectedStudent ? getStudentLabel(selectedStudent) : "this student"}.</p>
              <Button className="rounded-xl" onClick={() => setSetFeeOpen(true)}>
                <PlusCircle className="w-4 h-4 mr-2" /> Set Fee
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary stats */}
              <FeeSummary fees={fees} />

              {/* Overdue alert */}
              {fees.some(isOverdue) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-semibold text-sm">
                    {fees.filter(isOverdue).length} month{fees.filter(isOverdue).length > 1 ? "s" : ""} overdue —{" "}
                    {selectedStudent ? getStudentLabel(selectedStudent) : "Student"} has unpaid fees from past months.
                  </p>
                </div>
              )}

              {/* Fee table */}
              <Card className="rounded-3xl shadow-lg border-border/50 overflow-hidden">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-xl font-display">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Monthly Fees — {selectedStudent ? getStudentLabel(selectedStudent) : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
                        <TableHead className="pl-6">Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fees.slice().reverse().map(fee => {
                        const overdue = isOverdue(fee);
                        return (
                          <TableRow
                            key={fee.id}
                            className={`border-border/40 transition-colors
                              ${fee.status === "paid" ? "bg-emerald-50/40 hover:bg-emerald-50/70" : ""}
                              ${overdue ? "bg-red-50/40 hover:bg-red-50/70" : ""}
                              ${fee.status === "partial" && !overdue ? "bg-amber-50/40 hover:bg-amber-50/70" : ""}
                            `}
                          >
                            <TableCell className="pl-6 font-semibold text-foreground">
                              {format(parse(fee.month, "yyyy-MM", new Date()), "MMMM yyyy")}
                            </TableCell>
                            <TableCell className="font-medium">{fmt(fee.amount)}</TableCell>
                            <TableCell>
                              <span className={parseFloat(fee.paidAmount) > 0 ? "text-emerald-700 font-semibold" : "text-muted-foreground"}>
                                {fmt(fee.paidAmount)}
                              </span>
                            </TableCell>
                            <TableCell><StatusBadge fee={fee} /></TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {fee.paymentDate
                                ? format(new Date(fee.paymentDate + "T12:00:00"), "MMM d, yyyy")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <MarkPaidButton fee={fee} studentId={selectedStudentId!} />
                                {fee.status !== "paid" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary/5"
                                    onClick={() => setPayFee(fee)}
                                  >
                                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Payment
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      {selectedStudentId && (
        <SetFeeDialog
          studentId={selectedStudentId}
          open={setFeeOpen}
          onClose={() => setSetFeeOpen(false)}
        />
      )}
      <AddPaymentDialog
        fee={payFee}
        open={!!payFee}
        onClose={() => setPayFee(null)}
      />
    </div>
  );
}
