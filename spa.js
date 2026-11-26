/* ============================================================
   FIXWELL - IN-APP VIEWS (hash router)
   Routes: #/ #/auth #/book #/subscribe #/dashboard #/artisan #/admin
   ============================================================ */

const STATUSES = ["received", "assigned", "quote_sent", "in_progress", "completed"];
const STATUS_LABEL = {
  received: "Received", assigned: "Artisan assigned", quote_sent: "Quote sent",
  in_progress: "In progress", completed: "Completed", cancelled: "Cancelled",
};

function parseRoute() {
  const h = location.hash || "#/";
  if (!h.startsWith("#/")) return { name: "landing", query: {} };
  const [path, qs] = h.slice(2).split("?");
  const query = {};
  (qs || "").split("&").forEach(kv => {
    if (!kv) return;
    const [k, v] = kv.split("=");
    query[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return { name: path || "landing", query };
}

function showLanding() {
  document.getElementById("appView").hidden = true;
  document.getElementById("landing").hidden = false;
}
function showApp(html) {
  document.getElementById("landing").hidden = true;
  const v = document.getElementById("appView");
  v.hidden = false;
  document.getElementById("appContent").innerHTML = html;
  window.scrollTo(0, 0);
}

function toast(msg, isErr) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => t.classList.remove("show"), 3200);
}

function badge(status) {
  return `<span class="status-badge st-${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

function timeline(status) {
  if (status === "cancelled") return `<div class="timeline cancelled">Booking cancelled</div>`;
  const idx = STATUSES.indexOf(status);
  return `<div class="timeline">` + STATUSES.map((s, i) =>
    `<div class="tl-step${i <= idx ? " done" : ""}"><span class="tl-dot"></span><span class="tl-label">${STATUS_LABEL[s]}</span></div>`
  ).join("") + `</div>`;
}

function svcIcon(name) {
  const s = CONFIG.services.find(x => x.name === name);
  return s ? s.icon : "🧰";
}

/* ================= AUTH VIEW ================= */
let authMode = "signup";
let authRole = "customer";

function authView(query) {
  if (query && query.role) authRole = query.role === "artisan" ? "artisan" : "customer";
  const isUp = authMode === "signup";
  showApp(`
    <div class="auth-card">
      <a href="#/" class="app-back nav-route">← Back to site</a>
      <h2>${isUp ? "Create your free account" : "Welcome back"}</h2>
      <p class="app-sub">${isUp ? "Book artisans or find work, all in one place." : "Sign in to your Fixwell account."}</p>
      <div class="auth-tabs">
        <button class="auth-tab${isUp ? " active" : ""}" data-authmode="signup">Create account</button>
        <button class="auth-tab${!isUp ? " active" : ""}" data-authmode="signin">Sign in</button>
      </div>
      ${isUp ? `
      <div class="role-pick">
        <button class="role-btn${authRole === "customer" ? " active" : ""}" data-role="customer">
          <span>🏠</span><b>I'm a customer</b><small>I need things fixed</small>
        </button>
        <button class="role-btn${authRole === "artisan" ? " active" : ""}" data-role="artisan">
          <span>🛠️</span><b>I'm an artisan</b><small>I want job leads</small>
        </button>
      </div>` : ""}
      <form id="authForm">
        ${isUp ? `<label>Full name<input type="text" id="authName" required placeholder="Your name"></label>` : ""}
        <label>Email<input type="email" id="authEmail" required placeholder="you@example.com"></label>
        <label>Password<input type="password" id="authPass" required minlength="6" placeholder="At least 6 characters"></label>
        ${isUp ? `<label>Your city
          <select id="authCity">${CONFIG.cities.map(c => `<option${c === city ? " selected" : ""}>${c}</option>`).join("")}</select>
        </label>` : ""}
        <button type="submit" class="btn btn-primary btn-block" id="authSubmit">${isUp ? "Create account" : "Sign in"}</button>
      </form>
      <p class="modal-note">Free forever for customers. No card needed.</p>
    </div>`);

  document.querySelectorAll("[data-authmode]").forEach(b => b.addEventListener("click", () => {
    authMode = b.dataset.authmode; authView();
  }));
  document.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => {
    authRole = b.dataset.role; authView();
  }));
  document.getElementById("authForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("authSubmit");
    btn.disabled = true; btn.textContent = "Please wait…";
    try {
      if (authMode === "signup") {
        await DB.signUp(
          document.getElementById("authEmail").value.trim(),
          document.getElementById("authPass").value,
          document.getElementById("authName").value.trim(),
          authRole,
          document.getElementById("authCity").value
        );
        toast("Account created. Welcome to Fixwell!");
      } else {
        await DB.signIn(
          document.getElementById("authEmail").value.trim(),
          document.getElementById("authPass").value
        );
        toast("Signed in.");
      }
      await routeAfterLogin();
    } catch (err) {
      toast(err.message || "Something went wrong", true);
      btn.disabled = false; btn.textContent = authMode === "signup" ? "Create account" : "Sign in";
    }
  });
}

async function routeAfterLogin() {
  await renderNavAuth();
  const p = await DB.profile();
  if (p && p.is_admin) { location.hash = "#/admin"; return; }
  if (p && p.role === "artisan") { location.hash = "#/artisan"; return; }
  location.hash = "#/dashboard";
}

/* ================= NAV AUTH ================= */
async function renderNavAuth() {
  const slot = document.getElementById("navAuth");
  const u = await DB.user();
  if (!u) {
    slot.innerHTML = `<a href="#/auth" class="btn btn-primary btn-sm nav-route">Sign in / Join</a>`;
    return;
  }
  const p = await DB.profile();
  const dash = p && p.is_admin ? "#/admin" : (p && p.role === "artisan" ? "#/artisan" : "#/dashboard");
  slot.innerHTML = `
    <a href="${dash}" class="nav-route nav-dash">👤 ${esc((p && p.full_name) || "My account")}</a>
    <button class="btn btn-outline btn-sm" id="navSignOut">Sign out</button>`;
  document.getElementById("navSignOut").addEventListener("click", async () => {
    await DB.signOut();
    await renderNavAuth();
    toast("Signed out.");
    location.hash = "#/";
  });
  slot.querySelectorAll(".nav-route").forEach(a => a.addEventListener("click", closeMobileNav));
}

/* ================= BOOKING VIEW ================= */
async function bookView(query) {
  const u = await DB.user();
  if (!u) { authMode = "signup"; authRole = "customer"; location.hash = "#/auth"; return; }
  const svcIdx = query.service != null ? +query.service : null;
  const urgent = query.urgent === "1";
  showApp(`
    <div class="panel-card">
      <a href="#/" class="app-back nav-route">← Back to site</a>
      <h2>${urgent ? "🚨 Emergency booking" : "🔧 Book a handyman"}</h2>
      <p class="app-sub">Send your request and track it in your account. A booking reference is created automatically.</p>
      <form id="bookFormApp">
        <label>Service
          <select id="bkService">${CONFIG.services.map((s, i) =>
            `<option value="${esc(s.name)}"${i === svcIdx ? " selected" : ""}>${s.icon} ${esc(s.name)}</option>`).join("")}
            <option value="Other"${svcIdx == null ? " selected" : ""}>🧰 Other / not sure</option>
          </select>
        </label>
        <label>City
          <select id="bkCity">${CONFIG.cities.map(c => `<option${c === city ? " selected" : ""}>${c}</option>`).join("")}</select>
        </label>
        <label>Area / neighbourhood<input type="text" id="bkArea" required placeholder="e.g. GRA, Phase 2"></label>
        <label>Phone / WhatsApp number<input type="tel" id="bkPhone" required placeholder="e.g. 0803 000 0000"></label>
        <p class="modal-note">Your number stays hidden until an artisan accepts your job or unlocks it with a credit.</p>
        <label>How urgent is it?
          <select id="bkUrgency">
            <option${urgent ? "" : " selected"}>Flexible, this week is fine</option>
            <option>Soon, within 1 to 2 days</option>
            <option${urgent ? " selected" : ""}>EMERGENCY, today</option>
          </select>
        </label>
        <label>Describe the job<textarea id="bkDesc" rows="4" required placeholder="e.g. Kitchen tap is leaking and needs replacement"></textarea></label>
        <button type="submit" class="btn btn-primary btn-block" id="bkSubmit">Send booking request</button>
      </form>
    </div>`);
  document.getElementById("bookFormApp").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("bkSubmit");
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const b = await DB.createBooking({
        service: document.getElementById("bkService").value,
        city: document.getElementById("bkCity").value,
        area: document.getElementById("bkArea").value.trim(),
        urgency: document.getElementById("bkUrgency").value,
        description: document.getElementById("bkDesc").value.trim(),
        phone: document.getElementById("bkPhone").value.trim(),
      });
      showApp(`
        <div class="panel-card center">
          <span class="popup-emoji">✅</span>
          <h2>Booking received</h2>
          <p class="app-sub">Your reference is <b class="ref-chip">${esc(b.ref)}</b></p>
          <p>Screened artisans in ${esc(b.city)} can now see your job. You will see every status change in your dashboard.</p>
          <a href="#/dashboard" class="btn btn-primary nav-route">Track it in my dashboard →</a>
        </div>`);
    } catch (err) {
      toast(err.message || "Could not send booking", true);
      btn.disabled = false; btn.textContent = "Send booking request";
    }
  });
}

/* ================= CUSTOMER DASHBOARD ================= */
async function dashboardView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  const [bookings, subs, walletBal] = await Promise.all([DB.myBookings(), DB.mySubscriptions(), DB.walletBalance()]);
  const activeSub = subs.find(s => s.status === "active");

  const rows = await Promise.all(bookings.map(async b => {
    const reviewed = b.status === "completed" ? await DB.myReviewFor(b.id) : false;
    return `
    <div class="job-card">
      <div class="job-head">
        <span class="svc-icon">${svcIcon(b.service)}</span>
        <div class="job-title"><b>${esc(b.service)}</b><span class="job-meta">${esc(b.city)} · ${esc(b.area)} · ${new Date(b.created_at).toLocaleDateString()}</span></div>
        <span class="ref-chip">${esc(b.ref)}</span>
        ${badge(b.status)}
      </div>
      <p class="job-desc">${esc(b.description)}</p>
      <p class="job-meta">Urgency: ${esc(b.urgency)}${b.artisan_name ? " · Artisan: " + esc(b.artisan_name) : ""}</p>
      ${timeline(b.status)}
      ${b.status === "quote_sent" ? `
        <div class="quote-box">
          <div><b>Quote from ${esc(b.artisan_name || "artisan")}</b><span class="quote-amount">${fmt(b.quote_amount)}</span></div>
          <div class="quote-actions">
            <button class="btn btn-primary btn-sm" data-approve="${b.id}">Approve quote</button>
            <button class="btn btn-outline btn-sm" data-cancel="${b.id}">Decline</button>
          </div>
        </div>` : ""}
      ${b.status === "received" ? `<button class="btn btn-outline btn-sm" data-cancel="${b.id}">Cancel booking</button>` : ""}
      ${b.artisan_id ? `<a href="#/chat?booking=${b.id}" class="btn btn-outline btn-sm nav-route">💬 Messages</a>` : ""}
      ${b.status === "completed" && !reviewed ? `
        <form class="review-form" data-review="${b.id}" data-service="${esc(b.service)}" data-city="${esc(b.city)}">
          <b>How did it go? Leave a review</b>
          <div class="star-row">${[1,2,3,4,5].map(n => `<button type="button" class="star" data-star="${n}">☆</button>`).join("")}</div>
          <input type="hidden" class="rating-val" value="0">
          <textarea rows="2" required placeholder="A sentence or two about the work" class="review-text-input"></textarea>
          <button type="submit" class="btn btn-primary btn-sm">Post review</button>
        </form>` : ""}
      ${b.status === "completed" && reviewed ? `<p class="job-meta">⭐ Thanks for reviewing this job.</p>` : ""}
    </div>`;
  }));

  showApp(`
    <div class="dash">
      <div class="dash-head">
        <div>
          <h2>My bookings</h2>
          <p class="app-sub">Welcome back, ${esc(p.full_name)} · ${esc(p.city)}</p>
        </div>
        <a href="#/book" class="btn btn-primary nav-route">+ New booking</a>
      </div>
      ${activeSub ? `<div class="sub-strip">🗓️ Active plan: <b>${esc(activeSub.plan)}</b> (${esc(activeSub.billing)}, ${fmt(activeSub.amount)}) <a href="#plans" class="nav-anchor">Change</a></div>` : ""}
      <div class="sub-strip">🪙 Credit wallet: <b>${walletBal} credit${walletBal === 1 ? "" : "s"}</b> <a href="#/credits" class="nav-route">Buy credits</a></div>
      ${bookings.length ? rows.join("") : `
        <div class="empty-card">
          <span class="popup-emoji">🧰</span>
          <p><b>No bookings yet.</b></p>
          <p>When you book a job it shows up here with live status updates.</p>
          <a href="#/book" class="btn btn-primary nav-route">Book your first job</a>
        </div>`}
    </div>`);

  document.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.approveQuote(b.dataset.approve); toast("Quote approved. Work can start."); dashboardView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-cancel]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.cancelBooking(b.dataset.cancel); toast("Booking cancelled."); dashboardView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll(".review-form").forEach(f => {
    f.querySelectorAll(".star").forEach(s => s.addEventListener("click", () => {
      f.querySelector(".rating-val").value = s.dataset.star;
      f.querySelectorAll(".star").forEach(x => x.textContent = +x.dataset.star <= +s.dataset.star ? "★" : "☆");
    }));
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const rating = +f.querySelector(".rating-val").value;
      if (!rating) { toast("Tap the stars to rate first", true); return; }
      try {
        await DB.addReview({
          booking_id: f.dataset.review, service: f.dataset.service, city: f.dataset.city,
          rating, comment: f.querySelector(".review-text-input").value.trim(),
        });
        toast("Review posted. Thank you!");
        renderReviews();
        dashboardView();
      } catch (err) { toast(err.message, true); }
    });
  });
}

/* ================= SUBSCRIBE VIEW ================= */
async function subscribeView(query) {
  const u = await DB.user();
  if (!u) { authMode = "signup"; authRole = "customer"; location.hash = "#/auth"; return; }
  const plan = CONFIG.plans[+query.plan || 0];
  const billing = query.billing === "annual" ? "annual" : "monthly";
  const amount = billing === "annual"
    ? Math.round(plan.monthly * 12 * (100 - CONFIG.annualSavingsPct) / 100)
    : plan.monthly;
  showApp(`
    <div class="panel-card center">
      <a href="#plans" class="app-back nav-anchor">← All plans</a>
      <span class="popup-emoji">🗓️</span>
      <h2>${esc(plan.name)}</h2>
      <p class="app-sub">${esc(plan.desc)}</p>
      <div class="plan-price big">${fmt(amount)}<small>/${billing === "annual" ? "year" : "month"}</small></div>
      <ul class="confirm-list">${plan.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <button class="btn btn-primary btn-block" id="subConfirm">Confirm subscription</button>
      <p class="modal-note">No card needed now. Payment is arranged with you after sign-up.</p>
    </div>`);
  document.getElementById("subConfirm").addEventListener("click", async e => {
    e.target.disabled = true; e.target.textContent = "Saving…";
    try {
      await DB.subscribePlan(plan.name, billing, amount);
      toast("Subscription active: " + plan.name);
      location.hash = "#/dashboard";
    } catch (err) {
      toast(err.message, true);
      e.target.disabled = false; e.target.textContent = "Confirm subscription";
    }
  });
}

/* ================= ARTISAN VIEW ================= */
async function artisanView(query) {
  const u = await DB.user();
  if (!u) { authMode = "signup"; authRole = "artisan"; location.hash = "#/auth"; return; }
  const p = await DB.profile();
  const app = await DB.myApplication();
  const membership = await DB.myMembership();

  if (!app) {
    showApp(`
      <div class="panel-card">
        <a href="#/" class="app-back nav-route">← Back to site</a>
        <h2>💼 Artisan application</h2>
        <p class="app-sub">Tell us about your trade. We review every application before artisans take jobs.</p>
        <form id="applyFormApp">
          <label>Your trade
            <select id="apTrade">${CONFIG.services.map(s => `<option>${esc(s.name)}</option>`).join("")}<option>Other trade</option></select>
          </label>
          <label>Years of experience
            <select id="apExp"><option>1 to 3 years</option><option>3 to 5 years</option><option>5 to 10 years</option><option>10+ years</option></select>
          </label>
          <label>Area you cover<input type="text" id="apArea" required placeholder="e.g. ${esc(p.city)} and around"></label>
          <button type="submit" class="btn btn-primary btn-block" id="apSubmit">Submit application</button>
        </form>
        <p class="modal-note">Free to apply. We reply in the app after screening.</p>
      </div>`);
    document.getElementById("applyFormApp").addEventListener("submit", async e => {
      e.preventDefault();
      const btn = document.getElementById("apSubmit");
      btn.disabled = true; btn.textContent = "Submitting…";
      try {
        await DB.applyArtisan({
          trade: document.getElementById("apTrade").value,
          experience: document.getElementById("apExp").value,
          area: document.getElementById("apArea").value.trim(),
        });
        toast("Application sent.");
        artisanView({});
      } catch (err) {
        toast(err.message, true);
        btn.disabled = false; btn.textContent = "Submit application";
      }
    });
    return;
  }

  if (app.status === "pending") {
    showApp(`
      <div class="panel-card center">
        <span class="popup-emoji">⏳</span>
        <h2>Application under review</h2>
        <p class="app-sub">Trade: ${esc(app.trade)} · ${esc(app.city)}</p>
        <p>We are checking your details. This page updates as soon as screening is done, so check back here.</p>
      </div>`);
    return;
  }
  if (app.status === "declined") {
    showApp(`
      <div class="panel-card center">
        <span class="popup-emoji">🙏</span>
        <h2>Application not approved this time</h2>
        <p>Thanks for your interest. You can reapply with updated details.</p>
        <button class="btn btn-primary" id="reapply">Reapply</button>
      </div>`);
    document.getElementById("reapply").addEventListener("click", async () => {
      await DB.setApplicationStatus(app.id, "withdrawn");
      location.reload();
    });
    return;
  }

  // approved: leads + membership + credits
  const [leads, walletBal, unlocks] = await Promise.all([DB.listLeads(), DB.walletBalance(), DB.myUnlocks()]);
  const mine = leads.filter(b => b.artisan_id === p.id && !["completed", "cancelled"].includes(b.status));
  const open = leads.filter(b => b.status === "received" && b.city === p.city);
  const prePlan = query.plan != null ? CONFIG.artisanPlans[+query.plan] : null;
  const contacts = {};
  await Promise.all(leads.filter(b => unlocks.has(b.id)).map(async b => {
    contacts[b.id] = await DB.contactFor(b.id);
  }));
  const cost = CONFIG.credits.unlockCost;

  const leadCard = b => {
    const unlocked = unlocks.has(b.id);
    const c = contacts[b.id];
    const contactBit = unlocked && c
      ? `<p class="contact-line">📞 <b>${esc(c.name || "Customer")}</b> · <a href="tel:${esc(c.phone || "")}">${esc(c.phone || "")}</a></p>`
      : `<button class="btn btn-outline btn-sm" data-unlock="${b.id}">🔒 Unlock contact (${cost} credit${cost === 1 ? "" : "s"})</button>`;
    return `
    <div class="job-card">
      <div class="job-head">
        <span class="svc-icon">${svcIcon(b.service)}</span>
        <div class="job-title"><b>${esc(b.service)}</b><span class="job-meta">${esc(b.city)} · ${esc(b.area)} · ${new Date(b.created_at).toLocaleDateString()}</span></div>
        <span class="ref-chip">${esc(b.ref)}</span>
        ${badge(b.status)}
      </div>
      <p class="job-desc">${esc(b.description)}</p>
      <p class="job-meta">Urgency: ${esc(b.urgency)} · Customer: ${esc(b.customer_name || "")}</p>
      ${contactBit}
      ${b.status === "received" ? `<button class="btn btn-primary btn-sm" data-accept="${b.id}">Accept this job</button>` : ""}
      ${b.status === "assigned" ? `
        <form class="quote-form" data-quote="${b.id}">
          <input type="number" min="500" step="100" required placeholder="Your quote in ₦" class="quote-input">
          <button type="submit" class="btn btn-primary btn-sm">Send quote</button>
        </form>` : ""}
      ${b.status === "in_progress" ? `<button class="btn btn-primary btn-sm" data-complete="${b.id}">Mark job completed</button>` : ""}
      ${b.artisan_id === p.id ? `<a href="#/chat?booking=${b.id}" class="btn btn-outline btn-sm nav-route">💬 Messages</a>` : ""}
      ${b.status === "quote_sent" ? `<p class="job-meta">Quote of ${fmt(b.quote_amount)} sent. Waiting for the customer to approve.</p>` : ""}
    </div>`;
  };

  showApp(`
    <div class="dash">
      <div class="dash-head">
        <div>
          <h2>Artisan dashboard</h2>
          <p class="app-sub">${esc(p.full_name)} · ${esc(app.trade)} · ${esc(p.city)} · <span class="status-badge st-approved">Approved</span></p>
        </div>
      </div>
      <div class="sub-strip">💳 Membership: <b>${membership ? esc(membership.plan) : "Starter (free)"}</b> ${membership ? "" : `<a href="#artisans" class="nav-anchor">Upgrade</a>`}</div>
      <div class="sub-strip">🪙 Credit wallet: <b>${walletBal} credit${walletBal === 1 ? "" : "s"}</b> <a href="#/credits" class="nav-route">Buy credits</a></div>
      ${prePlan && (!membership || membership.plan !== prePlan.name) ? `
        <div class="sub-strip">Picked plan: <b>${esc(prePlan.name)}</b> (${esc(prePlan.price)} ${esc(prePlan.period)})
          <button class="btn btn-primary btn-sm" id="confirmPlan" data-plan="${esc(prePlan.name)}" data-amount="${prePlan.amount}">Confirm plan</button>
        </div>` : ""}
      <h3 class="dash-sec">Open jobs in ${esc(p.city)} (${open.length})</h3>
      ${open.length ? open.map(leadCard).join("") : `<p class="app-sub">No open jobs right now. New bookings appear here automatically.</p>`}
      <h3 class="dash-sec">My active jobs (${mine.length})</h3>
      ${mine.length ? mine.map(leadCard).join("") : `<p class="app-sub">Jobs you accept show up here.</p>`}
    </div>`);

  const cp = document.getElementById("confirmPlan");
  if (cp) cp.addEventListener("click", async () => {
    try { await DB.chooseMembership(cp.dataset.plan, +cp.dataset.amount); toast("Plan active: " + cp.dataset.plan); artisanView({}); }
    catch (e) { toast(e.message, true); }
  });
  document.querySelectorAll("[data-accept]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.acceptBooking(b.dataset.accept); toast("Job accepted. Send your quote."); artisanView({}); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll(".quote-form").forEach(f => f.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await DB.sendQuote(f.dataset.quote, +f.querySelector(".quote-input").value);
      toast("Quote sent to the customer."); artisanView({});
    } catch (err) { toast(err.message, true); }
  }));
  document.querySelectorAll("[data-complete]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.completeBooking(b.dataset.complete); toast("Marked completed. Nice work!"); artisanView({}); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-unlock]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      const r = await DB.unlockContact(b.dataset.unlock, CONFIG.credits.unlockCost);
      toast(r.charged ? `Contact unlocked for ${r.charged} credit${r.charged === 1 ? "" : "s"}.` : "Contact unlocked.");
      artisanView({});
    } catch (e) {
      b.disabled = false;
      if (/not enough credits/i.test(e.message || "")) {
        toast("Not enough credits. Top up your wallet first.", true);
        location.hash = "#/credits";
      } else {
        toast(e.message, true);
      }
    }
  }));
}

/* ================= MESSAGING (one thread per booking) ================= */
let chatTimer = null;

async function chatView(query) {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  let b;
  try { b = await DB.getBooking(query.booking); } catch (e) { b = null; }
  const isParty = b && (p.is_admin || b.customer_id === p.id || b.artisan_id === p.id);
  if (!isParty) {
    showApp(`<div class="panel-card center"><h2>No access</h2><p>This conversation belongs to a booking you are not part of.</p><a href="#/" class="btn btn-primary nav-route">Back to site</a></div>`);
    return;
  }
  const other = b.customer_id === p.id ? (b.artisan_name || "the artisan") : (b.customer_name || "the customer");
  const back = p.is_admin ? "#/admin" : (b.customer_id === p.id ? "#/dashboard" : "#/artisan");

  async function paint() {
    const msgs = await DB.listMessages(b.id);
    const list = document.getElementById("chatList");
    if (!list) return; // navigated away
    list.innerHTML = msgs.length ? msgs.map(m => `
      <div class="msg ${m.sender_id === p.id ? "mine" : "theirs"}">
        <div class="msg-body">${esc(m.body)}</div>
        <small>${esc(m.sender_name || "")} · ${new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
      </div>`).join("") : `<p class="app-sub center" style="margin-top:24px">No messages yet. Say hello to ${esc(other)}.</p>`;
    list.scrollTop = list.scrollHeight;
  }

  showApp(`
    <div class="panel-card chat-card">
      <a href="${back}" class="app-back nav-route">← Back</a>
      <h2>💬 ${esc(b.service)} · ${esc(b.ref)}</h2>
      <p class="app-sub">Chat with ${esc(other)} about this job.</p>
      <div class="chat-list" id="chatList"></div>
      <form id="chatForm" class="chat-form">
        <input type="text" id="chatInput" required maxlength="500" placeholder="Type a message…" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Send</button>
      </form>
    </div>`);
  await paint();

  clearInterval(chatTimer);
  chatTimer = setInterval(() => {
    if (!location.hash.startsWith("#/chat")) { clearInterval(chatTimer); return; }
    paint().catch(() => {});
  }, 8000);

  document.getElementById("chatForm").addEventListener("submit", async e => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const body = input.value.trim();
    if (!body) return;
    input.disabled = true;
    try {
      await DB.sendMessage(b.id, body);
      input.value = "";
      await paint();
    } catch (err) { toast(err.message, true); }
    input.disabled = false;
    input.focus();
  });
}

/* ================= CREDITS / WALLET VIEW ================= */
let paystackLoading = null;
function loadPaystack() {
  if (window.PaystackPop) return Promise.resolve();
  if (!paystackLoading) {
    paystackLoading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      s.onload = res;
      s.onerror = () => rej(new Error("Could not load the payment page. Check your connection and retry."));
      document.head.appendChild(s);
    });
  }
  return paystackLoading;
}

async function verifyPurchase(reference) {
  try {
    const tok = await DB.sessionToken();
    const res = await fetch(CONFIG.supabase.url + "/functions/v1/verify-paystack", {
      method: "POST",
      headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    const out = await res.json();
    if (out.ok) { toast("Payment confirmed. Credits added to your wallet."); creditsView(); }
    else toast(out.error || "Verification pending - your credits land shortly.", true);
  } catch (e) {
    toast("Verification pending - if you paid, the credits land shortly.", true);
  }
}

async function paystackCheckout(pkg) {
  const u = await DB.user();
  const ref = "FWCR-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  await DB.purchaseCredits(pkg, ref);
  await loadPaystack();
  window.PaystackPop.setup({
    key: CONFIG.paystack.publicKey,
    email: u.email,
    amount: pkg.priceNGN * 100,
    currency: "NGN",
    ref,
    callback: r => verifyPurchase(r.reference),
    onClose: () => toast("Checkout closed. If you completed payment, your credits land shortly."),
  }).openIframe();
}

async function creditsView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  const [bal, txs] = await Promise.all([DB.walletBalance(), DB.myTransactions()]);
  const home = p.role === "artisan" ? "#/artisan" : "#/dashboard";
  const payLive = !!CONFIG.paystack.publicKey;

  const txRow = t => `
    <div class="tx-row">
      <span class="tx-kind">${t.kind === "purchase" ? "🛒" : t.kind === "spend" ? "🔓" : "⚙️"}</span>
      <div class="tx-main">
        <b>${esc(t.note || (t.kind === "purchase" ? "Credit purchase" : t.kind === "spend" ? "Contact unlock" : "Adjustment"))}</b>
        <small>${new Date(t.created_at).toLocaleString()}${t.price_ngn ? " · " + fmt(t.price_ngn) : ""}${t.status === "pending" ? " · awaiting approval" : t.status === "rejected" ? " · declined" : ""}</small>
      </div>
      <span class="tx-amt ${t.credits > 0 ? "in" : "out"}">${t.credits > 0 ? "+" : ""}${t.credits}</span>
    </div>`;

  showApp(`
    <div class="dash">
      <div class="dash-head">
        <div><h2>Credit wallet</h2><p class="app-sub">${esc(p.full_name)} · credits unlock customer contacts on job leads.</p></div>
        <a href="${home}" class="btn btn-outline btn-sm nav-route">← Back</a>
      </div>
      <div class="wallet-hero">
        <span class="wallet-bal">${bal}</span>
        <span class="wallet-label">credit${bal === 1 ? "" : "s"} available · unlocking a customer contact costs ${CONFIG.credits.unlockCost} credit${CONFIG.credits.unlockCost === 1 ? "" : "s"}</span>
      </div>
      ${!payLive ? `<div class="testmode-banner">⚠️ TEST MODE - no payment is taken. You pick a pack, the Fixwell team confirms it manually, and the credits land in your wallet.</div>` : ""}
      <h3 class="dash-sec">Buy credits</h3>
      <div class="credit-packs">
        ${CONFIG.credits.packages.map((k, i) => `
          <div class="credit-pack${k.popular ? " popular" : ""}">
            ${k.popular ? `<span class="pack-badge">Popular</span>` : ""}
            <b class="pack-credits">${k.credits}</b>
            <span class="pack-label">${esc(k.label)} pack</span>
            <span class="pack-price">${fmt(k.priceNGN)}</span>
            <button class="btn btn-primary btn-sm" data-buy="${i}">Get ${k.credits} credits</button>
          </div>`).join("")}
      </div>
      <h3 class="dash-sec">History</h3>
      ${txs.length ? txs.map(txRow).join("") : `<p class="app-sub">No credit activity yet.</p>`}
    </div>`);

  document.querySelectorAll("[data-buy]").forEach(b => b.addEventListener("click", async () => {
    const pkg = CONFIG.credits.packages[+b.dataset.buy];
    b.disabled = true; b.textContent = payLive ? "Opening checkout…" : "Sending…";
    try {
      if (payLive) {
        await paystackCheckout(pkg);
        b.disabled = false; b.textContent = `Get ${pkg.credits} credits`;
      } else {
        await DB.purchaseCredits(pkg);
        toast(`Request sent: ${pkg.credits} credits (${fmt(pkg.priceNGN)}). It appears in your history as pending.`);
        creditsView();
      }
    } catch (e) {
      toast(e.message, true);
      b.disabled = false; b.textContent = `Get ${pkg.credits} credits`;
    }
  }));
}

/* ================= ADMIN VIEW ================= */
async function adminView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  if (!p || !p.is_admin) { showApp(`<div class="panel-card center"><h2>Admins only</h2><p>This area is for the Fixwell team.</p><a href="#/" class="btn btn-primary nav-route">Back to site</a></div>`); return; }
  const [apps, bookings, purchases] = await Promise.all([
    DB.listApplications(),
    DB.client.from("bookings").select("*").order("created_at", { ascending: false }).then(r => r.data || []),
    DB.pendingPurchases(),
  ]);
  showApp(`
    <div class="dash">
      <div class="dash-head"><div><h2>Admin</h2><p class="app-sub">Screen artisans and monitor bookings.</p></div></div>
      <h3 class="dash-sec">Artisan applications (${apps.filter(a => a.status === "pending").length} pending)</h3>
      ${apps.length ? apps.map(a => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(a.full_name)}</b><span class="job-meta">${esc(a.trade)} · ${esc(a.city)} · ${esc(a.experience)} · ${esc(a.area)}</span></div>
            ${badge(a.status === "approved" ? "assigned" : a.status === "pending" ? "received" : "cancelled")}
          </div>
          ${a.status === "pending" ? `
            <div class="quote-actions">
              <button class="btn btn-primary btn-sm" data-approve-app="${a.id}">Approve</button>
              <button class="btn btn-outline btn-sm" data-decline-app="${a.id}">Decline</button>
            </div>` : ""}
        </div>`).join("") : `<p class="app-sub">No applications yet.</p>`}
      <h3 class="dash-sec">Credit purchases (${purchases.length} pending)</h3>
      ${!CONFIG.paystack.publicKey ? `<div class="testmode-banner">⚠️ TEST MODE - no payment is processed. Approving a purchase simply credits the wallet.</div>` : ""}
      ${purchases.length ? purchases.map(t => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(t.buyer_name)}</b><span class="job-meta">${t.credits} credits · ${fmt(t.price_ngn || 0)} · ${new Date(t.created_at).toLocaleString()}</span></div>
          </div>
          <div class="quote-actions">
            <button class="btn btn-primary btn-sm" data-approve-tx="${t.id}">Approve & credit wallet</button>
            <button class="btn btn-outline btn-sm" data-reject-tx="${t.id}">Decline</button>
          </div>
        </div>`).join("") : `<p class="app-sub">No pending purchases.</p>`}
      <h3 class="dash-sec">All bookings (${bookings.length})</h3>
      ${bookings.length ? bookings.map(b => `
        <div class="job-card">
          <div class="job-head">
            <span class="svc-icon">${svcIcon(b.service)}</span>
            <div class="job-title"><b>${esc(b.service)}</b><span class="job-meta">${esc(b.city)} · ${esc(b.area)} · by ${esc(b.customer_name || "")}${b.artisan_name ? " · artisan " + esc(b.artisan_name) : ""}</span></div>
            <span class="ref-chip">${esc(b.ref)}</span>
            ${badge(b.status)}
          </div>
        </div>`).join("") : `<p class="app-sub">No bookings yet.</p>`}
    </div>`);
  document.querySelectorAll("[data-approve-app]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.setApplicationStatus(b.dataset.approveApp, "approved"); toast("Artisan approved."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-decline-app]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.setApplicationStatus(b.dataset.declineApp, "declined"); toast("Application declined."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-approve-tx]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.approvePurchase(b.dataset.approveTx); toast("Purchase approved, wallet credited."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-reject-tx]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.rejectPurchase(b.dataset.rejectTx); toast("Purchase declined."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
}

/* ================= ROUTER ================= */
async function router() {
  closeMobileNav();
  clearInterval(chatTimer);
  const r = parseRoute();
  try {
    switch (r.name) {
      case "auth": return authView(r.query);
      case "book": return await bookView(r.query);
      case "subscribe": return await subscribeView(r.query);
      case "dashboard": return await dashboardView();
      case "artisan": return await artisanView(r.query);
      case "credits": return await creditsView();
      case "chat": return await chatView(r.query);
      case "admin": return await adminView();
      default:
        showLanding();
        renderReviews();
    }
  } catch (e) {
    showApp(`<div class="panel-card center"><h2>Something went wrong</h2><p>${esc(e.message || e)}</p><a href="#/" class="btn btn-primary nav-route">Back to site</a></div>`);
  }
}

window.addEventListener("hashchange", router);
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a.nav-route");
  if (a) closeMobileNav();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closePopup(); });

(async function boot() {
  if (!CONFIG.supabase.url) {
    showLanding();
    return;
  }
  DB.init();
  await renderNavAuth();
  router();
})();
