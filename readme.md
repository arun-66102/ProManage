# 🚀 ProManage (Collaborative Project Management API)

This project is designed to force you to use **every single concept** from Phase 1-9. It is not just a CRUD app; it is a scalable, enterprise-grade backend.

---

## 🏗️ Technical Stack
*   **Runtime:** Node.js (v20+)
*   **Framework:** Express.js (Phase 5)
*   **Language:** TypeScript (Phase 8)
*   **Database:** PostgreSQL or MySQL (SQL is mandatory).
*   **ORM:** Prisma or TypeORM (Phase 6).
*   **Caching:** Redis (Phase 6).
*   **Testing:** Jest + Supertest (Phase 7).

---

## 💾 Database Schema (SQL Relational)

This structure requires complex joins, transactions, and constraints.

1.  **Users**: `id`, `email`, `password_hash`, `role` (Admin/Manager/Member).
2.  **Workspaces**: `id`, `name`, `owner_id`.
3.  **Projects**: `id`, `workspace_id`, `name`, `status`.
4.  **Tasks**: `id`, `project_id`, `assignee_id`, `title`, `priority`, `due_date`.
5.  **AuditLogs**: `id`, `user_id`, `action`, `timestamp`.

---

## 🎯 Features Mapped to Learning Phases

### 1. **Authentication & Security (Phase 6)**
*   **Requirement:** Users must log in to get a JWT.
*   **Challenge:** Implement **Refresh Tokens** (stored in HttpOnly cookies) and Access Tokens.
*   **Security:** Use `helmet` and implement Rate Limiting on the login route to prevent brute-force attacks.

### 2. **Role-Based Access Control (RBAC) (Phase 5 Middleware)**
*   **Requirement:**
    *   `Admin`: Can delete workspaces.
    *   `Manager`: Can create projects/tasks.
    *   `Member`: Can only move tasks (update status).
*   **Challenge:** Create a reusable middleware `@HasRole('ADMIN')` or `authorize(['MANAGER', 'ADMIN'])`.

### 3. **File Attachments with Streams (Phase 4)**
*   **Requirement:** Users can upload attachments (PDFs/Images) to a task.
*   **Challenge:** Do **NOT** use `multer` to save to disk seamlessly.
    *   Create a **Stream** that reads the incoming file request.
    *   Compress it using `zlib` (Node native module).
    *   Pipe it to a storage location (or simulate S3 upload).
    *   **Goal:** Handle a 1GB file upload without crashing the server's memory.

### 4. **Complex SQL Queries & Transactions (Phase 6)**
*   **Requirement:** When a Project is deleted, all its Tasks must be deleted **atomically**.
*   **Challenge:** Use a **Database Transaction**. If deleting Task #50 fails, the whole Project deletion must roll back.
*   **Optimization:** Write a raw SQL query (or advanced ORM query) to "Get all tasks for a user across all workspaces", indexed by `assignee_id`.

### 5. **Real-time Updates (Phase 4 Events)**
*   **Requirement:** When a Manager assigns a task to a User, the User should get a notification.
*   **Challenge:** Use Node.js `EventEmitter` internally to decouple the logic.
    *   `taskService` emits `'task:assigned'`.
    *   `notificationService` listens and sends an email (mocked).

### 6. **Performance Tuning (Phase 9)**
*   **Requirement:** The "Get All Tasks" endpoint is slow.
*   **Challenge:** Implement **Redis Caching**.
    *   First request: Read from SQL -> Write to Redis (TTL 60s).
    *   Second request: Read from Redis (serve in <5ms).

### 7. **Reliability (Phase 7 & 8)**
*   **Requirement:** The API cannot crash.
*   **Challenge:**
    *   Write **Integration Tests** for the Login and Create Task flows.
    *   Use **Zod DTOs** (Phase 8) to validate that `due_date` is a valid future date.

---

## 🛣️ Implementation Roadmap

### **Step 1: The Skeleton (Day 1)**
*   Initialize TypeScript project.
*   Setup Express + Helmet + CORS.
*   Connect to PostgreSQL.

### **Step 2: core Auth (Day 2)**
*   User Registration / Login.
*   JWT handling middleware.

### **Step 3: The Business Logic (Day 3-4)**
*   CRUD for Workspaces and Projects.
*   Implement RBAC middleware.

### **Step 4: The Hard Stuff (Day 5)**
*   File Upload streaming.
*   Database Transactions.

### **Step 5: Polish (Day 6)**
*   Add Redis caching.
*   Write Jest tests.
*   Run CPU Profiler to prove endpoints are fast.

---

## 🏁 Why this project?
If you can build this, you can walk into any Senior Node.js interview and explain:
> *"I built a scalable API where I handled backpressure on file uploads using Streams, managed distributed caching with Redis, and ensured data integrity with SQL transactions, all fully typed in TypeScript."*

**That is how you get hired.**
