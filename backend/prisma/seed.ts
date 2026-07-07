import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic PRNG so the seed is reproducible run-to-run.
// ---------------------------------------------------------------------------
let rngState = 0x1ada4a2d;
function rand(): number {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function roundTo(n: number, step: number): number {
  return Math.max(step, Math.round(n / step) * step);
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.now();

function phoneNumber(): string {
  const prefix = pick(["30", "31", "32", "33", "34", "35"]);
  let rest = "";
  for (let i = 0; i < 7; i++) rest += randInt(0, 9);
  return `+92 3${prefix[1]}${randInt(0, 9)}-${rest}`;
}

// ---------------------------------------------------------------------------
// Categories (unchanged from the original seed)
// ---------------------------------------------------------------------------
const categories = [
  { name: "Heavy Lifting", icon: "💪" },
  { name: "Tutoring", icon: "📚" },
  { name: "Cleaning", icon: "🧹" },
  { name: "Need a Ride", icon: "🚗" },
  { name: "Computer Help", icon: "💻" },
  { name: "Delivery / Errands", icon: "📦" },
  { name: "Pet Care", icon: "🐾" },
  { name: "Painting", icon: "🎨" },
  { name: "Gardening", icon: "🌿" },
  { name: "Other", icon: "📋" },
];

// ---------------------------------------------------------------------------
// Cities with real neighbourhood coordinates (hardcoded — no geocoding calls)
// ---------------------------------------------------------------------------
interface Spot {
  area: string;
  lat: number;
  lng: number;
}
const CITY_SPOTS: Record<string, Spot[]> = {
  Lahore: [
    { area: "DHA Phase 5", lat: 31.4622, lng: 74.4058 },
    { area: "Gulberg III", lat: 31.5102, lng: 74.3441 },
    { area: "Johar Town", lat: 31.4697, lng: 74.2728 },
    { area: "Model Town", lat: 31.4811, lng: 74.3242 },
  ],
  Karachi: [
    { area: "Clifton Block 5", lat: 24.8138, lng: 67.03 },
    { area: "Gulshan-e-Iqbal", lat: 24.918, lng: 67.0971 },
    { area: "North Nazimabad", lat: 24.9372, lng: 67.0361 },
    { area: "DHA Phase 6", lat: 24.7942, lng: 67.0505 },
  ],
  Islamabad: [
    { area: "F-7 Markaz", lat: 33.7203, lng: 73.0565 },
    { area: "G-11", lat: 33.6685, lng: 72.9982 },
    { area: "I-8", lat: 33.668, lng: 73.0755 },
  ],
  Rawalpindi: [
    { area: "Saddar", lat: 33.5977, lng: 73.0479 },
    { area: "Satellite Town", lat: 33.6425, lng: 73.0684 },
    { area: "Bahria Town Phase 4", lat: 33.5651, lng: 73.1183 },
  ],
  Faisalabad: [
    { area: "Peoples Colony", lat: 31.4278, lng: 73.1093 },
    { area: "Madina Town", lat: 31.43, lng: 73.118 },
    { area: "D Ground", lat: 31.418, lng: 73.105 },
  ],
  Multan: [
    { area: "Gulgasht Colony", lat: 30.257, lng: 71.4696 },
    { area: "Multan Cantt", lat: 30.1978, lng: 71.4711 },
    { area: "Shah Rukn-e-Alam Colony", lat: 30.19, lng: 71.465 },
  ],
  Peshawar: [
    { area: "Hayatabad Phase 3", lat: 33.9748, lng: 71.4373 },
    { area: "University Town", lat: 34.0055, lng: 71.5249 },
    { area: "Peshawar Saddar", lat: 34.008, lng: 71.543 },
  ],
  Sialkot: [
    { area: "Sialkot Cantt", lat: 32.5057, lng: 74.5361 },
    { area: "Model Town", lat: 32.4938, lng: 74.5222 },
    { area: "Paris Road", lat: 32.4996, lng: 74.531 },
  ],
};
const CITIES = Object.keys(CITY_SPOTS);

const STREETS = [
  "House 12, Street 5",
  "Flat 3B, Al-Noor Plaza",
  "House 47, Lane 8",
  "House 9, Block C",
  "Flat 201, Rehman Heights",
  "House 23, Main Boulevard",
];

// ---------------------------------------------------------------------------
// Task templates per category
// ---------------------------------------------------------------------------
interface Template {
  title: string;
  desc: (area: string, city: string) => string;
  min: number;
  max: number;
}
const TEMPLATES: Record<string, Template[]> = {
  "Heavy Lifting": [
    { title: "Help moving sofa and wardrobes", desc: (a, c) => `Shifting to a new house in ${a}, ${c}. Need one strong person for about two hours to load and unload furniture. Stairs are involved, so please come prepared.`, min: 800, max: 3000 },
    { title: "Shift boxes to a 3rd floor flat", desc: (a) => `Around 20 packed cartons need to be carried up to a third floor flat in ${a}. No lift in the building. Should take 1-2 hours with two people.`, min: 800, max: 3000 },
    { title: "Load construction material onto pickup", desc: (a) => `Cement bags and tiles need to be loaded onto a Suzuki pickup near ${a}. Roughly an hour of work. Gloves will be provided.`, min: 800, max: 2500 },
  ],
  Tutoring: [
    { title: "O-Level Maths tutor needed", desc: (a, c) => `Looking for a patient tutor for my son who is preparing for O-Level Maths. Two sessions a week at our home in ${a}, ${c}. CIE past-paper practice a big plus.`, min: 1000, max: 5000 },
    { title: "FSc Physics help before exams", desc: (a) => `Board exams are six weeks away and my daughter needs help with FSc Part 2 Physics numericals. Evening sessions preferred, at our place in ${a}.`, min: 1500, max: 5000 },
    { title: "Spoken English practice sessions", desc: (a) => `I want to improve my spoken English for job interviews. Looking for someone fluent for conversational practice twice a week in ${a}. Cafe or home, either works.`, min: 1000, max: 4000 },
  ],
  Cleaning: [
    { title: "Deep clean 2-bedroom apartment", desc: (a, c) => `Full deep clean needed for a 2-bed apartment in ${a}, ${c} before family arrives from abroad. Kitchen and bathrooms need extra attention. Supplies available at home.`, min: 1500, max: 4000 },
    { title: "Post-renovation cleaning needed", desc: (a) => `Just finished paint and polish work at our house in ${a}. Need thorough cleaning of dust, paint spots on tiles, and windows. One full day of work.`, min: 2000, max: 4000 },
    { title: "Weekly house cleaning help", desc: (a) => `Need reliable help for weekly cleaning of a small house in ${a} — sweeping, mopping, dusting, and bathrooms. Fixed day each week, timing flexible.`, min: 1500, max: 3500 },
  ],
  "Need a Ride": [
    { title: "Ride to airport early morning", desc: (a, c) => `Need a ride from ${a}, ${c} to the airport for a 6 AM flight. Two passengers with two suitcases. Must be on time — pickup at 3:30 AM sharp.`, min: 500, max: 1500 },
    { title: "Pick and drop for office week", desc: (a) => `Looking for daily pick and drop from ${a} to my office for one week while my car is at the workshop. Morning 8:30 pickup, evening 5:30 return.`, min: 800, max: 1500 },
    { title: "Ride to wedding hall on Saturday", desc: (a) => `Family of four needs a comfortable ride from ${a} to a wedding hall this Saturday evening, and back around midnight. Clean car please.`, min: 300, max: 1200 },
  ],
  "Computer Help": [
    { title: "Laptop running very slow, needs cleanup", desc: (a, c) => `My HP laptop in ${a}, ${c} takes ages to boot and hangs constantly. Need someone to clean it up, remove junk, and maybe add more RAM if needed.`, min: 500, max: 2500 },
    { title: "Set up WiFi router and printer", desc: (a) => `New PTCL connection installed at our home in ${a} but the router placement gives weak signal upstairs. Also need a wireless printer configured for three laptops.`, min: 500, max: 2000 },
    { title: "Recover files from old hard drive", desc: (a) => `An old desktop hard drive with family photos won't show up when connected. Looking for someone experienced in data recovery near ${a}. Will pay more if everything is recovered.`, min: 1000, max: 3000 },
  ],
  "Delivery / Errands": [
    { title: "Pick up documents from courier office", desc: (a, c) => `A parcel of office documents is held at the TCS office. Need someone to collect it with my authority letter and deliver to ${a}, ${c} the same day.`, min: 200, max: 800 },
    { title: "Grocery run needed this evening", desc: (a) => `Need someone to pick up a grocery list (about 15 items) from the nearest superstore and deliver to ${a}. Payment for groceries will be sent in advance.`, min: 200, max: 700 },
    { title: "Deliver a birthday cake across town", desc: (a) => `A cake needs to be picked from a bakery and delivered carefully to a birthday venue in ${a} by 7 PM. Must have a bike with a steady box carrier.`, min: 300, max: 1000 },
  ],
  "Pet Care": [
    { title: "Cat sitting for the weekend", desc: (a, c) => `Going out of town for two days. Need someone to visit our home in ${a}, ${c} twice a day to feed our two cats and clean the litter. References appreciated.`, min: 500, max: 2000 },
    { title: "Daily walks for my Labrador", desc: (a) => `My Labrador needs a 30-minute walk every evening for two weeks while I recover from surgery. We live in ${a}. He is friendly and leash-trained.`, min: 800, max: 2000 },
    { title: "Take parrot to the vet", desc: (a) => `Our grey parrot needs a checkup at the vet clinic. Need someone careful to take him from ${a} and bring him back. Cage and carrier provided.`, min: 500, max: 1500 },
  ],
  Painting: [
    { title: "Paint two bedrooms and lounge", desc: (a, c) => `Two bedrooms and the lounge of our house in ${a}, ${c} need fresh paint. Walls are in decent condition, minor filling required. Paint will be purchased by us.`, min: 5000, max: 15000 },
    { title: "Whitewash outer boundary wall", desc: (a) => `The boundary wall of our home in ${a} needs scraping and whitewash before Eid. Roughly 80 feet of wall, one side only.`, min: 3000, max: 8000 },
    { title: "Paint main gate and window grills", desc: (a) => `Main gate and all window grills at our house in ${a} need rust treatment and two coats of enamel paint. Materials can be arranged on request.`, min: 3000, max: 7000 },
  ],
  Gardening: [
    { title: "Lawn mowing and hedge trimming", desc: (a, c) => `Our lawn in ${a}, ${c} is overgrown after the rains. Need mowing, edge cutting, and the front hedge trimmed into shape. Tools available at home.`, min: 1000, max: 3000 },
    { title: "Plant seasonal flowers and set up beds", desc: (a) => `Want winter seasonal flowers planted along the driveway of our house in ${a}. Need someone who can suggest varieties, prepare the beds, and plant.`, min: 1500, max: 4000 },
    { title: "Clean up overgrown backyard", desc: (a) => `The backyard of our home in ${a} has weeds, dead leaves, and a broken planter pile. Need a full clean-up and green waste bagged for disposal.`, min: 1000, max: 3500 },
  ],
  Other: [
    { title: "Help set up stalls for school fair", desc: (a, c) => `Our school in ${a}, ${c} is holding a fair on Sunday and we need an extra pair of hands to set up stalls, canopies, and banners on Saturday evening.`, min: 500, max: 2000 },
    { title: "Assemble flat-pack furniture", desc: (a) => `Bought a study table, bookshelf, and office chair that need assembling at our flat in ${a}. All tools and manuals are in the boxes.`, min: 500, max: 2500 },
    { title: "Help with NADRA paperwork and queue", desc: (a) => `Need someone to help my elderly father with his CNIC renewal at the NADRA office near ${a} — standing in line, filling forms, and photocopies.`, min: 500, max: 1500 },
  ],
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const POSTER_NAMES = [
  "Ahmed Khan", "Fatima Malik", "Usman Sheikh", "Ayesha Siddiqui", "Tariq Mehmood",
  "Sana Javed", "Imran Qureshi", "Nadia Chaudhry", "Kamran Baig", "Rabia Farooq",
];
const HELPER_NAMES = [
  "Bilal Hussain", "Zainab Akhtar", "Hassan Raza", "Maryam Iqbal", "Faisal Mahmood",
  "Hira Shahid", "Omar Farhan", "Sadia Kamal", "Junaid Aslam", "Mehwish Tariq",
  "Adeel Abbasi", "Farah Naz", "Shahzaib Anwar", "Bushra Saleem",
];

function emailFor(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".") + "@example.com";
}

const REVIEW_COMMENTS = [
  "Very professional and finished on time. Highly recommended.",
  "Did a great job, exactly what I asked for.",
  "Polite and hardworking. Would hire again.",
  "Good work overall, arrived a little late but made up for it.",
  "Excellent! Went above and beyond what was needed.",
  "Solid work for the price. Communication could be better.",
  "Very careful and thorough. My go-to helper from now on.",
];

const TASK_COUNT = 80;

async function main() {
  // 1. Categories — upsert, never delete.
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon },
      create: category,
    });
  }
  const categoryRows = await prisma.category.findMany();
  const categoryId = new Map(categoryRows.map((c) => [c.name, c.id]));

  // 2. Wipe existing data in dependency-safe order (categories stay).
  await prisma.contactShare.deleteMany();
  await prisma.review.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // 3. Users — one shared password so any account is usable for demos.
  const passwordHash = await bcrypt.hash("password123", 10);
  const startingBalance = new Map<number, number>();
  const balances = new Map<number, number>();

  interface SeedUser { id: number; name: string; email: string; city: string; userType: "POSTER" | "HELPER" }
  const posters: SeedUser[] = [];
  const helpers: SeedUser[] = [];

  const allDefs = [
    ...POSTER_NAMES.map((name, i) => ({ name, userType: "POSTER" as const, city: CITIES[i % CITIES.length] })),
    ...HELPER_NAMES.map((name, i) => ({ name, userType: "HELPER" as const, city: CITIES[i % CITIES.length] })),
  ];
  for (const def of allDefs) {
    const start = def.userType === "POSTER" ? roundTo(randInt(150, 600), 50) : roundTo(randInt(30, 150), 10);
    const user = await prisma.user.create({
      data: {
        name: def.name,
        email: emailFor(def.name),
        passwordHash,
        userType: def.userType,
        city: def.city,
        phone: phoneNumber(),
        walletBalance: start,
        createdAt: new Date(NOW - randInt(60, 120) * DAY),
      },
    });
    startingBalance.set(user.id, start);
    balances.set(user.id, start);
    const row = { id: user.id, name: def.name, email: user.email, city: def.city, userType: def.userType };
    (def.userType === "POSTER" ? posters : helpers).push(row);
  }
  const heroPoster = posters[0]; // Ahmed Khan
  const heroHelper = helpers[0]; // Bilal Hussain

  // 4. Task status plan.
  const statuses: string[] = [
    ...Array(41).fill("OPEN"),
    ...Array(18).fill("IN_PROGRESS"),
    ...Array(17).fill("DONE"),
    ...Array(4).fill("CANCELLED"),
  ];
  shuffle(statuses);
  // Guarantee the hero poster's first task is IN_PROGRESS (hero data).
  const ipIdx = statuses.indexOf("IN_PROGRESS");
  [statuses[0], statuses[ipIdx]] = [statuses[ipIdx], statuses[0]];

  // Accumulators for bulk-created rows.
  const txs: { userId: number; type: string; amount: number; note: string; createdAt: Date }[] = [];
  const notifications: { userId: number; message: string; isRead: boolean; createdAt: Date }[] = [];
  const reviews: { taskId: number; reviewerId: number; revieweeId: number; rating: number; comment: string; createdAt: Date }[] = [];
  const bids: { taskId: number; helperId: number; proposedAmount: number; status: string; createdAt: Date }[] = [];
  const assignedTasks: { taskId: number; title: string; posterId: number; helperId: number; status: string; refTime: number }[] = [];
  const taskCounts: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0 };

  function addNotification(userId: number, message: string, at: number) {
    notifications.push({ userId, message, isRead: rand() < 0.4, createdAt: new Date(Math.min(at, NOW - HOUR)) });
  }

  // 5. Tasks + bids + escrow simulation.
  for (let i = 0; i < TASK_COUNT; i++) {
    const catName = categories[i % categories.length].name;
    const city = CITIES[i % CITIES.length];
    const spot = CITY_SPOTS[city][i % CITY_SPOTS[city].length];
    const template = TEMPLATES[catName][i % TEMPLATES[catName].length];
    const poster = posters[i % posters.length];
    const status = statuses[i];
    const budget = roundTo(randInt(template.min, template.max), 50);
    const createdAtMs = NOW - (TASK_COUNT - i) * 9 * HOUR - randInt(0, 4) * HOUR;

    // Jitter coordinates slightly so markers in the same area don't overlap.
    const lat = spot.lat + (rand() - 0.5) * 0.008;
    const lng = spot.lng + (rand() - 0.5) * 0.008;

    const cancelledFromInProgress = status === "CANCELLED" && rand() < 0.5;
    const isAssigned = status === "IN_PROGRESS" || status === "DONE" || cancelledFromInProgress;

    let helper: SeedUser | null = null;
    let acceptedAmount: number | null = null;
    if (isAssigned) {
      helper = i === 0 ? heroHelper : helpers[randInt(0, helpers.length - 1)];
      acceptedAmount = roundTo(budget * (0.75 + rand() * 0.25), 50);
      if (acceptedAmount > budget) acceptedAmount = budget;
    }

    const task = await prisma.task.create({
      data: {
        posterId: poster.id,
        categoryId: categoryId.get(catName)!,
        title: template.title,
        description: template.desc(spot.area, city),
        address: `${pick(STREETS)}, ${spot.area}, ${city}`,
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lng.toFixed(5)),
        budget,
        status,
        helperId: helper?.id ?? null,
        acceptedAmount,
        createdAt: new Date(createdAtMs),
      },
    });
    taskCounts[status]++;

    if (isAssigned && helper && acceptedAmount != null) {
      // Bids: one accepted + 1-4 rejected from distinct other helpers.
      const acceptTime = createdAtMs + randInt(6, 36) * HOUR;
      const otherHelpers = shuffle(helpers.filter((h) => h.id !== helper!.id)).slice(0, randInt(1, 4));

      bids.push({ taskId: task.id, helperId: helper.id, proposedAmount: acceptedAmount, status: "ACCEPTED", createdAt: new Date(createdAtMs + randInt(1, 5) * HOUR) });
      addNotification(poster.id, `New bid of Rs. ${acceptedAmount} received on "${task.title}".`, createdAtMs + randInt(1, 5) * HOUR);

      for (const other of otherHelpers) {
        const amount = roundTo(budget * (0.7 + rand() * 0.45), 50);
        bids.push({ taskId: task.id, helperId: other.id, proposedAmount: amount, status: "REJECTED", createdAt: new Date(createdAtMs + randInt(1, 5) * HOUR) });
        addNotification(poster.id, `New bid of Rs. ${amount} received on "${task.title}".`, createdAtMs + randInt(1, 5) * HOUR);
        addNotification(other.id, `Your bid on "${task.title}" was not selected.`, acceptTime);
      }
      addNotification(helper.id, `Your bid on "${task.title}" was accepted! Time to get started.`, acceptTime);

      // Escrow hold — top up the poster with a deposit first if needed,
      // exactly as a real user would have done before accepting the bid.
      const posterBal = balances.get(poster.id)!;
      if (posterBal < acceptedAmount) {
        const depositAmount = roundTo(acceptedAmount - posterBal + randInt(100, 500), 100);
        txs.push({ userId: poster.id, type: "DEPOSIT", amount: depositAmount, note: "Wallet deposit", createdAt: new Date(acceptTime - HOUR) });
        balances.set(poster.id, posterBal + depositAmount);
      }
      txs.push({ userId: poster.id, type: "ESCROW_HOLD", amount: acceptedAmount, note: `Held in escrow for task #${task.id}`, createdAt: new Date(acceptTime) });
      balances.set(poster.id, balances.get(poster.id)! - acceptedAmount);

      if (status === "DONE") {
        const doneTime = Math.min(acceptTime + randInt(1, 4) * DAY, NOW - 2 * HOUR);
        txs.push({ userId: helper.id, type: "ESCROW_RELEASE", amount: acceptedAmount, note: `Payment released for task #${task.id}`, createdAt: new Date(doneTime) });
        balances.set(helper.id, balances.get(helper.id)! + acceptedAmount);
        addNotification(helper.id, `You've been paid Rs. ${acceptedAmount} for completing "${task.title}"!`, doneTime);
        reviews.push({
          taskId: task.id,
          reviewerId: poster.id,
          revieweeId: helper.id,
          rating: randInt(3, 5),
          comment: pick(REVIEW_COMMENTS),
          createdAt: new Date(Math.min(doneTime + randInt(2, 24) * HOUR, NOW - HOUR)),
        });
        assignedTasks.push({ taskId: task.id, title: task.title, posterId: poster.id, helperId: helper.id, status, refTime: doneTime });
      } else if (status === "CANCELLED") {
        const cancelTime = Math.min(acceptTime + randInt(12, 48) * HOUR, NOW - 2 * HOUR);
        txs.push({ userId: poster.id, type: "REFUND", amount: acceptedAmount, note: `Refund for cancelled task #${task.id}`, createdAt: new Date(cancelTime) });
        balances.set(poster.id, balances.get(poster.id)! + acceptedAmount);
        addNotification(helper.id, `The task "${task.title}" was cancelled by the poster.`, cancelTime);
      } else {
        assignedTasks.push({ taskId: task.id, title: task.title, posterId: poster.id, helperId: helper.id, status, refTime: acceptTime });
      }
    } else if (status === "OPEN" && rand() < 0.5) {
      // Roughly half the open tasks get 1-4 pending bids from distinct helpers.
      const bidders = shuffle([...helpers]).slice(0, randInt(1, 4));
      for (const bidder of bidders) {
        const amount = roundTo(budget * (0.7 + rand() * 0.4), 50);
        const bidTime = createdAtMs + randInt(1, 30) * HOUR;
        bids.push({ taskId: task.id, helperId: bidder.id, proposedAmount: amount, status: "PENDING", createdAt: new Date(Math.min(bidTime, NOW - HOUR)) });
        addNotification(poster.id, `New bid of Rs. ${amount} received on "${task.title}".`, bidTime);
      }
    }
  }

  // 6. Contact shares — pre-seed a few assigned tasks so the feature has data.
  // Hero task (index 0 in assignedTasks order isn't guaranteed) — find it explicitly.
  const heroTask = assignedTasks.find((t) => t.posterId === heroPoster.id && t.helperId === heroHelper.id)!;
  const otherCandidates = assignedTasks.filter((t) => t !== heroTask);
  const contactShares: { taskId: number; userId: number; createdAt: Date }[] = [];

  // Both sides share on the hero task (fully connected state).
  for (const uid of [heroTask.posterId, heroTask.helperId]) {
    const at = heroTask.refTime + randInt(1, 6) * HOUR;
    contactShares.push({ taskId: heroTask.taskId, userId: uid, createdAt: new Date(Math.min(at, NOW - HOUR)) });
    const sharer = uid === heroTask.posterId ? heroPoster : heroHelper;
    const recipient = uid === heroTask.posterId ? heroTask.helperId : heroTask.posterId;
    addNotification(recipient, `${sharer.name} shared their contact info with you for "${heroTask.title}". You can now view it on the task page.`, at);
  }

  // One-sided shares on a few more tasks.
  const nameById = new Map([...posters, ...helpers].map((u) => [u.id, u.name]));
  for (const t of shuffle(otherCandidates).slice(0, 4)) {
    const sharerId = rand() < 0.5 ? t.posterId : t.helperId;
    const recipientId = sharerId === t.posterId ? t.helperId : t.posterId;
    const at = t.refTime + randInt(1, 12) * HOUR;
    contactShares.push({ taskId: t.taskId, userId: sharerId, createdAt: new Date(Math.min(at, NOW - HOUR)) });
    addNotification(recipientId, `${nameById.get(sharerId)} shared their contact info with you for "${t.title}". You can now view it on the task page.`, at);
  }

  // 7. Bulk-create dependent rows.
  await prisma.bid.createMany({ data: bids });
  await prisma.walletTransaction.createMany({ data: txs });
  await prisma.review.createMany({ data: reviews });
  await prisma.notification.createMany({ data: notifications });
  await prisma.contactShare.createMany({ data: contactShares });

  // 8. Final wallet balances = starting balance + sum of simulated transactions.
  for (const [userId, balance] of balances) {
    await prisma.user.update({ where: { id: userId }, data: { walletBalance: balance } });
  }

  // 9. Summary.
  console.log("Seed complete.");
  console.log(`  Categories:          ${categories.length} (upserted)`);
  console.log(`  Users:               ${posters.length + helpers.length} (${posters.length} posters, ${helpers.length} helpers)`);
  console.log(`  Tasks:               ${TASK_COUNT} (OPEN ${taskCounts.OPEN}, IN_PROGRESS ${taskCounts.IN_PROGRESS}, DONE ${taskCounts.DONE}, CANCELLED ${taskCounts.CANCELLED})`);
  console.log(`  Bids:                ${bids.length}`);
  console.log(`  Reviews:             ${reviews.length}`);
  console.log(`  Wallet transactions: ${txs.length}`);
  console.log(`  Notifications:       ${notifications.length}`);
  console.log(`  Contact shares:      ${contactShares.length}`);
  console.log("");
  console.log("Demo logins (password: password123):");
  console.log(`  poster:  ${heroPoster.email}`);
  console.log(`  helper:  ${heroHelper.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
