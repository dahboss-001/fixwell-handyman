/* ============================================================
   FIXWELL HANDYMAN - SITE CONFIG
   Edit everything the client needs to change in this block.
   Values marked PLACEHOLDER must be replaced with real ones.
   ============================================================ */
const CONFIG = {
  siteName: "Fixwell Handyman",

  // CONTACT (PLACEHOLDERS - replace with the client's real details)
  whatsappNumber: "2348000000000",   // PLACEHOLDER: WhatsApp number in international format, no +
  phoneDisplay: "+234 800 000 0000", // PLACEHOLDER
  email: "hello@fixwell.example",    // PLACEHOLDER
  address: "Your office address here", // PLACEHOLDER
  hours: "Mon to Sat, 8am to 6pm",   // PLACEHOLDER
  emergencyHours: "24/7",

  // CITIES the business serves
  cities: ["Awka", "Aba"],
  areasNote: "Serving Awka (Anambra) and Aba (Abia)",

  // HERO STATS (PLACEHOLDERS - replace with real figures)
  stats: [
    { value: "120+", label: "Jobs completed" },
    { value: "40+",  label: "Vetted artisans" },
    { value: "2",    label: "Cities served" },
  ],

  // SERVICES (icon, name, blurb, typical starting price - PLACEHOLDER prices)
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

  // PRICE GUIDE (PLACEHOLDER ranges in NGN)
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

  // MAINTENANCE PLANS for customers (PLACEHOLDER prices and discounts)
  annualSavingsPct: 20,
  plans: [
    {
      name: "Home Basic", monthly: 5000, discount: 5, popular: false,
      desc: "For small flats and light use",
      features: ["Quarterly home inspection", "5% off all call-outs", "Priority scheduling over walk-ins", "WhatsApp support"],
    },
    {
      name: "Home Plus", monthly: 9000, discount: 10, popular: true,
      desc: "Our most chosen home plan",
      features: ["Monthly home inspection", "10% off all call-outs", "Free minor fixes during visits", "Reminder before each visit", "WhatsApp support"],
    },
    {
      name: "Family Estate", monthly: 15000, discount: 15, popular: false,
      desc: "Cover up to 2 homes on one plan",
      features: ["Everything in Home Plus", "Covers 2 homes", "15% off all call-outs", "Family priority line"],
    },
    {
      name: "Business Care", monthly: 25000, discount: 20, popular: false,
      desc: "For shops, offices and rentals",
      features: ["Monthly servicing visit", "20% off all call-outs", "Priority emergency response", "Quarterly safety check", "Dedicated account contact"],
    },
  ],

  // ARTISAN MEMBERSHIP PLANS (PLACEHOLDER fees)
  artisanPlans: [
    {
      name: "Starter", price: "Free", period: "forever", popular: false,
      desc: "Test the waters",
      features: ["Up to 5 job leads monthly", "1 trade listed", "Standard support", "Basic profile"],
    },
    {
      name: "Pro", price: "₦3,000", period: "per month", popular: true,
      desc: "For active artisans",
      features: ["Unlimited job leads", "Priority job alerts", "Profile boost in search", "Pro badge on your profile"],
    },
    {
      name: "Team", price: "₦8,000", period: "per month", popular: false,
      desc: "For crews and companies",
      features: ["Everything in Pro", "Up to 5 crew profiles", "Featured listing", "Priority WhatsApp support"],
    },
  ],

  // FAQ
  faqs: [
    { q: "How do I pay for a job?", a: "You approve a quote on WhatsApp before work starts, then pay the artisan directly when the job is done. Bank transfer or cash, whatever suits you. We never take online payments on this site." },
    { q: "How are artisans vetted?", a: "Every artisan completes an ID check, a skill assessment and reference checks on past work before taking jobs. New artisans start with supervised trial jobs." },
    { q: "Which areas do you cover?", a: "We currently serve Awka in Anambra State and Aba in Abia State, including surrounding neighbourhoods. Message us your area and we will confirm coverage." },
    { q: "Is the price guide the final price?", a: "No. The guide shows typical ranges so you know the going rate. Your exact quote is confirmed on WhatsApp before any work begins, and you approve it first." },
    { q: "What if something goes wrong after a job?", a: "Tell us on WhatsApp within 7 days and we will send the artisan back to put it right at no extra labour cost." },
    { q: "Do you handle emergencies?", a: "Yes. Burst pipes, power faults and broken locks get priority dispatch. Use the emergency button and tell us it is urgent." },
  ],
};
/* ================== END OF CONFIG ================== */


