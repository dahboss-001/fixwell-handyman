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
  async createBooking({ service, city, area, urgency, description }) {
    const p = await this.profile();
    const ref = "FW-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data, error } = await this.client.from("bookings").insert({
      ref, customer_id: p.id, customer_name: p.full_name,
      service, city, area, urgency, description, status: "received",
    }).select().single();
    if (error) throw error;
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
