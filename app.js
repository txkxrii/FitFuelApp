const todayKey = new Date().toISOString().slice(0, 10);
const storageKey = "fitfuel-pwa-state";

const defaultState = {
  profile: {
    name: "Sporter",
    goal: "Spiermassa opbouwen",
    height: 180,
    startWeight: 82,
    calorieGoal: 2600,
    proteinGoal: 160,
    carbsGoal: 280,
    fatGoal: 80
  },
  meals: [
    { id: crypto.randomUUID(), date: todayKey, type: "Ontbijt", name: "Griekse yoghurt met oats", calories: 540, protein: 42, carbs: 58, fat: 14 }
  ],
  workouts: [
    { id: crypto.randomUUID(), date: todayKey, workout: "Push day", exercise: "Bench press", sets: 4, reps: 8, weight: 70, rest: 90 }
  ],
  weights: [
    { id: crypto.randomUUID(), date: todayKey, weight: 82, note: "Startmeting" }
  ]
};

let installPrompt = null;
let state = loadState();
let scannerStream = null;
let scannerActive = false;
let detector = null;
let html5Scanner = null;
let html5ScannerRunning = false;
let scannerLibraryPromise = null;

const views = {
  dashboard: "Dashboard",
  food: "Foodtracker",
  gym: "Gymtracker",
  progress: "Progressie",
  profile: "Profiel"
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function number(value) {
  return Number(value || 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(dateString));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "short" }).format(new Date(dateString));
}

function dateKeyFromOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function lastDayKeys(count) {
  return Array.from({ length: count }, (_, index) => dateKeyFromOffset(count - index - 1));
}

function todayItems(items) {
  return items.filter((item) => item.date === todayKey);
}

function sum(items, field) {
  return items.reduce((total, item) => total + number(item[field]), 0);
}

function setMeter(id, value, goal) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  qs(id).style.width = `${percent}%`;
}

