import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, Image, Loader2, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";

const AdminSliders = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", gradient: "from-yellow-500 via-red-500 to-orange-500", sort_order: "0" });

  const gradientOptions = [
    "from-yellow-500 via-red-500 to-orange-500",
    "from-teal-500 via-cyan-500 to-blue-500",
    "from-orange-500 via-pink-500 to-purple-500",
    "from-emerald-500 via-green-500 to-teal-500",
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-rose-500 via-red-500 to-amber-500",
  ];

  const fetchBanners = async () => {
    const { data } = await supabase.from("slider_banners").select("*").order("sort_order", { ascending: true });
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    const { error } = await supabase.from("slider_banners").insert({
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      gradient: form.gradient,
      sort_order: parseInt(form.sort_order) || 0,
    });
    setSaving(false);
    if (error) { toast.error("Failed to add banner"); return; }
    toast.success("Banner added!");
    setForm({ title: "", subtitle: "", gradient: gradientOptions[0], sort_order: "0" });
    setShowAdd(false);
    fetchBanners();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from("slider_banners").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Banner hidden" : "Banner visible");
    fetchBanners();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("slider_banners").delete().eq("id", id);
    toast.success("Banner deleted");
    fetchBanners();
  };

  if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-heading font-bold text-foreground">Slider Banners ({banners.length})</h1>
        </div>
        <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" />{showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {showAdd && (
        <Card className="shadow-neu animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1"><Label className="text-xs">Title *</Label><Input className="rounded-xl h-9" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New User Bonus!" /></div>
            <div className="space-y-1"><Label className="text-xs">Subtitle</Label><Input className="rounded-xl h-9" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Get Rs.100 Free" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Gradient</Label>
              <div className="grid grid-cols-3 gap-2">
                {gradientOptions.map((g) => (
                  <button key={g} onClick={() => setForm({ ...form, gradient: g })}
                    className={`h-8 rounded-lg bg-gradient-to-r ${g} ${form.gradient === g ? 'ring-2 ring-foreground' : ''}`} />
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Sort Order</Label><Input type="number" className="rounded-xl h-9" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
            <Button className="w-full rounded-xl gradient-primary text-primary-foreground" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Banner
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {banners.map((b) => (
          <Card key={b.id} className="shadow-neu overflow-hidden">
            <div className={`h-16 bg-gradient-to-r ${b.gradient} flex items-center justify-center p-3`}>
              <div className="text-white text-center">
                <p className="text-sm font-bold">{b.title}</p>
                {b.subtitle && <p className="text-[10px] opacity-80">{b.subtitle}</p>}
              </div>
            </div>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Order: {b.sort_order}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={b.is_active} onCheckedChange={() => handleToggle(b.id, b.is_active)} />
                <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminSliders;
