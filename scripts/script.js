"use strict";

const STORAGE_KEY = "tasks";
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const PRIORITY_ORDER = { red: 1, orange: 2, green: 3 };
const PRIORITY_LABEL = { red: "Sehr wichtig", orange: "Mittel wichtig", green: "Nicht wichtig" };
const DAY_MS = 24 * 60 * 60 * 1000;

let tasks = loadTasks();
let selectedDate = startOfDay(new Date());

const el = {
    time: document.getElementById("time"),
    form: document.getElementById("taskForm"),
    task: document.getElementById("task"),
    caption: document.getElementById("caption"),
    priority: document.getElementById("priority"),
    due: document.getElementById("due"),
    planned: document.getElementById("planned"),
    error: document.getElementById("error"),
    summary: document.getElementById("summary"),
    list: document.getElementById("list"),
    empty: document.getElementById("empty"),
    template: document.getElementById("taskTemplate")
};

/* ---------- Speicher ---------- */

function loadTasks() {
    let raw;
    try {
        raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (err) {
        console.warn("Gespeicherte To-Dos konnten nicht gelesen werden:", err);
        return [];
    }
    if (!Array.isArray(raw)) return [];

    // Migration: alte Eintraege nutzten die Schluessel "fällig"/"geplant" und hatten keine id.
    return raw
        .filter(t => t && typeof t.text === "string")
        .map(t => ({
            id: t.id || createId(),
            text: t.text,
            caption: typeof t.caption === "string" ? t.caption : "",
            done: Boolean(t.done),
            priority: PRIORITY_ORDER[t.priority] ? t.priority : "green",
            due: t.due || t["fällig"] || "",
            planned: t.planned || t["geplant"] || ""
        }));
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
        showError("To-Dos konnten nicht gespeichert werden (Speicher voll oder blockiert).");
        console.error(err);
    }
}

function createId() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return "t-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

/* ---------- Datums-Helfer ---------- */

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Bewusst nicht toISOString(): das rechnet in UTC um und liefert je nach
// Zeitzone den Vortag.
function toInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDate(value) {
    if (!value) return "–";
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
}

function updateDate() {
    const weekday = WEEKDAYS[selectedDate.getDay()];
    el.time.textContent = `${weekday}, den ${formatDate(toInputValue(selectedDate))}`;
}

function shiftDays(amount) {
    selectedDate.setDate(selectedDate.getDate() + amount);
    // Beim Blaettern gleich den angezeigten Tag vorbelegen.
    el.planned.value = toInputValue(selectedDate);
    render();
}

function goToday() {
    selectedDate = startOfDay(new Date());
    el.planned.value = toInputValue(selectedDate);
    render();
}

/* ---------- Anzeige ---------- */

function visibleTasks() {
    const key = toInputValue(selectedDate);
    return tasks
        .filter(t => !t.planned || t.planned === key)
        .slice()
        .sort((a, b) =>
            Number(a.done) - Number(b.done) ||
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99")
        );
}

function dueState(task) {
    if (!task.due || task.done) return "";
    const due = new Date(task.due + "T23:59:59");
    const diff = due - new Date();
    if (diff < 0) return "overdue";
    if (diff <= DAY_MS) return "soon";
    return "";
}

function render() {
    updateDate();

    const items = visibleTasks();
    const fragment = document.createDocumentFragment();

    for (const task of items) {
        const node = el.template.content.firstElementChild.cloneNode(true);
        node.dataset.id = task.id;
        node.classList.add(task.priority);

        const state = dueState(task);
        if (state) node.classList.add(state);
        if (task.done) node.classList.add("is-done");

        const checkbox = node.querySelector(".item-done");
        checkbox.checked = task.done;
        checkbox.setAttribute("aria-label", `${task.text} – erledigt`);

        // textContent statt innerHTML: Eingaben werden nie als HTML ausgefuehrt.
        node.querySelector(".item-text").textContent = task.text;
        node.querySelector(".meta-planned").textContent = `Geplant: ${formatDate(task.planned)}`;
        node.querySelector(".meta-due").textContent =
            `Fällig: ${formatDate(task.due)}` +
            (state === "overdue" ? " (überfällig)" : state === "soon" ? " (heute fällig)" : "");
        node.querySelector(".del").setAttribute("aria-label", `To-Do "${task.text}" löschen`);
        node.querySelector(".item-main").title = PRIORITY_LABEL[task.priority];

        if (task.caption) {
            const details = node.querySelector(".item-caption");
            details.hidden = false;
            details.querySelector(".caption-text").textContent = task.caption;
        }

        fragment.appendChild(node);
    }

    el.list.replaceChildren(fragment);
    el.empty.hidden = items.length > 0;

    const open = items.filter(t => !t.done).length;
    el.summary.textContent = items.length ? `${open} von ${items.length} offen` : "";
}

/* ---------- Aktionen ---------- */

function showError(message) {
    el.error.textContent = message;
    el.error.hidden = false;
}

function clearError() {
    el.error.hidden = true;
    el.error.textContent = "";
}

function addTask(event) {
    event.preventDefault();
    clearError();

    const text = el.task.value.trim();
    if (!text) {
        showError("Das To-Do darf nicht leer sein.");
        el.task.focus();
        return;
    }
    if (!el.planned.value) {
        showError("Bitte ein Planungsdatum angeben.");
        el.planned.focus();
        return;
    }
    if (!el.due.value) {
        showError("Bitte ein Fälligkeitsdatum angeben.");
        el.due.focus();
        return;
    }
    if (el.due.value < el.planned.value) {
        showError("Das Fälligkeitsdatum liegt vor dem Planungsdatum.");
        el.due.focus();
        return;
    }

    tasks.push({
        id: createId(),
        text: text,
        caption: el.caption.value.trim(),
        done: false,
        priority: el.priority.value,
        due: el.due.value,
        planned: el.planned.value
    });
    saveTasks();

    el.task.value = "";
    el.caption.value = "";
    el.task.focus();

    // Zu dem Tag springen, an dem das neue To-Do auch sichtbar ist.
    selectedDate = startOfDay(new Date(el.planned.value + "T00:00:00"));
    render();
}

function toggleDone(id, done) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = done;
    saveTasks();
    render();
}

function removeTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    tasks.splice(index, 1);
    saveTasks();
    render();
}

function clearAll() {
    if (!tasks.length) return;
    if (!window.confirm(`Wirklich alle ${tasks.length} To-Dos löschen?`)) return;
    tasks = [];
    saveTasks();
    render();
}

/* ---------- Events ---------- */

el.form.addEventListener("submit", addTask);
document.getElementById("prevDay").addEventListener("click", () => shiftDays(-1));
document.getElementById("nextDay").addEventListener("click", () => shiftDays(1));
document.getElementById("weekBack").addEventListener("click", () => shiftDays(-7));
document.getElementById("weekNext").addEventListener("click", () => shiftDays(7));
document.getElementById("today").addEventListener("click", goToday);
document.getElementById("clearAll").addEventListener("click", clearAll);

// Ein Listener fuer die ganze Liste statt inline-onclick pro Eintrag.
el.list.addEventListener("click", event => {
    const button = event.target.closest(".del");
    if (!button) return;
    removeTask(button.closest(".item").dataset.id);
});

el.list.addEventListener("change", event => {
    if (!event.target.classList.contains("item-done")) return;
    toggleDone(event.target.closest(".item").dataset.id, event.target.checked);
});

el.caption.addEventListener("keydown", event => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        el.form.requestSubmit();
    }
});

/* ---------- Start ---------- */

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

el.planned.value = toInputValue(new Date());
el.due.value = toInputValue(tomorrow);

render();
