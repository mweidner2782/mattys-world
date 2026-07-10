(() => {
  "use strict";

  const API = "/api/woodstock";
  const STORAGE = {
    pin: "woodstock.pinHash",
    owner: "woodstock.owner",
    device: "woodstock.deviceId",
    state: "woodstock.cachedState"
  };

  const contacts = [
    ["🔥", "Heat, boiler or hot water", "Bonestell Burners", "Ask for Rachel for scheduling; after-hours response is available.", ["8452470019", "8453324478"]],
    ["🚿", "Plumbing or leak", "Kelly Plumbing", "Kelly is primary. Ohayo Mountain is the backup and also services boilers.", ["8458535608", "8456793330"]],
    ["🏊", "Pool issue", "Pool Science · Errol", "Maintenance, opening and closing, heaters, leaks, and system repairs.", ["8454178594"]],
    ["⚡", "Electrical issue", "Krause Electric", "Use the verified office number.", ["8456885624"]],
    ["🔌", "Generator service", "Gen Plus", "Call if the whole-house generator does not start automatically.", ["8453395335"]],
    ["📺", "Wi-Fi, TV, Sonos or Savant", "Ambiance Systems", "Network, AV, Yale locks, Nest, Sonos, and Savant support.", ["5183730770"]],
    ["🐜", "Pests or insects", "Thomas Pest Services", "Routine service and infestations.", ["5184587378"]],
    ["🌲", "Landscaping or plowing", "Miseal", "Grounds maintenance and snow plowing.", ["8457509403"]],
    ["🧰", "General construction", "James Manuel Construction", "James is primary; Harmony Builders is the backup.", ["8456792664", "8458533058", "8454160232"]],
    ["🧺", "Appliance repair", "Earl B. Feiden Appliance", "The major appliances were purchased through Feiden.", ["8453312230"]],
    ["🚽", "Sewer backup or alarm", "Woodstock Water & Sewage", "Call for a sewer backup or sewage alarm.", ["8456792356"]],
    ["⛽", "Propane delivery or tank", "Suburban Propane", "Suburban owns and services the underground tank.", ["8453314957"]],
    ["💡", "Electric utility outage", "Central Hudson", "Utility outage and service issues.", ["8454522700"]],
    ["🗑️", "Garbage or recycling", "County Waste", "Weekly garbage and recycling service.", ["5188777007"]]
  ];

  const systems = {
    main: ["Main house", [
      ["Heating & cooling", "Three house zones", ["First-floor Nest near the back door", "Second-floor Nest in the hallway", "Separate bathroom heat zone", "First-floor AC from the Fujitsu mini-split under the stairs"]],
      ["Wood stove", "Open the flue first", ["Use only in heating season", "Keep screen and grate in place", "Never leave a fire unattended", "Close the flue only after embers are cold"]],
      ["Doors & shades", "Raise shades before opening", ["Release steel glass doors at top and bottom", "Open outward", "Anchor rods in patio holes", "Never open with shades lowered"]],
      ["TV & audio", "Savant, Apple TV, and Sonos", ["Use the universal remote", "Join Sonos through house Wi-Fi", "Choose rooms in the Sonos app", "Call Ambiance for programming"]],
      ["Kitchen", "Premium appliances", ["Fisher & Paykel refrigerator", "Wolf range and oven", "Dishwasher and microwave", "Call Feiden for appliance repair"]],
      ["Internet", "Spectrum + Ubiquiti", ["Indoor and outdoor Wi-Fi coverage", "Ambiance supports network hardware", "Password needed"]]
    ]],
    studio: ["Studio", [
      ["Heating", "Radiant floor zone", ["Controlled by the Nest near the bathroom/laundry door"]],
      ["Cooling", "Fujitsu mini-split", ["Unit is above the bookcase", "Point the remote directly at it"]],
      ["Laundry", "Stacked washer and dryer", ["Empty the dryer lint trap after every load"]],
      ["Doors", "Steel-framed glass doors", ["Raise shades first", "Release top and bottom", "Anchor the doors open"]],
      ["Bathroom", "Studio full bath", ["Shower-only bath", "Outdoor shower is seasonal"]],
      ["Media", "TV and sound", ["Uses the same Savant and Sonos system as the house"]]
    ]],
    pool: ["Pool", [
      ["Pool system", "Saline heated gunite pool", ["Pump and heater are automated", "Do not change manual controls unless directed by Pool Science"]],
      ["Normal schedule", "8 AM to 8 PM", ["Historic setting runs pump and heater during daytime", "Target temperature was approximately 80°F"]],
      ["Service", "Pool Science", ["Errol handles cleaning, opening, closing, leaks, heater, and repairs"]],
      ["Safety", "Secure the pool area", ["Keep access points secured", "Never leave children or guests unattended"]],
      ["Towels", "Use pool towels outside", ["Keep wet towels and suits off wood floors and furniture"]],
      ["Weather", "Storm preparation", ["Lower and tie umbrellas", "Remove loose items before wind or severe weather"]]
    ]],
    utilities: ["Utilities", [
      ["Propane", "Underground Suburban tank", ["Tank remains Suburban property", "Only Suburban should fill, alter, service, or remove it"]],
      ["Generator", "Automatic whole-house backup", ["Should start during an outage", "Should stop after utility power returns", "Call Gen Plus if it fails"]],
      ["Radon", "Active radon system", ["Retest every two years", "Confirm the system indicator stays in its normal range"]],
      ["Electrical", "Main panel and breakers", ["Do not work inside the panel", "A labeled circuit photo is still needed"]],
      ["Water", "Main shutoff", ["Exact shutoff location still needs a labeled photo and confirmation"]],
      ["Safety", "Basement work", ["Inspector recommended proper housings on exposed electrical boxes", "Add a handrail at the basement stairs"]]
    ]],
    grounds: ["Grounds", [
      ["Trash", "Thursday pickup", ["Bins are in the shed near the carport", "Roll out Wednesday night", "Return after pickup"]],
      ["Landscaping", "Weekly in season", ["Miseal handles lawn and grounds work subject to weather"]],
      ["Snow", "Plowing", ["Miseal is the first call", "Keep generator and propane access clear"]],
      ["Roof", "Annual inspection", ["Inspect screws, flashing, drainage, and overhangs", "Recheck after major storms"]],
      ["Grill", "Close propane after use", ["Turn burners off", "Close cylinder clockwise", "Replace cover after cooling"]],
      ["Pizza oven", "Wood-fired ALFA oven", ["Follow stored manufacturer instructions", "Let ashes cool completely"]]
    ]]
  };

  const photos = [
    "https://photos.zillowstatic.com/fp/992aebb961c3635577f1061ddf82a5e6-cc_ft_1536.webp",
    "https://photos.zillowstatic.com/fp/4a023cf02057f59d466e042f27970999-cc_ft_576.jpg",
    "https://photos.zillowstatic.com/fp/656dbc29ade56e5850109d30bbf5aac7-cc_ft_576.jpg",
    "https://photos.zillowstatic.com/fp/14eaeeeb93cb613958ceab07bb107210-cc_ft_576.jpg",
    "https://photos.zillowstatic.com/fp/d5fc4fef400b5698cd6214cdf54f3a46-cc_ft_576.jpg"
  ];

  const app = {
    pinHash: localStorage.getItem(STORAGE.pin) || "",
    owner: localStorage.getItem(STORAGE.owner) || "",
    deviceId: localStorage.getItem(STORAGE.device) || id("device"),
    state: readState(),
    publicKey: "",
    connected: false,
    view: "upcoming",
    activeSystem: "main",
    openMenu: null,
    deferredInstall: null,
    registration: null,
    poll: null
  };
  localStorage.setItem(STORAGE.device, app.deviceId);

  const el = (id) => document.getElementById(id);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];

  function id(prefix) {
    const value = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    return `${prefix}_${value.replaceAll("-", "").slice(0, 18)}`;
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE.state) || "null"); }
    catch { return null; }
  }

  function cacheState(state) {
    app.state = state;
    try { localStorage.setItem(STORAGE.state, JSON.stringify(state)); } catch {}
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function ownerName(owner) {
    return owner === "matt" ? "Matt" : owner === "sara" ? "Sara" : "Both";
  }

  function phone(value) {
    const d = String(value).replace(/\D/g, "");
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : value;
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function toast(message, error = false) {
    const node = document.createElement("div");
    node.className = `toast${error ? " error" : ""}`;
    node.textContent = message;
    el("toast-stack").appendChild(node);
    setTimeout(() => node.remove(), 4500);
  }

  function showModal(id) {
    el(id).classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => el(id).querySelector("input,button,select,textarea")?.focus(), 30);
  }

  function hideModal(id) {
    el(id).classList.add("hidden");
    if (!all(".modal-backdrop:not(.hidden)").length) document.body.classList.remove("modal-open");
  }

  async function request(action = "get", payload = {}, silent = false) {
    if (!app.pinHash || !app.owner) {
      if (!silent) showModal("unlock-modal");
      throw new Error("Unlock shared reminders first");
    }
    const response = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ action, payload, pinHash: app.pinHash, owner: app.owner, deviceId: app.deviceId })
    });
    let body;
    try { body = await response.json(); }
    catch { throw new Error("The reminder service returned an invalid response"); }
    if (!response.ok || !body?.ok) {
      if (response.status === 401) {
        localStorage.removeItem(STORAGE.pin);
        app.pinHash = "";
        app.connected = false;
      }
      throw new Error(body?.error || "Unable to update reminders");
    }
    app.connected = true;
    app.publicKey = body.publicKey || app.publicKey;
    if (body.state) cacheState(body.state);
    renderReminders();
    await sendWorkerConfig();
    return body;
  }

  function updateConnection() {
    const connected = Boolean(app.pinHash && app.owner && app.connected);
    el("connection-pill").classList.toggle("online", connected);
    el("connection-label").textContent = connected ? `Shared · ${ownerName(app.owner)}` : "Not connected";
    el("identity-avatar").textContent = app.owner ? app.owner[0].toUpperCase() : "?";
    el("identity-name").textContent = app.owner ? `${ownerName(app.owner)}’s phone` : "Not signed in";
    el("identity-detail").textContent = connected ? "Completing a task updates both phones" : "Shared reminders are locked on this device";
    el("add-task-top").disabled = !connected;
    el("add-task-button").disabled = !connected;
    el("test-push").disabled = !connected;

    if (!app.pinHash) {
      el("setup-title").textContent = "Connect this phone";
      el("setup-copy").textContent = "Choose Matt or Sara, enter the household PIN, and enable lock-screen notifications.";
      el("unlock-button").classList.remove("hidden");
    } else if (!app.connected) {
      el("setup-title").textContent = "Connecting shared reminders…";
      el("setup-copy").textContent = "The first connection may take a few seconds while the household service starts.";
      el("unlock-button").classList.add("hidden");
    } else {
      el("setup-title").textContent = "One shared list for Matt and Sara";
      el("setup-copy").textContent = "Done means done for both. Recurring tasks automatically move to their next due date.";
      el("unlock-button").classList.add("hidden");
    }
  }

  function nyParts(iso) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
  }

  function wallTimeToIso(dateValue, timeValue) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hour, minute] = timeValue.split(":").map(Number);
    let guess = Date.UTC(year, month - 1, day, hour, minute);
    for (let i = 0; i < 3; i += 1) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess));
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      const represented = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
      guess += Date.UTC(year, month - 1, day, hour, minute) - represented;
    }
    return new Date(guess).toISOString();
  }

  function formatDue(iso) {
    const date = new Date(iso);
    const today = nyParts(new Date().toISOString()).date;
    const tomorrow = nyParts(new Date(Date.now() + 86400000).toISOString()).date;
    const key = nyParts(iso).date;
    const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(date);
    if (key === today) return `Today at ${time}`;
    if (key === tomorrow) return `Tomorrow at ${time}`;
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined, hour: "numeric", minute: "2-digit" }).format(date);
  }

  function formatStamp(iso) {
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  }

  function recurrence(value) {
    if (!value || value.unit === "none") return "One time";
    const n = Number(value.interval) || 1;
    if (n === 1) return value.unit === "day" ? "Daily" : value.unit === "week" ? "Weekly" : value.unit === "month" ? "Monthly" : "Yearly";
    return `Every ${n} ${value.unit}s`;
  }

  function dueClass(task) {
    if (new Date(task.dueAt).getTime() < Date.now()) return "overdue";
    if (nyParts(task.dueAt).date === nyParts(new Date().toISOString()).date) return "today";
    return "";
  }

  function renderReminders() {
    updateConnection();
    const state = app.state;
    if (!state || !app.pinHash) {
      el("task-list").innerHTML = `<div class="empty"><span>🔒</span>Unlock the household reminder list to get started.</div>`;
      updateStats(null);
      renderDevices([]);
      return;
    }
    updateStats(state);
    renderDevices(state.devices || []);

    if (app.view === "activity") {
      const rows = state.activity || [];
      el("task-list").innerHTML = rows.length ? rows.map((item) => `<article class="card"><div class="task-title">${esc(item.text)}</div><div class="task-detail">${formatStamp(item.at)} · ${esc(ownerName(item.by))}</div></article>`).join("") : `<div class="empty"><span>◷</span>No activity yet.</div>`;
      return;
    }

    const tasks = (state.tasks || []).filter((task) => app.view === "completed" ? Boolean(task.completedAt) : task.active && !task.completedAt);
    if (!tasks.length) {
      el("task-list").innerHTML = `<div class="empty"><span>${app.view === "completed" ? "✓" : "🌿"}</span>${app.view === "completed" ? "No completed one-time reminders yet." : "Nothing is due. The house is caught up."}</div>`;
      return;
    }
    el("task-list").innerHTML = tasks.map(taskCard).join("");
    bindTaskRows();
  }

  function taskCard(task) {
    const assigned = task.assignedTo === "both" ? "Matt & Sara" : ownerName(task.assignedTo);
    const due = task.completedAt ? `Completed ${formatStamp(task.completedAt)}` : formatDue(task.dueAt);
    const last = task.lastCompletedAt ? `<span class="chip">Last done ${formatStamp(task.lastCompletedAt)}</span>` : "";
    return `<article class="task-card${task.completedAt ? " completed" : ""}" data-task="${esc(task.id)}">
      <button class="task-check" type="button" data-complete="${esc(task.id)}" aria-label="Mark done">${task.completedAt ? "✓" : ""}</button>
      <div><div class="task-title">${esc(task.title)}</div><div class="task-detail">${esc(task.details || "No notes")}</div><div class="task-meta"><span class="chip ${dueClass(task)}">◷ ${esc(due)}</span><span class="chip">↻ ${esc(recurrence(task.recurrence))}</span><span class="chip person">● ${esc(assigned)}</span><span class="chip">${esc(task.category || "House")}</span>${last}</div></div>
      <div class="task-menu"><button class="icon-button" type="button" data-menu="${esc(task.id)}">•••</button><div class="menu-pop${app.openMenu === task.id ? "" : " hidden"}">${task.completedAt ? "" : `<button type="button" data-snooze="${esc(task.id)}">Snooze 24 hours</button><button type="button" data-edit="${esc(task.id)}">Edit reminder</button>`}<button class="danger" type="button" data-delete="${esc(task.id)}">Delete reminder</button></div></div>
    </article>`;
  }

  function updateStats(state) {
    if (!state) {
      ["stat-due", "stat-week", "stat-devices"].forEach((id) => el(id).textContent = "—");
      el("status-copy").textContent = "Connect to see upcoming and completed work.";
      return;
    }
    const active = state.tasks.filter((task) => task.active && !task.completedAt);
    const week = active.filter((task) => new Date(task.dueAt).getTime() <= Date.now() + 7 * 86400000).length;
    el("stat-due").textContent = active.length;
    el("stat-week").textContent = week;
    el("stat-devices").textContent = (state.devices || []).length;
    el("status-copy").textContent = active.length ? `${active.length} active reminder${active.length === 1 ? "" : "s"}; ${week} due in the next seven days.` : "Everything is caught up.";
  }

  function renderDevices(devices) {
    el("device-list").innerHTML = devices.length ? devices.map((device) => `<div class="device"><span>📱</span><div><b>${esc(ownerName(device.owner))} · ${esc(device.label || "Phone")}</b><small>Connected ${formatStamp(device.lastSeenAt)}</small></div></div>`).join("") : `<div class="device"><span>📱</span><div><b>No phones connected yet</b><small>Enable notifications on Matt’s and Sara’s phones.</small></div></div>`;
  }

  function bindTaskRows() {
    all("[data-complete]").forEach((button) => button.addEventListener("click", () => completeTask(button.dataset.complete)));
    all("[data-menu]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); app.openMenu = app.openMenu === button.dataset.menu ? null : button.dataset.menu; renderReminders(); }));
    all("[data-snooze]").forEach((button) => button.addEventListener("click", () => snoozeTask(button.dataset.snooze)));
    all("[data-edit]").forEach((button) => button.addEventListener("click", () => openTask(button.dataset.edit)));
    all("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteTask(button.dataset.delete)));
  }

  async function completeTask(taskId) {
    try { const result = await request("completeTask", { taskId }); toast(result.message); }
    catch (error) { toast(error.message, true); }
  }

  async function snoozeTask(taskId) {
    app.openMenu = null;
    try { const result = await request("snoozeTask", { taskId, hours: 24 }); toast(result.message); }
    catch (error) { toast(error.message, true); }
  }

  async function deleteTask(taskId) {
    app.openMenu = null;
    const task = app.state?.tasks?.find((item) => item.id === taskId);
    if (!confirm(`Delete “${task?.title || "this reminder"}” from both phones?`)) return;
    try { const result = await request("deleteTask", { taskId }); toast(result.message); }
    catch (error) { toast(error.message, true); }
  }

  function openTask(taskId = "") {
    if (!app.connected) { showModal("unlock-modal"); return; }
    const task = app.state?.tasks?.find((item) => item.id === taskId);
    el("task-heading").textContent = task ? "Edit reminder" : "Add reminder";
    el("task-id").value = task?.id || "";
    el("task-title").value = task?.title || "";
    el("task-details").value = task?.details || "";
    el("task-category").value = task?.category || "House";
    el("task-assignee").value = task?.assignedTo || "both";
    el("task-repeat").value = task?.recurrence?.unit || "none";
    el("task-interval").value = String(task?.recurrence?.interval || 1);
    const parts = task ? nyParts(task.dueAt) : nyParts(new Date(Date.now() + 86400000).toISOString());
    el("task-date").value = parts.date;
    el("task-time").value = task ? parts.time : "09:00";
    el("task-error").classList.add("hidden");
    showModal("task-modal");
  }

  async function saveTask(event) {
    event.preventDefault();
    const existingId = el("task-id").value;
    const task = {
      id: existingId || id("task"),
      title: el("task-title").value.trim(),
      details: el("task-details").value.trim(),
      category: el("task-category").value,
      assignedTo: el("task-assignee").value,
      dueAt: wallTimeToIso(el("task-date").value, el("task-time").value),
      recurrence: { unit: el("task-repeat").value, interval: Number(el("task-interval").value) || 1 }
    };
    el("save-task").disabled = true;
    try {
      const result = await request(existingId ? "updateTask" : "addTask", { task });
      hideModal("task-modal");
      toast(result.message);
    } catch (error) {
      el("task-error").textContent = error.message;
      el("task-error").classList.remove("hidden");
    } finally { el("save-task").disabled = false; }
  }

  async function unlock(event) {
    event.preventDefault();
    const pin = el("pin-input").value.trim();
    const owner = new FormData(event.currentTarget).get("owner");
    if (!/^\d{6}$/.test(pin)) {
      el("pin-error").textContent = "Enter the six-digit household PIN.";
      el("pin-error").classList.remove("hidden");
      return;
    }
    app.pinHash = await sha256(pin);
    app.owner = owner === "sara" ? "sara" : "matt";
    localStorage.setItem(STORAGE.pin, app.pinHash);
    localStorage.setItem(STORAGE.owner, app.owner);
    updateConnection();
    try {
      await request("get");
      hideModal("unlock-modal");
      el("pin-input").value = "";
      el("pin-error").classList.add("hidden");
      toast(`Connected as ${ownerName(app.owner)}`);
      await reconnectSubscription();
      startPolling();
    } catch (error) {
      localStorage.removeItem(STORAGE.pin);
      app.pinHash = "";
      app.connected = false;
      el("pin-error").textContent = error.message;
      el("pin-error").classList.remove("hidden");
      updateConnection();
    }
  }

  async function refresh(silent = true) {
    if (!app.pinHash || !app.owner) return;
    try { await request("get", {}, silent); }
    catch (error) { app.connected = false; updateConnection(); if (!silent) toast(error.message, true); }
  }

  function startPolling() {
    clearInterval(app.poll);
    app.poll = setInterval(() => { if (document.visibilityState === "visible") refresh(true); }, 45000);
  }

  function renderStatic() {
    el("contact-grid").innerHTML = contacts.map(([icon, issue, vendor, note, numbers]) => `<article class="card contact"><div class="contact-icon">${icon}</div><h3>${esc(issue)}</h3><div class="vendor">${esc(vendor)}</div><p>${esc(note)}</p><div class="phones">${numbers.map((number) => `<a href="tel:+1${number}">${phone(number)}</a>`).join("")}</div></article>`).join("");
    el("system-tabs").innerHTML = Object.entries(systems).map(([key, [label]], index) => `<button class="tab${index === 0 ? " active" : ""}" type="button" data-system="${key}">${esc(label)}</button>`).join("");
    renderSystem("main");
    all("[data-system]").forEach((button) => button.addEventListener("click", () => { app.activeSystem = button.dataset.system; all("[data-system]").forEach((item) => item.classList.toggle("active", item === button)); renderSystem(app.activeSystem); }));
    el("gallery-grid").innerHTML = photos.map((url, index) => `<button class="photo" type="button" data-photo="${esc(url)}"><img src="${esc(url)}" loading="lazy" alt="Woodstock property photo ${index + 1}" onerror="this.parentElement.remove()"></button>`).join("");
    all("[data-photo]").forEach((button) => button.addEventListener("click", () => { el("lightbox-image").src = button.dataset.photo; el("lightbox").classList.add("open"); document.body.classList.add("modal-open"); }));
  }

  function renderSystem(key) {
    const cards = systems[key]?.[1] || [];
    el("system-grid").innerHTML = cards.map(([category, title, points]) => `<article class="card system-card"><span class="mini">${esc(category)}</span><h3>${esc(title)}</h3><ul>${points.map((point) => `<li>${esc(point)}</li>`).join("")}</ul></article>`).join("");
  }

  function standalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; }
  function ios() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

  function showInstall() {
    if (standalone()) {
      el("install-instructions").innerHTML = "Woodstock Home is already installed on this device. Open it from the Home Screen, then enable notifications.";
      el("native-install").classList.add("hidden");
    } else if (app.deferredInstall) {
      el("install-instructions").innerHTML = "Tap <b>Install app</b> below to add Woodstock Home to this device.";
      el("native-install").classList.remove("hidden");
    } else if (ios()) {
      el("install-instructions").innerHTML = "On iPhone or iPad, open this page in <b>Safari</b>, tap <b>Share</b>, choose <b>Add to Home Screen</b>, then open Woodstock Home from the new icon. Inside the installed app, tap <b>Enable notifications</b>.";
      el("native-install").classList.add("hidden");
    } else {
      el("install-instructions").innerHTML = "Open the browser menu and choose <b>Install app</b> or <b>Add to Home Screen</b>.";
      el("native-install").classList.add("hidden");
    }
    showModal("install-modal");
  }

  async function nativeInstall() {
    if (!app.deferredInstall) return;
    app.deferredInstall.prompt();
    await app.deferredInstall.userChoice;
    app.deferredInstall = null;
    hideModal("install-modal");
    updateInstallButtons();
  }

  function updateInstallButtons() {
    el("hero-install").classList.toggle("hidden", standalone());
    el("install-button").classList.toggle("hidden", standalone());
  }

  function base64Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
  }

  async function registerWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      app.registration = await navigator.serviceWorker.register("/woodstock/sw.js", { scope: "/woodstock/" });
      await navigator.serviceWorker.ready;
      await sendWorkerConfig();
    } catch (error) { console.error("Service worker registration failed", error); }
  }

  async function sendWorkerConfig() {
    if (!app.pinHash || !app.owner || !("serviceWorker" in navigator)) return;
    const registration = app.registration || await navigator.serviceWorker.ready.catch(() => null);
    const worker = registration?.active || registration?.waiting || registration?.installing || navigator.serviceWorker.controller;
    worker?.postMessage({ type: "SET_HOUSEHOLD_CONFIG", config: { pinHash: app.pinHash, owner: app.owner, deviceId: app.deviceId, apiUrl: API } });
  }

  function deviceLabel() {
    if (ios()) return /ipad/i.test(navigator.userAgent) ? "iPad" : "iPhone";
    if (/android/i.test(navigator.userAgent)) return "Android phone";
    if (/mac/i.test(navigator.userAgent)) return "Mac";
    if (/windows/i.test(navigator.userAgent)) return "Windows computer";
    return "Device";
  }

  function currentDevice() { return app.state?.devices?.find((item) => item.deviceId === app.deviceId); }

  async function updatePushUi() {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const status = el("push-status");
    const button = el("push-primary");
    if (!supported) { status.textContent = "This browser does not support web push notifications."; status.classList.add("error"); button.disabled = true; return; }
    if (ios() && !standalone()) { status.textContent = "On iPhone, add Woodstock Home to the Home Screen before enabling notifications."; status.classList.remove("error"); button.textContent = "Install first"; button.disabled = false; return; }
    const registration = app.registration || await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager?.getSubscription().catch(() => null);
    if (Notification.permission === "denied") { status.textContent = "Notifications are blocked in the browser settings for this app."; status.classList.add("error"); button.textContent = "Blocked"; button.disabled = true; }
    else if (subscription && currentDevice()) { status.textContent = `Notifications are on for ${ownerName(app.owner)} on this device.`; status.classList.remove("error"); button.textContent = "Notifications on"; button.disabled = false; el("push-copy").textContent = "Due reminders appear on the lock screen even when the app is closed."; }
    else { status.textContent = "Notifications are not enabled on this device."; status.classList.remove("error"); button.textContent = "Enable"; button.disabled = !app.connected; }
  }

  async function enablePush() {
    if (!app.connected) { showModal("unlock-modal"); return; }
    if (ios() && !standalone()) { showInstall(); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");
      const registration = app.registration || await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        if (!app.publicKey) await refresh(false);
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64Array(app.publicKey) });
      }
      const result = await request("subscribe", { subscription: subscription.toJSON(), label: deviceLabel() });
      toast(result.message);
      await sendWorkerConfig();
      await updatePushUi();
    } catch (error) { toast(error.message, true); await updatePushUi(); }
  }

  async function reconnectSubscription() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const registration = app.registration || await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager?.getSubscription().catch(() => null);
    if (!subscription) return;
    try { await request("subscribe", { subscription: subscription.toJSON(), label: deviceLabel() }, true); } catch {}
  }

  async function testPush() {
    try { const result = await request("testPush", { deviceId: app.deviceId }); toast(result.message); }
    catch (error) { toast(error.message, true); }
  }

  function closeLightbox() {
    el("lightbox").classList.remove("open");
    el("lightbox-image").src = "";
    document.body.classList.remove("modal-open");
  }

  function bindEvents() {
    all("[data-close]").forEach((button) => button.addEventListener("click", () => hideModal(button.dataset.close)));
    all(".modal-backdrop").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) hideModal(modal.id); }));
    el("unlock-form").addEventListener("submit", unlock);
    el("task-form").addEventListener("submit", saveTask);
    el("unlock-button").addEventListener("click", () => showModal("unlock-modal"));
    el("change-user").addEventListener("click", () => showModal("unlock-modal"));
    el("add-task-top").addEventListener("click", () => openTask());
    el("add-task-button").addEventListener("click", () => openTask());
    el("hero-install").addEventListener("click", showInstall);
    el("install-button").addEventListener("click", showInstall);
    el("native-install").addEventListener("click", nativeInstall);
    el("enable-push-button").addEventListener("click", enablePush);
    el("push-primary").addEventListener("click", () => ios() && !standalone() ? showInstall() : enablePush());
    el("test-push").addEventListener("click", testPush);
    all("[data-view]").forEach((button) => button.addEventListener("click", () => { app.view = button.dataset.view; all("[data-view]").forEach((item) => item.classList.toggle("active", item === button)); app.openMenu = null; renderReminders(); }));
    el("close-lightbox").addEventListener("click", closeLightbox);
    el("lightbox").addEventListener("click", (event) => { if (event.target === el("lightbox")) closeLightbox(); });
    document.addEventListener("click", (event) => { if (app.openMenu && !event.target.closest(".task-menu")) { app.openMenu = null; renderReminders(); } });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { refresh(true); updatePushUi(); } });
    window.addEventListener("online", () => refresh(true));
    window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); app.deferredInstall = event; updateInstallButtons(); });
    window.addEventListener("appinstalled", () => { app.deferredInstall = null; updateInstallButtons(); toast("Woodstock Home was installed"); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") { all(".modal-backdrop:not(.hidden)").forEach((modal) => hideModal(modal.id)); closeLightbox(); } });
  }

  async function init() {
    renderStatic();
    bindEvents();
    renderReminders();
    updateInstallButtons();
    await registerWorker();
    await updatePushUi();
    if (app.pinHash && app.owner) {
      await refresh(true);
      await reconnectSubscription();
      startPolling();
    }
  }

  init().catch((error) => { console.error(error); toast("Woodstock Home could not finish loading", true); });
})();
