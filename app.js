const todayKey = new Date().toISOString().slice(0, 10);
const storageKey = "fitfuel-pwa-state";
const settingsKey = "fitfuel-pwa-settings";

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
let uiSettings = loadUiSettings();
let scannerStream = null;
let scannerActive = false;
let detector = null;
let html5Scanner = null;
let html5ScannerRunning = false;
let scannerLibraryPromise = null;
let selectedProgramId = "beginner";

const views = {
  dashboard: "Dashboard",
  food: "Foodtracker",
  gym: "Gymtracker",
  progress: "Progressie",
  plan: "Plan",
  mealPlanner: "Eetplanner",
  feedback: "Feedback",
  profile: "Profiel"
};

const exactPlannerMeals = [
  {
    title: "Ontbijt",
    split: 0.25,
    foods: [
      { name: "Whey protein", unit: "droog", protein: 0.8, carbs: 0.07, fat: 0.06 },
      { name: "Havermout", unit: "droog", protein: 0.13, carbs: 0.6, fat: 0.07 },
      { name: "Pindakaas", unit: "gram", protein: 0.25, carbs: 0.2, fat: 0.5 }
    ],
    extra: { name: "Blauwe bessen", grams: 80 }
  },
  {
    title: "Lunch",
    split: 0.28,
    foods: [
      { name: "Kipfilet", unit: "bereid", protein: 0.31, carbs: 0, fat: 0.036 },
      { name: "Rijst", unit: "gekookt", protein: 0.027, carbs: 0.28, fat: 0.003 },
      { name: "Olijfolie", unit: "gram", protein: 0, carbs: 0, fat: 1 }
    ],
    extra: { name: "Broccoli", grams: 150 }
  },
  {
    title: "Diner",
    split: 0.32,
    foods: [
      { name: "Kalkoenfilet", unit: "bereid", protein: 0.29, carbs: 0, fat: 0.02 },
      { name: "Aardappelen", unit: "gekookt", protein: 0.02, carbs: 0.17, fat: 0.001 },
      { name: "Olijfolie", unit: "gram", protein: 0, carbs: 0, fat: 1 }
    ],
    extra: { name: "Groente naar keuze", grams: 200 }
  },
  {
    title: "Snack",
    split: 0.15,
    foods: [
      { name: "Skyr naturel", unit: "gram", protein: 0.11, carbs: 0.04, fat: 0.002 },
      { name: "Banaan", unit: "gram", protein: 0.011, carbs: 0.23, fat: 0.003 },
      { name: "Amandelen", unit: "gram", protein: 0.21, carbs: 0.22, fat: 0.5 }
    ],
    extra: null
  },
  {
    title: "Extra maaltijd",
    split: 0.12,
    foods: [
      { name: "Tonijn op water", unit: "uitgelekt", protein: 0.26, carbs: 0, fat: 0.01 },
      { name: "Volkoren wrap", unit: "gram", protein: 0.09, carbs: 0.5, fat: 0.08 },
      { name: "Avocado", unit: "gram", protein: 0.02, carbs: 0.09, fat: 0.15 }
    ],
    extra: { name: "Sla en komkommer", grams: 100 }
  }
];