/* ---------- helpers ---------- */
const fmt = n => "₦" + n.toLocaleString("en-NG");
let city = localStorage.getItem("fixwell_city") || CONFIG.cities[0];

function waLink(message) {
  return "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(message);
}
function bookingRef() {
  return "FW-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/* ---------- render: city picker ---------- */
function renderCityPicker() {
  const wrap = document.getElementById("cityPickerBtns");
  wrap.innerHTML = "";
  CONFIG.cities.forEach(c => {
    const b = document.createElement("button");
    b.className = "city-btn" + (c === city ? " active" : "");
    b.textContent = c;
    b.onclick = () => {
      city = c;
      localStorage.setItem("fixwell_city", c);
      renderCityPicker();
      renderServices();
    };
    wrap.appendChild(b);
  });
}

/* ---------- render: stats ---------- */
function renderStats() {
  document.getElementById("heroStats").innerHTML =
    CONFIG.stats.map(s => `<div class="stat"><b>${s.value}</b><span>${s.label}</span></div>`).join("");
}

/* ---------- render: services ---------- */
function renderServices() {
  document.getElementById("servicesGrid").innerHTML = CONFIG.services.map((s, i) => `
    <a href="#" class="service-card" data-service="${i}">
      <span class="svc-icon">${s.icon}</span>
      <h3>${s.name}</h3>
      <p>${s.blurb}</p>
      <span class="svc-from">From ${fmt(s.from)}</span>
      <span class="svc-book">Book in ${city}</span>
    </a>`).join("");
  document.querySelectorAll("[data-service]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      openBooking(+el.dataset.service);
    });
  });
}

/* ---------- render: price guide ---------- */
function renderPrices() {
  document.getElementById("priceGrid").innerHTML = CONFIG.priceGuide.map(p => `
    <div class="price-card">
      <span class="svc-icon">${p.icon}</span>
      <div>
        <h3>${p.job}</h3>
        <p>${p.note}</p>
        <span class="range">${p.range}</span>
      </div>
    </div>`).join("");
}

/* ---------- render: maintenance plans ---------- */
let annual = false;
function renderPlans() {
  const pct = CONFIG.annualSavingsPct;
  document.getElementById("saveBadge").textContent = "Save " + pct + "%";
  document.getElementById("labelMonthly").classList.toggle("active", !annual);
  document.getElementById("labelAnnual").classList.toggle("active", annual);
  document.getElementById("billingToggle").classList.toggle("on", annual);
  document.getElementById("billingToggle").setAttribute("aria-checked", annual);

  document.getElementById("plansGrid").innerHTML = CONFIG.plans.map((p, i) => {
    const price = annual ? Math.round(p.monthly * 12 * (100 - pct) / 100) : p.monthly;
    const per = annual ? "/year" : "/month";
    return `
    <div class="plan-card${p.popular ? " popular" : ""}">
      ${p.popular ? '<span class="popular-tag">MOST POPULAR</span>' : ""}
      <h3>${p.name}</h3>
      <p class="plan-desc">${p.desc}</p>
      <div class="plan-price">${fmt(price)}<small>${per}${annual ? ", billed annually" : ", billed monthly"}</small></div>
      <span class="plan-discount">${p.discount}% off call-outs</span>
      <ul>${p.features.map(f => `<li>${f}</li>`).join("")}</ul>
      <a href="#" class="btn ${p.popular ? "btn-primary" : "btn-outline"} btn-block" data-plan="${i}">Subscribe on WhatsApp</a>
    </div>`;
  }).join("");

  document.querySelectorAll("[data-plan]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const p = CONFIG.plans[+el.dataset.plan];
      const price = annual ? Math.round(p.monthly * 12 * (100 - CONFIG.annualSavingsPct) / 100) : p.monthly;
      const msg = `Hello ${CONFIG.siteName}! I want to subscribe to the ${p.name} maintenance plan (${fmt(price)}${annual ? "/year" : "/month"}) in ${city}. Please confirm the details.`;
      window.open(waLink(msg), "_blank");
    });
  });

  // keep outline buttons readable on dark background for non-popular cards
  document.querySelectorAll(".plan-card:not(.popular) .btn-outline").forEach(b => {
    b.style.color = "#fff"; b.style.borderColor = "rgba(255,255,255,.7)";
  });
}