function renderLineChart(container, points, unit) {
  const width = 320;
  const height = 168;
  const padX = 28;
  const padY = 28;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;
  const values = points.map((point) => number(point.value));
  const max = Math.max(...values, 1);
  const min = values.every((value) => value === 0) ? 0 : Math.min(...values);
  const range = Math.max(max - min, 1);
  const baselineY = padY + plotHeight;
  const coords = points.map((point, index) => {
    const x = padX + (points.length === 1 ? plotWidth / 2 : (plotWidth / (points.length - 1)) * index);
    const y = values.every((value) => value === 0)
      ? baselineY
      : padY + plotHeight - ((number(point.value) - min) / range) * plotHeight;
    return { x, y, point };
  });
  const linePoints = coords.map((coord) => `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(" ");
  const areaPoints = `${padX},${baselineY} ${linePoints} ${padX + plotWidth},${baselineY}`;
  const topLabel = `${Math.round(max)}${unit}`;

  container.innerHTML = `
    <svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Lijngrafiek">
      <line class="line-grid" x1="${padX}" y1="${padY}" x2="${padX + plotWidth}" y2="${padY}"></line>
      <line class="line-grid" x1="${padX}" y1="${baselineY}" x2="${padX + plotWidth}" y2="${baselineY}"></line>
      <polygon class="line-area" points="${areaPoints}"></polygon>
      <polyline class="line-path" points="${linePoints}"></polyline>
      ${coords.map(({ x, y, point }) => `
        <circle class="line-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"></circle>
        <text class="line-day" x="${x.toFixed(1)}" y="${height - 7}" text-anchor="middle">${formatShortDate(point.date)}</text>
      `).join("")}
      <text class="line-value" x="${padX}" y="16">${topLabel}</text>
    </svg>
  `;
}

function renderMacroChart(container, meals) {
  const protein = sum(meals, "protein");
  const carbs = sum(meals, "carbs");
  const fat = sum(meals, "fat");
  const total = protein + carbs + fat;
  const safeTotal = total || 1;

  if (!total) {
    container.innerHTML = `<div class="empty">Nog geen macrodata voor vandaag.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="macro-total">
      <div>
        <span class="list-meta">Vandaag gelogd</span>
        <strong>${total}g</strong>
      </div>
      <span class="badge">${sum(meals, "calories")} kcal</span>
    </div>
    <div class="macro-stack" aria-label="Macro verdeling">
      <span class="macro-segment protein-bar" style="width:${(protein / safeTotal) * 100}%"></span>
      <span class="macro-segment carbs-bar" style="width:${(carbs / safeTotal) * 100}%"></span>
      <span class="macro-segment fat-bar" style="width:${(fat / safeTotal) * 100}%"></span>
    </div>
    <div class="macro-legend">
      <div class="legend-item"><span>Eiwit</span><strong>${protein}g</strong></div>
      <div class="legend-item"><span>Koolhydraten</span><strong>${carbs}g</strong></div>
      <div class="legend-item"><span>Vet</span><strong>${fat}g</strong></div>
    </div>
  `;
}

function renderTrendCharts() {
  const days = lastDayKeys(7);
  const caloriePoints = days.map((date) => ({
    date,
    value: sum(state.meals.filter((meal) => meal.date === date), "calories")
  }));
  const volumePoints = days.map((date) => ({
    date,
    value: state.workouts
      .filter((workout) => workout.date === date)
      .reduce((total, workout) => total + workout.sets * workout.reps * workout.weight, 0)
  }));

  renderLineChart(qs("#calorieChart"), caloriePoints, "");
  renderLineChart(qs("#volumeChart"), volumePoints, "kg");
  renderLineChart(qs("#progressCalorieChart"), caloriePoints, "");
}

function renderList(container, items, emptyText, itemTemplate) {
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  items.forEach((item) => {
    const element = document.createElement("article");
    element.className = "list-item";
    element.innerHTML = itemTemplate(item);
    container.appendChild(element);
  });
}

function renderDashboard() {
  const meals = todayItems(state.meals);
  const workouts = todayItems(state.workouts);
  const calories = sum(meals, "calories");
  const protein = sum(meals, "protein");
  const volume = workouts.reduce((total, item) => total + item.sets * item.reps * item.weight, 0);
  const latestWeight = state.weights.at(-1);
  const previousWeight = state.weights.at(-2);
  const calorieGoal = number(state.profile.calorieGoal);
  const proteinGoal = number(state.profile.proteinGoal);

  qs("#caloriesOut").value = calories;
  qs("#caloriesLeftOut").textContent = Math.max(0, calorieGoal - calories);
  qs("#proteinOut").value = protein;
  qs("#proteinGoalOut").textContent = proteinGoal;
  qs("#volumeOut").value = Math.round(volume);
  qs("#weightOut").value = latestWeight ? `${latestWeight.weight}kg` : "-";
  qs("#weightTrendOut").textContent = latestWeight && previousWeight
    ? `${(latestWeight.weight - previousWeight.weight).toFixed(1)}kg sinds vorige meting`
    : "Nog geen trend";

  setMeter("#calorieMeter", calories, calorieGoal);
  setMeter("#proteinMeter", protein, proteinGoal);
  setMeter("#volumeMeter", volume, 12000);
  setMeter("#weightMeter", latestWeight ? 70 : 0, 100);

  renderMacroChart(qs("#macroChart"), meals);
  renderTrendCharts();
  renderList(qs("#todayMeals"), meals, "Nog geen maaltijden voor vandaag.", mealTemplate);
  renderList(qs("#todayWorkouts"), workouts, "Nog geen workout voor vandaag.", workoutTemplate);
}

function mealTemplate(item) {
  const barcodeText = item.barcode ? ` · barcode ${escapeHtml(item.barcode)}` : "";
  return `
    <div>
      <strong>${escapeHtml(item.name)}</strong>
      <div class="list-meta">${escapeHtml(item.type)} · ${item.protein}g eiwit · ${item.carbs}g koolhydraten · ${item.fat}g vet${barcodeText}</div>
    </div>
    <div class="badge">${item.calories} kcal</div>
  `;
}

function workoutTemplate(item) {
  const volume = Math.round(item.sets * item.reps * item.weight);
  return `
    <div>
      <strong>${escapeHtml(item.exercise)}</strong>
      <div class="list-meta">${escapeHtml(item.workout)} · ${item.sets} sets x ${item.reps} reps · ${item.weight}kg · rust ${item.rest || 0}s</div>
    </div>
    <div class="badge blue">${volume}kg</div>
  `;
}

function recordTemplate(item) {
  return `
    <div>
      <strong>${escapeHtml(item.exercise)}</strong>
      <div class="list-meta">${escapeHtml(item.workout)} · ${formatDate(item.date)}</div>
    </div>
    <div class="badge green">${item.weight}kg</div>
  `;
}

function renderFood() {
  renderList(qs("#mealList"), [...state.meals].reverse(), "Je food log is nog leeg.", mealTemplate);
}

function renderGym() {
  renderList(qs("#workoutList"), [...state.workouts].reverse(), "Je workout log is nog leeg.", workoutTemplate);
}

function renderProgress() {
  const records = Object.values(state.workouts.reduce((best, item) => {
    if (!best[item.exercise] || number(item.weight) > number(best[item.exercise].weight)) {
      best[item.exercise] = item;
    }
    return best;
  }, {}));

  renderList(qs("#recordList"), records, "Nog geen persoonlijke records.", recordTemplate);
  renderMacroChart(qs("#progressMacroChart"), todayItems(state.meals));
  renderTrendCharts();
  renderWeightChart();
}

function renderWeightChart() {
  const chart = qs("#weightChart");
  chart.innerHTML = "";

  if (!state.weights.length) {
    chart.innerHTML = `<div class="empty">Log eerst je gewicht om een trend te zien.</div>`;
    return;
  }

  renderLineChart(
    chart,
    state.weights.slice(-8).map((item) => ({ date: item.date, value: item.weight })),
    "kg"
  );
}

function renderProfile() {
  const form = qs("#profileForm");
  Object.entries(state.profile).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
}

function renderAll() {
  renderDashboard();
  renderFood();
  renderGym();
  renderProgress();
  renderProfile();
}

function switchView(view) {
  if (view !== "food") stopScanner();
  qsa(".view").forEach((section) => section.classList.toggle("active", section.id === view));
  qsa(".nav-tab").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  qs("#pageTitle").textContent = views[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleMealSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.meals.push({
    id: crypto.randomUUID(),
    date: todayKey,
    type: data.type,
    name: data.name,
    calories: number(data.calories),
    protein: number(data.protein),
    carbs: number(data.carbs),
    fat: number(data.fat),
    barcode: data.barcode || ""
  });
  saveState();
  event.currentTarget.reset();
  renderAll();
}

function handleWorkoutSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.workouts.push({
    id: crypto.randomUUID(),
    date: todayKey,
    workout: data.workout,
    exercise: data.exercise,
    sets: number(data.sets),
    reps: number(data.reps),
    weight: number(data.weight),
    rest: number(data.rest)
  });
  saveState();
  event.currentTarget.reset();
  renderAll();
}

function handleWeightSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.weights.push({
    id: crypto.randomUUID(),
    date: todayKey,
    weight: number(data.weight),
    note: data.note
  });
  saveState();
  event.currentTarget.reset();
  renderAll();
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.profile = {
    name: data.name,
    goal: data.goal,
    height: number(data.height),
    startWeight: number(data.startWeight),
    calorieGoal: number(data.calorieGoal),
    proteinGoal: number(data.proteinGoal),
    carbsGoal: number(data.carbsGoal),
    fatGoal: number(data.fatGoal)
  };
  saveState();
  renderAll();
  switchView("dashboard");
}

function setScannerStatus(message) {
  qs("#scannerStatus").textContent = message;
}

function showScannerResult(html) {
  const result = qs("#scannerResult");
  result.innerHTML = html;
  result.classList.add("active");
}

function fillMealFormFromProduct(product) {
  const form = qs("#mealForm");
  form.elements.type.value = product.type || "Snack";
  form.elements.name.value = product.name;
  form.elements.calories.value = product.calories;
  form.elements.protein.value = product.protein;
  form.elements.carbs.value = product.carbs;
  form.elements.fat.value = product.fat;
  form.elements.barcode.value = product.barcode || "";
}

function stopScanner() {
  scannerActive = false;
  if (html5ScannerRunning && html5Scanner) {
    html5Scanner.stop()
      .then(() => html5Scanner.clear())
      .catch(() => {});
  }
  html5ScannerRunning = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  qs("#html5Scanner").hidden = true;
  qs("#scannerVideo").hidden = false;
  qs("#scannerVideo").srcObject = null;
}

async function lookupProductByBarcode(barcode) {
  const cleaned = String(barcode || "").trim();
  if (!cleaned) {
    setScannerStatus("Vul eerst een barcode in.");
    return;
  }

  setScannerStatus(`Barcode gevonden: ${cleaned}. Productgegevens zoeken...`);

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json?fields=product_name,nutriments,serving_quantity,serving_size,quantity`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      fillMealFormFromProduct({
        type: "Snack",
        name: `Product ${cleaned}`,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        barcode: cleaned
      });
      showScannerResult(`<strong>Geen product gevonden</strong><span class="list-meta">De barcode staat klaar in je maaltijdformulier. Vul de voedingswaarden handmatig aan.</span>`);
      setScannerStatus("Product niet gevonden. Je kunt het handmatig loggen.");
      return;
    }

    const nutriments = data.product.nutriments || {};
    const serving = Number.parseFloat(data.product.serving_quantity) || 100;
    const factor = serving / 100;
    const product = {
      type: "Snack",
      name: data.product.product_name || `Product ${cleaned}`,
      calories: Math.round(number(nutriments["energy-kcal_100g"]) * factor),
      protein: Math.round(number(nutriments.proteins_100g) * factor),
      carbs: Math.round(number(nutriments.carbohydrates_100g) * factor),
      fat: Math.round(number(nutriments.fat_100g) * factor),
      barcode: cleaned
    };

    fillMealFormFromProduct(product);
    showScannerResult(`
      <strong>${escapeHtml(product.name)}</strong>
      <span class="list-meta">${product.calories} kcal · ${product.protein}g eiwit · ${product.carbs}g koolhydraten · ${product.fat}g vet per ${serving}g</span>
    `);
    setScannerStatus("Product ingevuld. Controleer de waarden en sla de maaltijd op.");
  } catch {
    fillMealFormFromProduct({
      type: "Snack",
      name: `Product ${cleaned}`,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      barcode: cleaned
    });
    showScannerResult(`<strong>Geen verbinding met productdatabase</strong><span class="list-meta">De barcode is ingevuld. Voeg de voedingswaarden handmatig toe.</span>`);
    setScannerStatus("Productdatabase niet bereikbaar.");
  }
}