const storeFoods = [
  {
    name: "Skyr of magere kwark",
    type: "Eiwit",
    macros: "250g · 25-30g eiwit",
    use: "Snel ontbijt of snack. Combineer met fruit of havermout.",
    tip: "Kies naturel als je suiker laag wilt houden."
  },
  {
    name: "Proteine pudding",
    type: "Eiwit",
    macros: "200g · 20g eiwit",
    use: "Handig als zoete snack na training of onderweg.",
    tip: "Check calorieen per bakje; smaken verschillen sterk."
  },
  {
    name: "Tonijn op water",
    type: "Eiwit",
    macros: "1 blik · 25-30g eiwit",
    use: "Goed in wraps, salade of op rijstwafels.",
    tip: "Neem zakjes of blikjes als noodvoorraad."
  },
  {
    name: "Gerookte kipfilet",
    type: "Eiwit",
    macros: "100g · 22-25g eiwit",
    use: "Direct klaar voor wraps, rijstbowls of salade.",
    tip: "Let op zout als je dit vaak gebruikt."
  },
  {
    name: "Maaltijdsalade met kip",
    type: "Complete maaltijd",
    macros: "1 bak · 400-700 kcal",
    use: "Makkelijke lunch als je weinig tijd hebt.",
    tip: "Gebruik minder dressing als vetten hoog uitvallen."
  },
  {
    name: "Magnetronrijst",
    type: "Koolhydraten",
    macros: "250g · 70-80g carbs",
    use: "Snelle basis voor kip, tonijn of roerbakgroente.",
    tip: "Kies naturel rijst voor betere controle over macro's."
  },
  {
    name: "Volkoren wraps",
    type: "Koolhydraten",
    macros: "1 wrap · 35-45g carbs",
    use: "Makkelijk met kip, tonijn, hummus of groente.",
    tip: "Handig voor mealprep zonder koken."
  },
  {
    name: "Voorgekookte aardappelen",
    type: "Koolhydraten",
    macros: "300g · 50g carbs",
    use: "Snel opbakken of in de airfryer.",
    tip: "Combineer met magere eiwitbron en groente."
  },
  {
    name: "Avocado cup of guacamole",
    type: "Vetten",
    macros: "70g · 10-15g vet",
    use: "Voor gezonde vetten bij wraps of bowls.",
    tip: "Weeg dit, vetten lopen snel op."
  },
  {
    name: "Ongezouten notenmix",
    type: "Vetten",
    macros: "30g · 15-18g vet",
    use: "Compacte calorieen als je bulk of veel energie nodig hebt.",
    tip: "Gebruik kleine porties; 30g is vaak genoeg."
  },
  {
    name: "Kant-en-klare omelet of gekookte eieren",
    type: "Eiwit en vet",
    macros: "2 eieren · 12g eiwit · 10g vet",
    use: "Snelle snack of ontbijt zonder koken.",
    tip: "Combineer met brood of fruit als je carbs mist."
  },
  {
    name: "Sushi of poke bowl",
    type: "Complete maaltijd",
    macros: "1 portie · 500-800 kcal",
    use: "Goede snelle maaltijd met rijst en vis/kip.",
    tip: "Kies extra eiwit als je eiwitdoel hoog is."
  }
];

const trainingOptions = [
  {
    id: "strength",
    title: "Krachtgym",
    tag: "Spiermassa",
    match: ["strength", "fatloss"],
    details: "Kies een gym met squat rack, benches, dumbbells tot minimaal 40kg en vrije gewichten.",
    search: "kracht gym"
  },
  {
    id: "pilates",
    title: "Pilates studio",
    tag: "Core & houding",
    match: ["pilates", "fatloss"],
    details: "Zoek reformer pilates als je begeleiding en weerstand wilt. Mat pilates is laagdrempeliger.",
    search: "pilates studio"
  },
  {
    id: "hyrox",
    title: "Hyrox training",
    tag: "Conditie & kracht",
    match: ["hyrox", "fatloss"],
    details: "Let op sled push/pull, ski-erg, rower, wall balls en functionele groepslessen.",
    search: "hyrox gym"
  },
  {
    id: "crossfit",
    title: "Functional training",
    tag: "Explosief",
    match: ["hyrox", "strength"],
    details: "Sterk alternatief als je met coaches, intervals en compound bewegingen wilt trainen.",
    search: "functional training gym"
  }
];

