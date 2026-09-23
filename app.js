(function () {
  const PLAN = window.PLAN;
  const app = document.getElementById("app");
  const tabs = document.getElementById("tabs");
  const KEY = "sarahs-fourteen-v2";
  const LEN = PLAN.days.length;
  const BLOCK = PLAN.block || 14;
  const GOALS = PLAN.goals || { protein: 60, carbs: 180, fibre: 25 };
  let state = load();
  let view = "today";
  let filter = "all";
  let tripId = 1;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function todayNum() {
    if (!state.start) return state.day || 1;
    const start = new Date(state.start + "T00:00:00");
    const now = new Date();
    const diff = Math.floor((now - start) / 86400000);
    return ((diff % LEN) + LEN) % LEN + 1;
  }
  function jobName(tag) {
    if (tag === "Brain") return "Brain fats";
    if (tag === "Steady") return "Steady energy";
    if (tag === "Calm") return "Calmer plate";
    if (tag === "Gut") return "Feeds the gut";
    return tag || "";
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function dayBy(n) {
    return PLAN.days[n - 1];
  }
  function setTab(name) {
    tabs.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.view === name);
    });
  }

  function blockStart(n) {
    return Math.floor((n - 1) / BLOCK) * BLOCK + 1;
  }
  function blockEnd(n) {
    return Math.min(LEN, blockStart(n) + BLOCK - 1);
  }
  function loggedMap() {
    state.logged = state.logged || {};
    return state.logged;
  }
  function xpFor(day) {
    let xp = 25;
    if ((day.protein || 0) >= GOALS.protein) xp += 15;
    if ((day.total || 0) >= GOALS.fibre) xp += 15;
    if ((day.carbs || 0) >= 100) xp += 5;
    return xp;
  }
  function blockStats(today) {
    const start = blockStart(today);
    const end = blockEnd(today);
    const logged = loggedMap();
    let xp = 0;
    let count = 0;
    const dots = [];
    for (let n = start; n <= end; n++) {
      const on = !!logged[String(n)];
      dots.push({ n: n, on: on, isToday: n === today });
      if (on) {
        count += 1;
        xp += xpFor(dayBy(n));
      }
    }
    let streak = 0;
    let cursor = logged[String(today)] ? today : today - 1;
    while (cursor >= start && logged[String(cursor)]) {
      streak += 1;
      cursor -= 1;
    }
    return { start: start, end: end, xp: xp, count: count, dots: dots, streak: streak };
  }
  function macroBar(label, value, goal, kind) {
    const wrap = el("div", "macro");
    const top = el("div", "macro-top");
    top.appendChild(el("span", null, label));
    top.appendChild(el("span", null, value + " / " + goal + " g"));
    wrap.appendChild(top);
    const track = el("div", "track");
    const fill = el("div", "fill " + kind);
    const pct = Math.max(4, Math.min(100, Math.round((value / goal) * 100)));
    fill.style.width = pct + "%";
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  }
  function renderTracker(day) {
    const today = todayNum();
    const stats = blockStats(today);
    const box = el("section", "tracker");
    const head = el("div", "row");
    head.appendChild(el("div", null, "Streak " + stats.streak));
    head.appendChild(el("div", "xp", stats.xp + " XP"));
    box.appendChild(head);
    const dots = el("div", "dots");
    stats.dots.forEach(function (dot) {
      const d = el("span", "dot" + (dot.on ? " on" : "") + (dot.isToday ? " now" : ""), String(dot.n));
      dots.appendChild(d);
    });
    box.appendChild(dots);
    box.appendChild(el("p", "muted", stats.count + " of " + BLOCK + " days logged in this block."));
    const resetDay = stats.end < LEN ? stats.end + 1 : 1;
    const resetName = stats.end < LEN ? "day " + resetDay : "day 1, the next rotation";
    box.appendChild(el("p", "muted", "Streak and XP reset on " + resetName + ". That is the next 14-day block."));
    box.appendChild(macroBar("Protein", day.protein || 0, GOALS.protein, "protein"));
    box.appendChild(macroBar("Carbs", day.carbs || 0, GOALS.carbs, "carbs"));
    box.appendChild(macroBar("Fibre", day.total || 0, GOALS.fibre, "fibre"));
    box.appendChild(el("p", "muted", "Fat about " + (day.fat || 0) + " g. About " + (day.kcal || 0) + " kcal. Kitchen estimate, not a lab label."));
    if (day.n <= today) {
      const logged = !!loggedMap()[String(day.n)];
      const btn = el("button", "log" + (logged ? " done" : ""), logged ? "Logged. Tap to undo." : "Log this day");
      btn.addEventListener("click", function () {
        if (loggedMap()[String(day.n)]) delete loggedMap()[String(day.n)];
        else loggedMap()[String(day.n)] = xpFor(day);
        save();
        render();
      });
      box.appendChild(btn);
      box.appendChild(el("p", "muted", "Logging pays 25 XP, plus 15 if protein hits " + GOALS.protein + " g, plus 15 if fibre hits " + GOALS.fibre + " g, plus 5 if carbs are at least 100 g."));
    } else {
      box.appendChild(el("p", "muted", "You can log a day once it arrives. Future days stay closed."));
    }
    return box;
  }

  function renderCook(n) {
    const day = dayBy(n);
    app.innerHTML = "";
    const head = el("div", "row");
    const left = el("div");
    left.appendChild(el("p", "kicker", PLAN.name));
    left.appendChild(el("div", "daynum", "Day " + day.n));
    head.appendChild(left);
    head.appendChild(el("div", "fibre", day.total + " g fibre"));
    app.appendChild(head);
    const badges = el("div", "badges");
    const shiftLabel = day.shift === "day" ? "Day shift" : day.shift === "night" ? "Night shift" : "Day off";
    badges.appendChild(el("span", "badge " + day.shift, shiftLabel));
    if (day.cheat) badges.appendChild(el("span", "badge cheat", "Cheat day"));
    app.appendChild(badges);
    app.appendChild(renderTracker(day));
    const note = el("div", "note");
    note.appendChild(el("p", null, day.note));
    note.appendChild(el("p", "muted", day.line));
    app.appendChild(note);
    day.meals.forEach(function (m, i) {
      const card = el("article", "card m" + i);
      const row = el("div", "slotrow");
      const lab = el("div");
      lab.appendChild(el("div", "slot", m.slot));
      lab.appendChild(el("div", "muted", m.when));
      row.appendChild(lab);
      row.appendChild(el("div", "tag " + m.tag, jobName(m.tag)));
      card.appendChild(row);
      card.appendChild(el("h2", null, m.name));
      const stats = el("div", "stats");
      [["Protein", m.protein || 0], ["Carbs", m.carbs || 0], ["Fibre", m.g || 0]].forEach(function (pair) {
        const cell = el("div", "stat");
        cell.appendChild(el("b", null, pair[1] + " g"));
        cell.appendChild(el("span", null, pair[0]));
        stats.appendChild(cell);
      });
      card.appendChild(stats);
      card.appendChild(el("p", "muted", "Fat " + (m.fat || 0) + " g"));
      const ul = el("ul");
      m.items.forEach(function (item) { ul.appendChild(el("li", null, item)); });
      card.appendChild(ul);
      card.appendChild(el("p", "method", m.method));
      app.appendChild(card);
    });
    const arrows = el("div", "arrows");
    const prev = el("button", null, "Previous");
    const next = el("button", null, "Next");
    prev.disabled = n === 1;
    next.disabled = n === LEN;
    prev.addEventListener("click", function () { openDay(n - 1); });
    next.addEventListener("click", function () { openDay(n + 1); });
    arrows.appendChild(prev);
    arrows.appendChild(next);
    app.appendChild(arrows);
    const set = el("div", "panel setday");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(LEN);
    input.value = String(n);
    const btn = el("button", null, "Make this today");
    btn.addEventListener("click", function () {
      const want = Math.max(1, Math.min(LEN, parseInt(input.value, 10) || n));
      const start = new Date();
      start.setDate(start.getDate() - (want - 1));
      state.start = start.toISOString().slice(0, 10);
      state.day = want;
      save();
      view = "today";
      render();
    });
    set.appendChild(input);
    set.appendChild(btn);
    app.appendChild(set);
    const guideBtn = el("button", "primary", "How to read this");
    guideBtn.addEventListener("click", function () { view = "guide"; render(); });
    app.appendChild(guideBtn);
    app.appendChild(el("p", "muted", "The three big numbers are protein, carbs, and fibre. The colored words say why the meal is there. No onions. Food supports mood. It does not treat it."));
    window.scrollTo(0, 0);
  }

  function renderDays() {
    app.innerHTML = "";
    app.appendChild(el("p", "kicker", "All " + LEN));
    app.appendChild(el("h1", null, "Pick a day"));
    const filters = el("div", "filters");
    [["all", "All"], ["day", "Day shifts"], ["night", "Nights"], ["off", "Off"], ["cheat", "Cheat"]].forEach(function (pair) {
      const b = el("button", filter === pair[0] ? "on" : "", pair[1]);
      b.addEventListener("click", function () { filter = pair[0]; renderDays(); });
      filters.appendChild(b);
    });
    app.appendChild(filters);
    PLAN.days.forEach(function (day) {
      if (filter === "cheat" && !day.cheat) return;
      if (filter !== "all" && filter !== "cheat" && day.shift !== filter) return;
      const b = el("button", "day-link");
      const title = el("b", null, "Day " + day.n + "  ·  " + day.total + " g");
      b.appendChild(title);
      const sub = el("div", "muted", (day.cheat ? "Cheat. " : "") + day.line);
      b.appendChild(sub);
      const pills = el("div", "pills");
      day.meals.forEach(function (m, i) {
        pills.appendChild(el("div", "pill m" + i, m.slot + ": " + m.name));
      });
      b.appendChild(pills);
      b.addEventListener("click", function () { openDay(day.n); });
      app.appendChild(b);
    });
  }

  function checks() {
    state.checks = state.checks || {};
    return state.checks;
  }
  function renderShopHome() {
    app.innerHTML = "";
    app.appendChild(el("p", "kicker", "Every 14 days"));
    app.appendChild(el("h1", null, "Shop without thinking"));
    app.appendChild(el("p", "muted", "One list per block. Color is the aisle. Check items off. The phone remembers."));
    PLAN.trips.forEach(function (trip) {
      const done = trip.groups.reduce(function (sum, g) { return sum + g.items.length; }, 0);
      const got = trip.groups.reduce(function (sum, g) {
        return sum + g.items.filter(function (item) { return checks()[item.id]; }).length;
      }, 0);
      const b = el("button", "trip " + trip.shift);
      b.appendChild(el("b", null, trip.title));
      b.appendChild(el("div", null, trip.blurb));
      b.appendChild(el("div", "muted", got + " of " + done + " checked"));
      b.addEventListener("click", function () { tripId = trip.id; view = "trip"; render(); });
      app.appendChild(b);
    });
  }
  function renderTrip() {
    const trip = PLAN.trips[tripId - 1];
    app.innerHTML = "";
    const back = el("button", "primary", "All trips");
    back.addEventListener("click", function () { view = "shop"; render(); });
    app.appendChild(back);
    app.appendChild(el("h1", null, trip.title));
    app.appendChild(el("p", "muted", trip.blurb));
    trip.groups.forEach(function (group) {
      const h = el("div", "aisle", group.aisle);
      h.style.color = group.color;
      app.appendChild(h);
      group.items.forEach(function (item) {
        const row = el("label", "shop-item" + (checks()[item.id] ? " done" : ""));
        row.style.borderLeftColor = group.color;
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = !!checks()[item.id];
        box.addEventListener("change", function () {
          checks()[item.id] = box.checked;
          save();
          row.classList.toggle("done", box.checked);
        });
        const text = el("span");
        text.appendChild(el("b", null, item.name));
        text.appendChild(document.createTextNode("  " + item.qty));
        row.appendChild(box);
        row.appendChild(text);
        app.appendChild(row);
      });
    });
    if (trip.still && trip.still.length) {
      app.appendChild(el("h2", null, "Still in the cupboard"));
      app.appendChild(el("p", "still", trip.still.join(", ") + ". Do not buy these again unless the jar is empty."));
    }
  }

  function guideCard(title, paragraphs) {
    const card = el("section", "guide-card");
    card.appendChild(el("h2", null, title));
    paragraphs.forEach(function (text) {
      card.appendChild(el("p", null, text));
    });
    return card;
  }
  function renderGuide() {
    app.innerHTML = "";
    app.appendChild(el("p", "kicker", "Read this once"));
    app.appendChild(el("h1", null, "How to use it"));
    app.appendChild(guideCard("The three buttons", [
      "Today is the day you cook from. One screen, three meals.",
      "Days is the whole rotation if you want to look ahead. Tap a day to open it.",
      "Shop is the grocery list. One list every 14 days. The color is the aisle. Check the box when it is in the cart."
    ]));
    app.appendChild(guideCard("Gold, green, blue", [
      "Gold is meal 1. Green is meal 2. Blue is meal 3.",
      "On day shifts that is breakfast, lunch, dinner.",
      "On nights, meal 1 is the big plate before work. Meal 2 is the one you pack. Meal 3 is small, then you sleep."
    ]));
    app.appendChild(guideCard("What Brain, Steady, Calm, and Gut mean", [
      "Those words are the job of the meal. They are not a dose.",
      "Brain means the plate has fats used in brain cells. Salmon is the strong one. Walnuts, chia, and flax are the backup.",
      "Steady means fibre plus protein, so your energy is less likely to crash and feel like a short temper.",
      "Calm means magnesium foods. Pumpkin seeds, yogurt, beans, and greens.",
      "Gut means beans, oats, or yogurt. They feed the gut bacteria tied to mood. That research is real and still young. It is a reason to eat the beans, not a promise that lunch fixes a hard month."
    ]));
    app.appendChild(guideCard("What the grams mean", [
      "Each meal has three big numbers: Protein, Carbs, Fibre. The word under the number is the name of that number.",
      "Brain fats, Steady energy, Calmer plate, and Feeds the gut are the job of the meal. They are not a dose. There is no such thing as 5 grams of brain.",
      "The bars at the top add the whole day. Protein guide is 60 g. Carbs guide is 180 g. Fibre guide is 25 g, the daily target for women 19 to 50.",
      "Going past a bar is fine. The bar is a guide, not a limit.",
      "Fat and the calorie number are smaller on purpose. They are a kitchen estimate, not a lab test of the plate."
    ]));
    app.appendChild(guideCard("Streak and XP", [
      "Tap Log this day after you eat it. You can undo it.",
      "Streak is days in a row inside this 14-day block. Miss a day and the streak stops.",
      "XP adds up in that same block. You get 25 for logging, 15 more if protein hits 60 g, 15 more if fibre hits 25 g, and 5 more if carbs are at least 100 g.",
      "Both start over when the next block starts. That is day 15, day 29, day 43, and then day 1 again. Same rhythm as the work schedule."
    ]));
    app.appendChild(guideCard("If you are not on day 1", [
      "Type your day number and tap Make this today. Tomorrow the app moves ahead on its own."
    ]));
  }

  function openDay(n) {
    state.day = n;
    save();
    view = "day";
    render();
  }
  function render() {
    setTab(view === "day" ? "today" : view === "trip" ? "shop" : view);
    if (view === "today") renderCook(todayNum());
    else if (view === "day") renderCook(state.day || todayNum());
    else if (view === "days") renderDays();
    else if (view === "trip") renderTrip();
    else if (view === "guide") renderGuide();
    else renderShopHome();
  }
  tabs.addEventListener("click", function (e) {
    const b = e.target.closest("button");
    if (!b) return;
    view = b.dataset.view;
    render();
  });
  render();
})();