async function scanLoop() {
  if (!scannerActive || !detector) return;

  try {
    const codes = await detector.detect(qs("#scannerVideo"));
    if (codes.length) {
      scannerActive = false;
      stopScanner();
      await lookupProductByBarcode(codes[0].rawValue);
      return;
    }
  } catch {
    setScannerStatus("Scannen lukt niet met deze camera. Probeer de barcode handmatig.");
  }

  if (scannerActive) requestAnimationFrame(scanLoop);
}

function scannerFormats() {
  if (!window.Html5QrcodeSupportedFormats) return undefined;
  const formats = window.Html5QrcodeSupportedFormats;
  return [
    formats.EAN_13,
    formats.EAN_8,
    formats.UPC_A,
    formats.UPC_E,
    formats.CODE_128,
    formats.CODE_39
  ].filter(Boolean);
}

function loadHtml5ScannerLibrary() {
  if (window.Html5Qrcode) return Promise.resolve(true);
  if (scannerLibraryPromise) return scannerLibraryPromise;

  scannerLibraryPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => resolve(false), 6000);
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve(Boolean(window.Html5Qrcode));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scannerLibraryPromise;
}

async function startHtml5Scanner() {
  qs("#scannerVideo").hidden = true;
  qs("#html5Scanner").hidden = false;
  html5Scanner = html5Scanner || new Html5Qrcode("html5Scanner");
  html5ScannerRunning = true;
  setScannerStatus("Camera starten. Geef toestemming als je telefoon daarom vraagt.");

  await html5Scanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 280, height: 150 },
      aspectRatio: 1.777,
      formatsToSupport: scannerFormats()
    },
    async (decodedText) => {
      stopScanner();
      await lookupProductByBarcode(decodedText);
    },
    () => {}
  );

  setScannerStatus("Richt je camera op de barcode.");
}

