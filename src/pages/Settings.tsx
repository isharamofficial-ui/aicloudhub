import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Loader2, User, Lock, CreditCard, Download, Headphones,
  Info, LogOut, Settings as SettingsIcon, Gift, Users, PieChart,
  Tag, Bell, ArrowDownToLine, ArrowUpFromLine, CloudDownload,
  ShieldCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [walletData, setWalletData] = useState({ balance: 0, total_deposited: 0, total_commission: 0 });

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("display_name, phone").eq("user_id", userId).maybeSingle(),
        supabase.from("wallets").select("balance, total_deposited, total_commission").eq("user_id", userId).maybeSingle(),
      ]);
      if (profileRes.data) { setDisplayName(profileRes.data.display_name || ""); setPhone(profileRes.data.phone || ""); }
      if (walletRes.data) setWalletData(walletRes.data);
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim(), phone: phone.trim() }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to update profile"); else toast.success("Profile updated!");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) toast.error(error.message); else { toast.success("Password changed!"); setNewPassword(""); setConfirmPassword(""); setActiveSection(null); }
  };

  const maskedEmail = user?.email
    ? user.email.split("@")[0].slice(0, 3) + "***@" + user.email.split("@")[1]
    : "user@email.com";

  const userIdShort = userId ? userId.slice(0, 5).toUpperCase() : "00000";

  const now = new Date();
  const serverTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const gridItems = [
    // Row 1 - Financial Records
    { label: "Bank Info", icon: CreditCard, key: "bank", action: () => setActiveSection(activeSection === "bank" ? null : "bank") },
    { label: "Deposit History", icon: ArrowDownToLine, key: "deposit-history", action: () => navigate("/transactions") },
    { label: "Withdraw History", icon: ArrowUpFromLine, key: "withdraw-history", action: () => navigate("/transactions") },
    // Row 2 - Earning Activity
    { label: "My Packages", icon: Gift, key: "packages", action: () => navigate("/packages") },
    { label: "Team Report", icon: Users, key: "team", action: () => navigate("/team") },
    { label: "Commission Details", icon: PieChart, key: "commission", action: () => navigate("/transactions") },
    // Row 3 - Rewards & Account
    { label: "Redeem Code", icon: Tag, key: "redeem", action: () => toast.info("Coming soon!") },
    { label: "Message Center", icon: Bell, key: "messages", action: () => toast.info("No new messages") },
    { label: "Change Password", icon: Lock, key: "password", action: () => setActiveSection(activeSection === "password" ? null : "password") },
    // Row 4 - System
    { label: "Download App", icon: CloudDownload, key: "download", action: () => toast.info("Coming soon!") },
    { label: "Support", icon: Headphones, key: "support", action: () => window.open("https://wa.me/94771234567", "_blank") },
    { label: "About Us", icon: Info, key: "about", action: () => setActiveSection(activeSection === "about" ? null : "about") },
  ];

  if (loading) return <div className="px-4 py-4 space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="px-4 py-4 space-y-4 pb-8">

        {/* ===== 1. Supercharged User Header Card ===== */}
        <div className="shadow-neu rounded-2xl bg-card p-5 space-y-4">
          {/* Top Row */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-lg shrink-0">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-heading font-bold text-foreground truncate">{displayName || "User"}</p>
              <p className="text-xs text-muted-foreground">{maskedEmail}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">ID: {userIdShort}</p>
            </div>
            <button
              onClick={() => setActiveSection(activeSection === "edit" ? null : "edit")}
              className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0"
            >
              <SettingsIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Middle Row - VIP + Progress */}
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-2.5 py-0.5 shrink-0 shadow-sm">
              ⭐ VIP Level 1
            </Badge>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Upgrade Progress</span>
                <span className="text-[10px] font-semibold text-foreground">450/1000 exp</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </div>

          {/* Bottom Row - Credit Score */}
          <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs text-muted-foreground">Credit Score:</span>
            <span className="text-xs font-bold text-emerald-500">100% Excellent</span>
          </div>
        </div>

        {/* ===== 2. Wallet Dashboard Strip ===== */}
        <div className="shadow-neu rounded-2xl bg-card p-4">
          <div className="flex items-center divide-x divide-border">
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground mb-1">Total Assets</p>
              <p className="text-sm font-heading font-bold text-foreground">Rs {walletData.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground mb-1">Frozen Amount</p>
              <p className="text-sm font-heading font-bold text-muted-foreground">Rs 0.00</p>
            </div>
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground mb-1">Today's Earnings</p>
              <p className="text-sm font-heading font-bold text-emerald-500">+Rs {walletData.total_commission.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* ===== 3. Control Center Grid (4x3) ===== */}
        <div className="space-y-2">
          <h2 className="text-sm font-heading font-bold text-foreground px-1">Control Center</h2>
          <div className="grid grid-cols-3 gap-3">
            {gridItems.map((item) => (
              <button
                key={item.key}
                onClick={item.action}
                className={cn(
                  "shadow-neu rounded-2xl bg-card p-3.5 flex flex-col items-center gap-2 transition-all active:scale-95",
                  activeSection === item.key && "ring-2 ring-primary"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== Expandable Sections ===== */}

        {/* Password Section */}
        {activeSection === "password" && (
          <div className="shadow-neu rounded-2xl bg-card p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-heading font-bold text-foreground">Change Password</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">New Password</Label>
                <Input type="password" className="rounded-xl h-11 shadow-neu-inset bg-muted/30" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Confirm Password</Label>
                <Input type="password" className="rounded-xl h-11 shadow-neu-inset bg-muted/30" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleChangePassword} className="w-full rounded-xl gradient-primary text-primary-foreground" disabled={changingPw}>
              {changingPw && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Update Password
            </Button>
          </div>
        )}

        {/* About Section */}
        {activeSection === "about" && (
          <div className="shadow-neu rounded-2xl bg-card p-5 space-y-3 animate-fade-in">
            <h3 className="text-sm font-heading font-bold text-foreground">About AICloudHub</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AICloudHub is a premium AI services marketplace providing cutting-edge artificial intelligence solutions.
              Rent GPU clusters, access vector databases, and earn through our referral program.
            </p>
            <p className="text-xs text-muted-foreground">support@aicloudhub.com</p>
          </div>
        )}

        {/* Edit Profile Section */}
        {activeSection === "edit" && (
          <div className="shadow-neu rounded-2xl bg-card p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-heading font-bold text-foreground">Edit Profile</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Display Name</Label>
                <Input className="rounded-xl h-11 shadow-neu-inset bg-muted/30" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone (optional)</Label>
                <Input className="rounded-xl h-11 shadow-neu-inset bg-muted/30" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 7X XXX XXXX" />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="w-full rounded-xl gradient-primary text-primary-foreground" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
            </Button>
          </div>
        )}

        {/* ===== Logout ===== */}
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full rounded-xl h-12 border-destructive text-destructive hover:bg-destructive/10 font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>

        {/* ===== 4. Footer Info ===== */}
        <div className="text-center space-y-1 pt-2 pb-4">
          <p className="text-[10px] text-muted-foreground">Version 1.4.2 (Build 2026)</p>
          <p className="text-[10px] text-muted-foreground">Server Time: {serverTime}</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
