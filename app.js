/* ============================================================
   FIXWELL HANDYMAN - SITE CONFIG
   ============================================================ */
const CONFIG = {
  siteName: "Fixwell Handyman",

  // BACKEND (Supabase project for this site - filled after setup)
  supabase: {
    url: "https://ckvhnrdteoouovsnlsvj.supabase.co",
    anonKey: "",
  },

  // CONTACT (PLACEHOLDERS - replace with the client's real details)
  email: "hello@fixwell.example",    // PLACEHOLDER
  address: "Your office address here", // PLACEHOLDER
  hours: "Mon to Sat, 8am to 6pm",   // PLACEHOLDER

  cities: ["Awka", "Aba"],
  areasNote: "Serving Awka (Anambra) and Aba (Abia)",

  // HERO STATS - EMPTY by default: shown only when the client sets REAL figures
  stats: [],

  services: [
    { icon: "🚰", name: "Plumbing",        blurb: "Leaks, pipes, taps, water heaters, blockages", from: 5000 },
    { icon: "💡", name: "Electrical",      blurb: "Wiring, sockets, lighting, faults, fittings",   from: 5000 },
    { icon: "🪚", name: "Carpentry",       blurb: "Furniture, doors, wardrobes, repairs",          from: 7000 },
    { icon: "🎨", name: "Painting",        blurb: "Interior and exterior, screeding, touch-ups",   from: 15000 },
    { icon: "❄️", name: "AC & Fridge Repair", blurb: "Servicing, gas refill, faults, installation", from: 8000 },
    { icon: "🔌", name: "Generator Repair", blurb: "Servicing, faults, parts replacement",         from: 7000 },
    { icon: "🧱", name: "Tiling & Masonry", blurb: "Floor and wall tiles, plaster, repairs",       from: 12000 },
    { icon: "⚙️", name: "Welding & Metalwork", blurb: "Gates, rails, burglar-proof, fabrication",  from: 10000 },
    { icon: "🛋️", name: "Furniture & Upholstery", blurb: "Repairs, refurbishing, custom pieces",   from: 8000 },
    { icon: "📺", name: "TV & Appliance Repair", blurb: "TVs, fans, microwaves, home gadgets",     from: 5000 },
    { icon: "🧹", name: "Cleaning & Fumigation", blurb: "Deep cleaning, pest control, move-in cleans", from: 15000 },
    { icon: "🚪", name: "Locks & Doors",   blurb: "Lock changes, door repairs, key issues",        from: 6000 },
  ],

  priceGuide: [
    { icon: "🚰", job: "Tap or mixer replacement",   range: "₦5,000 - ₦15,000",  note: "Labour only, parts billed at cost" },
    { icon: "💡", job: "Socket or switch install",   range: "₦3,500 - ₦8,000",   note: "Per point, materials extra" },
    { icon: "❄️", job: "AC servicing (split unit)",  range: "₦10,000 - ₦20,000", note: "Gas refill quoted separately" },
    { icon: "🔌", job: "Generator service",          range: "₦8,000 - ₦18,000",  note: "Depends on generator size" },
    { icon: "🎨", job: "Room painting",              range: "₦25,000 - ₦60,000", note: "Per room, paint excluded" },
    { icon: "🚪", job: "Lock replacement",           range: "₦6,000 - ₦12,000",  note: "Standard cylinder locks" },
    { icon: "🧱", job: "Tile repair (small area)",   range: "₦12,000 - ₦30,000", note: "Tiles billed at cost" },
    { icon: "⚙️", job: "Gate or rail welding",      range: "₦15,000 - ₦50,000", note: "Quoted after inspection" },
    { icon: "🧹", job: "Deep clean (2-bed flat)",    range: "₦30,000 - ₦70,000", note: "Supplies included" },
  ],

  annualSavingsPct: 20,
  plans: [
    { name: "Home Basic", monthly: 5000, discount: 5, popular: false,
      desc: "For small flats and light use",
      features: ["Quarterly home inspection", "5% off all call-outs", "Priority scheduling over walk-ins", "In-app support"] },
    { name: "Home Plus", monthly: 9000, discount: 10, popular: true,
      desc: "Our most chosen home plan",
      features: ["Monthly home inspection", "10% off all call-outs", "Free minor fixes during visits", "Reminder before each visit", "In-app support"] },
    { name: "Family Estate", monthly: 15000, discount: 15, popular: false,
      desc: "Cover up to 2 homes on one plan",
      features: ["Everything in Home Plus", "Covers 2 homes", "15% off all call-outs", "Family priority line"] },
    { name: "Business Care", monthly: 25000, discount: 20, popular: false,
      desc: "For shops, offices and rentals",
      features: ["Monthly servicing visit", "20% off all call-outs", "Priority emergency response", "Quarterly safety check", "Dedicated account contact"] },
  ],

  artisanPlans: [
    { name: "Starter", price: "Free", amount: 0, period: "forever", popular: false,
      desc: "Test the waters",
      features: ["Up to 5 job leads monthly", "1 trade listed", "Standard support", "Basic profile"] },
    { name: "Pro", price: "₦3,000", amount: 3000, period: "per month", popular: true,
      desc: "For active artisans",
      features: ["Unlimited job leads", "Priority job alerts", "Profile boost in search", "Pro badge on your profile"] },
    { name: "Team", price: "₦8,000", amount: 8000, period: "per month", popular: false,
      desc: "For crews and companies",
      features: ["Everything in Pro", "Up to 5 crew profiles", "Featured listing", "Priority support"] },
  ],

  // CREDITS - placeholder pricing in NGN, edit freely.
  // testMode stays true until real payment processing is wired:
  // purchases go in as pending and an admin approves them manually.
  credits: {
    unlockCost: 1,           // credits to unlock a customer's contact on a lead
    testMode: true,
    packages: [
      { credits: 5,  priceNGN: 1500, label: "Starter",  popular: false },
      { credits: 15, priceNGN: 4000, label: "Active",   popular: true },
      { credits: 40, priceNGN: 9000, label: "Crew",     popular: false },
    ],
  },

  faqs: [
    { q: "How do I pay for a job?", a: "You approve a quote in your account before work starts, then pay the artisan directly when the job is done. Bank transfer or cash, whatever suits you. We never take online payments on this site." },
    { q: "How are artisans screened?", a: "Before artisans join, we confirm their ID, assess their skill and check references on past work. New artisans start with supervised trial jobs. Confirm this matches your actual process and edit it here if needed." },
    { q: "Which areas do you cover?", a: "We currently serve Awka in Anambra State and Aba in Abia State, including surrounding neighbourhoods." },
    { q: "Is the price guide the final price?", a: "No. The guide shows typical ranges so you know the going rate. Your exact quote is sent to your account before any work begins, and you approve it first." },
    { q: "What if something goes wrong after a job?", a: "Tell us through your booking within 7 days and we will send the artisan back to put it right at no extra labour cost." },
    { q: "Do you handle emergencies?", a: "Yes. Place an emergency booking and it is flagged as urgent for artisans. Burst pipes, power faults and broken locks get priority." },
  ],
};
/* ================== END OF CONFIG ================== */