async function startScanner() {
  qs("#scannerBox").hidden = false;
  qs("#scannerResult").classList.remove("active");
  qs("#scannerResult").innerHTML = "";

  if (!window.isSecureContext) {
    setScannerStatus("Camera is geblokkeerd op onbeveiligde adressen. Gebruik HTTPS, localhost op hetzelfde apparaat, of installeer de PWA.");
    return;
  }

  const hasHtml5Scanner = window.Html5Qrcode || await loadHtml5ScannerLibrary();

  if (hasHtml5Scanner) {
    try {
      await startHtml5Scanner();
      return;
    } catch {
      qs("#html5Scanner").hidden = true;
      qs("#scannerVideo").hidden = false;
      html5ScannerRunning = false;
      setScannerStatus("Live scanner kon niet starten. Ik probeer de native camera scanner.");
    }
  }

  if (!("BarcodeDetector" in window)) {
    setScannerStatus("Deze browser ondersteunt geen live barcode scanner. Gebruik Foto of vul de barcode handmatig in.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setScannerStatus("Camera toegang is niet beschikbaar. Vul de barcode handmatig in.");
    return;
  }

  try {
    detector = detector || new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    const video = qs("#scannerVideo");
    video.srcObject = scannerStream;
    await video.play();
    scannerActive = true;
    setScannerStatus("Richt je camera op de barcode.");
    requestAnimationFrame(scanLoop);
  } catch (error) {
    const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    setScannerStatus(denied
      ? "Camera toestemming is geweigerd of geblokkeerd. Gebruik HTTPS en geef camera toestemming."
      : "Camera kon niet starten. Gebruik Foto of vul de barcode handmatig in.");
  }
}

async function scanBarcodeImage(file) {
  if (!file) return;
  qs("#scannerBox").hidden = false;

  if (!("BarcodeDetector" in window)) {
    setScannerStatus("Foto scannen vraagt native BarcodeDetector ondersteuning. Vul de barcode handmatig in.");
    return;
  }

  try {
    detector = detector || new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    bitmap.close?.();

    if (!codes.length) {
      setScannerStatus("Geen barcode gevonden op de foto. Probeer dichterbij of vul hem handmatig in.");
      return;
    }

    await lookupProductByBarcode(codes[0].rawValue);
  } catch {
    setScannerStatus("Foto kon niet gelezen worden. Vul de barcode handmatig in.");
  }
}

function clearCollection(key) {
  state[key] = [];
  saveState();
  renderAll();
}

function bindEvents() {
  qsa(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  qsa("[data-shortcut]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.shortcut));
  });

  qs("#mealForm").addEventListener("submit", handleMealSubmit);
  qs("#workoutForm").addEventListener("submit", handleWorkoutSubmit);
  qs("#weightForm").addEventListener("submit", handleWeightSubmit);
  qs("#profileForm").addEventListener("submit", handleProfileSubmit);
  qs("#clearMeals").addEventListener("click", () => clearCollection("meals"));
  qs("#clearWorkouts").addEventListener("click", () => clearCollection("workouts"));
  qs("#startScanner").addEventListener("click", startScanner);
  qs("#stopScanner").addEventListener("click", stopScanner);
  qs("#lookupBarcode").addEventListener("click", () => lookupProductByBarcode(qs("#barcodeInput").value));
  qs("#barcodeImageInput").addEventListener("change", (event) => scanBarcodeImage(event.currentTarget.files?.[0]));
  qs("#barcodeInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      lookupProductByBarcode(event.currentTarget.value);
    }
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  qs("#installButton").hidden = false;
});

qs("#installButton").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  qs("#installButton").hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

qs("#todayLabel").textContent = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

bindEvents();
renderAll();
