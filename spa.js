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
    <a href="#/notifications" class="nav-route nav-bell" id="navBell" title="Notifications">🔔<span class="notif-badge" id="notifBadge" hidden></span></a>
    <a href="${dash}" class="nav-route nav-dash">👤 ${esc((p && p.full_name) || "My account")}</a>
    <a href="#/profile" class="nav-route nav-gear" title="My profile">⚙️</a>
    <button class="btn btn-outline btn-sm" id="navSignOut">Sign out</button>`;
  updateNotifBadge();
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
  let props = [];
  try { props = await DB.myProperties(); } catch (e) { /* properties feature may not be enabled yet */ }
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
        ${props.length ? `
        <label>Which property? (optional)
          <select id="bkProp">
            <option value="">No property selected</option>
            ${props.map(p => `<option value="${p.id}">${esc(p.label)} - ${esc(p.address)}</option>`).join("")}
          </select>
        </label>
        <p class="modal-note">Saved properties keep a service history. Add or manage them in your dashboard.</p>` : ""}
        <label>Area / neighbourhood<input type="text" id="bkArea" required placeholder="e.g. GRA, Phase 2"></label>
        <label>Phone / WhatsApp number<input type="tel" id="bkPhone" required placeholder="e.g. 0803 000 0000"></label>
        <p class="modal-note">Your number stays hidden until an artisan accepts your job or unlocks it with a credit.</p>
        <label>How urgent is it?
          <select id="bkUrgency">
            <option${urgent ? "" : " selected"}>Flexible, this week is fine</option>
            <option>Soon, within 1 to 2 days</option>
            <option${urgent ? " selected" : ""}>🚨 EMERGENCY - jumps the queue</option>
          </select>
        </label>
        <p class="modal-note" id="bkUrgencyNote" hidden>🚨 Emergency bookings are shown first to available artisans. We can't promise instant dispatch - how fast someone arrives depends on artisan availability in your area.</p>
        <label>Preferred date (optional)<input type="date" id="bkDate" min="${new Date().toISOString().slice(0, 10)}"></label>
        <label>Photos (optional, up to 3)<input type="file" id="bkPhotos" accept="image/*" multiple></label>
        <p class="modal-note">Photos help the artisan quote accurately. They are only visible to you, your artisan and the Fixwell team.</p>
        <label>Describe the job<textarea id="bkDesc" rows="4" required placeholder="e.g. Kitchen tap is leaking and needs replacement"></textarea></label>
        <button type="submit" class="btn btn-primary btn-block" id="bkSubmit">Send booking request</button>
      </form>
    </div>`);
  const urgSel = document.getElementById("bkUrgency");
  const urgNote = document.getElementById("bkUrgencyNote");
  const syncUrg = () => { urgNote.hidden = !urgSel.value.includes("EMERGENCY"); };
  urgSel.addEventListener("change", syncUrg); syncUrg();
  document.getElementById("bookFormApp").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("bkSubmit");
    btn.disabled = true; btn.textContent = "Sending…";
    const files = [...document.getElementById("bkPhotos").files].slice(0, 3);
    try {
      const b = await DB.createBooking({
        service: document.getElementById("bkService").value,
        city: document.getElementById("bkCity").value,
        area: document.getElementById("bkArea").value.trim(),
        urgency: urgSel.value,
        description: document.getElementById("bkDesc").value.trim(),
        phone: document.getElementById("bkPhone").value.trim(),
        preferredDate: document.getElementById("bkDate").value || null,
        propertyId: (document.getElementById("bkProp") || {}).value || null,
      });
      if (files.length) {
        btn.textContent = "Uploading photos…";
        for (const f of files) { try { await DB.uploadJobPhoto(b.id, f, "booking"); } catch (e2) { /* booking itself is safe */ } }
      }
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

/* ================= REPORT A PROBLEM (disputes) ================= */
async function reportView(query) {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  let b = null;
  if (query.booking) { try { b = await DB.getBooking(query.booking); } catch (e) { b = null; } }
  const mine = await DB.myDisputes();
  const dash = p.is_admin ? "#/admin" : (p.role === "artisan" ? "#/artisan" : "#/dashboard");
  showApp(`
    <div class="panel-card chat-card">
      <a href="${dash}" class="app-back nav-route">← Back</a>
      <h2>⚠️ Report a problem</h2>
      <p class="app-sub">${b ? `About booking <b class="ref-chip">${esc(b.ref)}</b> (${esc(b.service)}).` : "Tell us what went wrong."} The Fixwell team reviews every report.</p>
      <form id="reportForm" class="profile-form">
        <label>What happened?
          <textarea id="rpText" rows="4" required maxlength="1000" placeholder="Describe the problem - what was agreed, what happened, and what you would like done."></textarea>
        </label>
        <button type="submit" class="btn btn-primary btn-sm">Send report</button>
      </form>
      ${mine.length ? `<h3 class="dash-sec" style="margin-top:18px">My reports (${mine.length})</h3>` + mine.map(d => `
        <div class="audit-row">
          <span class="audit-action">${d.status === "resolved" ? "✅ Resolved" : "🕓 Open"}</span>
          <span class="audit-target">${esc(d.text.slice(0, 80))}${d.text.length > 80 ? "…" : ""}</span>
          <small>${new Date(d.created_at).toLocaleString()}${d.resolution_note ? " · Fixwell: " + esc(d.resolution_note) : ""}</small>
        </div>`).join("") : ""}
    </div>`);
  document.getElementById("reportForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await DB.fileDispute(query.booking || null, document.getElementById("rpText").value.trim());
      toast("Report sent. The Fixwell team will review it.");
      reportView(query);
    } catch (err) { toast(err.message, true); }
  });
}

