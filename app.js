(function () {
  const PLAN = window.PLAN;
  const app = document.getElementById("app");
  const tabs = document.getElementById("tabs");
  const KEY = "sarahs-fourteen-v1";
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
    return ((diff % 60) + 60) % 60 + 1;
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
      row.appendChild(el("div", "tag " + m.tag, m.tag + "  " + m.g + " g"));
      card.appendChild(row);
      card.appendChild(el("h2", null, m.name));
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
    next.disabled = n === 60;
    prev.addEventListener("click", function () { openDay(n - 1); });
    next.addEventListener("click", function () { openDay(n + 1); });
    arrows.appendChild(prev);
    arrows.appendChild(next);
    app.appendChild(arrows);
    const set = el("div", "panel setday");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "60";
    input.value = String(n);
    const btn = el("button", null, "Make this today");
    btn.addEventListener("click", function () {
      const want = Math.max(1, Math.min(60, parseInt(input.value, 10) || n));
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
    app.appendChild(el("p", "muted", "No onions. Food supports mood. It does not treat it."));
    window.scrollTo(0, 0);
  }

  function renderDays() {
    app.innerHTML = "";
    app.appendChild(el("p", "kicker", "All 60"));
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
