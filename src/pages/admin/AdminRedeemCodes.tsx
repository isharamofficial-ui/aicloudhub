import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, Tag, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const AdminRedeemCodes = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", reward_amount: "", max_uses: "1", expires_at: "" });

  const fetchCodes = async () => {
    const { data } = await supabase.from("redeem_codes").select("*").order("created_at", { ascending: false });
    setCodes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleAdd = async () => {
    if (!form.code.trim() || !form.reward_amount) { toast.error("Code and amount required"); return; }
    setSaving(true);
    const { error } = await supabase.from("redeem_codes").insert({
      code: form.code.trim().toUpperCase(),
      reward_amount: parseFloat(form.reward_amount),
      max_uses: parseInt(form.max_uses) || 1,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Code already exists");
      else toast.error("Failed to add code");
      return;
    }
    toast.success("Redeem code added!");
    setForm({ code: "", reward_amount: "", max_uses: "1", expires_at: "" });
    setShowAdd(false);
    fetchCodes();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from("redeem_codes").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Code deactivated" : "Code activated");
    fetchCodes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("redeem_codes").delete().eq("id", id);
    toast.success("Code deleted");
    fetchCodes();
  };

  if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-heading font-bold text-foreground">Redeem Codes ({codes.length})</h1>
        </div>
        <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" />{showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {showAdd && (
        <Card className="shadow-neu animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1"><Label className="text-xs">Code *</Label><Input className="rounded-xl h-9 uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME100" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Reward (Rs)</Label><Input type="number" className="rounded-xl h-9" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Max Uses</Label><Input type="number" className="rounded-xl h-9" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Expires At (optional)</Label><Input type="date" className="rounded-xl h-9" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
            <Button className="w-full rounded-xl gradient-primary text-primary-foreground" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Code
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {codes.map((c) => (
          <Card key={c.id} className="shadow-neu">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold font-mono">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Rs {Number(c.reward_amount).toLocaleString()} | Used: {c.current_uses}/{c.max_uses}
                      {c.expires_at && ` | Exp: ${new Date(c.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={c.is_active} onCheckedChange={() => handleToggle(c.id, c.is_active)} />
                  <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminRedeemCodes;
