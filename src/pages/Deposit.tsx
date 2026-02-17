import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowLeft, Building2, Copy, Camera, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const Deposit = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const copyAccount = () => {
    navigator.clipboard.writeText("82001567XX");
    toast.success("Account number copied!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!user) return;
    setLoading(true);

    const { error: depErr } = await supabase.from("deposit_requests").insert({
      user_id: user.id, amount: amt, payment_method: "bank_transfer" as const,
      notes: reference.trim() || null,
    });

    if (!depErr) {
      await supabase.from("transactions").insert({
        user_id: user.id, type: "deposit" as const, amount: amt, status: "pending" as const,
        description: `Deposit via Bank Transfer${reference ? ` - ${reference}` : ""}`,
      });
    }

    setLoading(false);
    if (depErr) { toast.error("Failed to submit deposit request"); } else { setSubmitted(true); }
  };

  if (submitted) {
    return (
      <div className="px-4 py-8 animate-fade-in">
        <div className="shadow-neu rounded-2xl bg-card p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground">Deposit Request Submitted</h2>
          <p className="text-sm text-muted-foreground">Your deposit of <strong>Rs {parseFloat(amount).toFixed(2)}</strong> is pending approval.</p>
          <Button onClick={() => { setSubmitted(false); setAmount(""); setReference(""); }} variant="outline" className="rounded-xl">
            Make Another Deposit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-heading font-bold text-foreground">Deposit (තැන්පත් කරන්න)</h1>
      </div>

      <div className="px-4 space-y-5 pb-8">
        {/* Payment Method */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Select Method</p>
          <div className="shadow-neu rounded-2xl bg-card p-4 flex items-center gap-4 ring-2 ring-primary">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-foreground">Bank Transfer</p>
              <p className="text-xs text-muted-foreground">Manual transfer to our account</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="shadow-neu rounded-2xl bg-card p-5 space-y-3">
          <h3 className="text-sm font-heading font-bold text-foreground">Receiving Bank Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank</span>
              <span className="font-medium text-foreground">Commercial Bank PLC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">A/C Name</span>
              <span className="font-medium text-foreground">AI Cloud Technologies</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">A/C No</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground font-mono">82001567XX</span>
                <button onClick={copyAccount} className="text-primary hover:text-primary/80">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch</span>
              <span className="font-medium text-foreground">Colombo 07</span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Enter Amount (Rs)</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              className="rounded-xl h-12 text-lg shadow-neu-inset bg-muted/30"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Transaction Reference / Remark</Label>
            <Input
              placeholder="e.g. TXN12345"
              className="rounded-xl h-12 shadow-neu-inset bg-muted/30"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center bg-muted/20 cursor-pointer hover:border-primary/40 transition-colors">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Upload Payment Slip</p>
              <p className="text-xs text-muted-foreground">(රිසිට්පත මෙතැනට දමන්න)</p>
              <Upload className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full rounded-xl h-12 gradient-primary text-primary-foreground font-semibold text-base" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Deposit
          </Button>

          {/* Warning */}
          <p className="text-xs text-destructive text-center font-medium">
            ⚠️ Transfer exact amount. Requests are processed within 30 minutes.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Deposit;
