/**
 * Seed an "active" demo tutor — a full, internally-consistent dataset to look at
 * the product as a working tutor would see it after 3 months of teaching.
 *
 * What it creates (all owned by one auth user you can log in as):
 *   • a tutor profile (RUB), ~12 students with varied subjects/levels/prices;
 *   • ~20 lessons/week as recurring series, 13 weeks of history + 9 weeks ahead;
 *   • packages whose balances are burned down EXACTLY like complete_lesson does
 *     (oldest-first, with a charged_package_id receipt), so reopen/refund stays
 *     correct and the low-balance card lights up for a few students;
 *   • a payment per package (+ a couple of ad-hoc ones), with several in the
 *     current month so the dashboard "income this month" looks alive;
 *   • homework across every state (assigned / submitted / reviewed), including a
 *     few awaiting review and a few overdue, to populate the action inbox.
 *
 * It is destructive & idempotent for THIS demo account only: if the demo email
 * already exists, its auth user is deleted first (cascades away all its data),
 * then everything is recreated. No other tutor is touched.
 *
 * Run (loads Supabase URL + service-role key from .env.local):
 *   node --env-file=.env.local scripts/seed-active-tutor.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ───────────────────────────────────────────────────────────────────
const DEMO = {
  email: "demo@example.com",
  password: process.env.DEMO_PASSWORD ?? "demo-Pass-2026",
  name: "Елена Кравцова",
  currency: "RUB",
};

const WEEKS_BACK = 13; // ~3 months of history
const WEEKS_FWD = 9; //  ~2 months ahead
const HW_PROBABILITY = 0.35; // fraction of done lessons that get homework
const MAX_OVERDUE_LESSONS = 5; // recent past lessons left "scheduled" (to finish)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with:  node --env-file=.env.local scripts/seed-active-tutor.mjs",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const uuid = () => globalThis.crypto.randomUUID();
const pick = (arr, i) => arr[i % arr.length];
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

// ── Date helpers (naive local zone, like the app — see src/lib/date.ts) ───────
const DAY_MS = 86_400_000;
const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
/** Build a local Date at the given y/m/d hh:mm and return its ISO instant. */
function at(year, monthIdx, day, hh, mm) {
  return new Date(year, monthIdx, day, hh, mm, 0, 0);
}
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]; // index = getDay()

// ── Topic banks (varied, realistic) ──────────────────────────────────────────
const TOPICS = {
  mathExam: [
    "Производная и её применение",
    "Тригонометрические уравнения",
    "Логарифмы",
    "Стереометрия: углы и расстояния",
    "Задачи с параметром",
    "Текстовые задачи на движение",
    "Теория вероятностей",
    "Планиметрия: окружности",
    "Показательные уравнения",
    "Первообразная и интеграл",
    "Комбинаторика",
    "Системы уравнений",
    "Экономическая задача",
    "Неравенства методом интервалов",
  ],
  mathSchool: [
    "Обыкновенные дроби",
    "Проценты",
    "Линейные уравнения",
    "Площади фигур",
    "Действия с отрицательными числами",
    "Пропорции",
    "Степень с натуральным показателем",
    "Координатная плоскость",
    "Модуль числа",
    "Графики функций",
  ],
  english: [
    "Present Perfect vs Past Simple",
    "Conditionals (0–3)",
    "Phrasal verbs: get / take",
    "Reported speech",
    "Speaking: travel & holidays",
    "Essay: opinion writing",
    "Listening practice (B1)",
    "Passive voice",
    "Vocabulary: environment",
    "Modal verbs of deduction",
    "Reading comprehension",
    "Articles: a / an / the",
    "Idioms & collocations",
    "Pronunciation: weak forms",
  ],
  physics: [
    "Кинематика прямолинейного движения",
    "Динамика: законы Ньютона",
    "Законы сохранения импульса",
    "Электростатика",
    "Постоянный электрический ток",
    "Магнитное поле",
    "Геометрическая оптика",
    "Термодинамика",
    "Механические колебания и волны",
    "Молекулярная физика",
    "Электромагнитная индукция",
  ],
  chemistry: [
    "Строение атома",
    "Химическая связь",
    "Окислительно-восстановительные реакции",
    "Растворы и концентрация",
    "Кислоты и основания",
    "Органика: углеводороды",
    "Спирты и фенолы",
    "Электролиз",
    "Скорость химической реакции",
    "Соли: свойства",
    "Альдегиды и кетоны",
  ],
  informatics: [
    "Системы счисления",
    "Логические выражения",
    "Алгоритмы и блок-схемы",
    "Программирование на Python",
    "Рекурсия",
    "Сортировки массивов",
    "Графы и обходы",
    "Основы баз данных",
    "Кодирование информации",
    "Динамическое программирование",
    "Обработка строк",
  ],
  russian: [
    "Орфография: -Н- и -НН-",
    "Пунктуация в сложном предложении",
    "Сочинение-рассуждение (27)",
    "Средства выразительности",
    "Грамматические нормы",
    "Анализ текста",
    "Причастный и деепричастный оборот",
    "Лексические нормы",
    "Тире и двоеточие",
    "Изложение",
  ],
  social: [
    "Человек и общество",
    "Экономика: рынок и конкуренция",
    "Политическая система",
    "Право: основы",
    "Социальная стратификация",
    "Конституция РФ",
    "Финансовая грамотность",
    "Духовная культура",
    "Семья и брак",
    "Развёрнутый план по теме",
  ],
};

