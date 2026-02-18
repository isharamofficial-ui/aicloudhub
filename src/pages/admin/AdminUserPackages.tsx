import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Search, Package, X, Check, Clock, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";

const AdminUserPackages = () => {
  const [userPackages, setUserPackages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [packages, setPackages] = useState<Map<string, any>>(new Map());
  const [allPackages, setAllPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ user_id: "", package_id: "", price_paid: "", expires_at: "" });
  const [editForm, setEditForm] = useState({ expires_at: "", price_paid: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [upRes, profilesRes, pkgRes] = await Promise.all([
      supabase.from("user_packages").select("*").order("purchased_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
      supabase.from("ai_packages").select("id, name, price_onetime, price_monthly"),
    ]);
    setProfiles(new Map((profilesRes.data || []).map((p: any) => [p.user_id, p.display_name])));
    const pkgMap = new Map((pkgRes.data || []).map((p: any) => [p.id, p]));
    setPackages(pkgMap);
    setAllPackages(pkgRes.data || []);
    setUserPackages(upRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleActive = async (id: string, current: boolean, userId: string) => {
    setProcessing(id);
    await supabase.from("user_packages").update({ is_active: !current }).eq("id", id);
    await supabase.from("notifications").insert({
      user_id: userId, type: "system",
      title: current ? "Package Deactivated" : "Package Reactivated",
      description: current ? "One of your packages has been deactivated by admin." : "One of your packages has been reactivated by admin.",
    });
    toast.success(current ? "Package deactivated" : "Package activated");
    setProcessing(null);
    fetchData();
  };

  const handleExtend = async (id: string, userId: string, currentExpiry: string | null) => {
    setProcessing(id);
    const newExpiry = new Date(currentExpiry || new Date());
    newExpiry.setDate(newExpiry.getDate() + 30);
    await supabase.from("user_packages").update({ expires_at: newExpiry.toISOString() }).eq("id", id);
    await supabase.from("notifications").insert({
      user_id: userId, type: "system",
      title: "Package Extended",
      description: "Your package has been extended by 30 days by admin.",
    });
    toast.success("Package extended by 30 days");
    setProcessing(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user package?")) return;
    const { error } = await supabase.from("user_packages").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Package deleted");
    fetchData();
  };

  const handleAdd = async () => {
    if (!addForm.user_id.trim() || !addForm.package_id) { toast.error("User ID and package required"); return; }
    setSaving(true);
    const pkg = packages.get(addForm.package_id);
    const price = addForm.price_paid ? parseFloat(addForm.price_paid) : (pkg?.price_onetime || pkg?.price_monthly || 0);
    const { error } = await supabase.from("user_packages").insert({
      user_id: addForm.user_id.trim(),
      package_id: addForm.package_id,
      price_paid: price,
      expires_at: addForm.expires_at ? new Date(addForm.expires_at).toISOString() : null,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast.error("Failed to add: " + error.message); return; }
    toast.success("Package assigned!");
    setAddForm({ user_id: "", package_id: "", price_paid: "", expires_at: "" });
    setShowAdd(false);
    fetchData();
  };

  const startEdit = (up: any) => {
    setEditingId(up.id);
    setEditForm({
      expires_at: up.expires_at ? new Date(up.expires_at).toISOString().split("T")[0] : "",
      price_paid: up.price_paid?.toString() || "",
    });
  };

  const handleEdit = async (id: string, userId: string) => {
    setSaving(true);
    const { error } = await supabase.from("user_packages").update({
      price_paid: parseFloat(editForm.price_paid) || 0,
      expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Package updated!");
    setEditingId(null);
    fetchData();
  };

  const filtered = userPackages.filter(up => {
    const q = search.toLowerCase();
    if (!q) return true;
    const userName = profiles.get(up.user_id)?.toLowerCase() || "";
    const pkgName = packages.get(up.package_id)?.name?.toLowerCase() || "";
    return userName.includes(q) || pkgName.includes(q) || up.user_id.includes(q);
  });

  if (loading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="p-4 space-y-4 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-heading font-bold text-foreground">User Packages ({userPackages.length})</h1>
        </div>
        <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground" onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}>
          <Plus className="w-4 h-4 mr-1" />{showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {showAdd && (
        <Card className="shadow-neu animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1"><Label className="text-xs">User ID *</Label><Input className="rounded-xl h-9 font-mono text-xs" placeholder="Paste user UUID" value={addForm.user_id} onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Package *</Label>
              <select className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm" value={addForm.package_id} onChange={(e) => setAddForm({ ...addForm, package_id: e.target.value })}>
                <option value="">Select package...</option>
                {allPackages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Price Paid (Rs)</Label><Input type="number" className="rounded-xl h-9" placeholder="Auto from package" value={addForm.price_paid} onChange={(e) => setAddForm({ ...addForm, price_paid: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Expires At</Label><Input type="date" className="rounded-xl h-9" value={addForm.expires_at} onChange={(e) => setAddForm({ ...addForm, expires_at: e.target.value })} /></div>
            </div>
            <Button className="w-full rounded-xl gradient-primary text-primary-foreground" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Assign Package
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 rounded-xl" placeholder="Search by user, package..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(up => (
          <Card key={up.id} className={`shadow-neu ${!up.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              {editingId === up.id ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Editing: {packages.get(up.package_id)?.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Price Paid</Label><Input type="number" className="rounded-xl h-8 text-xs" value={editForm.price_paid} onChange={(e) => setEditForm({ ...editForm, price_paid: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Expires At</Label><Input type="date" className="rounded-xl h-8 text-xs" value={editForm.expires_at} onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-xl text-xs gradient-primary text-primary-foreground" onClick={() => handleEdit(up.id, up.user_id)} disabled={saving}>
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Save</>}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{packages.get(up.package_id)?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{profiles.get(up.user_id) || "User"} • Rs {Number(up.price_paid).toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge className={up.is_active ? "bg-emerald-500/20 text-emerald-600 text-[9px]" : "bg-red-500/20 text-red-500 text-[9px]"}>
                      {up.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(up.purchased_at).toLocaleDateString()}</span>
                    {up.expires_at && <span>Expires: {new Date(up.expires_at).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant={up.is_active ? "destructive" : "default"} className="flex-1 rounded-xl text-xs" disabled={processing === up.id}
                      onClick={() => handleToggleActive(up.id, up.is_active, up.user_id)}>
                      {processing === up.id ? <Loader2 className="w-3 h-3 animate-spin" /> : up.is_active ? <><X className="w-3 h-3 mr-1" />Deactivate</> : <><Check className="w-3 h-3 mr-1" />Activate</>}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs px-3" disabled={processing === up.id}
                      onClick={() => handleExtend(up.id, up.user_id, up.expires_at)}>
                      +30d
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs px-3" onClick={() => startEdit(up)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl text-xs px-3 text-destructive" onClick={() => handleDelete(up.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminUserPackages;
