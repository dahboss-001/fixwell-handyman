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
  async createBooking({ service, city, area, urgency, description, phone }) {
    const p = await this.profile();
    const ref = "FW-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data, error } = await this.client.from("bookings").insert({
      ref, customer_id: p.id, customer_name: p.full_name,
      service, city, area, urgency, description, status: "received",
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
      user_id: p.id, plan, billing, amount, status: "active",
    }).select().single();
    if (error) throw error;
    return data;
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

  // Test-mode purchase: goes in as pending, admin approves manually.
  async purchaseCredits(pkg) {
    const p = await this.profile();
    const { data, error } = await this.client.from("credit_transactions").insert({
      user_id: p.id, kind: "purchase", credits: pkg.credits,
      price_ngn: pkg.priceNGN, status: "pending",
      note: pkg.label + " pack (test mode)",
    }).select().single();
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
};