const LESSON_NOTES = [
  "Тему усвоил хорошо, идём дальше.",
  "Нужно повторить дома, дал дополнительные задачи.",
  "Разобрали типовые задания из варианта.",
  "Много вопросов по прошлой теме — вернулись и закрепили.",
  "Хороший прогресс, темп растёт.",
  "Допускает ошибки по невнимательности, проговорили проверку.",
  "Отработали формат экзамена на время.",
];

const SUBMISSIONS = [
  "Готово, прикрепляю решения. Пара заданий вызвала вопросы.",
  "Сделал всё, кроме последнего — не понял условие.",
  "Выполнила, проверьте, пожалуйста.",
  "Решил, но не уверен в номере 4.",
  "Готово 👍",
];
const FEEDBACKS = [
  "Отлично, всё верно! Маленькая неточность в оформлении.",
  "Хорошо, но в №3 ошибка в знаке — посмотри ещё раз.",
  "Молодец! Разберём спорный момент на занятии.",
  "Почти всё верно, подтяни вычисления.",
  "Супер, можно двигаться к следующей теме.",
];

function homeworkTitle(bank, topic) {
  if (bank === "english") return `Homework: ${topic}`;
  return `Задание: ${topic}`;
}
function homeworkDescription(bank, topic) {
  if (bank === "english") return `Exercises on "${topic}". Workbook + a short writing task.`;
  return `Задачи по теме «${topic}». Сделать письменно, разобрать примеры.`;
}

// ── Roster: ~20 lessons/week total ───────────────────────────────────────────
// slots: { dow (0=Sun..6=Sat), hh, mm, dur } · rate = ₽ per lesson · R = target
// remaining balance · B = package block size · bank = topic bank · color swatch.
const COLORS = ["violet", "blue", "green", "amber", "orange", "pink", "purple", "teal"];