const gymPrograms = [
  {
    id: "beginner",
    title: "Beginner",
    frequency: "3 dagen per week",
    goal: "Techniek, basisconditie en full-body kracht",
    note: "Rust minimaal 1 dag tussen sessies. Start licht en verhoog pas als je reps strak blijven.",
    days: [
      {
        title: "Full body A",
        exercises: [
          { name: "Goblet squat", sets: "3", reps: "10", focus: "benen" },
          { name: "Dumbbell bench press", sets: "3", reps: "10", focus: "borst" },
          { name: "Lat pulldown", sets: "3", reps: "12", focus: "rug" },
          { name: "Romanian deadlift", sets: "3", reps: "10", focus: "hamstrings" },
          { name: "Plank", sets: "3", reps: "30 sec", focus: "core" }
        ]
      },
      {
        title: "Full body B",
        exercises: [
          { name: "Leg press", sets: "3", reps: "12", focus: "benen" },
          { name: "Seated row", sets: "3", reps: "12", focus: "rug" },
          { name: "Shoulder press machine", sets: "3", reps: "10", focus: "schouders" },
          { name: "Hamstring curl", sets: "3", reps: "12", focus: "hamstrings" },
          { name: "Cable crunch", sets: "3", reps: "12", focus: "core" }
        ]
      },
      {
        title: "Full body C",
        exercises: [
          { name: "Squat patroon", sets: "3", reps: "8", focus: "benen" },
          { name: "Incline dumbbell press", sets: "3", reps: "10", focus: "borst" },
          { name: "Assisted pull-up", sets: "3", reps: "8", focus: "rug" },
          { name: "Hip thrust", sets: "3", reps: "10", focus: "glutes" },
          { name: "Side plank", sets: "3", reps: "30 sec", focus: "core" }
        ]
      }
    ]
  },
  {
    id: "intermediate",
    title: "Intermediate",
    frequency: "4 dagen per week",
    goal: "Meer volume met upper/lower split",
    note: "Train met 1 tot 2 reps in reserve. Houd progressie bij per oefening.",
    days: [
      {
        title: "Upper 1",
        exercises: [
          { name: "Bench press", sets: "4", reps: "6-8", focus: "borst" },
          { name: "Barbell row", sets: "4", reps: "8", focus: "rug" },
          { name: "Overhead press", sets: "3", reps: "8", focus: "schouders" },
          { name: "Lat pulldown", sets: "3", reps: "10", focus: "rug" },
          { name: "Triceps rope pushdown", sets: "3", reps: "12", focus: "triceps" },
          { name: "Dumbbell curl", sets: "3", reps: "12", focus: "biceps" }
        ]
      },
      {
        title: "Lower 1",
        exercises: [
          { name: "Back squat", sets: "4", reps: "6-8", focus: "benen" },
          { name: "Romanian deadlift", sets: "4", reps: "8", focus: "hamstrings" },
          { name: "Leg press", sets: "3", reps: "10", focus: "quads" },
          { name: "Leg curl", sets: "3", reps: "12", focus: "hamstrings" },
          { name: "Calf raise", sets: "4", reps: "12", focus: "kuiten" }
        ]
      },
      {
        title: "Upper 2",
        exercises: [
          { name: "Incline dumbbell press", sets: "4", reps: "8", focus: "borst" },
          { name: "Pull-up of assisted pull-up", sets: "4", reps: "6-10", focus: "rug" },
          { name: "Seated cable row", sets: "3", reps: "10", focus: "rug" },
          { name: "Lateral raise", sets: "4", reps: "12", focus: "schouders" },
          { name: "Face pull", sets: "3", reps: "15", focus: "achterkant schouder" }
        ]
      },
      {
        title: "Lower 2",
        exercises: [
          { name: "Deadlift", sets: "3", reps: "5", focus: "posterior chain" },
          { name: "Front squat", sets: "3", reps: "8", focus: "quads" },
          { name: "Bulgarian split squat", sets: "3", reps: "10 per kant", focus: "benen" },
          { name: "Hip thrust", sets: "3", reps: "10", focus: "glutes" },
          { name: "Hanging knee raise", sets: "3", reps: "12", focus: "core" }
        ]
      }
    ]
  },
  {
    id: "advanced",
    title: "Advanced",
    frequency: "5-6 dagen per week",
    goal: "Push/pull/legs met hogere intensiteit",
    note: "Gebruik dit alleen als herstel, slaap en voeding op orde zijn. Deload elke 4 tot 6 weken.",
    days: [
      {
        title: "Push kracht",
        exercises: [
          { name: "Bench press", sets: "5", reps: "5", focus: "borst" },
          { name: "Incline press", sets: "4", reps: "8", focus: "borst" },
          { name: "Weighted dips", sets: "3", reps: "8", focus: "borst/triceps" },
          { name: "Shoulder press", sets: "4", reps: "6", focus: "schouders" },
          { name: "Lateral raise", sets: "4", reps: "15", focus: "schouders" },
          { name: "Triceps extension", sets: "4", reps: "12", focus: "triceps" }
        ]
      },
      {
        title: "Pull kracht",
        exercises: [
          { name: "Deadlift", sets: "4", reps: "4", focus: "rug/hamstrings" },
          { name: "Weighted pull-up", sets: "4", reps: "6", focus: "rug" },
          { name: "Barbell row", sets: "4", reps: "8", focus: "rug" },
          { name: "Chest-supported row", sets: "3", reps: "10", focus: "rug" },
          { name: "Rear delt fly", sets: "4", reps: "15", focus: "achterkant schouder" },
          { name: "Hammer curl", sets: "4", reps: "10", focus: "biceps" }
        ]
      },
      {
        title: "Legs kracht",
        exercises: [
          { name: "Back squat", sets: "5", reps: "5", focus: "benen" },
          { name: "Romanian deadlift", sets: "4", reps: "8", focus: "hamstrings" },
          { name: "Hack squat", sets: "4", reps: "10", focus: "quads" },
          { name: "Leg curl", sets: "4", reps: "12", focus: "hamstrings" },
          { name: "Calf raise", sets: "5", reps: "12", focus: "kuiten" },
          { name: "Ab wheel", sets: "3", reps: "10", focus: "core" }
        ]
      },
      {
        title: "Push hypertrofie",
        exercises: [
          { name: "Incline dumbbell press", sets: "4", reps: "10", focus: "borst" },
          { name: "Machine chest press", sets: "3", reps: "12", focus: "borst" },
          { name: "Cable fly", sets: "3", reps: "15", focus: "borst" },
          { name: "Seated lateral raise", sets: "4", reps: "15", focus: "schouders" },
          { name: "Overhead triceps cable", sets: "4", reps: "12", focus: "triceps" }
        ]
      },
      {
        title: "Pull hypertrofie",
        exercises: [
          { name: "Lat pulldown", sets: "4", reps: "10", focus: "rug" },
          { name: "Cable row", sets: "4", reps: "12", focus: "rug" },
          { name: "Single-arm dumbbell row", sets: "3", reps: "12 per kant", focus: "rug" },
          { name: "Face pull", sets: "4", reps: "15", focus: "achterkant schouder" },
          { name: "Preacher curl", sets: "4", reps: "12", focus: "biceps" }
        ]
      },
      {
        title: "Legs hypertrofie",
        exercises: [
          { name: "Front squat", sets: "4", reps: "8", focus: "quads" },
          { name: "Leg press", sets: "4", reps: "12", focus: "benen" },
          { name: "Walking lunge", sets: "3", reps: "12 per kant", focus: "benen" },
          { name: "Seated leg curl", sets: "4", reps: "12", focus: "hamstrings" },
          { name: "Standing calf raise", sets: "5", reps: "15", focus: "kuiten" }
        ]
      }
    ]
  }
];

