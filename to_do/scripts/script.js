const todos = [];
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let selectedDate = new Date();

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function updateDate() {
    let y = selectedDate.getFullYear();
    let m = selectedDate.getMonth() + 1;
    let d = selectedDate.getDate();
    let t = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][selectedDate.getDay()];

    document.getElementById("time").innerHTML = t + ", den " + d + "." + m + "." + y;
}

function displayTasks() {
    let html = "";
    let priorityOrder = {
        red: 1,
        orange: 2,
        green: 3
    };

    tasks.sort(function(a, b) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (let i = 0; i < tasks.length; i++) {

        if (tasks[i].geplant) {
            let taskDate = new Date(tasks[i].geplant);

            if (taskDate.toDateString() !== selectedDate.toDateString()) {
                continue;
            }
        }

        let background = "";

        if (tasks[i].fällig) {
            const now = new Date();
            const due = new Date(tasks[i].fällig);
            due.setHours(23, 59, 59, 999);

            const diff = due - now;

            if (diff < 0) {
                background = "background-color:#ff9999;";
            } 
            else if (diff <= 24 * 60 * 60 * 1000) {
                background = "background-color:#ffff99;";
            }
        }

        html +=
"<li class='" + tasks[i].priority + "' style='" + background + "'>" +
"<input type='checkbox' " +
(tasks[i].done ? "checked" : "") +
" onchange='tasks[" + i + "].done=this.checked; saveTasks(); displayTasks()'>" +
"<span class='" + (tasks[i].done ? "done" : "") + "'>" +
tasks[i].text +
"</span>" +
"<small style='color:black'> │ Fällig: " + formatDate(tasks[i].fällig) + "</small>" +
"<small style='color:black'> │ Geplant: " + formatDate(tasks[i].geplant) + "</small>" +
"<button class='del' onclick='removeTask(" + i + ")'>✖️</button>" +
(tasks[i].caption ?
"<br><details>" +
"<summary>Beschreibung</summary>" +
"<p style='white-space: pre-line;'>" + tasks[i].caption + "</p>" +
"</details>"
: "") +

"</li>";
    }

    document.getElementById("list").innerHTML = html;
}

function previousTodo() {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDate();
    displayTasks();
}

function weekBack() {
    selectedDate.setDate(selectedDate.getDate() - 7);
    updateDate();
    displayTasks();
}

function nextTodo() {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDate();
    displayTasks();
}

function weekNext() {
    selectedDate.setDate(selectedDate.getDate() + 7);
    updateDate();
    displayTasks();
}

function todaysTodo() {
    selectedDate = new Date();
    updateDate();
    displayTasks();
}
function addTask() {
    let input = document.getElementById("task");
    let caption = document.getElementById("caption");
    let priority = document.getElementById("priority");
    let fällig = document.getElementById("fällig");
    let geplant = document.getElementById("geplant");
    let text = input.value.trim();

    if (text === "") {
        window.alert("ToDo darf NICHT leer sein!");
        return;
    }
    if (fällig.value === "") {
        window.alert("Fälligkeitsdatum darf NICHT leer sein!");
        return;
    }
    if (geplant.value === "") {
        window.alert("Planungsdatum darf NICHT leer sein!");
        return;
    }

    tasks.push({
        text: text,
        caption: caption.value.trim(),
        expanded: false,
        done: false,
        priority: priority.value,
        fällig: fällig.value,
        geplant: geplant.value
    });

    saveTasks();
    input.value = "";
    caption.value = "";
    displayTasks();
}

function removeTask(i) {
    tasks.splice(i, 1);
    saveTasks();
    displayTasks();
}

function clearAll() {
    tasks = [];
    saveTasks();
    displayTasks();
}

updateDate();
displayTasks();

document.getElementById("task")
.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        addTask();
    }
});

function formatDate(date) {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    return `${day}.${month}.${year}`;
}

const tommorow = new Date();
tommorow.setDate(tommorow.getDate() + 1);
document.getElementById("fällig").value = tommorow.toISOString().split("T")[0];
document.getElementById("fällig").min = new Date().toISOString().split("T")[0];
document.getElementById("geplant").value = new Date().toISOString().split("T")[0];
document.getElementById("geplant").min = new Date().toISOString().split("T")[0];
