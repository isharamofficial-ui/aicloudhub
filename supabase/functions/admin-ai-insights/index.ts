import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats, userGrowth, packageStats, recentTransactions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are an AI business analyst for a financial platform. Analyze this data and provide insights:

**Platform Stats:**
- Total Users: ${stats.totalUsers}
- Platform Balance: Rs ${stats.totalBalance}
- Total Deposited: Rs ${stats.totalDeposited}
- Total Withdrawn: Rs ${stats.totalWithdrawn}
- Total Commission: Rs ${stats.totalCommission}
- Active Packages: ${stats.activePackages}
- Today's New Users: ${stats.todayNewUsers}
- Today's Deposits: Rs ${stats.todayDeposits}
- Today's Withdrawals: Rs ${stats.todayWithdrawals}
- Pending Deposits: ${stats.pendingDepositsCount}
- Pending Withdrawals: ${stats.pendingWithdrawalsCount}

**User Growth (last 7 days):** ${JSON.stringify(userGrowth)}

**Package Revenue:** ${JSON.stringify(packageStats)}

**Recent Transactions:** ${JSON.stringify(recentTransactions)}

Provide:
1. 📈 **Revenue Prediction** - Estimated next day income based on trends
2. 🎯 **Key Insights** - 3 actionable insights about user behavior & revenue
3. ⚠️ **Risk Alerts** - Any concerning patterns (withdrawal/deposit ratio, frozen accounts, etc.)
4. 💡 **Recommendations** - 2-3 specific actions to improve platform performance

Keep it concise and actionable. Use emojis for clarity. Format with markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert financial analyst providing actionable business intelligence." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "No insights generated.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