/* ================= CUSTOMER DASHBOARD ================= */
async function dashboardView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  const [bookings, subs, walletBal] = await Promise.all([DB.myBookings(), DB.mySubscriptions(), DB.walletBalance()]);
  const activeSub = subs.find(s => s.status === "active");
  const requestedSub = subs.find(s => s.status === "requested");
  let props = [], history = [];
  try { [props, history] = await Promise.all([DB.myProperties(), DB.myServiceHistory()]); } catch (e) { /* properties feature may not be enabled yet */ }

  const propCards = props.map(pr => {
    const entries = history.filter(h => h.property_id === pr.id);
    return `
    <div class="job-card">
      <div class="job-head">
        <span class="svc-icon">🏠</span>
        <div class="job-title"><b>${esc(pr.label)}</b><span class="job-meta">${esc(pr.type)} · ${esc(pr.address)}</span></div>
      </div>
      ${pr.notes ? `<p class="job-desc">${esc(pr.notes)}</p>` : ""}
      ${entries.length ? `<div class="hist-list">${entries.map(h => `
        <p class="job-meta">🔧 ${esc(h.service)} · ${esc(new Date(h.done_at).toLocaleDateString())}${h.booking_ref ? " · " + esc(h.booking_ref) : ""}${h.summary ? " - " + esc(h.summary) : ""}</p>`).join("")}</div>` : `<p class="job-meta">No service history yet. Completed bookings on this property appear here automatically.</p>`}
      <form class="hist-form" data-hist="${pr.id}">
        <input type="text" class="hist-svc" required placeholder="Service, e.g. Plumbing repair">
        <input type="date" class="hist-date" max="${new Date().toISOString().slice(0, 10)}">
        <input type="text" class="hist-note" placeholder="Note (optional)">
        <button type="submit" class="btn btn-outline btn-sm">Add entry</button>
      </form>
    </div>`;
  }).join("");

  const rows = await Promise.all(bookings.map(async b => {
    const reviewed = b.status === "completed" ? await DB.myReviewFor(b.id) : false;
    const photos = await DB.bookingPhotos(b.id);
    return `
    <div class="job-card">
      <div class="job-head">
        <span class="svc-icon">${svcIcon(b.service)}</span>
        <div class="job-title"><b>${esc(b.service)}</b><span class="job-meta">${esc(b.city)} · ${esc(b.area)} · ${new Date(b.created_at).toLocaleDateString()}</span></div>
        <span class="ref-chip">${esc(b.ref)}</span>
        ${badge(b.status)}
      </div>
      <p class="job-desc">${esc(b.description)}</p>
      <p class="job-meta">Urgency: ${esc(b.urgency)}${b.preferred_date ? " · Preferred: " + esc(new Date(b.preferred_date).toLocaleDateString()) : ""}${b.artisan_name ? " · Artisan: " + esc(b.artisan_name) : ""}</p>
      ${b.appointment_at ? `<p class="appt-line">🗓️ Appointment: <b>${esc(new Date(b.appointment_at).toLocaleString())}</b>${b.appointment_note ? " · " + esc(b.appointment_note) : ""}</p>` : ""}
      ${photos.length ? `<p class="job-meta photos-line">📷 ${photos.map((ph, i) => `<a href="${ph.url}" target="_blank" rel="noopener">photo ${i + 1}${ph.kind === "completion" ? " (done)" : ""}</a>`).join(" · ")}</p>` : ""}
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
      ${b.status !== "cancelled" ? `<a href="#/report?booking=${b.id}" class="btn btn-outline btn-sm nav-route" title="Report a problem">⚠️ Report a problem</a>` : ""}
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
      ${!activeSub && requestedSub ? `<div class="sub-strip">🗓️ Plan request sent: <b>${esc(requestedSub.plan)}</b> (${esc(requestedSub.billing)}) - the Fixwell team will contact you to set it up. <a href="#plans" class="nav-anchor">All plans</a></div>` : ""}
      <div class="sub-strip">🪙 Credit wallet: <b>${walletBal} credit${walletBal === 1 ? "" : "s"}</b> <a href="#/credits" class="nav-route">Buy credits</a></div>
      <h3 class="dash-subhead">🏠 My home care</h3>
      ${propCards}
      <div class="job-card">
        <form class="hist-form" id="propForm">
          <input type="text" id="prLabel" required placeholder="Property label, e.g. My flat">
          <select id="prType">
            <option value="house">House</option><option value="flat">Flat</option>
            <option value="shop">Shop</option><option value="office">Office</option><option value="other">Other</option>
          </select>
          <input type="text" id="prAddr" required placeholder="Address">
          <input type="text" id="prNotes" placeholder="Notes (optional)">
          <button type="submit" class="btn btn-outline btn-sm">+ Add property</button>
        </form>
      </div>
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
  const propForm = document.getElementById("propForm");
  if (propForm) propForm.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await DB.addProperty({
        label: document.getElementById("prLabel").value.trim(),
        type: document.getElementById("prType").value,
        address: document.getElementById("prAddr").value.trim(),
        notes: document.getElementById("prNotes").value.trim(),
      });
      toast("Property saved.");
      dashboardView();
    } catch (err) { toast(err.message, true); }
  });
  document.querySelectorAll("[data-hist]").forEach(f => f.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await DB.addHistoryEntry(f.dataset.hist,
        f.querySelector(".hist-svc").value.trim(),
        f.querySelector(".hist-note").value.trim(),
        f.querySelector(".hist-date").value ? new Date(f.querySelector(".hist-date").value).toISOString() : null);
      toast("History entry added.");
      dashboardView();
    } catch (err) { toast(err.message, true); }
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
      <div class="plan-price big">${fmt(amount)}<small>/${billing === "annual" ? "year" : "month"}, billed ${billing}</small></div>
      <ul class="confirm-list">${plan.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <button class="btn btn-primary btn-block" id="subConfirm">Send plan request</button>
      <p class="modal-note">Placeholder price, confirmed before any payment. No card is taken now: the Fixwell team contacts you to set up the plan.</p>
    </div>`);
  document.getElementById("subConfirm").addEventListener("click", async e => {
    e.target.disabled = true; e.target.textContent = "Sending…";
    try {
      await DB.subscribePlan(plan.name, billing, amount);
      showApp(`
        <div class="panel-card center">
          <span class="popup-emoji">✅</span>
          <h2>Request received</h2>
          <p>The Fixwell team has your <b>${esc(plan.name)}</b> request and will contact you to set it up. No payment has been taken.</p>
          <a href="#/dashboard" class="btn btn-primary nav-route">Back to my dashboard →</a>
        </div>`);
    } catch (err) {
      toast(err.message, true);
      e.target.disabled = false; e.target.textContent = "Send plan request";
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
  const [leads, walletBal, unlocks, rejected] = await Promise.all([DB.listLeads(), DB.walletBalance(), DB.myUnlocks(), DB.myRejections()]);
  const mine = leads.filter(b => b.artisan_id === p.id && !["completed", "cancelled"].includes(b.status));
  const past = leads.filter(b => b.artisan_id === p.id && ["completed", "cancelled"].includes(b.status));
  const open = leads.filter(b => b.status === "received" && b.city === p.city && !rejected.has(b.id));
  const prePlan = query.plan != null ? CONFIG.artisanPlans[+query.plan] : null;
  const contacts = {};
  await Promise.all(leads.filter(b => unlocks.has(b.id)).map(async b => {
    contacts[b.id] = await DB.contactFor(b.id);
  }));
  const cost = CONFIG.credits.unlockCost;
  const photosBy = {};
  await Promise.all([...open, ...mine].map(async b => { photosBy[b.id] = await DB.bookingPhotos(b.id); }));

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
      <p class="job-meta">Urgency: ${esc(b.urgency)}${b.preferred_date ? " · Preferred: " + esc(new Date(b.preferred_date).toLocaleDateString()) : ""} · Customer: ${esc(b.customer_name || "")}</p>
      ${(photosBy[b.id] || []).length ? `<p class="job-meta photos-line">📷 ${photosBy[b.id].map((ph, i) => `<a href="${ph.url}" target="_blank" rel="noopener">photo ${i + 1}${ph.kind === "completion" ? " (done)" : ""}</a>`).join(" · ")}</p>` : ""}
      ${contactBit}
      ${b.status === "received" ? `<button class="btn btn-primary btn-sm" data-accept="${b.id}">Accept this job</button>
        <button class="btn btn-outline btn-sm" data-reject-lead="${b.id}">Not for me</button>` : ""}
      ${b.status === "assigned" ? `
        <form class="quote-form" data-quote="${b.id}">
          <input type="number" min="500" step="100" required placeholder="Your quote in ₦" class="quote-input">
          <button type="submit" class="btn btn-primary btn-sm">Send quote</button>
        </form>
        <form class="appt-form" data-appt="${b.id}">
          <input type="datetime-local" class="appt-input" aria-label="Appointment date and time">
          <input type="text" class="appt-note" maxlength="80" placeholder="Note (optional, e.g. gate code)">
          <button type="submit" class="btn btn-outline btn-sm">🗓️ Set appointment</button>
        </form>` : ""}
      ${b.appointment_at ? `<p class="appt-line">🗓️ Appointment: <b>${esc(new Date(b.appointment_at).toLocaleString())}</b>${b.appointment_note ? " · " + esc(b.appointment_note) : ""}</p>` : ""}
      ${b.status === "in_progress" ? `
        <form class="complete-form" data-complete-form="${b.id}">
          <input type="file" class="done-photos" accept="image/*" multiple aria-label="Completion photos">
          <button type="submit" class="btn btn-primary btn-sm">Mark job completed</button>
        </form>
        <p class="modal-note">Add up to 3 photos of the finished work (optional but builds your record).</p>` : ""}
      ${b.artisan_id === p.id ? `<a href="#/chat?booking=${b.id}" class="btn btn-outline btn-sm nav-route">💬 Messages</a>` : ""}
      ${b.status === "quote_sent" ? `<p class="job-meta">Quote of ${fmt(b.quote_amount)} sent. Waiting for the customer to approve.</p>` : ""}
    </div>`;
  };

  showApp(`
    <div class="dash">
      <div class="dash-head">
        <div>
          <h2>Artisan dashboard</h2>
          <p class="app-sub">${esc(p.full_name)} · ${esc(app.trade)} · ${esc(p.city)} · <span class="status-badge st-approved">✅ Approved (application reviewed)</span></p>
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
      ${past.length ? `<h3 class="dash-sec">Past jobs (${past.length})</h3>${past.map(leadCard).join("")}` : ""}
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
  document.querySelectorAll("[data-reject-lead]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    try { await DB.rejectLead(b.dataset.rejectLead); artisanView({}); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  }));
  document.querySelectorAll("[data-appt]").forEach(f => f.addEventListener("submit", async e => {
    e.preventDefault();
    const at = f.querySelector(".appt-input").value;
    if (!at) { toast("Pick a date and time first", true); return; }
    try {
      await DB.setAppointment(f.dataset.appt, new Date(at).toISOString(), f.querySelector(".appt-note").value.trim() || null);
      toast("Appointment set. The customer can see it now."); artisanView({});
    } catch (err) { toast(err.message, true); }
  }));
  document.querySelectorAll("[data-complete-form]").forEach(f => f.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const files = [...f.querySelector(".done-photos").files].slice(0, 3);
      for (const file of files) { await DB.uploadJobPhoto(f.dataset.completeForm, file, "completion"); }
      await DB.completeBooking(f.dataset.completeForm);
      toast("Marked completed. Nice work!"); artisanView({});
    } catch (e2) { toast(e2.message, true); btn.disabled = false; }
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

/* ================= NOTIFICATIONS ================= */
let notifTimer = null;

async function updateNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  const n = await DB.unreadCount().catch(() => 0);
  badge.hidden = !n;
  badge.textContent = n > 99 ? "99+" : n;
}

async function notificationsView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const items = await DB.myNotifications();
  showApp(`
    <div class="panel-card chat-card">
      <a href="#/" class="app-back nav-route">← Back</a>
      <h2>🔔 Notifications</h2>
      ${items.length ? `<div class="notif-list">${items.map(n => `
        <a class="notif-item ${n.read ? "" : "unread"}" href="${esc(n.link || "#/")}">
          <span class="notif-text">${esc(n.text)}</span>
          <small>${new Date(n.created_at).toLocaleString()}</small>
        </a>`).join("")}</div>`
      : `<p class="app-sub center" style="margin-top:24px">Nothing yet. Booking updates, quotes and new messages show up here.</p>`}
    </div>`);
  await DB.markAllRead();
  updateNotifBadge();
}

/* ================= PROFILE ================= */
async function profileView() {
  const u = await DB.user();
  if (!u) { location.hash = "#/auth"; return; }
  const p = await DB.profile();
  const dash = p.is_admin ? "#/admin" : (p.role === "artisan" ? "#/artisan" : "#/dashboard");
  showApp(`
    <div class="panel-card chat-card">
      <a href="${dash}" class="app-back nav-route">← Back to my dashboard</a>
      <h2>⚙️ My profile</h2>
      <p class="app-sub">${esc(u.email || "")} · ${esc(p.role || "customer")}${p.is_admin ? " · admin" : ""} · joined ${new Date(p.created_at).toLocaleDateString()}</p>
      <form id="profileForm" class="profile-form">
        <label>Full name
          <input type="text" id="pfName" required maxlength="80" value="${esc(p.full_name || "")}">
        </label>
        <label>Your city
          <select id="pfCity">
            ${CONFIG.cities.map(c => `<option ${c === p.city ? "selected" : ""}>${esc(c)}</option>`).join("")}
          </select>
        </label>
        <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
      </form>
      <p class="app-sub" style="margin-top:14px">Email and password changes: contact support for now.</p>
    </div>`);
  document.getElementById("profileForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await DB.updateProfile({ full_name: document.getElementById("pfName").value.trim(), city: document.getElementById("pfCity").value });
      toast("Profile saved.");
      await renderNavAuth();
      profileView();
    } catch (err) { toast(err.message, true); }
  });
}

/* ================= SUSPENDED ================= */
function suspendedView() {
  DB._profileCache = null; // refetch on next route so a reinstated account recovers without a reload
  showApp(`<div class="panel-card center"><h2>Account suspended</h2><p>Your Fixwell account has been suspended. If you think this is a mistake, reply to any message from the Fixwell team.</p></div>`);
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
      ${p.is_admin && b.customer_id !== p.id && b.artisan_id !== p.id
        ? `<p class="app-sub center" style="margin-top:10px">👁️ You are viewing this conversation as admin (read-only).</p>`
        : `<form id="chatForm" class="chat-form">
        <input type="text" id="chatInput" required maxlength="500" placeholder="Type a message…" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Send</button>
      </form>`}
    </div>`);
  await paint();

  clearInterval(chatTimer);
  chatTimer = setInterval(() => {
    if (!location.hash.startsWith("#/chat")) { clearInterval(chatTimer); return; }
    paint().catch(() => {});
  }, 8000);

  const chatForm = document.getElementById("chatForm");
  if (!chatForm) return; // admin read-only view
  chatForm.addEventListener("submit", async e => {
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
    metadata: { custom_fields: [{ display_name: "App", variable_name: "app", value: "Fixwell Handyman" }] },
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
      ${payLive && CONFIG.paystack.publicKey.startsWith("pk_test") ? `<div class="testmode-banner">🧪 PAYSTACK TEST MODE - checkout runs on test keys. Use a Paystack test card; no real money moves.</div>` : ""}
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
  let subRequests = [];
  try { subRequests = await DB.adminListSubscriptions(); } catch (e) { /* plan requests feature may not be enabled yet */ }
  const [apps, bookings, purchases, users, artisans, audit, allReviews, disputes] = await Promise.all([
    DB.listApplications(),
    DB.client.from("bookings").select("*").order("created_at", { ascending: false }).then(r => r.data || []),
    DB.pendingPurchases(),
    DB.adminListUsers(),
    DB.adminListApprovedArtisans(),
    DB.adminAuditLog(),
    DB.adminAllReviews(),
    DB.adminListDisputes(),
  ]);
  const openStatuses = ["received", "assigned", "quote_sent", "in_progress"];
  const bookingRefs = {}; bookings.forEach(b => { bookingRefs[b.id] = b.ref; });
  const artisanOpts = b => artisans
    .map(a => `<option value="${a.user_id}" ${a.user_id === b.artisan_id ? "disabled" : ""}>${esc(a.full_name)} (${esc(a.trade)}, ${esc(a.city)})</option>`)
    .join("");
  showApp(`
    <div class="dash">
      <div class="dash-head"><div><h2>Admin</h2><p class="app-sub">Screen artisans and monitor bookings.</p></div></div>
      <h3 class="dash-sec">Artisan applications (${apps.filter(a => a.status === "pending").length} pending)</h3>
      ${apps.length ? apps.map(a => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(a.full_name)}</b><span class="job-meta">${esc(a.trade)} · ${esc(a.city)} · ${esc(a.experience)} · ${esc(a.area)}</span></div>
            ${a.status === "approved" ? `<span class="status-badge st-completed">Approved</span>` : a.status === "pending" ? `<span class="status-badge st-received">Pending</span>` : `<span class="status-badge st-cancelled">Declined</span>`}
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
      <h3 class="dash-sec">Home Care plan requests (${subRequests.filter(s => s.status === "requested").length} waiting)</h3>
      ${subRequests.length ? subRequests.map(s => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(s.plan)}</b><span class="job-meta">${esc((s.profiles && s.profiles.full_name) || "(user)")} · ${esc(s.billing)} · ${fmt(s.amount || 0)} · ${new Date(s.created_at).toLocaleString()}</span></div>
            <span class="status-badge ${s.status === "active" ? "st-completed" : s.status === "requested" ? "st-received" : "st-cancelled"}">${esc(s.status)}</span>
          </div>
          ${s.status === "requested" ? `
            <div class="quote-actions">
              <button class="btn btn-primary btn-sm" data-sub-active="${s.id}">Mark active</button>
              <button class="btn btn-outline btn-sm" data-sub-close="${s.id}">Close</button>
            </div>` : ""}
        </div>`).join("") : `<p class="app-sub">No plan requests yet.</p>`}
      <h3 class="dash-sec">All bookings (${bookings.length})</h3>
      ${bookings.length ? bookings.map(b => `
        <div class="job-card">
          <div class="job-head">
            <span class="svc-icon">${svcIcon(b.service)}</span>
            <div class="job-title"><b>${esc(b.service)}</b><span class="job-meta">${esc(b.city)} · ${esc(b.area)} · by ${esc(b.customer_name || "")}${b.artisan_name ? " · artisan " + esc(b.artisan_name) : ""}</span></div>
            <span class="ref-chip">${esc(b.ref)}</span>
            ${badge(b.status)}
          </div>
          <div class="quote-actions">
            ${b.artisan_id ? `<a href="#/chat?booking=${b.id}" class="btn btn-outline btn-sm nav-route">👁️ View chat</a>` : ""}
            ${openStatuses.includes(b.status) ? `
              <button class="btn btn-outline btn-sm" data-cancel-booking="${b.id}" data-ref="${esc(b.ref)}">Cancel</button>
              <select class="reassign-sel" id="reassign-${b.id}">${artisanOpts(b)}</select>
              <button class="btn btn-outline btn-sm" data-reassign-booking="${b.id}" data-ref="${esc(b.ref)}">Reassign</button>` : ""}
          </div>
        </div>`).join("") : `<p class="app-sub">No bookings yet.</p>`}
      <h3 class="dash-sec">Users (${users.length})</h3>
      ${users.length ? users.map(x => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(x.full_name || "(no name)")}</b><span class="job-meta">${esc(x.role || "customer")} · ${esc(x.city || "")}${x.is_admin ? " · admin" : ""}</span></div>
            ${x.suspended ? `<span class="status-badge st-cancelled">Suspended</span>` : ""}
          </div>
          ${!x.is_admin ? `<div class="quote-actions">
            <button class="btn btn-outline btn-sm" data-suspend="${x.id}" data-name="${esc(x.full_name || "")}" data-flag="${x.suspended ? "0" : "1"}">${x.suspended ? "Reinstate" : "Suspend"}</button>
            <button class="btn btn-outline btn-sm" data-adjust="${x.id}" data-name="${esc(x.full_name || "")}">Adjust wallet</button>
          </div>` : ""}
        </div>`).join("") : `<p class="app-sub">No users yet.</p>`}
      <h3 class="dash-sec">Problem reports (${disputes.filter(d => d.status !== "resolved").length} open)</h3>
      ${disputes.length ? disputes.map(d => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(d.user_name || "(user)")}</b><span class="job-meta">${d.booking_id && bookingRefs[d.booking_id] ? "booking " + esc(bookingRefs[d.booking_id]) + " · " : ""}${new Date(d.created_at).toLocaleString()}</span></div>
            <span class="status-badge ${d.status === "resolved" ? "st-completed" : "st-received"}">${d.status === "resolved" ? "Resolved" : "Open"}</span>
          </div>
          <p class="job-desc">${esc(d.text)}</p>
          ${d.resolution_note ? `<p class="job-meta">Fixwell: ${esc(d.resolution_note)}</p>` : ""}
          ${d.status !== "resolved" ? `<button class="btn btn-outline btn-sm" data-resolve-dispute="${d.id}">Mark resolved</button>` : ""}
        </div>`).join("") : `<p class="app-sub">No problem reports yet.</p>`}
      <h3 class="dash-sec">Reviews (${allReviews.length})</h3>
      ${allReviews.length ? allReviews.map(rv => `
        <div class="job-card">
          <div class="job-head">
            <div class="job-title"><b>${esc(rv.customer_name || "")}</b><span class="job-meta">${"⭐".repeat(rv.rating || 0)} · ${esc(rv.service || "")} · ${esc(rv.city || "")}</span></div>
            <button class="btn btn-outline btn-sm" data-remove-review="${rv.id}">Remove</button>
          </div>
          ${rv.comment ? `<p class="job-desc">${esc(rv.comment)}</p>` : ""}
        </div>`).join("") : `<p class="app-sub">No reviews yet.</p>`}
      <h3 class="dash-sec">Admin audit log</h3>
      ${audit.length ? audit.map(a => `
        <div class="audit-row">
          <span class="audit-action">${esc(a.action)}</span>
          <span class="audit-target">${esc(a.target || "")}</span>
          <small>${esc(a.admin_name || "")} · ${new Date(a.created_at).toLocaleString()}${a.reason ? " · " + esc(a.reason) : ""}</small>
        </div>`).join("") : `<p class="app-sub">No admin actions recorded yet.</p>`}
    </div>`);
  document.querySelectorAll("[data-sub-active]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.adminSetSubscriptionStatus(b.dataset.subActive, "active"); toast("Plan marked active."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-sub-close]").forEach(b => b.addEventListener("click", async () => {
    try { await DB.adminSetSubscriptionStatus(b.dataset.subClose, "closed"); toast("Plan request closed."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-resolve-dispute]").forEach(b => b.addEventListener("click", async () => {
    const note = (window.prompt("Resolution note (shown to the user):") || "").trim();
    if (!note) return;
    try { await DB.adminResolveDispute(b.dataset.resolveDispute, note); toast("Report resolved."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
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
  document.querySelectorAll("[data-cancel-booking]").forEach(b => b.addEventListener("click", async () => {
    const reason = prompt(`Cancel booking ${b.dataset.ref}? Give a reason (customer and artisan see the cancellation):`);
    if (reason === null) return;
    try { await DB.adminCancelBooking(b.dataset.cancelBooking, reason); toast("Booking cancelled."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-reassign-booking]").forEach(b => b.addEventListener("click", async () => {
    const sel = document.getElementById("reassign-" + b.dataset.reassignBooking);
    const artisanId = sel && sel.value;
    if (!artisanId) { toast("Pick an artisan first.", true); return; }
    const reason = prompt(`Reassign booking ${b.dataset.ref} to ${sel.options[sel.selectedIndex].text}? Reason:`);
    if (reason === null) return;
    try { await DB.adminReassignBooking(b.dataset.reassignBooking, artisanId, reason); toast("Booking reassigned."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-suspend]").forEach(b => b.addEventListener("click", async () => {
    const flag = b.dataset.flag === "1";
    const reason = prompt(`${flag ? "Suspend" : "Reinstate"} ${b.dataset.name}? Reason:`);
    if (reason === null) return;
    try { await DB.adminSetSuspended(b.dataset.suspend, flag, reason); toast(flag ? "Account suspended." : "Account reinstated."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-adjust]").forEach(b => b.addEventListener("click", async () => {
    const amt = prompt(`Adjust ${b.dataset.name}'s wallet by how many credits? (negative to remove)`);
    if (amt === null) return;
    const credits = parseInt(amt, 10);
    if (!credits) { toast("Enter a non-zero whole number.", true); return; }
    const reason = prompt("Reason for this adjustment (required, goes to the audit log):");
    if (reason === null) return;
    try { await DB.adminAdjustWallet(b.dataset.adjust, credits, reason); toast("Wallet adjusted."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
  document.querySelectorAll("[data-remove-review]").forEach(b => b.addEventListener("click", async () => {
    const reason = prompt("Remove this review from the site? Reason:");
    if (reason === null) return;
    try { await DB.adminRemoveReview(b.dataset.removeReview, reason); toast("Review removed."); adminView(); }
    catch (e) { toast(e.message, true); }
  }));
}

/* ================= ROUTER ================= */
async function router() {
  closeMobileNav();
  clearInterval(chatTimer);
  const r = parseRoute();
  try {
    if (r.name !== "auth") {
      const u = await DB.user();
      if (u) {
        const p = await DB.profile();
        if (p && p.suspended) return suspendedView();
      }
    }
    updateNotifBadge();
    switch (r.name) {
      case "auth": return authView(r.query);
      case "book": return await bookView(r.query);
      case "subscribe": return await subscribeView(r.query);
      case "report": return await reportView(r.query);
      case "dashboard": return await dashboardView();
      case "artisan": return await artisanView(r.query);
      case "credits": return await creditsView();
      case "chat": return await chatView(r.query);
      case "notifications": return await notificationsView();
      case "profile": return await profileView();
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
  clearInterval(notifTimer);
  notifTimer = setInterval(() => { updateNotifBadge(); }, 30000);
})();
