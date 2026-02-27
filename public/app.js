/* ═══════════════════════════════════════════════════════════════════════
   ProManage — Frontend Logic
   Auth, Workspaces, Projects, Tasks (Kanban board)
   ═══════════════════════════════════════════════════════════════════════ */

const API = "https://pro-manage-backend-nine.vercel.app/api";

// ─── DOM Helpers ────────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── State ──────────────────────────────────────────────────────────────
let token = localStorage.getItem("pm_token") || "";
let refreshToken = localStorage.getItem("pm_refresh") || "";
let currentUser = JSON.parse(localStorage.getItem("pm_user") || "null");
let activeWorkspaceId = null;
let activeProjectId = null;

// ─── Toast ──────────────────────────────────────────────────────────────
function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    $("#toast-container").appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ─── API Helper ─────────────────────────────────────────────────────────
async function api(method, path, body = null) {
    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    let res = await fetch(`${API}${path}`, opts);

    // Auto-refresh on 401
    if (res.status === 401 && refreshToken) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            opts.headers["Authorization"] = `Bearer ${token}`;
            res = await fetch(`${API}${path}`, opts);
        }
    }

    const data = await res.json().catch(() => ({ status: "error", message: res.statusText }));
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
}

async function tryRefresh() {
    try {
        const res = await fetch(`${API}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        token = data.data.accessToken;
        localStorage.setItem("pm_token", token);
        return true;
    } catch {
        logout();
        return false;
    }
}

// ─── Auth ───────────────────────────────────────────────────────────────
function setAuth(data) {
    token = data.accessToken;
    refreshToken = data.refreshToken;
    currentUser = data.user;
    localStorage.setItem("pm_token", token);
    localStorage.setItem("pm_refresh", refreshToken);
    localStorage.setItem("pm_user", JSON.stringify(currentUser));
}

function logout() {
    if (token) api("POST", "/auth/logout").catch(() => { });
    token = "";
    refreshToken = "";
    currentUser = null;
    localStorage.removeItem("pm_token");
    localStorage.removeItem("pm_refresh");
    localStorage.removeItem("pm_user");
    showView("auth");
}

function showView(name) {
    if (name === "auth") {
        $("#auth-view").classList.remove("hidden");
        $("#dashboard-view").classList.add("hidden");
    } else {
        $("#auth-view").classList.add("hidden");
        $("#dashboard-view").classList.remove("hidden");
        updateUserUI();
        loadWorkspaces();
    }
}

function updateUserUI() {
    if (!currentUser) return;
    $("#user-badge").textContent = currentUser.name?.charAt(0).toUpperCase() || "U";
    $("#user-name").textContent = currentUser.name || "User";
    $("#user-role").textContent = currentUser.role || "MEMBER";
}

// Auth form toggles
$("#show-register").addEventListener("click", (e) => {
    e.preventDefault();
    $("#login-form").classList.add("hidden");
    $("#register-form").classList.remove("hidden");
});
$("#show-login").addEventListener("click", (e) => {
    e.preventDefault();
    $("#register-form").classList.add("hidden");
    $("#login-form").classList.remove("hidden");
});

// Login
$("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const data = await api("POST", "/auth/login", {
            email: $("#login-email").value.trim(),
            password: $("#login-password").value,
        });
        setAuth(data.data);
        toast("Welcome back!", "success");
        showView("dashboard");
    } catch (err) {
        toast(err.message, "error");
    }
});

// Register
$("#register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const data = await api("POST", "/auth/register", {
            name: $("#reg-name").value.trim(),
            email: $("#reg-email").value.trim(),
            password: $("#reg-password").value,
        });
        setAuth(data.data);
        toast("Account created!", "success");
        showView("dashboard");
    } catch (err) {
        toast(err.message, "error");
    }
});

$("#logout-btn").addEventListener("click", logout);

// ─── Modal ──────────────────────────────────────────────────────────────
function showModal(title, formHTML, onSubmit) {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = `<form class="auth-form" id="modal-form">${formHTML}
        <button type="submit" class="btn btn-primary btn-full">${title}</button></form>`;
    $("#modal-overlay").classList.remove("hidden");
    $("#modal-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await onSubmit();
    });
}

function closeModal() { $("#modal-overlay").classList.add("hidden"); }
$("#modal-close").addEventListener("click", closeModal);
$("#modal-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// ─── Workspaces ─────────────────────────────────────────────────────────
async function loadWorkspaces() {
    try {
        const data = await api("GET", "/workspaces");
        const list = $("#workspace-list");
        list.innerHTML = "";
        data.data.forEach((ws) => {
            const li = document.createElement("li");
            li.innerHTML = `<span>${ws.name}</span>
                <span class="item-actions">
                    <button data-action="del-ws" data-id="${ws.id}" title="Delete">🗑</button>
                </span>`;
            li.dataset.id = ws.id;
            if (ws.id === activeWorkspaceId) li.classList.add("active");
            li.addEventListener("click", (e) => {
                if (e.target.dataset.action === "del-ws") {
                    deleteWorkspace(ws.id);
                    return;
                }
                selectWorkspace(ws.id, ws.name);
            });
            list.appendChild(li);
        });
    } catch (err) {
        toast(err.message, "error");
    }
}

function selectWorkspace(id) {
    activeWorkspaceId = id;
    activeProjectId = null;
    $$('#workspace-list li').forEach(l => l.classList.toggle('active', Number(l.dataset.id) === id));
    loadProjects(id);
    $("#welcome-state").classList.remove("hidden");
    $("#task-board").classList.add("hidden");
}

async function deleteWorkspace(id) {
    if (!confirm("Delete this workspace and all its projects?")) return;
    try {
        await api("DELETE", `/workspaces/${id}`);
        toast("Workspace deleted", "success");
        if (activeWorkspaceId === id) { activeWorkspaceId = null; activeProjectId = null; }
        loadWorkspaces();
        $("#project-list").innerHTML = "";
        $("#welcome-state").classList.remove("hidden");
        $("#task-board").classList.add("hidden");
    } catch (err) { toast(err.message, "error"); }
}

$("#add-workspace-btn").addEventListener("click", () => {
    showModal("Create Workspace", `
        <div class="form-group"><label>Name</label>
        <input type="text" id="m-ws-name" placeholder="My Workspace" required></div>`,
        async () => {
            try {
                await api("POST", "/workspaces", { name: $("#m-ws-name").value.trim() });
                toast("Workspace created!", "success");
                closeModal();
                loadWorkspaces();
            } catch (err) { toast(err.message, "error"); }
        });
});

// ─── Projects ───────────────────────────────────────────────────────────
async function loadProjects(workspaceId) {
    try {
        const data = await api("GET", `/projects?workspaceId=${workspaceId}`);
        const list = $("#project-list");
        list.innerHTML = "";
        data.data.forEach((p) => {
            const li = document.createElement("li");
            li.innerHTML = `<span>${p.name}</span>
                <span class="item-actions">
                    <button data-action="del-proj" data-id="${p.id}" title="Delete">🗑</button>
                </span>`;
            li.dataset.id = p.id;
            if (p.id === activeProjectId) li.classList.add("active");
            li.addEventListener("click", (e) => {
                if (e.target.dataset.action === "del-proj") {
                    deleteProject(p.id);
                    return;
                }
                selectProject(p.id, p.name);
            });
            list.appendChild(li);
        });
    } catch (err) { toast(err.message, "error"); }
}

function selectProject(id, name) {
    activeProjectId = id;
    $$('#project-list li').forEach(l => l.classList.toggle('active', Number(l.dataset.id) === id));
    $("#welcome-state").classList.add("hidden");
    $("#task-board").classList.remove("hidden");
    $("#board-title").textContent = name || "Tasks";
    loadTasks(id);
}

async function deleteProject(id) {
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
        await api("DELETE", `/projects/${id}`);
        toast("Project deleted", "success");
        if (activeProjectId === id) { activeProjectId = null; }
        loadProjects(activeWorkspaceId);
        $("#welcome-state").classList.remove("hidden");
        $("#task-board").classList.add("hidden");
    } catch (err) { toast(err.message, "error"); }
}

$("#add-project-btn").addEventListener("click", () => {
    if (!activeWorkspaceId) return toast("Select a workspace first.", "info");
    showModal("Create Project", `
        <div class="form-group"><label>Name</label>
        <input type="text" id="m-proj-name" placeholder="Website Redesign" required></div>
        <div class="form-group"><label>Description</label>
        <textarea id="m-proj-desc" placeholder="Optional description"></textarea></div>`,
        async () => {
            try {
                await api("POST", "/projects", {
                    name: $("#m-proj-name").value.trim(),
                    description: $("#m-proj-desc").value.trim() || undefined,
                    workspaceId: activeWorkspaceId,
                });
                toast("Project created!", "success");
                closeModal();
                loadProjects(activeWorkspaceId);
            } catch (err) { toast(err.message, "error"); }
        });
});

// ─── Tasks ──────────────────────────────────────────────────────────────
async function loadTasks(projectId) {
    try {
        const data = await api("GET", `/tasks?projectId=${projectId}`);
        renderBoard(data.data);
    } catch (err) { toast(err.message, "error"); }
}

async function loadMyTasks() {
    try {
        const data = await api("GET", "/tasks/me");
        activeProjectId = null;
        $$('#project-list li').forEach(l => l.classList.remove('active'));
        $("#welcome-state").classList.add("hidden");
        $("#task-board").classList.remove("hidden");
        $("#board-title").textContent = "📋 My Tasks";
        renderBoard(data.data);
    } catch (err) { toast(err.message, "error"); }
}

function renderBoard(tasks) {
    const cols = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    tasks.forEach((t) => (cols[t.status] || cols.TODO).push(t));

    fillColumn("col-todo", cols.TODO, "count-todo");
    fillColumn("col-progress", cols.IN_PROGRESS, "count-progress");
    fillColumn("col-review", cols.IN_REVIEW, "count-review");
    fillColumn("col-done", cols.DONE, "count-done");
}

function fillColumn(containerId, tasks, countId) {
    const el = $(`#${containerId}`);
    el.innerHTML = "";
    $(`#${countId}`).textContent = tasks.length;

    tasks.forEach((t) => {
        const card = document.createElement("div");
        card.className = "task-card";
        const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "";
        card.innerHTML = `
            <div class="task-title">${t.title}</div>
            <div class="task-meta">
                <span class="tag ${t.priority}">${t.priority}</span>
            </div>
            ${due ? `<div class="task-due">📅 ${due}</div>` : ""}`;
        card.addEventListener("click", () => showTaskDetail(t));
        el.appendChild(card);
    });
}

function showTaskDetail(task) {
    const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const isMember = currentUser?.role === "MEMBER";

    let fields = "";
    if (!isMember) {
        fields = `
        <div class="form-group"><label>Title</label>
        <input type="text" id="m-task-title" value="${task.title}" required></div>
        <div class="form-group"><label>Description</label>
        <textarea id="m-task-desc">${task.description || ""}</textarea></div>
        <div class="form-group"><label>Priority</label>
        <select id="m-task-priority">${priorities.map(p => `<option value="${p}" ${p === task.priority ? "selected" : ""}>${p}</option>`).join("")}</select></div>`;
    }
    fields += `
        <div class="form-group"><label>Status</label>
        <select id="m-task-status">${statuses.map(s => `<option value="${s}" ${s === task.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>`;

    if (!isMember) {
        fields += `<div style="margin-top:0.5rem"><button type="button" class="btn btn-danger btn-sm" id="m-task-del">Delete Task</button></div>`;
    }

    showModal("Update Task", fields, async () => {
        try {
            const body = { status: $("#m-task-status").value };
            if (!isMember) {
                body.title = $("#m-task-title").value.trim();
                body.description = $("#m-task-desc").value.trim() || undefined;
                body.priority = $("#m-task-priority").value;
            }
            await api("PATCH", `/tasks/${task.id}`, body);
            toast("Task updated!", "success");
            closeModal();
            if (activeProjectId) loadTasks(activeProjectId);
            else loadMyTasks();
        } catch (err) { toast(err.message, "error"); }
    });

    // Wire delete (after modal is rendered)
    setTimeout(() => {
        const delBtn = $("#m-task-del");
        if (delBtn) {
            delBtn.addEventListener("click", async () => {
                if (!confirm("Delete this task?")) return;
                try {
                    await api("DELETE", `/tasks/${task.id}`);
                    toast("Task deleted", "success");
                    closeModal();
                    if (activeProjectId) loadTasks(activeProjectId);
                    else loadMyTasks();
                } catch (err) { toast(err.message, "error"); }
            });
        }
    }, 50);
}

$("#add-task-btn").addEventListener("click", () => {
    if (!activeProjectId) return toast("Select a project first.", "info");
    const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    showModal("Create Task", `
        <div class="form-group"><label>Title</label>
        <input type="text" id="m-task-title" placeholder="Task title" required></div>
        <div class="form-group"><label>Description</label>
        <textarea id="m-task-desc" placeholder="Optional"></textarea></div>
        <div class="form-group"><label>Priority</label>
        <select id="m-task-priority">${priorities.map(p => `<option value="${p}" ${p === "MEDIUM" ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div class="form-group"><label>Due Date</label>
        <input type="date" id="m-task-due"></div>`,
        async () => {
            try {
                const body = {
                    title: $("#m-task-title").value.trim(),
                    description: $("#m-task-desc").value.trim() || undefined,
                    priority: $("#m-task-priority").value,
                    projectId: activeProjectId,
                };
                const due = $("#m-task-due").value;
                if (due) body.dueDate = new Date(due).toISOString();
                await api("POST", "/tasks", body);
                toast("Task created!", "success");
                closeModal();
                loadTasks(activeProjectId);
            } catch (err) { toast(err.message, "error"); }
        });
});

$("#my-tasks-btn").addEventListener("click", loadMyTasks);

// ─── Init ───────────────────────────────────────────────────────────────
if (token && currentUser) {
    showView("dashboard");
} else {
    showView("auth");
}
