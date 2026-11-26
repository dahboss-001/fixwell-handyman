/* ============================================================
   FIXWELL - DATA LAYER
   All app data goes through this module (Supabase).
   ============================================================ */
const DB = {
  client: null,
  _profileCache: null,

  init() {
    this.client = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
    this.client.auth.onAuthStateChange(() => { this._profileCache = null; });
  },

  /* ---------- auth ---------- */
  async signUp(email, password, fullName, role, city) {
    const { data, error } = await this.client.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role, city } },
    });
    if (error) throw error;
    if (data.user) {
      await this.client.from("profiles").upsert({
        id: data.user.id, full_name: fullName, role, city,
      });
      await this.client.from("wallets").upsert({ user_id: data.user.id, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
      this._profileCache = null;
    }
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await this.client.auth.signOut();
    this._profileCache = null;
  },

  async user() {
    const { data } = await this.client.auth.getUser();
    return data.user || null;
  },

  async profile() {
    if (this._profileCache) return this._profileCache;
    const u = await this.user();
    if (!u) return null;
    const { data, error } = await this.client.from("profiles").select("*").eq("id", u.id).single();
    if (error) return null;
    this._profileCache = data;
    return data;
  },

  /* ---------- bookings ---------- */
  async createBooking({ service, city, area, urgency, description, phone, preferredDate, propertyId }) {
    const p = await this.profile();
    const ref = "FW-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data, error } = await this.client.from("bookings").insert({
      ref, customer_id: p.id, customer_name: p.full_name,
      service, city, area, urgency, description, status: "received",
      preferred_date: preferredDate || null,
      property_id: propertyId || null,
    }).select().single();
    if (error) throw error;
    const { error: cErr } = await this.client.from("booking_contacts").insert({
      booking_id: data.id, name: p.full_name, phone,
    });
    if (cErr) throw cErr;
    return data;
  },

  async myBookings() {
    const p = await this.profile();
    const { data, error } = await this.client.from("bookings")
      .select("*").eq("customer_id", p.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listLeads() {
    // Approved artisans see open bookings plus the ones they accepted
    const p = await this.profile();
    const { data, error } = await this.client.from("bookings")
      .select("*").or(`status.eq.received,artisan_id.eq.${p.id}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async acceptBooking(id) {
    const p = await this.profile();
    const { error } = await this.client.from("bookings")
      .update({ artisan_id: p.id, artisan_name: p.full_name, status: "assigned" })
      .eq("id", id).eq("status", "received");
    if (error) throw error;
  },

  async sendQuote(id, amount) {
    const { error } = await this.client.from("bookings")
      .update({ quote_amount: amount, status: "quote_sent" }).eq("id", id);
    if (error) throw error;
  },

  /* ---------- quote comparison (patch-006) ---------- */
  async sendLeadQuote(bookingId, amount, note) {
    const { error } = await this.client.rpc("artisan_send_quote", {
      p_booking: bookingId, p_amount: amount, p_note: note || null,
    });
    if (error) throw error;
  },

  async withdrawQuote(quoteId) {
    const { error } = await this.client.rpc("artisan_withdraw_quote", { p_quote: quoteId });
    if (error) throw error;
  },

  async acceptQuoteCard(quoteId) {
    const { error } = await this.client.rpc("customer_accept_quote", { p_quote: quoteId });
    if (error) throw error;
  },

  async bookingQuotes(bookingId) {
    const { data } = await this.client.from("quotes")
      .select("*").eq("booking_id", bookingId).order("amount", { ascending: true });
    return data || [];
  },

  async myQuotesByBooking() {
    const p = await this.profile();
    const { data } = await this.client.from("quotes")
      .select("*").eq("artisan_id", p.id);
    const map = {};
    (data || []).forEach(q => { if (q.status === "pending") map[q.booking_id] = q; });
    return map;
  },

  async approveQuote(id) {
    const { error } = await this.client.from("bookings")
      .update({ status: "in_progress" }).eq("id", id);
    if (error) throw error;
  },

  async completeBooking(id) {
    const { error } = await this.client.from("bookings")
      .update({ status: "completed" }).eq("id", id);
    if (error) throw error;
  },

  async cancelBooking(id) {
    const { error } = await this.client.from("bookings")
      .update({ status: "cancelled" }).eq("id", id);
    if (error) throw error;
  },

  /* ---------- artisan applications ---------- */
  async applyArtisan({ trade, experience, area }) {
    const p = await this.profile();
    const { data, error } = await this.client.from("artisan_applications").insert({
      user_id: p.id, full_name: p.full_name, trade, experience, area,
      city: p.city, status: "pending",
    }).select().single();
    if (error) throw error;
    return data;
  },

  async myApplication() {
    const p = await this.profile();
    const { data } = await this.client.from("artisan_applications")
      .select("*").eq("user_id", p.id).order("applied_at", { ascending: false }).limit(1);
    return data && data[0] ? data[0] : null;
  },

  async listApplications() {
    const { data, error } = await this.client.from("artisan_applications")
      .select("*").order("applied_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async setApplicationStatus(id, status) {
    const { error } = await this.client.from("artisan_applications").update({ status }).eq("id", id);
    if (error) throw error;
  },

  /* ---------- plans ---------- */
  async subscribePlan(plan, billing, amount) {
    const p = await this.profile();
    const { data, error } = await this.client.from("subscriptions").insert({
      user_id: p.id, plan, billing, amount, status: "requested",
    }).select().single();
    if (error) throw error;
    return data;
  },

  async adminListSubscriptions() {
    const { data } = await this.client.from("subscriptions")
      .select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(50);
    return data || [];
  },

  async adminSetSubscriptionStatus(id, status) {
    const { error } = await this.client.rpc("admin_set_subscription_status", { p_sub: id, p_status: status });
    if (error) throw error;
  },

  /* ---------- properties & service history ---------- */
  async myProperties() {
    const p = await this.profile();
    const { data } = await this.client.from("properties")
      .select("*").eq("user_id", p.id).order("created_at", { ascending: true });
    return data || [];
  },

  async addProperty({ label, address, type, notes }) {
    const p = await this.profile();
    const { error } = await this.client.from("properties").insert({
      user_id: p.id, label, address, type, notes,
    });
    if (error) throw error;
  },

  async myServiceHistory() {
    const p = await this.profile();
    const { data } = await this.client.from("service_history")
      .select("*").eq("user_id", p.id).order("done_at", { ascending: false });
    return data || [];
  },

  async addHistoryEntry(propertyId, service, summary, doneAt) {
    const p = await this.profile();
    const { error } = await this.client.from("service_history").insert({
      user_id: p.id, property_id: propertyId, service, summary,
      done_at: doneAt || new Date().toISOString(),
    });
    if (error) throw error;
  },

  async mySubscriptions() {
    const p = await this.profile();
    const { data } = await this.client.from("subscriptions")
      .select("*").eq("user_id", p.id).order("created_at", { ascending: false });
    return data || [];
  },

  async chooseMembership(plan, amount) {
    const p = await this.profile();
    const { data, error } = await this.client.from("memberships").insert({
      user_id: p.id, plan, amount, status: "active",
    }).select().single();
    if (error) throw error;
    return data;
  },

  async myMembership() {
    const p = await this.profile();
    const { data } = await this.client.from("memberships")
      .select("*").eq("user_id", p.id).order("created_at", { ascending: false }).limit(1);
    return data && data[0] ? data[0] : null;
  },

  /* ---------- credits & contact unlocks ---------- */
  async walletBalance() {
    const p = await this.profile();
    const { data } = await this.client.from("wallets").select("balance").eq("user_id", p.id).limit(1);
    return data && data[0] ? data[0].balance : 0;
  },

  async myTransactions() {
    const p = await this.profile();
    const { data, error } = await this.client.from("credit_transactions")
      .select("*").eq("user_id", p.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  },

  // Purchase: goes in as pending. In test mode an admin approves it
  // manually; with Paystack live it carries a payment reference and the
  // verify-paystack edge function settles it after a verified charge.
  async purchaseCredits(pkg, paymentRef) {
    const p = await this.profile();
    const row = {
      user_id: p.id, kind: "purchase", credits: pkg.credits,
      price_ngn: pkg.priceNGN, status: "pending",
      note: pkg.label + " pack" + (paymentRef ? "" : " (test mode)"),
    };
    if (paymentRef) row.payment_ref = paymentRef;
    const { data, error } = await this.client.from("credit_transactions").insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async sessionToken() {
    const { data } = await this.client.auth.getSession();
    return data.session ? data.session.access_token : null;
  },

  /* ---------- messaging (one thread per booking) ---------- */
  async listMessages(bookingId) {
    const { data, error } = await this.client.from("messages")
      .select("*").eq("booking_id", bookingId).order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendMessage(bookingId, body) {
    const p = await this.profile();
    const { error } = await this.client.from("messages").insert({
      booking_id: bookingId, sender_id: p.id, sender_name: p.full_name, body,
    });
    if (error) throw error;
  },

  async getBooking(id) {
    const { data, error } = await this.client.from("bookings").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async pendingPurchases() {
    const { data, error } = await this.client.from("credit_transactions")
      .select("*").eq("kind", "purchase").eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    // attach buyer names for the admin list
    const ids = [...new Set(rows.map(r => r.user_id))];
    if (!ids.length) return rows;
    const { data: profs } = await this.client.from("profiles").select("id, full_name").in("id", ids);
    const names = {};
    (profs || []).forEach(pr => { names[pr.id] = pr.full_name; });
    rows.forEach(r => { r.buyer_name = names[r.user_id] || "Customer"; });
    return rows;
  },

  async approvePurchase(txId) {
    const { error } = await this.client.rpc("approve_credit_purchase", { p_tx: txId });
    if (error) throw error;
  },

  async rejectPurchase(txId) {
    const { error } = await this.client.rpc("reject_credit_purchase", { p_tx: txId });
    if (error) throw error;
  },

  async myUnlocks() {
    const p = await this.profile();
    const { data } = await this.client.from("contact_unlocks").select("booking_id").eq("user_id", p.id);
    return new Set((data || []).map(r => r.booking_id));
  },

  async contactFor(bookingId) {
    const { data } = await this.client.from("booking_contacts")
      .select("name, phone").eq("booking_id", bookingId).limit(1);
    return data && data[0] ? data[0] : null;
  },

  // Atomic on the server: balance check, deduction, unlock record in one call.
  async unlockContact(bookingId, cost) {
    const { data, error } = await this.client.rpc("spend_credits", { p_booking_id: bookingId, p_cost: cost });
    if (error) throw error;
    return data;
  },

  /* ---------- reviews ---------- */
  async addReview({ booking_id, service, city, rating, comment }) {
    const p = await this.profile();
    const { error } = await this.client.from("reviews").insert({
      booking_id, customer_id: p.id, customer_name: p.full_name,
      service, city, rating, comment,
    });
    if (error) throw error;
  },

  async myReviewFor(bookingId) {
    const { data } = await this.client.from("reviews").select("id").eq("booking_id", bookingId).limit(1);
    return !!(data && data.length);
  },

  async listReviews() {
    const { data, error } = await this.client.from("reviews")
      .select("*").order("created_at", { ascending: false }).limit(12);
    if (error) return [];
    return data || [];
  },

  /* ---------- profile ---------- */
  async updateProfile(fields) {
    const u = await this.user();
    const { error } = await this.client.from("profiles").update(fields).eq("id", u.id);
    if (error) throw error;
    this._profileCache = null;
  },

  /* ---------- notifications ---------- */
  async myNotifications() {
    const { data, error } = await this.client.from("notifications")
      .select("*").order("created_at", { ascending: false }).limit(50);
    if (error) return [];
    return data || [];
  },

  async unreadCount() {
    const { count, error } = await this.client.from("notifications")
      .select("id", { count: "exact", head: true }).eq("read", false);
    if (error) return 0;
    return count || 0;
  },

  async markAllRead() {
    const u = await this.user();
    await this.client.from("notifications").update({ read: true }).eq("user_id", u.id).eq("read", false);
  },

  /* ---------- admin controls ---------- */
  async adminListUsers() {
    const { data, error } = await this.client.from("profiles")
      .select("*").order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
  },

  async adminListApprovedArtisans() {
    const { data, error } = await this.client.from("artisan_applications")
      .select("user_id, full_name, trade, city").eq("status", "approved");
    if (error) return [];
    return data || [];
  },

  async adminAuditLog() {
    const { data, error } = await this.client.from("admin_actions")
      .select("*").order("created_at", { ascending: false }).limit(50);
    if (error) return [];
    return data || [];
  },

  async adminCancelBooking(id, reason) {
    const { error } = await this.client.rpc("admin_cancel_booking", { p_booking: id, p_reason: reason });
    if (error) throw error;
  },

  async adminReassignBooking(id, artisanId, reason) {
    const { error } = await this.client.rpc("admin_reassign_booking", { p_booking: id, p_artisan: artisanId, p_reason: reason });
    if (error) throw error;
  },

  async adminSetSuspended(userId, flag, reason) {
    const { error } = await this.client.rpc("admin_set_suspended", { p_user: userId, p_suspended: flag, p_reason: reason });
    if (error) throw error;
  },

  async adminRemoveReview(id, reason) {
    const { error } = await this.client.rpc("admin_remove_review", { p_review: id, p_reason: reason });
    if (error) throw error;
  },

  async adminAdjustWallet(userId, credits, reason) {
    const { error } = await this.client.rpc("admin_adjust_wallet", { p_user: userId, p_credits: credits, p_reason: reason });
    if (error) throw error;
  },

  /* ---------- job photos (Supabase Storage, private bucket) ---------- */
  async uploadJobPhoto(bookingId, file, kind) {
    const u = await this.user();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${u.id}/${bookingId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await this.client.storage.from("job-photos").upload(path, file, { upsert: false });
    if (error) throw error;
    const { error: rErr } = await this.client.from("booking_photos").insert({
      booking_id: bookingId, uploader_id: u.id, kind, path,
    });
    if (rErr) throw rErr;
    return path;
  },

  async bookingPhotos(bookingId) {
    const { data, error } = await this.client.from("booking_photos")
      .select("*").eq("booking_id", bookingId).order("created_at");
    if (error) return [];
    const out = [];
    for (const row of data || []) {
      const { data: s } = await this.client.storage.from("job-photos").createSignedUrl(row.path, 3600);
      if (s && s.signedUrl) out.push({ ...row, url: s.signedUrl });
    }
    return out;
  },

  /* ---------- artisan: pass on a lead / appointment ---------- */
  async rejectLead(bookingId) {
    const p = await this.profile();
    const { error } = await this.client.from("artisan_rejections").insert({ booking_id: bookingId, artisan_id: p.id });
    if (error) throw error;
  },

  async myRejections() {
    const p = await this.profile();
    const { data } = await this.client.from("artisan_rejections").select("booking_id").eq("artisan_id", p.id);
    return new Set((data || []).map(r => r.booking_id));
  },

  async setAppointment(bookingId, at, note) {
    const { error } = await this.client.from("bookings")
      .update({ appointment_at: at || null, appointment_note: note || null }).eq("id", bookingId);
    if (error) throw error;
  },

  /* ---------- disputes ---------- */
  async fileDispute(bookingId, text) {
    const p = await this.profile();
    const { error } = await this.client.from("disputes").insert({
      user_id: p.id, user_name: p.full_name, booking_id: bookingId || null, text,
    });
    if (error) throw error;
  },

  async myDisputes() {
    const u = await this.user();
    const { data } = await this.client.from("disputes")
      .select("*").eq("user_id", u.id).order("created_at", { ascending: false });
    return data || [];
  },

  async adminListDisputes() {
    const { data } = await this.client.from("disputes")
      .select("*").order("created_at", { ascending: false }).limit(50);
    return data || [];
  },

  async adminResolveDispute(id, note) {
    const { error } = await this.client.rpc("admin_resolve_dispute", { p_dispute: id, p_note: note });
    if (error) throw error;
  },

  async adminAllReviews() {
    const { data, error } = await this.client.from("reviews")
      .select("*").order("created_at", { ascending: false }).limit(50);
    if (error) return [];
    return data || [];
  },
};
