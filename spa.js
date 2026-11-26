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
  const [bookings, subs] = await Promise.all([DB.myBookings(), DB.mySubscriptions()]);
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

  // approved: leads + membership
  const leads = await DB.listLeads();
  const mine = leads.filter(b => b.artisan_id === p.id && !["completed", "cancelled"].includes(b.status));
  const open = leads.filter(b => b.status === "received" && b.city === p.city);
  const prePlan = query.plan != null ? CONFIG.artisanPlans[+query.plan] : null;

  const leadCard = b => `
    <div class="job-card">
      <div class="job-head">
        <span class="svc-icon">${svcIcon(b.service)}</span>
        <div class="job-title"><b>${esc(b.service)}</b><span class="job-meta">${esc(b.city)} · ${esc(b.area)} · ${new Date(b.created_at).toLocaleDateString()}</span></div>
        <span class="ref-chip">${esc(b.ref)}</span>
        ${badge(b.status)}
      </div>
      <p class="job-desc">${esc(b.description)}</p>
      <p class="job-meta">Urgency: ${esc(b.urgency)} · Customer: ${esc(b.customer_name || "")}</p>
      ${b.status === "received" ? `<button class="btn btn-primary btn-sm" data-accept="${b.id}">Accept this job</button>` : ""}
      ${b.status === "assigned" ? `
        <form class="quote-form" data-quote="${b.id}">
          <input type="number" min="500" step="100" required placeholder="Your quote in ₦" class="quote-input">
          <button type="submit" class="btn btn-primary btn-sm">Send quote</button>
        </form>` : ""}
      ${b.status === "in_progress" ? `<button class="btn btn-primary btn-sm" data-complete="${b.id}">Mark job completed</button>` : ""}
      ${b.status === "quote_sent" ? `<p class="job-meta">Quote of ${fmt(b.quote_amount)} sent. Waiting for the customer to approve.</p>` : ""}
    </div>`;

  showApp(`
    <div class="dash">
      <div class="dash-head">
        <div>
          <h2>Artisan dashboard</h2>
          <p class="app-sub">${esc(p.full_name)} · ${esc(app.trade)} · ${esc(p.city)} · <span class="status-badge st-approved">Approved</span></p>
        </div>
      </div>
      <div class="sub-strip">💳 Membership: <b>${membership ? esc(membership.plan) : "Starter (free)"}</b> ${membership ? "" : `<a href="#artisans" class="nav-anchor">Upgrade</a>`}</div>
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
}

/* ================= ADMIN VIEW ================= */
async function adminView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  if (!p || !p.is_admin) { showApp(`<div class="panel-card center"><h2>Admins only</h2><p>This area is for the Fixwell team.</p><a href="#/" class="btn btn-primary nav-route">Back to site</a></div>`); return; }
  const [apps, bookings] = await Promise.all([DB.listApplications(), DB.listLeads ? DB.client.from("bookings").select("*").order("created_at", { ascending: false }).then(r => r.data || []) : []]);
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
}

/* ================= ROUTER ================= */
async function router() {
  closeMobileNav();
  const r = parseRoute();
  try {
    switch (r.name) {
      case "auth": return authView(r.query);
      case "book": return await bookView(r.query);
      case "subscribe": return await subscribeView(r.query);
      case "dashboard": return await dashboardView();
      case "artisan": return await artisanView(r.query);
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