const fmt = n => "₦" + n.toLocaleString("en-NG");
let city = localStorage.getItem("fixwell_city") || CONFIG.cities[0];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function renderCityPicker() {
  const wrap = document.getElementById("cityPickerBtns");
  if (!wrap) return;
  wrap.innerHTML = "";
  CONFIG.cities.forEach(c => {
    const b = document.createElement("button");
    b.className = "city-btn" + (c === city ? " active" : "");
    b.textContent = c;
    b.onclick = () => { city = c; localStorage.setItem("fixwell_city", c); renderCityPicker(); renderServices(); };
    wrap.appendChild(b);
  });
}

function renderStats() {
  const box = document.getElementById("heroStats");
  const launch = document.getElementById("heroLaunch");
  if (!box) return;
  if (!CONFIG.stats.length) { box.hidden = true; launch.hidden = false; return; }
  launch.hidden = true; box.hidden = false;
  box.innerHTML = CONFIG.stats.map(s => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("");
}

function renderServices() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  grid.innerHTML = CONFIG.services.map((s, i) => `
    <a href="#/book?service=${i}" class="service-card nav-route">
      <span class="svc-icon">${s.icon}</span>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.blurb)}</p>
      <span class="svc-from">From ${fmt(s.from)}</span>
      <span class="svc-book">Book in ${esc(city)}</span>
    </a>`).join("");
}

function renderPrices() {
  const grid = document.getElementById("priceGrid");
  if (!grid) return;
  grid.innerHTML = CONFIG.priceGuide.map(p => `
    <div class="price-card">
      <span class="svc-icon">${p.icon}</span>
      <div><h3>${esc(p.job)}</h3><p>${esc(p.note)}</p><span class="range">${esc(p.range)}</span></div>
    </div>`).join("");
}

let annual = false;
function renderPlans() {
  const grid = document.getElementById("plansGrid");
  if (!grid) return;
  const pct = CONFIG.annualSavingsPct;
  document.getElementById("saveBadge").textContent = "Save " + pct + "%";
  document.getElementById("labelMonthly").classList.toggle("active", !annual);
  document.getElementById("labelAnnual").classList.toggle("active", annual);
  document.getElementById("billingToggle").classList.toggle("on", annual);
  document.getElementById("billingToggle").setAttribute("aria-checked", annual);
  grid.innerHTML = CONFIG.plans.map((p, i) => {
    const price = annual ? Math.round(p.monthly * 12 * (100 - pct) / 100) : p.monthly;
    const per = annual ? "/year" : "/month";
    return `
    <div class="plan-card${p.popular ? " popular" : ""}">
      ${p.popular ? '<span class="popular-tag">MOST POPULAR</span>' : ""}
      <h3>${esc(p.name)}</h3>
      <p class="plan-desc">${esc(p.desc)}</p>
      <div class="plan-price">${fmt(price)}<small>${per}${annual ? ", billed annually" : ", billed monthly"}</small></div>
      <span class="plan-discount">${p.discount}% off call-outs</span>
      <ul>${p.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <a href="#/subscribe?plan=${i}&billing=${annual ? "annual" : "monthly"}" class="btn ${p.popular ? "btn-primary" : "btn-outline"} btn-block nav-route">Subscribe in the app</a>
    </div>`;
  }).join("");
  document.querySelectorAll(".plan-card:not(.popular) .btn-outline").forEach(b => {
    b.style.color = "#fff"; b.style.borderColor = "rgba(255,255,255,.7)";
  });
}