const motivationQuotes = [
  {
    title: "Discipline boven motivatie.",
    quote: "Je hoeft geen zin te hebben. Je hoeft alleen te beginnen.",
    source: "Hard work mindset"
  },
  {
    title: "Blijf harder dan je excuses.",
    quote: "De sessie die je bijna overslaat, bouwt vaak het meeste karakter.",
    source: "Endurance mindset"
  },
  {
    title: "Comfort bouwt geen lichaam.",
    quote: "Kies de set, de maaltijd en de herhaling die past bij je doel.",
    source: "Performance mindset"
  },
  {
    title: "Maak het simpel. Doe het strak.",
    quote: "Log je voeding, train gecontroleerd, kom morgen sterker terug.",
    source: "FitFuel mindset"
  },
  {
    title: "Geen onderhandeling vandaag.",
    quote: "Je plan staat vast. Je uitvoering bepaalt het verschil.",
    source: "Discipline mindset"
  },
  {
    title: "Verdien je progressie.",
    quote: "Elke rep en elke keuze telt. Kleine discipline stapelt snel op.",
    source: "Strength mindset"
  },
  {
    title: "Werk als niemand kijkt.",
    quote: "Resultaat komt van herhaling, niet van perfecte omstandigheden.",
    source: "Training mindset"
  }
];

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

function loadUiSettings() {
  const saved = localStorage.getItem(settingsKey);
  if (!saved) return { layout: "app" };

  try {
    const settings = JSON.parse(saved);
    return {
      layout: settings.layout === "web" ? "web" : "app"
    };
  } catch {
    return { layout: "app" };
  }
}

function saveUiSettings() {
  localStorage.setItem(settingsKey, JSON.stringify(uiSettings));
}

