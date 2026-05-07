import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceType: "air_ticket" | "visa";
  serviceId: string;
  remainingDue: number;
  onSuccess?: () => void;
}

export function ServicePaymentDialog({ open, onOpenChange, serviceType, serviceId, remainingDue, onSuccess }: Props) {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("cash");
  const [walletId, setWalletId] = useState<string>("");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("accounts").select("id, name, type, balance").then(({ data }) => {
      setWallets(data || []);
      if (data && data.length && !walletId) setWalletId(data[0].id);
    });
    setAmount(remainingDue);
  }, [open, remainingDue]);

  const submit = async () => {
    if (!walletId) return toast({ title: "Wallet account required", variant: "destructive" });
    if (amount <= 0) return toast({ title: "Amount must be > 0", variant: "destructive" });
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("service_payments").insert({
      service_type: serviceType,
      service_id: serviceId,
      amount,
      payment_method: method,
      wallet_account_id: walletId,
      transaction_ref: ref || null,
      notes: notes || null,
      payment_date: date,
      recorded_by: u.user?.id || null,
    } as any);
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Payment recorded" });
    onOpenChange(false);
    setAmount(0); setRef(""); setNotes("");
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Receive Payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Remaining due: <strong className="text-red-600">৳{remainingDue.toLocaleString("en-IN")}</strong>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Wallet Account</Label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>
                  {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Transaction Ref</Label><Input value={ref} onChange={e => setRef(e.target.value)} placeholder="Optional" /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Record Payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}