const ROSTER = [
  {
    name: "Артём Соколов", subject: "Математика, ЕГЭ", level: "11 класс",
    contact: "@artem_s", parent: "+7 900 000-00-01",
    slots: [{ dow: 1, hh: 16, mm: 0, dur: 90 }, { dow: 4, hh: 16, mm: 0, dur: 90 }],
    rate: 2200, R: 10, B: 8, bank: "mathExam",
  },
  {
    name: "Мария Иванова", subject: "Английский язык, ОГЭ", level: "9 класс",
    contact: "maria.i@example.com", parent: "+7 900 000-00-02",
    slots: [{ dow: 2, hh: 17, mm: 0, dur: 60 }, { dow: 5, hh: 17, mm: 0, dur: 60 }],
    rate: 1500, R: 2, B: 8, bank: "english",
  },
  {
    name: "Дмитрий Петров", subject: "Физика, ЕГЭ", level: "11 класс",
    contact: "@dmitry_p", parent: null,
    slots: [{ dow: 3, hh: 18, mm: 0, dur: 90 }, { dow: 0, hh: 12, mm: 0, dur: 90 }],
    rate: 1900, R: 6, B: 8, bank: "physics",
  },
  {
    name: "София Кузнецова", subject: "Английский язык", level: "Взрослый, B1→B2",
    contact: "sofia.k@example.com", parent: null,
    slots: [{ dow: 1, hh: 19, mm: 0, dur: 60 }, { dow: 3, hh: 19, mm: 0, dur: 60 }],
    rate: 2300, R: 12, B: 16, bank: "english",
  },
  {
    name: "Егор Васильев", subject: "Математика", level: "7 класс",
    contact: null, parent: "+7 900 000-00-03",
    slots: [{ dow: 6, hh: 11, mm: 0, dur: 60 }],
    rate: 1100, R: 4, B: 4, bank: "mathSchool",
  },
  {
    name: "Анна Морозова", subject: "Химия, ЕГЭ", level: "11 класс",
    contact: "@anna_morozova", parent: "+7 900 000-00-04",
    slots: [{ dow: 2, hh: 15, mm: 0, dur: 60 }, { dow: 6, hh: 12, mm: 0, dur: 60 }],
    rate: 2000, R: 8, B: 8, bank: "chemistry",
  },
  {
    name: "Кирилл Новиков", subject: "Информатика, ЕГЭ", level: "11 класс",
    contact: "kirill.n@example.com", parent: null,
    slots: [{ dow: 1, hh: 20, mm: 0, dur: 90 }, { dow: 4, hh: 19, mm: 0, dur: 90 }],
    rate: 2100, R: 1, B: 8, bank: "informatics",
  },
  {
    name: "Полина Волкова", subject: "Русский язык, ОГЭ", level: "9 класс",
    contact: "@polina_v", parent: "+7 900 000-00-05",
    slots: [{ dow: 5, hh: 15, mm: 0, dur: 60 }],
    rate: 1400, R: 5, B: 4, bank: "russian",
  },
  {
    name: "Тимур Алиев", subject: "Математика", level: "5 класс",
    contact: null, parent: "+7 900 000-00-06",
    slots: [{ dow: 0, hh: 10, mm: 0, dur: 45 }],
    rate: 900, R: 3, B: 4, bank: "mathSchool",
  },
  {
    name: "Виктория Лебедева", subject: "Английский язык", level: "6 класс",
    contact: null, parent: "@lebedeva_mom",
    slots: [{ dow: 1, hh: 17, mm: 30, dur: 45 }, { dow: 4, hh: 17, mm: 30, dur: 45 }],
    rate: 1000, R: 7, B: 8, bank: "english",
  },
  {
    name: "Максим Орлов", subject: "Обществознание, ЕГЭ", level: "11 класс",
    contact: "maxim.o@example.com", parent: null,
    slots: [{ dow: 3, hh: 16, mm: 30, dur: 60 }],
    rate: 1800, R: 0, B: 4, bank: "social",
  },
  {
    name: "Алиса Смирнова", subject: "Английский язык, IELTS", level: "Взрослый",
    contact: "@alice_ielts", parent: null,
    slots: [{ dow: 2, hh: 19, mm: 0, dur: 60 }, { dow: 5, hh: 19, mm: 0, dur: 60 }],
    rate: 2600, R: 14, B: 16, bank: "english",
  },
];

