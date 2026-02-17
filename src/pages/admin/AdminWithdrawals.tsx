import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Clock, Copy, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  approved: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-500 border-red-500/30",
};

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());
  const [bankMap, setBankMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    const [wdsRes, profilesRes, bankRes] = await Promise.all([
      supabase.from("withdrawal_requests").select("*, bank_accounts(bank_name, account_number)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, phone"),
      supabase.from("bank_accounts").select("user_id, bank_name, account_number, iban"),
    ]);
    setProfileMap(new Map((profilesRes.data || []).map((p: any) => [p.user_id, { name: p.display_name, phone: p.phone }])));
    setBankMap(new Map((bankRes.data || []).map((b: any) => [b.user_id, b])));
    setWithdrawals(wdsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleAction = async (id: string, userId: string, amount: number, action: "approved" | "rejected") => {
    setProcessing(id);
    const { error } = await supabase.from("withdrawal_requests").update({ status: action }).eq("id", id);
    if (error) { toast.error("Failed to update"); setProcessing(null); return; }

    if (action === "approved") {
      const { data: wallet } = await supabase.from("wallets").select("total_withdrawn").eq("user_id", userId).maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({
          total_withdrawn: Number(wallet.total_withdrawn) + amount,
        }).eq("user_id", userId);
      }
      await supabase.from("transactions").update({ status: "approved", description: "Withdrawal approved by admin" })
        .eq("user_id", userId).eq("type", "withdrawal").eq("status", "pending");
      await supabase.from("notifications").insert({
        user_id: userId, type: "money",
        title: "Withdrawal Approved ✅",
        description: `Your withdrawal of Rs ${amount.toLocaleString()} has been processed successfully.`,
      });
    } else {
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({
          balance: Number(wallet.balance) + amount,
        }).eq("user_id", userId);
      }
      await supabase.from("transactions").update({ status: "rejected", description: "Withdrawal rejected by admin" })
        .eq("user_id", userId).eq("type", "withdrawal").eq("status", "pending");
      await supabase.from("notifications").insert({
        user_id: userId, type: "money",
        title: "Withdrawal Rejected ❌",
        description: `Your withdrawal of Rs ${amount.toLocaleString()} was rejected. The amount has been returned to your wallet.`,
      });
      const { data: profile } = await supabase.from("profiles").select("credit_score").eq("user_id", userId).maybeSingle();
      if (profile) {
        await supabase.from("profiles").update({ credit_score: Math.max(0, (profile.credit_score || 100) - 10) }).eq("user_id", userId);
      }
    }

    toast.success(`Withdrawal ${action}`);
    setProcessing(null);
    fetchWithdrawals();
  };

  if (loading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <h1 className="text-2xl font-heading font-bold text-foreground">Withdrawal Requests</h1>
      </div>

      {withdrawals.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No withdrawal requests</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {withdrawals.map((w) => {
          const bank = bankMap.get(w.user_id) || w.bank_accounts;
          const profile = profileMap.get(w.user_id);
          return (
            <Card key={w.id} className="shadow-neu">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold">{profile?.name || "User"}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{new Date(w.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">Rs {Number(w.amount).toLocaleString()}</p>
                    <Badge className={`text-[9px] ${statusColor[w.status]}`}>{w.status}</Badge>
                  </div>
                </div>

                {/* Bank Details - prominent and copyable */}
                {bank && (
                  <div className="bg-muted/30 rounded-xl p-3 mb-3 space-y-1.5">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" /> Bank Details
                    </p>
                    <div className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2">
                      <div><span className="text-muted-foreground">Bank: </span><span className="font-semibold text-foreground">{bank.bank_name}</span></div>
                      <button onClick={() => copyToClipboard(bank.bank_name)} className="text-primary hover:text-primary/80"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2">
                      <div><span className="text-muted-foreground">A/C: </span><span className="font-mono font-bold text-foreground tracking-wide text-sm">{bank.account_number}</span></div>
                      <button onClick={() => copyToClipboard(bank.account_number)} className="text-primary hover:text-primary/80"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                    {bank.iban && (
                      <div className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2">
                        <div><span className="text-muted-foreground">IBAN: </span><span className="font-mono font-bold text-foreground">{bank.iban}</span></div>
                        <button onClick={() => copyToClipboard(bank.iban)} className="text-primary hover:text-primary/80"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    {profile?.phone && (
                      <div className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2">
                        <div><span className="text-muted-foreground">Phone: </span><span className="font-medium text-foreground">{profile.phone}</span></div>
                        <button onClick={() => copyToClipboard(profile.phone)} className="text-primary hover:text-primary/80"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                )}

                {w.notes && <p className="text-xs text-muted-foreground mb-3">Note: {w.notes}</p>}
                {w.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white" disabled={processing === w.id} onClick={() => handleAction(w.id, w.user_id, Number(w.amount), "approved")}>
                      <Check className="w-3 h-3 mr-1" />Deposited
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 rounded-xl" disabled={processing === w.id} onClick={() => handleAction(w.id, w.user_id, Number(w.amount), "rejected")}>
                      <X className="w-3 h-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWithdrawals;
