import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Brain, Database as DbIcon, Cpu, Server, Zap, Star, Loader2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiPackage {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  price_onetime: number | null;
  price_monthly: number | null;
  cashback_percent: number | null;
  bonus_tag: string | null;
  duration_days: number | null;
  is_active: boolean | null;
}

interface UserPackage {
  id: string;
  package_id: string;
  purchased_at: string;
  expires_at: string | null;
  is_active: boolean;
  price_paid: number;
  ai_packages: { name: string; description: string | null } | null;
}

const packageIcons = [Brain, DbIcon, Cpu, Server, Zap, Star];

// Mock daily income data for display
const dailyIncomeMap: Record<string, { daily: number; total: number }> = {};

const Packages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<AiPackage[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      const [pkgRes, upRes] = await Promise.all([
        supabase.from("ai_packages").select("*").order("price_monthly", { ascending: true }),
        user ? supabase.from("user_packages").select("*, ai_packages(name, description)").eq("user_id", user.id).order("purchased_at", { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      const pkgs = (pkgRes.data || []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] }));
      setPackages(pkgs as AiPackage[]);
      setUserPackages((upRes.data || []) as UserPackage[]);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleBuy = async (pkg: AiPackage) => {
    if (!user) return;
    const price = pkg.price_onetime || pkg.price_monthly || 0;
    setBuying(pkg.id);
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    const bal = wallet?.balance ? Number(wallet.balance) : 0;
    if (bal < price) { toast.error("Insufficient balance. Please deposit funds first."); setBuying(null); return; }
    const expiresAt = pkg.duration_days ? new Date(Date.now() + pkg.duration_days * 86400000).toISOString() : null;
    const { error } = await supabase.from("user_packages").insert({ user_id: user.id, package_id: pkg.id, price_paid: price, expires_at: expiresAt });
    if (!error) {
      await supabase.from("wallets").update({ balance: bal - price }).eq("user_id", user.id);
      await supabase.from("transactions").insert({ user_id: user.id, type: "purchase" as const, amount: price, status: "approved" as const, description: `Purchased ${pkg.name}` });
      toast.success(`Successfully purchased ${pkg.name}!`);
      const upRes = await supabase.from("user_packages").select("*, ai_packages(name, description)").eq("user_id", user.id).order("purchased_at", { ascending: false });
      setUserPackages((upRes.data || []) as UserPackage[]);
    } else { toast.error("Failed to purchase package"); }
    setBuying(null);
  };

  const filterCategory = (name: string) => {
    if (activeTab === "all") return true;
    const lower = name.toLowerCase();
    if (activeTab === "gpu") return lower.includes("gpu") || lower.includes("cluster");
    if (activeTab === "database") return lower.includes("db") || lower.includes("database") || lower.includes("vector");
    if (activeTab === "nodes") return lower.includes("node") || lower.includes("starter") || lower.includes("query");
    return true;
  };

  if (loading) return <div className="px-4 py-4 space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div></div>;

  const filteredPkgs = packages.filter((p) => filterCategory(p.name));

  return (
    <div className="animate-fade-in">
      <div className="px-4 py-4">
        <h1 className="text-lg font-heading font-bold text-foreground mb-4">AI Cloud Market</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {["all", "gpu", "database", "nodes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                activeTab === tab
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab === "all" ? "All" : tab === "gpu" ? "GPU" : tab === "database" ? "Database" : "Nodes"}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredPkgs.map((pkg, idx) => {
            const isComingSoon = !pkg.is_active;
            const price = pkg.price_onetime || pkg.price_monthly || 0;
            const dailyIncome = Math.round(price * 0.05);
            const totalRevenue = dailyIncome * (pkg.duration_days || 30);
            const IconComp = packageIcons[idx % packageIcons.length];
            const isSoldOut = pkg.bonus_tag === "SOLD OUT";

            return (
              <div
                key={pkg.id}
                className={cn(
                  "rounded-2xl overflow-hidden flex flex-col",
                  isComingSoon || isSoldOut ? "bg-muted/60 opacity-60" : "bg-card shadow-neu"
                )}
              >
                {/* Icon area */}
                <div className={cn(
                  "h-24 flex items-center justify-center relative",
                  isComingSoon || isSoldOut ? "bg-muted" : idx % 3 === 0 ? "gradient-primary" : idx % 3 === 1 ? "gradient-secondary" : "gradient-dark"
                )}>
                  <IconComp className="w-10 h-10 text-primary-foreground/80" />
                  {pkg.bonus_tag && (
                    <Badge className={cn(
                      "absolute top-2 right-2 text-[9px] px-1.5 py-0",
                      pkg.bonus_tag === "HOT" && "bg-destructive text-destructive-foreground",
                      pkg.bonus_tag === "NEW" && "bg-secondary text-secondary-foreground",
                      isSoldOut && "bg-muted-foreground text-muted",
                    )}>
                      {pkg.bonus_tag}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-xs font-heading font-bold text-foreground leading-tight line-clamp-2">{pkg.name}</p>
                  <p className="text-base font-heading font-bold text-primary mt-1">Rs.{price.toLocaleString()}</p>
                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                    <p>Daily: Rs.{dailyIncome}/day</p>
                    <p>Total: Rs.{totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="mt-auto pt-2">
                    {isComingSoon ? (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-lg block text-center">Coming soon</span>
                    ) : isSoldOut ? (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-lg block text-center">Sold Out</span>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full rounded-xl gradient-primary text-primary-foreground text-[10px] h-8 font-semibold"
                        onClick={() => handleBuy(pkg)}
                        disabled={buying === pkg.id}
                      >
                        {buying === pkg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Rent Now"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* My Packages */}
        {userPackages.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-heading font-bold text-foreground mb-3">My Packages</h2>
            <div className="space-y-2">
              {userPackages.map((up) => (
                <div key={up.id} className="shadow-neu rounded-xl bg-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(up.ai_packages as any)?.name || "Package"}</p>
                    <p className="text-[10px] text-muted-foreground">Purchased {new Date(up.purchased_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">Rs.{up.price_paid.toFixed(0)}</p>
                    <Badge className={cn("text-[9px]", up.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                      {up.is_active ? "Active" : "Expired"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Packages;