function applyUiSettings() {
  document.body.dataset.layout = uiSettings.layout;
  qs("meta[name='theme-color']").setAttribute("content", "#f3f1ec");

  const layoutToggle = qs("#layoutToggle");

  if (layoutToggle) {
    const webMode = uiSettings.layout === "web";
    layoutToggle.textContent = webMode ? "Appversie" : "Webversie";
    layoutToggle.setAttribute("aria-pressed", String(webMode));
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

function percent(value, goal) {
  return goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
}

function renderMotivation() {
  const index = new Date(todayKey).getDate() % motivationQuotes.length;
  const item = motivationQuotes[index];
  qs("#dashboard-title").textContent = item.title;
  qs("#motivationQuote").textContent = item.quote;
  qs("#motivationSource").textContent = item.source;
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
  const caloriePercent = percent(calories, calorieGoal);
  const proteinPercent = percent(protein, proteinGoal);
  const volumeGoal = 12000;

  qs("#caloriesOut").value = calories;
  qs("#caloriesLeftOut").textContent = Math.max(0, calorieGoal - calories);
  qs("#calorieGoalOut").textContent = calorieGoal;
  qs("#caloriePercentOut").textContent = `${caloriePercent}%`;
  qs("#proteinOut").value = protein;
  qs("#proteinLeftOut").textContent = Math.max(0, proteinGoal - protein);
  qs("#proteinGoalOut").textContent = proteinGoal;
  qs("#proteinPercentOut").textContent = `${proteinPercent}%`;
  qs("#volumeOut").value = Math.round(volume);
  qs("#workoutCountOut").textContent = `${workouts.length} ${workouts.length === 1 ? "log" : "logs"}`;
  qs("#volumeStatusOut").textContent = workouts.length
    ? `${Math.round(percent(volume, volumeGoal))}% van dagvolume`
    : "Nog geen training gelogd";
  qs("#weightOut").value = latestWeight ? `${latestWeight.weight}kg` : "-";
  qs("#weightDateOut").textContent = latestWeight ? formatDate(latestWeight.date) : "Geen log";
  qs("#weightTrendOut").textContent = latestWeight && previousWeight
    ? `${(latestWeight.weight - previousWeight.weight).toFixed(1)}kg sinds vorige meting`
    : "Nog geen trend";

  setMeter("#calorieMeter", calories, calorieGoal);
  setMeter("#proteinMeter", protein, proteinGoal);
  setMeter("#volumeMeter", volume, volumeGoal);
  setMeter("#weightMeter", latestWeight ? 70 : 0, 100);

  renderMotivation();
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

function renderTrainingRecommendations() {
  const goal = qs("#trainingGoal")?.value || "strength";
  const location = qs("#trainingLocation")?.value.trim();
  const matches = trainingOptions.filter((option) => option.match.includes(goal));
  const fallback = trainingOptions.filter((option) => !option.match.includes(goal)).slice(0, 1);
  const options = [...matches, ...fallback].slice(0, 3);
  const container = qs("#trainingRecommendations");

  container.innerHTML = options.map((option) => {
    const query = encodeURIComponent(`${option.search} ${location || "in de buurt"}`);
    return `
      <article class="recommendation-card">
        <div>
          <span class="plan-tag">${escapeHtml(option.tag)}</span>
          <h3>${escapeHtml(option.title)}</h3>
          <p>${escapeHtml(option.details)}</p>
        </div>
        <a class="ghost-button small" href="https://www.google.com/maps/search/${query}" target="_blank" rel="noreferrer">Maps</a>
      </article>
    `;
  }).join("");
}

function renderGymPrograms() {
  const tabs = qs("#programTabs");
  const details = qs("#programDetails");
  if (!tabs || !details) return;

  tabs.innerHTML = gymPrograms.map((program) => `
    <button class="program-tab-button" type="button" data-program="${program.id}" aria-pressed="${program.id === selectedProgramId}">
      <strong>${escapeHtml(program.title)}</strong>
      <span>${escapeHtml(program.frequency)}</span>
    </button>
  `).join("");

  const program = gymPrograms.find((item) => item.id === selectedProgramId) || gymPrograms[0];
  details.innerHTML = `
    <article class="program-card">
      <div class="program-summary">
        <div>
          <span class="plan-tag">${escapeHtml(program.frequency)}</span>
          <h3>${escapeHtml(program.title)} schema</h3>
          <p>${escapeHtml(program.goal)}</p>
        </div>
        <small>${escapeHtml(program.note)}</small>
      </div>
      <div class="program-day-grid">
        ${program.days.map((day) => `
          <section class="program-day">
            <h4>${escapeHtml(day.title)}</h4>
            <div class="exercise-list">
              ${day.exercises.map((exercise) => `
                <div class="exercise-row">
                  <div>
                    <strong>${escapeHtml(exercise.name)}</strong>
                    <span>${escapeHtml(exercise.focus)}</span>
                  </div>
                  <small>${escapeHtml(exercise.sets)} x ${escapeHtml(exercise.reps)}</small>
                </div>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function solveThreeFoods(target, foods) {
  const [a, b, c] = foods;
  const matrix = [
    [a.protein, b.protein, c.protein],
    [a.carbs, b.carbs, c.carbs],
    [a.fat, b.fat, c.fat]
  ];
  const det =
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

  if (Math.abs(det) < 0.0001) return null;

  const detFor = (column, values) => {
    const m = matrix.map((row) => [...row]);
    m[0][column] = values[0];
    m[1][column] = values[1];
    m[2][column] = values[2];
    return (
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
  };

  const values = [target.protein, target.carbs, target.fat];
  return foods.map((food, index) => ({
    ...food,
    grams: Math.max(0, Math.round(detFor(index, values) / det))
  }));
}

function macrosForFoods(items) {
  return items.reduce((total, item) => ({
    protein: total.protein + item.grams * item.protein,
    carbs: total.carbs + item.grams * item.carbs,
    fat: total.fat + item.grams * item.fat
  }), { protein: 0, carbs: 0, fat: 0 });
}

function plannerTargetsFromForm(form) {
  const data = Object.fromEntries(new FormData(form));
  return {
    calories: number(data.calories),
    protein: number(data.protein),
    carbs: number(data.carbs),
    fat: number(data.fat),
    meals: number(data.meals) || 4
  };
}

function buildExactPlan(target) {
  const selected = exactPlannerMeals.slice(0, target.meals);
  const splitTotal = selected.reduce((total, meal) => total + meal.split, 0);

  const meals = selected.map((meal) => {
    const ratio = meal.split / splitTotal;
    const mealTarget = {
      calories: target.calories * ratio,
      protein: target.protein * ratio,
      carbs: target.carbs * ratio,
      fat: target.fat * ratio
    };
    const foods = solveThreeFoods(mealTarget, meal.foods) || [];
    const totals = macrosForFoods(foods);

    return { ...meal, target: mealTarget, foods, totals };
  });

  const totals = meals.reduce((sumTotal, meal) => ({
    protein: sumTotal.protein + meal.totals.protein,
    carbs: sumTotal.carbs + meal.totals.carbs,
    fat: sumTotal.fat + meal.totals.fat
  }), { protein: 0, carbs: 0, fat: 0 });

  totals.calories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  return { meals, totals };
}

function renderExactPlanner(target) {
  const plan = buildExactPlan(target);
  const diff = {
    calories: Math.round(plan.totals.calories - target.calories),
    protein: Math.round(plan.totals.protein - target.protein),
    carbs: Math.round(plan.totals.carbs - target.carbs),
    fat: Math.round(plan.totals.fat - target.fat)
  };

  qs("#exactPlannerSummary").innerHTML = `
    <div class="plan-summary exact-summary-grid">
      <span>${Math.round(plan.totals.calories)}/${target.calories} kcal <small>${diff.calories >= 0 ? "+" : ""}${diff.calories}</small></span>
      <span>${Math.round(plan.totals.protein)}/${target.protein}g eiwit <small>${diff.protein >= 0 ? "+" : ""}${diff.protein}</small></span>
      <span>${Math.round(plan.totals.carbs)}/${target.carbs}g carbs <small>${diff.carbs >= 0 ? "+" : ""}${diff.carbs}</small></span>
      <span>${Math.round(plan.totals.fat)}/${target.fat}g vet <small>${diff.fat >= 0 ? "+" : ""}${diff.fat}</small></span>
    </div>
  `;

  const todayFoods = plan.meals.flatMap((meal) => [
    ...meal.foods
      .filter((food) => food.grams > 0)
      .map((food) => ({
        meal: meal.title,
        name: food.name,
        grams: food.grams,
        note: food.unit
      })),
    ...(meal.extra ? [{
      meal: meal.title,
      name: meal.extra.name,
      grams: meal.extra.grams,
      note: "extra volume"
    }] : [])
  ]);

  qs("#todayFoodList").innerHTML = `
    <div class="today-food-head">
      <strong>Alle voeding voor vandaag</strong>
      <small>${todayFoods.length} producten gebaseerd op jouw macro-invoer</small>
    </div>
    <div class="today-food-grid">
      ${todayFoods.map((food) => `
        <div class="today-food-row">
          <div>
            <strong>${escapeHtml(food.name)}</strong>
            <span>${escapeHtml(food.meal)} · ${escapeHtml(food.note)}</span>
          </div>
          <output>${food.grams}g</output>
        </div>
      `).join("")}
    </div>
  `;

  qs("#exactPlannerOutput").innerHTML = plan.meals.map((meal) => `
    <article class="exact-meal-card">
      <div class="exact-meal-head">
        <div>
          <span class="plan-tag">${Math.round(meal.target.calories)} kcal</span>
          <h3>${escapeHtml(meal.title)}</h3>
        </div>
        <small>${Math.round(meal.totals.protein)}g eiwit · ${Math.round(meal.totals.carbs)}g carbs · ${Math.round(meal.totals.fat)}g vet</small>
      </div>
      <div class="ingredient-list">
        ${meal.foods.map((food) => `
          <div class="ingredient-row">
            <span>${escapeHtml(food.name)} <small>${escapeHtml(food.unit)}</small></span>
            <strong>${food.grams}g</strong>
          </div>
        `).join("")}
        ${meal.extra ? `
          <div class="ingredient-row muted-row">
            <span>${escapeHtml(meal.extra.name)} <small>vrij laag in kcal</small></span>
            <strong>${meal.extra.grams}g</strong>
          </div>
        ` : ""}
      </div>
    </article>
  `).join("");
}

function fillPlannerFromProfile() {
  const form = qs("#exactPlannerForm");
  if (!form) return;
  form.elements.calories.value = state.profile.calorieGoal;
  form.elements.protein.value = state.profile.proteinGoal;
  form.elements.carbs.value = state.profile.carbsGoal;
  form.elements.fat.value = state.profile.fatGoal;
}

function renderStoreFoods() {
  const container = qs("#storeFoodGrid");
  if (!container) return;

  container.innerHTML = storeFoods.map((food) => `
    <article class="store-food-card">
      <div>
        <span class="plan-tag">${escapeHtml(food.type)}</span>
        <h3>${escapeHtml(food.name)}</h3>
        <p>${escapeHtml(food.use)}</p>
      </div>
      <div class="store-food-meta">
        <strong>${escapeHtml(food.macros)}</strong>
        <small>${escapeHtml(food.tip)}</small>
      </div>
    </article>
  `).join("");
}

function renderPlan() {
  renderTrainingRecommendations();
  renderGymPrograms();
}

function renderMealPlanner() {
  fillPlannerFromProfile();
  renderExactPlanner(plannerTargetsFromForm(qs("#exactPlannerForm")));
  renderStoreFoods();
}

function renderAll() {
  renderDashboard();
  renderFood();
  renderGym();
  renderProgress();
  renderPlan();
  renderMealPlanner();
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
  qs("#exactPlannerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderExactPlanner(plannerTargetsFromForm(event.currentTarget));
  });
  qs("#useProfileMacros").addEventListener("click", () => {
    fillPlannerFromProfile();
    renderExactPlanner(plannerTargetsFromForm(qs("#exactPlannerForm")));
  });
  qs("#clearMeals").addEventListener("click", () => clearCollection("meals"));
  qs("#clearWorkouts").addEventListener("click", () => clearCollection("workouts"));
  qs("#layoutToggle").addEventListener("click", () => {
    uiSettings.layout = uiSettings.layout === "web" ? "app" : "web";
    saveUiSettings();
    applyUiSettings();
  });
  qs("#findTrainingButton").addEventListener("click", renderTrainingRecommendations);
  qs("#trainingGoal").addEventListener("change", renderTrainingRecommendations);
  qs("#programTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-program]");
    if (!button) return;
    selectedProgramId = button.dataset.program;
    renderGymPrograms();
  });
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
applyUiSettings();
renderAll();
