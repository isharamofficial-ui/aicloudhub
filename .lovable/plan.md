

# Plan: Credit Score Penalties, Ban Reason, and Global Marquee

## 1. Credit Score Impact on Withdraw Page

**Current state:** The withdraw page shows a static "Handling fee: 5%" and "Minimum withdrawal: Rs 1,000" regardless of credit score.

**Changes to `src/pages/Withdraw.tsx`:**
- Fetch `credit_score` from the `profiles` table (already fetching `is_frozen`, just add `credit_score`)
- Calculate dynamic fee: `5% + (100 - credit_score) * 0.1%`
- Calculate dynamic minimum withdrawal: base Rs 1,000, increasing as credit score drops (e.g., Rs 1,000 + (100 - score) * 50, so at score 0, minimum is Rs 6,000)
- Display the actual fee percentage and minimum dynamically
- Show a warning when credit score is below 100 explaining the penalty

**Changes to `submit_withdrawal` RPC:**
- Update the minimum withdrawal check to use the dynamic minimum: `1000 + (100 - credit_score) * 50`

## 2. Lower Redeem Code Income Based on Credit Score

**Changes to `src/pages/Redeem.tsx`:**
- Fetch user's `credit_score` from profiles before redeeming
- Scale the reward: `actual_reward = reward_amount * (credit_score / 100)`
- Show the user their effective reward rate if credit score is below 100
- Update wallet with scaled amount instead of full amount

## 3. Lower Commission Based on Credit Score

**Current state:** The `approve_deposit` RPC already scales commissions by credit score. This is already implemented correctly in the database function. No changes needed here -- just verify it's working.

## 4. Ban Reason Input with Quick-Select Messages

**Changes to `src/pages/admin/AdminUserDetail.tsx`:**
- Add a `banReason` text state and a textarea input in the ban controls section
- Add quick-select reason buttons: "Suspicious activity detected", "Multiple account violation", "Fraudulent transaction", "Terms of service violation", "Spam or abuse"
- Pass the reason to the `ban_user` RPC and include it in the notification sent to the user

**Changes to `ban_user` RPC:**
- Add `p_reason text DEFAULT NULL` parameter
- Include the reason in the notification description sent to the banned user

## 5. Global Marquee -- Show All Users' Activity

**Problem:** RLS policies on `transactions` table restrict users to only see their own transactions. The marquee fetch runs client-side and is limited by RLS.

**Solution:** Create a database function (RPC) `get_recent_activity` with `SECURITY DEFINER` that returns anonymized recent transactions from all users (masked names, amounts, types) without exposing raw user data. The Dashboard will call this RPC instead of querying the transactions table directly for the marquee.

**New RPC `get_recent_activity`:**
- Returns the latest 50 approved transactions (withdrawals, deposits, commissions) across all users
- Returns masked display names (first 3 chars + "***@gmail.com")
- Accessible to authenticated users

**Changes to `src/pages/Dashboard.tsx`:**
- Replace direct transaction queries in `fetchRealActivityData` with a call to the new `get_recent_activity` RPC
- The rest of the marquee rotation logic stays the same

---

## Technical Summary

| Area | File/Function | Change |
|------|--------------|--------|
| Dynamic withdrawal fees | `Withdraw.tsx` | Fetch credit_score, show dynamic fee and min |
| Dynamic withdrawal minimum | `submit_withdrawal` RPC | Use credit-score-based minimum |
| Redeem code scaling | `Redeem.tsx` | Scale reward by credit_score/100 |
| Ban reason | `AdminUserDetail.tsx` | Add reason textarea + quick buttons |
| Ban reason in DB | `ban_user` RPC | Add p_reason parameter, include in notification |
| Global marquee | New `get_recent_activity` RPC | Security definer function returning anonymized data |
| Global marquee | `Dashboard.tsx` | Call RPC instead of direct table query |

