import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, Tag, Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const emptyForm = { code: "", reward_amount: "", max_uses: "1", expires_at: "" };

const AdminRedeemCodes = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    setForm(emptyForm);
    setShowAdd(false);
    fetchCodes();
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setShowAdd(false);
    setForm({
      code: c.code,
      reward_amount: c.reward_amount?.toString() || "",
      max_uses: c.max_uses?.toString() || "1",
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().split("T")[0] : "",
    });
  };

  const handleEdit = async () => {
    if (!form.code.trim() || !form.reward_amount) { toast.error("Code and amount required"); return; }
    setSaving(true);
    const { error } = await supabase.from("redeem_codes").update({
      code: form.code.trim().toUpperCase(),
      reward_amount: parseFloat(form.reward_amount),
      max_uses: parseInt(form.max_uses) || 1,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }).eq("id", editingId!);
    setSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Code updated!");
    setEditingId(null);
    setForm(emptyForm);
    fetchCodes();
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from("redeem_codes").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Code deactivated" : "Code activated");
    fetchCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this redeem code?")) return;
    await supabase.from("redeem_codes").delete().eq("id", id);
    toast.success("Code deleted");
    fetchCodes();
  };

  const formFields = (
    <div className="space-y-3">
      <div className="space-y-1"><Label className="text-xs">Code *</Label><Input className="rounded-xl h-9 uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME100" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Reward (Rs)</Label><Input type="number" className="rounded-xl h-9" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Max Uses</Label><Input type="number" className="rounded-xl h-9" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Expires At (optional)</Label><Input type="date" className="rounded-xl h-9" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
    </div>
  );

  if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-heading font-bold text-foreground">Redeem Codes ({codes.length})</h1>
        </div>
        <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground" onClick={() => { setShowAdd(!showAdd); cancelEdit(); }}>
          <Plus className="w-4 h-4 mr-1" />{showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {showAdd && (
        <Card className="shadow-neu animate-fade-in">
          <CardContent className="p-4 space-y-3">
            {formFields}
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
              {editingId === c.id ? (
                <div className="space-y-3">
                  {formFields}
                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-xl gradient-primary text-primary-foreground text-xs" onClick={handleEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Save</>}
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl text-xs" onClick={cancelEdit}><X className="w-3 h-3 mr-1" />Cancel</Button>
                  </div>
                </div>
              ) : (
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
                  <div className="flex items-center gap-1">
                    <Switch checked={c.is_active} onCheckedChange={() => handleToggle(c.id, c.is_active)} />
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => startEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminRedeemCodes;