/* ---------- render: artisan plans ---------- */
function renderAplans() {
  document.getElementById("aplansGrid").innerHTML = CONFIG.artisanPlans.map((p, i) => `
    <div class="aplan-card${p.popular ? " popular" : ""}">
      ${p.popular ? '<span class="popular-tag">MOST POPULAR</span>' : ""}
      <h4>${p.name}</h4>
      <p class="plan-desc">${p.desc}</p>
      <div class="plan-price">${p.price}<small> ${p.period}</small></div>
      <ul>${p.features.map(f => `<li>${f}</li>`).join("")}</ul>
      <a href="#" class="btn ${p.popular ? "btn-primary" : "btn-outline"} btn-block" data-aplan="${i}">${p.price === "Free" ? "Start free" : "Choose " + p.name}</a>
    </div>`).join("");
  document.querySelectorAll("[data-aplan]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const p = CONFIG.artisanPlans[+el.dataset.aplan];
      const msg = `Hello ${CONFIG.siteName}! I am an artisan interested in the ${p.name} membership plan (${p.price} ${p.period}). My trade is: `;
      window.open(waLink(msg), "_blank");
    });
  });
}

/* ---------- render: faq ---------- */
function renderFaq() {
  document.getElementById("faqList").innerHTML = CONFIG.faqs.map((f, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-q" data-faq="${i}">${f.q}</button>
      <div class="faq-a"><p>${f.a}</p></div>
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

/* ---------- render: contact/footer ---------- */
function renderContact() {
  document.getElementById("topbarHours").textContent = "🕒 " + CONFIG.hours;
  const tp = document.getElementById("topbarPhone");
  tp.textContent = "📞 " + CONFIG.phoneDisplay;
  tp.href = "tel:+" + CONFIG.whatsappNumber;
  document.getElementById("emgHours").textContent = CONFIG.emergencyHours;
  document.getElementById("footerTagline").textContent =
    "Vetted local artisans for homes and businesses. " + CONFIG.areasNote + ".";
  document.getElementById("footerAddress").textContent = "📍 " + CONFIG.address;
  document.getElementById("footerEmail").textContent = "✉️ " + CONFIG.email;
  document.getElementById("footerPhone").textContent = "📞 " + CONFIG.phoneDisplay;
  document.getElementById("footerAreas").textContent = "🗺️ " + CONFIG.areasNote;
  document.getElementById("footerServices").innerHTML =
    CONFIG.services.slice(0, 6).map(s => `<a href="#services">${s.name}</a>`).join("");
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("footerName").textContent = CONFIG.siteName;
}

/* ---------- booking modal ---------- */
const bookModal = document.getElementById("bookModal");
const applyModal = document.getElementById("applyModal");

function openBooking(serviceIndex) {
  const sel = document.getElementById("bookService");
  sel.innerHTML = CONFIG.services.map((s, i) =>
    `<option value="${s.name}"${i === serviceIndex ? " selected" : ""}>${s.icon} ${s.name}</option>`).join("")
    + `<option value="Other">🧰 Other / not sure</option>`;
  if (serviceIndex == null) sel.selectedIndex = 0;
  document.getElementById("bookArea").placeholder = "e.g. area in " + city;
  bookModal.classList.add("show");
  bookModal.setAttribute("aria-hidden", "false");
}
function openApply() {
  const sel = document.getElementById("applyTrade");
  sel.innerHTML = CONFIG.services.map(s => `<option>${s.name}</option>`).join("")
    + `<option>Other trade</option>`;
  document.getElementById("applyArea").placeholder = "e.g. area in " + city;
  applyModal.classList.add("show");
  applyModal.setAttribute("aria-hidden", "false");
}
function closeModals() {
  [bookModal, applyModal].forEach(m => { m.classList.remove("show"); m.setAttribute("aria-hidden", "true"); });
}

document.getElementById("bookForm").addEventListener("submit", e => {
  e.preventDefault();
  const ref = bookingRef();
  const msg =
    `Hello ${CONFIG.siteName}! New booking request (${ref})\n` +
    `• Service: ${document.getElementById("bookService").value}\n` +
    `• City: ${city}\n` +
    `• Area: ${document.getElementById("bookArea").value}\n` +
    `• Urgency: ${document.getElementById("bookUrgency").value}\n` +
    `• Job: ${document.getElementById("bookDesc").value}\n` +
    `• Name: ${document.getElementById("bookName").value}`;
  window.open(waLink(msg), "_blank");
  closeModals();
});
document.getElementById("applyForm").addEventListener("submit", e => {
  e.preventDefault();
  const msg =
    `Hello ${CONFIG.siteName}! Artisan application\n` +
    `• Trade: ${document.getElementById("applyTrade").value}\n` +
    `• Experience: ${document.getElementById("applyExp").value}\n` +
    `• City: ${city}\n` +
    `• Area: ${document.getElementById("applyArea").value}\n` +
    `• Name: ${document.getElementById("applyName").value}`;
  window.open(waLink(msg), "_blank");
  closeModals();
});

/* ---------- wire up buttons ---------- */
document.querySelectorAll("[data-book]").forEach(el => {
  el.addEventListener("click", e => { e.preventDefault(); closePopup(); openBooking(null); });
});
document.querySelectorAll("[data-apply]").forEach(el => {
  el.addEventListener("click", e => { e.preventDefault(); openApply(); });
});
document.querySelectorAll("[data-emergency]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    const msg = `EMERGENCY: Hello ${CONFIG.siteName}! I need an artisan urgently in ${city}. The problem is: `;
    window.open(waLink(msg), "_blank");
  });
});
document.querySelectorAll("[data-review]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    const msg = `Hello ${CONFIG.siteName}! I want to share feedback about a completed job: `;
    window.open(waLink(msg), "_blank");
  });
});
document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModals));
[bookModal, applyModal].forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModals(); }));
document.getElementById("billingToggle").addEventListener("click", () => { annual = !annual; renderPlans(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModals(); closePopup(); } });

/* ---------- mobile nav ---------- */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", open);
});
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  navLinks.classList.remove("open"); navToggle.classList.remove("open");
}));

/* ---------- first-visit popup ---------- */
const popup = document.getElementById("popupOverlay");
function closePopup() {
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
  localStorage.setItem("fixwell_seen_popup", "1");
}
if (!localStorage.getItem("fixwell_seen_popup")) {
  setTimeout(() => {
    popup.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
  }, 1200);
}
document.getElementById("popupClose").addEventListener("click", closePopup);
document.getElementById("popupLater").addEventListener("click", closePopup);
popup.addEventListener("click", e => { if (e.target === popup) closePopup(); });

/* ---------- init ---------- */
renderCityPicker();
renderStats();
renderServices();
renderPrices();
renderPlans();
renderAplans();
renderFaq();
renderContact();