// ── Build dataset ─────────────────────────────────────────────────────────────
const students = [];
const series = [];
const lessons = [];
const packages = [];
const payments = [];
const homework = [];

let overdueLeft = MAX_OVERDUE_LESSONS;

const histStart = addDays(startOfToday, -7 * WEEKS_BACK);
const histEnd = addDays(startOfToday, 7 * WEEKS_FWD);

ROSTER.forEach((r, ri) => {
  const studentId = uuid();
  const color = COLORS[ri % COLORS.length];
  const topicBank = TOPICS[r.bank];

  // Earliest first lesson across slots → student "joined" just before it.
  const studentLessons = [];

  for (const slot of r.slots) {
    // First occurrence on/after histStart matching the weekday.
    const first = new Date(histStart);
    while (first.getDay() !== slot.dow) first.setDate(first.getDate() + 1);

    const occ = [];
    for (let d = new Date(first); d <= histEnd; d = addDays(d, 7)) {
      occ.push(at(d.getFullYear(), d.getMonth(), d.getDate(), slot.hh, slot.mm));
    }

    const seriesId = uuid();
    series.push({
      id: seriesId,
      student_id: studentId,
      rrule: `FREQ=WEEKLY;BYDAY=${BYDAY[slot.dow]};COUNT=${occ.length}`,
      dtstart: occ[0].toISOString(),
      duration_min: slot.dur,
      topic: r.subject,
      color,
    });

    occ.forEach((startDate, oi) => {
      const startsAt = startDate.getTime();
      const isPast = startsAt < now.getTime();
      const lessonId = uuid();
      let status = "scheduled";
      let topic = null;
      let note = null;

      if (isPast) {
        const recent = now.getTime() - startsAt < 5 * DAY_MS;
        if (recent && overdueLeft > 0 && chance(0.5)) {
          status = "scheduled"; // overdue: past but not yet finished
          overdueLeft -= 1;
        } else if (chance(0.06)) {
          status = "canceled";
        } else if (chance(0.07)) {
          status = "no_show";
        } else {
          status = "done";
          topic = pick(topicBank, oi);
          if (chance(0.4)) note = rand(LESSON_NOTES);
        }
      }

      const lesson = {
        id: lessonId,
        student_id: studentId,
        starts_at: startDate.toISOString(),
        duration_min: slot.dur,
        status,
        topic,
        note,
        series_id: seriesId,
        color,
        charged_package_id: null, // filled by the burn simulation below
      };
      lessons.push(lesson);
      studentLessons.push(lesson);
    });
  }

  const firstLessonTime = Math.min(...studentLessons.map((l) => new Date(l.starts_at).getTime()));

  students.push({
    id: studentId,
    name: r.name,
    contact: r.contact,
    parent_contact: r.parent,
    subject: r.subject,
    level: r.level,
    created_at: new Date(firstLessonTime - 2 * DAY_MS).toISOString(),
  });

  // ── Packages + burn simulation (mirrors complete_lesson: oldest-first) ──────
  const terminal = studentLessons
    .filter((l) => l.status === "done" || l.status === "no_show")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const consumed = terminal.length;
  const total = consumed + r.R;

  // Split `total` into blocks of size B (last block = remainder).
  const caps = [];
  let acc = 0;
  while (acc < total) {
    caps.push(Math.min(r.B, total - acc));
    acc += r.B;
  }
  if (caps.length === 0) caps.push(r.B); // student with no history yet

  const studentPackages = [];
  let boundary = 0; // index of first terminal lesson this package covers
  caps.forEach((cap, ci) => {
    const pkgId = uuid();
    // "Bought" right when the previous package ran out; trailing (still-unspent)
    // packages are dated recently so their payment lands in the current month.
    let createdAt;
    if (boundary < consumed) {
      createdAt = new Date(new Date(terminal[boundary].starts_at).getTime() - DAY_MS);
    } else {
      createdAt = addDays(startOfToday, -(2 + Math.floor(Math.random() * 18)));
    }
    const pkg = {
      id: pkgId,
      student_id: studentId,
      total_lessons: cap,
      lessons_left: cap, // decremented by the burn loop
      price: r.rate * cap,
      created_at: createdAt.toISOString(),
      _consumed: 0,
    };
    studentPackages.push(pkg);
    boundary += cap;
    ci; // (index unused beyond ordering)
  });

  // Burn one credit per terminal lesson from the oldest package with balance,
  // writing the charged_package_id receipt — exactly like the DB function.
  let p = 0;
  for (const lesson of terminal) {
    while (p < studentPackages.length && studentPackages[p].lessons_left === 0) p++;
    if (p >= studentPackages.length) break; // shouldn't happen (total covers consumed)
    studentPackages[p].lessons_left -= 1;
    studentPackages[p]._consumed += 1;
    lesson.charged_package_id = studentPackages[p].id;
  }

  for (const pkg of studentPackages) {
    const { _consumed, ...row } = pkg;
    packages.push(row);
    // One payment per package (the tutor recorded the cash when it was bought).
    payments.push({
      id: uuid(),
      student_id: studentId,
      amount: pkg.price,
      paid_at: pkg.created_at,
      note: `Пакет ${pkg.total_lessons} занятий`,
    });
    void _consumed;
  }

  // ── Homework across every state ─────────────────────────────────────────────
  const doneLessons = studentLessons
    .filter((l) => l.status === "done")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  for (const lesson of doneLessons) {
    if (!chance(HW_PROBABILITY)) continue;
    const daysAgo = (now.getTime() - new Date(lesson.starts_at).getTime()) / DAY_MS;
    const topic = lesson.topic ?? rand(topicBank);
    const hw = {
      id: uuid(),
      student_id: studentId,
      lesson_id: lesson.id,
      title: homeworkTitle(r.bank, topic),
      description: homeworkDescription(r.bank, topic),
      status: "assigned",
      submission_text: null,
      feedback: null,
      due_at: null,
    };

    if (daysAgo > 14) {
      hw.status = "reviewed";
      hw.submission_text = rand(SUBMISSIONS);
      hw.feedback = rand(FEEDBACKS);
    } else if (daysAgo > 6) {
      if (chance(0.5)) {
        hw.status = "submitted"; // awaiting the tutor's review → action inbox
        hw.submission_text = rand(SUBMISSIONS);
      } else {
        hw.status = "reviewed";
        hw.submission_text = rand(SUBMISSIONS);
        hw.feedback = rand(FEEDBACKS);
      }
    } else {
      // Recent: still open, due next week.
      hw.status = "assigned";
      hw.due_at = addDays(new Date(lesson.starts_at), 7).toISOString();
    }
    homework.push(hw);
  }

  // A guaranteed overdue homework for ~1/3 of students (assigned, due in the
  // past, never submitted) — populates the dashboard "overdue" inbox.
  if (ri % 3 === 0 && doneLessons.length) {
    const anchor = doneLessons[Math.max(0, doneLessons.length - 2)];
    homework.push({
      id: uuid(),
      student_id: studentId,
      lesson_id: anchor.id,
      title: homeworkTitle(r.bank, rand(topicBank)),
      description: "Доделать оставшиеся задания из прошлого занятия.",
      status: "assigned",
      submission_text: null,
      feedback: null,
      due_at: addDays(startOfToday, -(2 + (ri % 3))).toISOString(),
    });
  }
});

