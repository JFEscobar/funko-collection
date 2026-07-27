/* =====================================================================
   CONFIG
   ===================================================================== */
const CURRENCY = "$";

/* =====================================================================
   STATE
   ===================================================================== */
let ALL_FUNKOS = [];
let selectedIds = loadSelection();
let filters = { search: "", series: "all", availableOnly: false };
let lightboxState = { images: [], index: 0 };

const view = document.getElementById("view");

init();

async function init() {
  try {
    const res = await fetch("data.json");
    ALL_FUNKOS = await res.json();
  } catch (err) {
    view.innerHTML = `<div class="max-w-md mx-auto text-center py-20">
      <span class="material-symbols-outlined text-5xl text-error mb-4">error</span>
      <p class="text-on-surface-variant">Could not load collection data. Ensure you are running this on a server environment.</p>
    </div>`;
    return;
  }
  window.addEventListener("hashchange", route);
  route();
  renderDrawer();
  setupDrawerToggle();
  setupSendButton();
  setupLightbox();
}

function route() {
  const hash = location.hash || "#/";
  const itemMatch = hash.match(/^#\/item\/(.+)$/);

  if (itemMatch) {
    const funko = ALL_FUNKOS.find(
      (f) => f.id === decodeURIComponent(itemMatch[1]),
    );
    if (funko) {
      renderDetail(funko);
    } else {
      view.innerHTML = `<div class="text-center py-20">
        <p class="text-xl font-headline text-navy-deep mb-6">Oops! This Funko has vanished.</p>
        <a class="inline-flex items-center gap-2 text-coral-vibrant font-bold hover:underline" href="#/">
          <span class="material-symbols-outlined">arrow_back</span> Back to the shelf
        </a>
      </div>`;
    }
  } else {
    renderGallery();
  }
  window.scrollTo(0, 0);
}

/* =====================================================================
   GALLERY VIEW
   ===================================================================== */
function renderGallery() {
  const seriesList = [...new Set(ALL_FUNKOS.map((f) => f.series))].sort();

  view.innerHTML = `
    <div class="mb-12 space-y-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-4xl font-headline text-navy-deep mb-2">The Collection</h1>
          <p class="text-on-surface-variant font-body">Browse, select, and copy your list in seconds.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[240px]">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
            <input type="search" id="filter-search" placeholder="Search by name..." class="filter-input w-full pl-12" value="${escapeAttr(filters.search)}">
          </div>
          <select id="filter-series" class="filter-input min-w-[160px] pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.5em_1.5em]">
            <option value="all">All Series</option>
            ${seriesList.map((s) => `<option value="${escapeAttr(s)}" ${filters.series === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
          </select>
          <label class="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-surface-container-high cursor-pointer hover:bg-surface-container-low transition-colors">
            <input type="checkbox" id="filter-available" ${filters.availableOnly ? "checked" : ""} class="rounded text-coral-vibrant focus:ring-coral-vibrant">
            <span class="text-sm font-medium text-navy-deep">Available Only</span>
          </label>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-8 sm:gap-y-12" id="grid"></div>
  `;

  document.getElementById("filter-search").addEventListener("input", (e) => {
    filters.search = e.target.value;
    renderGrid();
  });
  document.getElementById("filter-series").addEventListener("change", (e) => {
    filters.series = e.target.value;
    renderGrid();
  });
  document
    .getElementById("filter-available")
    .addEventListener("change", (e) => {
      filters.availableOnly = e.target.checked;
      renderGrid();
    });

  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("grid");
  if (!grid) return;

  const filtered = ALL_FUNKOS.filter((f) => {
    if (filters.availableOnly && f.status !== "available") return false;
    if (filters.series !== "all" && f.series !== filters.series) return false;
    if (
      filters.search &&
      !f.name.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-20 text-center border-2 border-dashed border-surface-container-highest rounded-2xl">
      <span class="material-symbols-outlined text-4xl text-surface-dim mb-2">filter_list_off</span>
      <p class="text-on-surface-variant font-medium">No matches found for your current filters.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(cardTemplate).join("");
}

function cardTemplate(f) {
  const isSold = f.status === "sold";
  const isPending = f.status === "pending";
  const isUnavailable = isSold || isPending;
  const isSelected = selectedIds.has(f.id);
  const cover = f.images && f.images[0];

  return `
    <a href="#/item/${encodeURIComponent(f.id)}"
       class="group relative flex flex-col bg-white rounded-2xl p-3 sm:p-4 transition-all duration-300 card-hover ${isSelected ? "ring-2 ring-coral-vibrant shadow-lg shadow-coral-vibrant/10" : "ring-1 ring-surface-container-high"}">
      <div class="relative aspect-square mb-4 sm:mb-6 overflow-hidden rounded-xl bg-surface-container-low flex items-center justify-center">
        ${
          cover
            ? `<img src="${escapeAttr(cover)}" alt="${escapeAttr(f.name)}" class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 ${isUnavailable ? "grayscale opacity-60" : ""}" loading="lazy" onerror="this.replaceWith(placeholderNode('${escapeAttr(f.name)}'))">`
            : placeholderMarkup(f.name)
        }

        <div class="price-tag">${CURRENCY}${f.price.toFixed(2)}</div>
        ${isSold ? `<div class="stamp">SOLD</div>` : isPending ? `<div class="stamp stamp--pending">PENDING</div>` : ""}
      </div>

      <div class="flex-1 flex flex-col px-1">
        <p class="text-[11px] sm:text-xs font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-1">${escapeHtml(f.series)}</p>
        <h3 class="font-headline font-bold text-base sm:text-lg text-navy-deep leading-tight mb-2 flex-1">${escapeHtml(f.name)}</h3>
        <div class="flex items-center justify-between mt-auto pt-3 sm:pt-4 border-t border-surface-container-low">
          <span class="text-xs sm:text-sm font-medium text-on-surface-variant">${f.popNumber ? "#" + escapeHtml(f.popNumber) : "Unnumbered"}</span>
          ${
            isSelected
              ? `
            <span class="flex items-center gap-1.5 text-coral-vibrant text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <span class="material-symbols-outlined text-sm">check_circle</span> Added
            </span>
          `
              : `
            <span class="text-[10px] sm:text-xs font-bold text-surface-dim uppercase tracking-wider group-hover:text-coral-vibrant transition-colors">Details &rarr;</span>
          `
          }
        </div>
      </div>
    </a>
  `;
}

/* =====================================================================
   DETAIL VIEW
   ===================================================================== */
function renderDetail(f) {
  const images = f.images && f.images.length ? f.images : [];
  const isSold = f.status === "sold";
  const isPending = f.status === "pending";
  const isAvailable = f.status === "available";
  const isSelected = selectedIds.has(f.id);

  view.innerHTML = `
    <div class="mb-10">
      <a href="#/" class="inline-flex items-center gap-2 py-2 px-4 bg-white border border-surface-container-high rounded-full font-headline font-bold text-sm text-navy-deep hover:bg-surface-container-low transition-all">
        <span class="material-symbols-outlined text-lg">arrow_back</span> Back to the shelf
      </a>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      <div class="space-y-8">
        <div class="relative bg-white rounded-3xl p-10 ring-1 ring-surface-container-high shadow-sm flex items-center justify-center aspect-square overflow-hidden ${images.length ? "zoomable" : ""}" id="carousel">
          <div class="w-full h-full" id="carousel-frame">
            ${
              images.length
                ? `<img id="carousel-img" src="${escapeAttr(images[0])}" alt="${escapeAttr(f.name)}" class="w-full h-full object-contain ${!isAvailable ? "grayscale opacity-60" : ""}" onerror="this.replaceWith(placeholderNode('${escapeAttr(f.name)}'))">`
                : placeholderMarkup(f.name)
            }
          </div>
          ${isSold ? `<div class="stamp text-4xl">SOLD OUT</div>` : isPending ? `<div class="stamp stamp--pending text-4xl">PENDING</div>` : ""}
          ${images.length ? `<div class="zoom-hint"><span class="material-symbols-outlined text-lg">zoom_in</span></div>` : ""}
        </div>

        ${
          images.length > 1
            ? `
          <div class="flex items-center justify-center gap-6">
            <button class="w-12 h-12 flex items-center justify-center rounded-full border border-surface-container-high bg-white text-navy-deep hover:bg-surface-container-low transition-all" id="carousel-prev" type="button" aria-label="Previous photo">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <div class="flex gap-2" id="carousel-dots">
              ${images.map((_, i) => `<button class="w-2.5 h-2.5 rounded-full transition-all ${i === 0 ? "bg-coral-vibrant w-6" : "bg-surface-dim hover:bg-on-surface-variant"}" data-index="${i}" aria-label="Photo ${i + 1}"></button>`).join("")}
            </div>
            <button class="w-12 h-12 flex items-center justify-center rounded-full border border-surface-container-high bg-white text-navy-deep hover:bg-surface-container-low transition-all" id="carousel-next" type="button" aria-label="Next photo">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        `
            : ""
        }
      </div>

      <div class="flex flex-col h-full">
        <div class="mb-8">
          <div class="flex flex-wrap gap-2 mb-6">
            ${f.popNumber ? `<span class="px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-mono font-bold rounded">#${escapeHtml(f.popNumber)}</span>` : ""}
            <span class="px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-mono font-bold rounded uppercase tracking-wider">${escapeHtml(f.condition)}</span>
            <span class="px-3 py-1 text-xs font-mono font-bold rounded uppercase tracking-wider ${isSold ? "bg-error-container text-on-error-container" : isPending ? "bg-amber-100 text-amber-800" : "bg-secondary-container text-on-secondary-container"}">
              ${isSold ? "Sold" : isPending ? "Pending" : "Available"}
            </span>
          </div>

          <p class="text-sm font-mono font-bold text-coral-vibrant uppercase tracking-[0.2em] mb-2">${escapeHtml(f.series)}</p>
          <h1 class="text-4xl sm:text-5xl font-headline font-extrabold text-navy-deep leading-[1.1] mb-4">${escapeHtml(f.name)}</h1>
          <div class="text-4xl font-headline font-bold text-navy-deep mb-8">
            ${CURRENCY}${f.price.toFixed(2)}
          </div>

          ${
            f.notes
              ? `
            <div class="bg-surface-container-low rounded-2xl p-6 border-l-4 border-coral-vibrant">
              <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Collector's Notes</h4>
              <p class="text-on-surface leading-relaxed italic">"${escapeHtml(f.notes)}"</p>
            </div>
          `
              : ""
          }
        </div>

        <div class="mt-auto pt-8">
          <button class="w-full py-5 px-8 rounded-2xl font-headline font-extrabold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 ${!isAvailable ? "bg-surface-container text-on-surface-variant cursor-not-allowed opacity-50" : isSelected ? "bg-navy-deep text-white shadow-xl" : "bg-coral-vibrant text-white shadow-xl shadow-coral-vibrant/20 hover:bg-[#ff8f66]"}" id="toggle-select-btn" type="button" ${!isAvailable ? "disabled" : ""}>
            <span class="material-symbols-outlined">${isSold ? "block" : isPending ? "schedule" : isSelected ? "check_circle" : "shopping_bag"}</span>
            ${isSold ? "Item Sold" : isPending ? "Sale Pending" : isSelected ? "✓ Added To List" : "Add To My List"}
          </button>
          ${isSelected ? `<p class="text-center text-sm text-on-surface-variant mt-4 font-medium">This item is in your list. Tap again to remove.</p>` : ""}
        </div>
      </div>
    </div>
  `;

  if (isAvailable) {
    document
      .getElementById("toggle-select-btn")
      .addEventListener("click", () => {
        toggleSelect(f.id);
        renderDetail(f);
      });
  }

  let current = 0;
  const imgEl = () => document.getElementById("carousel-img");
  const setIndex = (i) => {
    current = (i + images.length) % images.length;
    const el = imgEl();
    if (el) {
      el.style.opacity = 0;
      setTimeout(() => {
        el.src = images[current];
        el.style.opacity = 1;
      }, 150);
    }
    document.querySelectorAll("#carousel-dots button").forEach((dot, idx) => {
      const isActive = idx === current;
      dot.classList.toggle("bg-coral-vibrant", isActive);
      dot.classList.toggle("w-6", isActive);
      dot.classList.toggle("bg-surface-dim", !isActive);
      dot.classList.toggle("w-2.5", !isActive);
    });
  };

  if (images.length > 1) {
    document
      .getElementById("carousel-prev")
      .addEventListener("click", () => setIndex(current - 1));
    document
      .getElementById("carousel-next")
      .addEventListener("click", () => setIndex(current + 1));
    document.querySelectorAll("#carousel-dots button").forEach((dot) => {
      dot.addEventListener("click", () => setIndex(Number(dot.dataset.index)));
    });
  }

  // Tap/click the photo to open it full-screen
  if (images.length) {
    document.getElementById("carousel").addEventListener("click", () => {
      openLightbox(images, current);
    });
  }
}

/* =====================================================================
   LIGHTBOX (full-screen photo zoom)
   ===================================================================== */
function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  document
    .getElementById("lightbox-close")
    .addEventListener("click", closeLightbox);
  document
    .getElementById("lightbox-prev")
    .addEventListener("click", () => lightboxStep(-1));
  document
    .getElementById("lightbox-next")
    .addEventListener("click", () => lightboxStep(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") lightboxStep(-1);
    if (e.key === "ArrowRight") lightboxStep(1);
  });
}

function openLightbox(images, index) {
  lightboxState.images = images;
  lightboxState.index = index;

  const lightbox = document.getElementById("lightbox");
  document.getElementById("lightbox-img").src = images[index];

  const showNav = images.length > 1;
  document.getElementById("lightbox-prev").style.display = showNav
    ? "flex"
    : "none";
  document.getElementById("lightbox-next").style.display = showNav
    ? "flex"
    : "none";

  lightbox.classList.remove("hidden");
  lightbox.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  lightbox.classList.add("hidden");
  lightbox.classList.remove("flex");
  document.body.style.overflow = "";
}

function lightboxStep(delta) {
  const { images } = lightboxState;
  if (!images.length) return;
  lightboxState.index =
    (lightboxState.index + delta + images.length) % images.length;
  document.getElementById("lightbox-img").src = images[lightboxState.index];
}

/* =====================================================================
   SELECTION STATE
   ===================================================================== */
function loadSelection() {
  try {
    const raw = localStorage.getItem("funko-selection");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSelection() {
  localStorage.setItem("funko-selection", JSON.stringify([...selectedIds]));
}

function toggleSelect(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  saveSelection();
  renderDrawer();
  if (document.getElementById("grid")) renderGrid();
}

/* =====================================================================
   DRAWER
   ===================================================================== */
function renderDrawer() {
  const drawer = document.getElementById("drawer");
  const countEl = document.getElementById("drawer-count");
  const listEl = document.getElementById("drawer-list");
  const totalEl = document.getElementById("drawer-total");

  const items = [...selectedIds]
    .map((id) => ALL_FUNKOS.find((f) => f.id === id))
    .filter(Boolean);

  if (items.length === 0) {
    listEl.innerHTML = "";
    drawer.hidden = true;
    drawer.style.display = "none";
    document.body.classList.remove("pb-32");
    // Reset to collapsed so it doesn't reappear already-open next time
    const container = document.getElementById("drawer-container");
    const toggle = document.getElementById("drawer-toggle");
    container.classList.remove("drawer-open");
    toggle.setAttribute("aria-expanded", "false");
    return;
  }
  drawer.hidden = false;
  drawer.style.display = "";
  document.body.classList.add("pb-32");

  countEl.textContent = items.length;
  const total = items.reduce((sum, f) => sum + f.price, 0);
  totalEl.textContent = `${CURRENCY}${total.toFixed(2)}`;

  listEl.innerHTML = items
    .map(
      (f) => `
    <li class="flex items-center gap-4 bg-white/5 p-2 rounded-xl">
      <div class="w-12 h-12 bg-white rounded-lg flex-shrink-0 overflow-hidden ring-1 ring-white/10">
        ${
          f.images && f.images[0]
            ? `<img src="${escapeAttr(f.images[0])}" class="w-full h-full object-cover" onerror="this.style.visibility='hidden'">`
            : `<div class="w-full h-full flex items-center justify-center text-[8px] text-navy-deep font-bold leading-tight p-1 text-center">${escapeHtml(f.name)}</div>`
        }
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-white truncate">${escapeHtml(f.name)}</p>
        <p class="text-[10px] font-mono text-white/50 uppercase tracking-widest">${escapeHtml(f.series)}</p>
      </div>
      <div class="text-sm font-mono font-bold text-coral-vibrant">${CURRENCY}${f.price.toFixed(2)}</div>
      <button class="w-8 h-8 flex items-center justify-center text-white/40 hover:text-error transition-colors" data-id="${escapeAttr(f.id)}" aria-label="Remove item">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    </li>
  `,
    )
    .join("");

  listEl.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSelect(btn.dataset.id);
      const match = location.hash.match(/^#\/item\/(.+)$/);
      if (match && decodeURIComponent(match[1]) === btn.dataset.id) {
        const f = ALL_FUNKOS.find((x) => x.id === btn.dataset.id);
        if (f) renderDetail(f);
      }
    });
  });
}

function setupDrawerToggle() {
  const container = document.getElementById("drawer-container");
  const toggle = document.getElementById("drawer-toggle");

  toggle.addEventListener("click", () => {
    const isOpen = container.classList.toggle("drawer-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

/* =====================================================================
   SEND LIST — copies to clipboard only, no Messenger link
   ===================================================================== */
function setupSendButton() {
  document
    .getElementById("send-list-btn")
    .addEventListener("click", async () => {
      const text = buildSummaryText();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        showToast("List copied! Paste it wherever you'd like to send it.");
      } catch {
        showToast(
          "Couldn't copy automatically — please copy the list manually.",
        );
      }
    });
}

function buildSummaryText() {
  const items = [...selectedIds]
    .map((id) => ALL_FUNKOS.find((f) => f.id === id))
    .filter(Boolean);

  if (items.length === 0) return "";

  const lines = items.map(
    (f) => `- ${f.name} (${f.series}) — ${CURRENCY}${f.price.toFixed(2)}`,
  );
  const total = items.reduce((sum, f) => sum + f.price, 0);

  return [
    // "📦 Funko List:",
    ...lines,
    `Total: ${CURRENCY}${total.toFixed(2)}`,
  ].join("\n");
}

/* =====================================================================
   TOAST
   ===================================================================== */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("opacity-100", "-translate-y-0");
  toast.classList.remove("opacity-0", "translate-y-4");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-4");
    toast.classList.remove("opacity-100", "-translate-y-0");
  }, 3500);
}

/* =====================================================================
   HELPERS
   ===================================================================== */
function placeholderMarkup(name) {
  return `<div class="w-full h-full flex flex-col items-center justify-center p-6 text-center text-on-surface-variant/40 bg-surface-container-low">
    <span class="material-symbols-outlined text-4xl mb-2">image</span>
    <span class="text-xs font-mono uppercase tracking-widest">${escapeHtml(name)}</span>
  </div>`;
}

function placeholderNode(name) {
  const div = document.createElement("div");
  div.className =
    "w-full h-full flex flex-col items-center justify-center p-6 text-center text-on-surface-variant/40 bg-surface-container-low";
  div.innerHTML = `<span class="material-symbols-outlined text-4xl mb-2">image</span>
                   <span class="text-xs font-mono uppercase tracking-widest">${escapeHtml(name)}</span>`;
  return div;
}
window.placeholderNode = placeholderNode;

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str = "") {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
