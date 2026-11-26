// ============================================================
// FIXWELL - verify-paystack edge function
//
// Two entry modes:
//  A) User callback: POST { "reference": "FWCR-..." } with the
//     buyer's Supabase session token in the Authorization header.
//     Verifies the charge with Paystack, matches it to the buyer's
//     pending purchase, credits the wallet. Idempotent.
//  B) Paystack webhook: POST with x-paystack-signature header
//     (HMAC SHA512 of the raw body with the secret key). Handles
//     charge.success the same way, so a closed popup still credits.
//
// Secrets (set in Supabase dashboard -> Edge Functions -> Secrets):
//   PAYSTACK_SECRET_KEY = sk_test_... / sk_live_... (vault only)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function paystackVerify(reference: string) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  if (!res.ok) throw new Error("Paystack verification failed");
  const body = await res.json();
  return body.data; // { status, amount (kobo), reference, ... }
}

// Credit the buyer's wallet for a verified charge. Returns a message.
async function settle(sb: ReturnType<typeof createClient>, tx: any, callerUserId: string | null) {
  if (tx.status !== "pending") return "already_handled";
  if (callerUserId && tx.user_id !== callerUserId) throw new Error("This purchase belongs to a different account");

  const paid = await paystackVerify(tx.payment_ref);
  if (paid.status !== "success") throw new Error("Payment not successful");
  if (paid.amount !== (tx.price_ngn || 0) * 100) throw new Error("Amount mismatch");

  const { error: upErr } = await sb.from("credit_transactions").update({ status: "approved" }).eq("id", tx.id).eq("status", "pending");
  if (upErr) throw upErr;
  const { error: crErr } = await sb.rpc("credit_wallet", { p_user: tx.user_id, p_credits: tx.credits });
  if (crErr) throw crErr;
  return "credited";
}

async function hmacHex(key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!PAYSTACK_SECRET) return json({ error: "Payment verification is not configured yet" }, 503);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  try {
    // ---- Mode B: Paystack webhook (signature header present) ----
    const sig = req.headers.get("x-paystack-signature");
    if (sig) {
      const raw = await req.text();
      if (await hmacHex(PAYSTACK_SECRET, raw) !== sig) return json({ error: "Bad signature" }, 401);
      const event = JSON.parse(raw);
      if (event.event !== "charge.success") return json({ ok: true, ignored: event.event });
      const reference = event.data && event.data.reference;
      // Shared Paystack account: events from other flows (e.g. a store)
      // arrive here too. Only Fixwell credit purchases use FWCR- refs;
      // acknowledge everything else immediately without touching it.
      if (!reference || !String(reference).startsWith("FWCR-")) {
        return json({ ok: true, ignored: "not a Fixwell reference" });
      }
      const { data: txs } = await sb.from("credit_transactions")
        .select("*").eq("payment_ref", reference).eq("kind", "purchase").limit(1);
      if (!txs || !txs.length) return json({ ok: true, note: "unknown reference" });
      return json({ ok: true, result: await settle(sb, txs[0], null) });
    }

    // ---- Mode A: buyer callback after inline checkout ----
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Sign in again and retry" }, 401);

    const { reference } = await req.json();
    if (!reference) return json({ error: "Missing reference" }, 400);

    const { data: txs } = await sb.from("credit_transactions")
      .select("*").eq("payment_ref", reference).eq("kind", "purchase").limit(1);
    if (!txs || !txs.length) return json({ error: "Purchase not found" }, 404);

    return json({ ok: true, result: await settle(sb, txs[0], userData.user.id) });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 400);
  }
});