function renderAplans() {
  const grid = document.getElementById("aplansGrid");
  if (!grid) return;
  grid.innerHTML = CONFIG.artisanPlans.map((p, i) => `
    <div class="aplan-card${p.popular ? " popular" : ""}">
      ${p.popular ? '<span class="popular-tag">MOST POPULAR</span>' : ""}
      <h4>${esc(p.name)}</h4>
      <p class="plan-desc">${esc(p.desc)}</p>
      <div class="plan-price">${esc(p.price)}<small> ${esc(p.period)}</small></div>
      <ul>${p.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <a href="#/artisan?plan=${i}" class="btn ${p.popular ? "btn-primary" : "btn-outline"} btn-block nav-route">${p.amount === 0 ? "Start free" : "Choose " + esc(p.name)}</a>
    </div>`).join("");
}

function renderFaq() {
  const list = document.getElementById("faqList");
  if (!list) return;
  list.innerHTML = CONFIG.faqs.map((f, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-q" data-faq="${i}">${esc(f.q)}</button>
      <div class="faq-a"><p>${esc(f.a)}</p></div>
    </div>`).join("");
  document.querySelectorAll("[data-faq]").forEach(el => {
    el.addEventListener("click", () => {
      const item = document.getElementById("faq-" + el.dataset.faq);
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(x => x.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

async function renderReviews() {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;
  let reviews = [];
  try { reviews = await DB.listReviews(); } catch (e) { reviews = []; }
  if (!reviews.length) {
    grid.innerHTML = `<div class="reviews-empty">
      <span class="popup-emoji">🌱</span>
      <p><b>No reviews yet, and that is the honest truth.</b></p>
      <p>Reviews appear here automatically when customers rate completed jobs in the app. The first one is a real job away.</p>
    </div>`;
    return;
  }
  grid.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      <p class="review-text">"${esc(r.comment)}"</p>
      <div class="review-meta"><b>${esc(r.customer_name || "Customer")}</b><span>${esc(r.service || "")} · ${esc(r.city || "")}</span></div>
    </div>`).join("");
}

function renderContact() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("topbarHours", "🕒 " + CONFIG.hours);
  set("topbarCities", "📍 " + CONFIG.cities.join(" & "));
  set("footerTagline", "Screened local artisans for homes and businesses. " + CONFIG.areasNote + ".");
  set("footerAddress", "📍 " + CONFIG.address);
  set("footerEmail", "✉️ " + CONFIG.email);
  set("footerAreas", "🗺️ " + CONFIG.areasNote);
  const fs = document.getElementById("footerServices");
  if (fs) fs.innerHTML = CONFIG.services.slice(0, 6).map(s => `<a href="#/book?service=${CONFIG.services.indexOf(s)}" class="nav-route">${esc(s.name)}</a>`).join("");
  set("year", new Date().getFullYear());
  set("footerName", CONFIG.siteName);
}

/* ---------- mobile nav ---------- */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", open);
});
function closeMobileNav() {
  navLinks.classList.remove("open"); navToggle.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

/* ---------- billing toggle ---------- */
document.getElementById("billingToggle").addEventListener("click", () => { annual = !annual; renderPlans(); });

/* ---------- first-visit popup ---------- */
const popup = document.getElementById("popupOverlay");
function closePopup() {
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  localStorage.setItem("fixwell_seen_popup", "1");
}
if (!localStorage.getItem("fixwell_seen_popup")) {
  setTimeout(() => { popup.classList.add("show"); popup.setAttribute("aria-hidden", "false"); }, 1200);
}
document.getElementById("popupClose").addEventListener("click", closePopup);
document.getElementById("popupLater").addEventListener("click", closePopup);
popup.addEventListener("click", e => { if (e.target === popup) closePopup(); });
popup.querySelector(".nav-route").addEventListener("click", closePopup);

/* ---------- landing anchors when app view is open ---------- */
document.querySelectorAll(".nav-anchor").forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    closeMobileNav();
    location.hash = "";
    setTimeout(() => {
      const t = document.querySelector(a.getAttribute("href"));
      if (t) t.scrollIntoView({ behavior: "smooth" });
    }, 30);
  });
});

/* ---------- init landing ---------- */
renderCityPicker();
renderStats();
renderServices();
renderPrices();
renderPlans();
renderAplans();
renderFaq();
renderContact();
