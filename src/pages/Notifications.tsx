import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const typeEmoji: Record<string, string> = {
  money: "💰",
  security: "🔒",
  system: "📢",
  promo: "🎁",
  update: "🚀",
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data || []);
      setLoading(false);

      // Mark all as read
      if (data && data.some((n: any) => !n.is_read)) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
      }
    };
    fetch();
  }, [user]);

  if (loading) return <div className="px-4 py-4 space-y-3"><Skeleton className="h-14" />{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-heading font-bold text-foreground">Message Center</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
        )}
        {notifications.map((n) => (
          <div key={n.id} className={`shadow-neu rounded-2xl bg-card p-4 space-y-2 ${!n.is_read ? 'ring-1 ring-primary/20' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                {typeEmoji[n.type] || "📢"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-heading font-bold text-foreground truncate">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{n.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