// A couple of ad-hoc payments (a make-up lesson, a partial top-up) this month.
payments.push({
  id: uuid(),
  student_id: students[2].id,
  amount: 1900,
  paid_at: addDays(startOfToday, -3).toISOString(),
  note: "Доплата за разовое занятие",
});
payments.push({
  id: uuid(),
  student_id: students[5].id,
  amount: 2000,
  paid_at: addDays(startOfToday, -1).toISOString(),
  note: "Перенос с пропущенного занятия",
});

// ── Write to the database ─────────────────────────────────────────────────────
async function chunkInsert(table, rows) {
  const SIZE = 500;
  for (let i = 0; i < rows.length; i += SIZE) {
    const slice = rows.slice(i, i + SIZE);
    const { error } = await db.from(table).insert(slice);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

async function resetDemoUser() {
  // Find & delete any prior demo auth user (cascades away all its data).
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const found = data.users.find((u) => u.email === DEMO.email);
    if (found) {
      const { error: delErr } = await db.auth.admin.deleteUser(found.id);
      if (delErr) throw new Error(`deleteUser: ${delErr.message}`);
      console.log("• removed existing demo account");
      return;
    }
    if (data.users.length < 200) return;
    page += 1;
  }
}

async function main() {
  console.log(`Seeding demo tutor → ${DEMO.email}`);
  await resetDemoUser();

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
    user_metadata: { name: DEMO.name },
  });
  if (createErr) throw new Error(`createUser: ${createErr.message}`);
  const tutorId = created.user.id;

  // Trigger creates the tutor row; upsert guarantees name/currency regardless.
  const { error: tutorErr } = await db
    .from("tutor")
    .upsert({ id: tutorId, email: DEMO.email, name: DEMO.name, currency: DEMO.currency });
  if (tutorErr) throw new Error(`upsert tutor: ${tutorErr.message}`);

  // Stamp every child row with the owner (tutor_id is NOT NULL; the app relies on
  // a trigger, but we set it explicitly for a bulk service-role insert).
  const own = (rows) => rows.map((r) => ({ ...r, tutor_id: tutorId }));

  await chunkInsert("student", students.map((s) => ({ ...s, tutor_id: tutorId })));
  await chunkInsert("lesson_series", own(series));
  await chunkInsert("package", own(packages));
  await chunkInsert("lesson", own(lessons));
  await chunkInsert("payment", own(payments));
  await chunkInsert("homework", own(homework));

  // ── Summary ────────────────────────────────────────────────────────────────
  const byStatus = (s) => lessons.filter((l) => l.status === s).length;
  const monthIncome = payments
    .filter((p) => new Date(p.paid_at) >= startOfMonth)
    .reduce((sum, p) => sum + p.amount, 0);
  const balByStudent = new Map();
  for (const p of packages)
    balByStudent.set(p.student_id, (balByStudent.get(p.student_id) ?? 0) + p.lessons_left);
  const lowBalance = students
    .map((s) => ({ name: s.name, left: balByStudent.get(s.id) ?? 0 }))
    .filter((s) => s.left <= 2)
    .sort((a, b) => a.left - b.left);

  console.log("\n✓ Seed complete\n");
  console.log(`  Login:        ${DEMO.email}  /  ${DEMO.password}`);
  console.log(`  Tutor:        ${DEMO.name} (${DEMO.currency})`);
  console.log(`  Students:     ${students.length}`);
  console.log(`  Series:       ${series.length}`);
  console.log(
    `  Lessons:      ${lessons.length}  ` +
      `(done ${byStatus("done")}, no_show ${byStatus("no_show")}, ` +
      `canceled ${byStatus("canceled")}, scheduled ${byStatus("scheduled")})`,
  );
  console.log(`  Packages:     ${packages.length}`);
  console.log(`  Payments:     ${payments.length}  (this month ≈ ${monthIncome.toLocaleString("ru-RU")} ₽)`);
  console.log(
    `  Homework:     ${homework.length}  ` +
      `(submitted ${homework.filter((h) => h.status === "submitted").length}, ` +
      `assigned ${homework.filter((h) => h.status === "assigned").length}, ` +
      `reviewed ${homework.filter((h) => h.status === "reviewed").length})`,
  );
  console.log(`  Low balance:  ${lowBalance.map((s) => `${s.name} (${s.left})`).join(", ")}`);
  console.log("");
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message);
  process.exit(1);
});
