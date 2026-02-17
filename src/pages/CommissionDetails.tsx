import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Commission {
  id: string;
  amount: number;
  tier: number;
  source_type: string | null;
  created_at: string;
  from_user_id: string | null;
}

const tierColors: Record<number, string> = {
  1: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  2: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  3: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

const CommissionDetails = () => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCommissions = async () => {
      const { data } = await supabase
        .from("commissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setCommissions((data || []) as Commission[]);
      setLoading(false);
    };
    fetchCommissions();
  }, [user]);

  const totalAmount = commissions.reduce((s, c) => s + Number(c.amount), 0);
  const tier1Total = commissions.filter(c => c.tier === 1).reduce((s, c) => s + Number(c.amount), 0);
  const tier2Total = commissions.filter(c => c.tier === 2).reduce((s, c) => s + Number(c.amount), 0);
  const tier3Total = commissions.filter(c => c.tier === 3).reduce((s, c) => s + Number(c.amount), 0);

  if (loading) return <div className="px-4 py-4 space-y-4"><Skeleton className="h-14" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="px-4 py-4 flex items-center gap-3">
        <Link to="/settings">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-heading font-bold text-foreground">Commission Details</h1>
      </div>

      <div className="px-4 space-y-5 pb-8">
        {/* Summary */}
        <div className="gradient-primary rounded-2xl p-5 text-primary-foreground shadow-neu">
          <p className="text-sm opacity-80">Total Commissions</p>
          <p className="text-3xl font-heading font-bold mt-1">
            Rs {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Tier Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tier 1", value: tier1Total, tier: 1 },
            { label: "Tier 2", value: tier2Total, tier: 2 },
            { label: "Tier 3", value: tier3Total, tier: 3 },
          ].map((item) => (
            <div key={item.label} className="shadow-neu rounded-xl bg-card p-3 text-center">
              <Badge className={cn("text-[9px] mb-1", tierColors[item.tier])}>{item.label}</Badge>
              <p className="text-sm font-heading font-bold text-foreground">Rs {item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Commission List */}
        <div>
          <h2 className="text-sm font-heading font-bold text-foreground mb-3">Transaction History</h2>
          {commissions.length === 0 ? (
            <div className="shadow-neu rounded-2xl bg-card p-8 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No commissions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Invite friends to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.map((c) => (
                <div key={c.id} className="shadow-neu rounded-xl bg-card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {c.source_type === "package_purchase" ? "Package Commission" : c.source_type || "Commission"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-success">+Rs {Number(c.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <Badge className={cn("text-[9px] px-1.5 py-0", tierColors[c.tier])}>Tier {c.tier}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionDetails;
