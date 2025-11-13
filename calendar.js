/****************************************************
   GLOBAL VARIABLES
****************************************************/
let reminders = [];
let editingReminderId = null;

const API = "https://cloud-reminder-system.onrender.com";

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const calendarBody = document.getElementById("calendarBody");
const reminderItems = document.getElementById("reminderItems");
const popupBox = document.getElementById("popupReminder");
const popupTitle = document.getElementById("popupTitle");
const popupDateTime = document.getElementById("popupDateTime");
const alertSound = document.getElementById("alertSound");

/****************************************************
   POPUP
****************************************************/
function showPopup(title, msg) {
    popupTitle.innerText = title;
    popupDateTime.innerText = msg;
    popupBox.style.display = "block";

    setTimeout(() => {
        popupBox.style.display = "none";
    }, 12000);
}

/****************************************************
   FETCH REMINDERS (GET)
****************************************************/
function fetchReminders() {
    fetch(`${API}/api/reminders`)
        .then(res => res.json())
        .then(data => {
            reminders = data;
            loadCalendar(currentMonth, currentYear);
        })
        .catch(err => {
            reminders = [];
            loadCalendar(currentMonth, currentYear);
        });
}

/****************************************************
   LOAD CALENDAR
****************************************************/
function loadCalendar(month, year) {
    calendarBody.innerHTML = "";
    document.getElementById("currentMonthYear").innerText =
        new Date(year, month).toLocaleString("default", {
            month: "long",
            year: "numeric"
        });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let row = document.createElement("tr");

    for (let i = 0; i < firstDay; i++) row.appendChild(document.createElement("td"));

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("td");
        cell.innerHTML = `<strong>${day}</strong>`;

        reminders.forEach(r => {
            if (r.day == day && r.month == month + 1 && r.year == year) {
                const e = document.createElement("div");
                e.className = "event";
                e.innerText = `${r.title} (${r.time})`;
                cell.appendChild(e);
            }
        });

        row.appendChild(cell);

        if (row.children.length === 7) {
            calendarBody.appendChild(row);
            row = document.createElement("tr");
        }
    }

    if (row.children.length) calendarBody.appendChild(row);
}

/****************************************************
   ADD / UPDATE REMINDER
****************************************************/
document.getElementById("addEventBtn").addEventListener("click", () => {
    const day = +document.getElementById("eventDay").value;
    const month = +document.getElementById("eventMonth").value;
    const year = +document.getElementById("eventYear").value;
    const time = document.getElementById("eventTime").value.trim();
    const title = document.getElementById("eventTitle").value.trim();

    if (!day || !month || !year || !time || !title) {
        showPopup("⚠ Missing Fields", "Please fill all fields.");
        return;
    }

    const reminderData = { title, day, month, year, time };

    // ADD
    if (!editingReminderId) {
        fetch(`${API}/api/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reminderData)
        })
            .then(() => {
                showPopup("✅ Reminder Added", `${title} on ${day}-${month}-${year} at ${time}`);
                alertSound.play();
                fetchReminders();
            });
    }

    // UPDATE
    else {
        // first delete the old one
        fetch(`${API}/api/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingReminderId })
        }).then(() => {
            // then add new updated reminder
            fetch(`${API}/api/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reminderData)
            }).then(() => {
                showPopup("✏️ Reminder Updated", `${title} on ${day}-${month}-${year} at ${time}`);
                alertSound.play();
                editingReminderId = null;
                document.getElementById("addEventBtn").innerText = "Add Event";
                fetchReminders();
            });
        });
    }

    // Reset form
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDay").value = "";
    document.getElementById("eventMonth").value = 1;
    document.getElementById("eventYear").value = currentYear;
    document.getElementById("eventTime").value = "";
});

/****************************************************
   VIEW ALL REMINDERS
****************************************************/
document.getElementById("viewAllBtn").addEventListener("click", () => {
    document.getElementById("reminderList").style.display = "block";
    reminderItems.innerHTML = "";

    reminders.forEach(r => {
        const li = document.createElement("li");
        li.innerHTML = `
            <b>${r.title}</b> - ${r.day}/${r.month}/${r.year} at ${r.time}
            <button class="editBtn" data-id="${r.id}">Edit</button>
            <button class="deleteBtn" data-id="${r.id}">Delete</button>
        `;
        reminderItems.appendChild(li);
    });
});

/****************************************************
   DELETE + EDIT BUTTON HANDLERS
****************************************************/
document.addEventListener("click", (e) => {
    // DELETE
    if (e.target.classList.contains("deleteBtn")) {
        const id = e.target.dataset.id;

        fetch(`${API}/api/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        }).then(() => {
            showPopup("🗑 Reminder Deleted", "Removed successfully.");
            alertSound.play();
            fetchReminders();
        });
    }

    // EDIT
    if (e.target.classList.contains("editBtn")) {
        const id = e.target.dataset.id;
        const r = reminders.find(x => x.id === id);

        editingReminderId = id;

        document.getElementById("eventTitle").value = r.title;
        document.getElementById("eventDay").value = r.day;
        document.getElementById("eventMonth").value = r.month;
        document.getElementById("eventYear").value = r.year;
        document.getElementById("eventTime").value = r.time;

        document.getElementById("addEventBtn").innerText = "Update Reminder";
        showPopup("✏️ Edit Mode", "Make changes and click Update Reminder");
    }
});

/****************************************************
   AUTO REMINDER POPUP (every 5 sec)
****************************************************/
setInterval(() => {
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const t =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

    reminders.forEach(r => {
        if (r.day == d && r.month == m && r.year == y && r.time == t && !r.notified) {
            alertSound.play();
            showPopup("⏰ Reminder Alert", `${r.title} — ${d}/${m}/${y} at ${t}`);
            r.notified = true;
        }
    });
}, 5000);

/****************************************************
   MONTH NAVIGATION
****************************************************/
document.getElementById("prevMonthBtn").onclick = () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    fetchReminders();
};

document.getElementById("nextMonthBtn").onclick = () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    fetchReminders();
};

/****************************************************
   INITIAL LOAD
****************************************************/
fetchReminders();
