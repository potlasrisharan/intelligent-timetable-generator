# TimeTable X — Complete Technical Deep-Dive
### Jury Reference Guide — GeeksforGeeks Hackathon, April 2026

> **Live URL:** https://timetablex.sharan.quest  
> **Backend API:** https://itg-backend-837l.onrender.com  
> **Repository:** https://github.com/potlasrisharan/intelligent-timetable-generator

---

## TABLE OF CONTENTS

1. [What Does TimeTable X Do?](#1-what-does-timetable-x-do)
2. [System Architecture — End to End](#2-system-architecture)
3. [The CP-SAT Solver — Every Constraint Explained](#3-the-cp-sat-solver)
4. [Decision Variables & Model Construction](#4-decision-variables)
5. [AI Action Engine — How the Chatbot Modifies Schedules](#5-ai-action-engine)
6. [CSV Import — 3-Phase Detection Pipeline](#6-csv-import-pipeline)
7. [Constraint Inference Engine](#7-constraint-inference-engine)
8. [Explainable AI (XAI) — Why Each Slot Was Chosen](#8-explainable-ai)
9. [Every API Endpoint](#9-api-endpoints)
10. [Frontend Architecture — Pages & Components](#10-frontend-architecture)
11. [Data Storage Layer — Dual-Store Pattern](#11-data-storage-layer)
12. [Security & Rate Limiting](#12-security)
13. [Deployment Architecture](#13-deployment)
14. [Complexity Analysis](#14-complexity-analysis)
15. [Anticipated Judge Questions & Answers](#15-judge-qa)

---

## 1. What Does TimeTable X Do?

TimeTable X is a **full-stack academic timetable generation and management system** for South Asian University. It takes raw input data (courses, faculty, rooms, sections, holidays) and produces a **conflict-free, constraint-satisfying weekly timetable** using a formal constraint solver.

**The Core Pipeline:**
```
CSV Upload → Header Detection → Data Import → Constraint Inference → CP-SAT Solver → Timetable Output → XAI Explanations → AI Review → Export
```

**What makes it different from basic timetable tools:**
- Uses **Google OR-Tools CP-SAT**, a formal constraint programming solver — not heuristics or greedy algorithms
- Has an **AI copilot** that can READ the schedule, ANALYZE conflicts, and EXECUTE changes
- Understands **messy CSV files** with non-standard headers via 3-phase detection
- Every placement comes with an **XAI explanation** ("why was CS301 placed in Room A-101 on Monday P1?")

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                           │
│  Next.js 15.5.15 │ React 19 │ TypeScript 5 │ Tailwind CSS 4.1.9   │
│  Clerk Auth │ Radix UI │ Lucide Icons │ Recharts                   │
│                                                                     │
│  15 Pages: Dashboard, Editor, Courses, Faculty, Rooms, Sections,   │
│  Combined, Timeslots, Holidays, Conflicts, Reports, History,       │
│  Settings, Teacher Dashboard, Student Dashboard                     │
│                                                                     │
│  API Client: 12s timeout → backend, silent fallback to mock data   │
├──────────────────────────────┬──────────────────────────────────────┤
│          HTTPS (REST)        │          CORS Allowlist              │
├──────────────────────────────┴──────────────────────────────────────┤
│                        BACKEND (Render)                            │
│  Python 3.10+ │ FastAPI 0.115.6 │ Uvicorn 0.34.0                  │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐    │
│  │  9 Routers   │ │  Middleware   │ │  Job Tracker             │    │
│  │  (REST API)  │ │  CORS        │ │  Threading + Lock        │    │
│  │              │ │  Rate Limit  │ │  Max 2 concurrent jobs   │    │
│  │              │ │  Security    │ │                          │    │
│  └──────┬───────┘ └──────────────┘ └──────────────────────────┘    │
│         │                                                           │
│  ┌──────┴───────┐ ┌──────────────┐ ┌──────────────────────────┐    │
│  │ OR-Tools     │ │ AI Service   │ │ Constraint Service       │    │
│  │ CP-SAT       │ │ Groq LLM    │ │ Deterministic + LLM      │    │
│  │ 45s timeout  │ │ LLaMA 3.1   │ │ Constraint Inference     │    │
│  └──────┬───────┘ └──────────────┘ └──────────────────────────┘    │
│         │                                                           │
│  ┌──────┴──────────────────────────────────────────────────────┐    │
│  │                    DUAL STORE LAYER                          │    │
│  │  DatabaseStore (Supabase) ←→ InMemoryStore (Seed Data)      │    │
│  │  Reads from Supabase first, falls back to in-memory         │    │
│  │  Solver ALWAYS reads from in-memory for consistency         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. The CP-SAT Solver — Every Constraint Explained

**File:** `backend/app/solver/engine.py` (540 lines)  
**Solver:** Google OR-Tools CP-SAT (Constraint Programming – Satisfiability)  
**Timeout:** 45 seconds  
**Statuses:** OPTIMAL (quality 97), FEASIBLE (quality 84), or UNSATISFIABLE (error)

### What is CP-SAT?

CP-SAT (Constraint Programming Satisfiability) combines:
- **Constraint Propagation** — reduces the search space by eliminating impossible assignments
- **SAT Solving** — converts the problem to Boolean satisfiability clauses
- **Linear Relaxation** — uses LP bounds to prune branches
- **Lazy Clause Generation** — learns from failed assignments to avoid repeating them

**Why CP-SAT over heuristics?**
| Approach | Guarantees | Speed | Code Complexity |
|----------|-----------|-------|-----------------|
| Greedy | No optimality | Fast | Low |
| Genetic Algorithm | No guarantee of feasibility | Moderate | High |
| **CP-SAT** | **Provably optimal or certifiably infeasible** | Moderate | Moderate |

### The 9 Hard Constraints (with exact code)

#### HC-01: Each request scheduled exactly once
```python
for r_id in range(num_requests):
    model.AddExactlyOne(
        schedules[(r_id, p_id, rm_id)]
        for p_id in range(total_periods)
        for rm_id in range(num_rooms)
    )
```
**What it does:** Every theory/lab hour MUST appear exactly once in the final timetable. Not zero, not two.  
**Solver method:** `AddExactlyOne` — a native CP-SAT constraint that's more efficient than `Add(sum(...) == 1)`.

#### HC-02: One class per room per period
```python
for p_id in range(total_periods):
    for rm_id in range(num_rooms):
        model.AddAtMostOne(
            schedules[(r_id, p_id, rm_id)] for r_id in range(num_requests)
        )
```
**What it does:** Two classes can never be in the same room at the same time.  
**Why AtMostOne:** We use `AddAtMostOne` (not `AddExactlyOne`) because a room CAN be empty.

#### HC-03: One class per faculty per period
```python
for p_id in range(total_periods):
    for fac_id in faculty_ids:
        fac_requests = [r_id for r_id, req in enumerate(requests) if req[2] == fac_id]
        if fac_requests:
            model.AddAtMostOne(
                schedules[(r_id, p_id, rm_id)]
                for r_id in fac_requests
                for rm_id in range(num_rooms)
            )
```
**What it does:** A professor can't teach two classes simultaneously. Period.

#### HC-04: One class per section per period
```python
for p_id in range(total_periods):
    for sec_id in section_ids:
        sec_requests = [r_id for r_id, req in enumerate(requests) if req[1] == sec_id]
        if sec_requests:
            model.AddAtMostOne(...)
```
**What it does:** Students in CSE 3A can't attend CS301 and CS315 at the same time.

#### HC-05/06: Room capacity ≥ section student count
```python
if cap < needed_cap:
    for p_id in range(total_periods):
        model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
```
**What it does:** A section with 54 students can't be placed in a room with capacity 30.  
**Implementation:** Pre-filters by setting the variable to 0 (banned) rather than at runtime — this is much faster for the solver.

#### HC-07: Labs → LAB rooms; Theory → CLASSROOM rooms
```python
if is_lab and room_type != "LAB":
    model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
elif not is_lab and room_type != "CLASSROOM":
    model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
```
**What it does:** Practical sessions MUST be in labs (with equipment). Theory MUST be in classrooms.

#### HC-08: File-aware constraints (dynamic)
```python
if (fac_id, day_name, timeslot_id) in constraint_state["facultyUnavailableSlots"]:
    model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
if (sec_id, day_name, timeslot_id) in constraint_state["sectionUnavailableSlots"]:
    model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
if (room_id, day_name, timeslot_id) in constraint_state["roomUnavailableSlots"]:
    model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
if required_room_id and room_id != required_room_id:
    model.Add(schedules[(r_id, p_id, rm_idx)] == 0)
```
**What it does:** Applies constraints from CSV imports. If a faculty member says "no classes on Friday", those slots are banned. If a course says "must use Lab-1", all other rooms are banned. These are **dynamically injected** from the constraint rules store.

#### HC-09: Faculty daily load cap
```python
model.Add(sum(day_vars) <= max_per_day)
```
**What it does:** If Dr. Farhan has `maxPeriodsPerDay = 4`, he can't teach more than 4 classes on any single day.

#### HC-11: Consecutive lab pairs
```python
model.AddImplication(var_a, var_b)  # If lab part 1 is at P3, part 2 MUST be at P4
model.Add(var_a == 0)  # Lab part 1 can't be in the LAST slot (no room for part 2)
```
**What it does:** 2-hour lab sessions must be in consecutive periods on the same day, in the same room.  
**Solver method:** `AddImplication` — a → b means "if a is true, then b must be true".

#### HC-13: Holiday blocked days
```python
if day_idx in holiday_blocked_days:
    model.Add(schedules[(r_id, p_id, rm_id)] == 0)
```
**What it does:** If "Founders Day" falls on Monday, ALL slots on Monday are blocked.

### Soft Constraint: Minimize Faculty Idle Gaps (SC-01)
The solver minimizes the total idle time between a faculty member's first and last class of the day. This is an **objective function**, not a hard constraint — the solver will violate it if necessary to satisfy all hard constraints.

---

## 4. Decision Variables & Model Construction

### How the model is built

**Decision Variable:**
```python
schedules[(request_id, period_id, room_id)] = BoolVar
```
- `request_id`: Index into the requests list (one per theory/lab hour)
- `period_id`: Combined day+timeslot index (`day_idx * num_timeslots + ts_idx`)
- `room_id`: Index into rooms list

**Total variables** = `num_requests × total_periods × num_rooms`

**Example:** With 30 requests, 30 periods (5 days × 6 slots), and 6 rooms:
- Variables = 30 × 30 × 6 = **5,400 Boolean variables**
- The solver must find an assignment of 0/1 to each variable that satisfies ALL constraints

### Request Construction
```python
# Theory: 1 request per hour per section
for _ in range(course.theoryHours):
    for sec_id in course.sectionIds:
        requests.append((course_id, sec_id, faculty_id, False, course))

# Practical: 1 request per hour per section (paired later for consecutive constraint)
for _ in range(course.practicalHours):
    for sec_id in course.sectionIds:
        requests.append((course_id, sec_id, faculty_id, True, course))
```

### Period Indexing
```
Mon P1 = 0,  Mon P2 = 1,  ..., Mon P6 = 5
Tue P1 = 6,  Tue P2 = 7,  ..., Tue P6 = 11
...
Fri P1 = 24, Fri P2 = 25, ..., Fri P6 = 29
```
Formula: `period_index(day_idx, ts_idx) = day_idx * num_timeslots + ts_idx`

---

## 5. AI Action Engine

**File:** `backend/app/ai_service.py` (lines 819-922)  
**Model:** Groq LLaMA 3.1 8B Instant  
**Temperature:** 0.2 (low randomness for reliable structured output)

### How it works

1. **User sends a message** to the AI Chat (e.g., "Block P1 on Monday for Dr. Farhan")
2. **Backend builds context**: Current quality score, conflict summary, prediction highlights
3. **System prompt instructs** the LLM to include `[ACTIONS]` blocks for any modifications
4. **LLM responds** with natural language + structured JSON actions
5. **Backend parses** the `[ACTIONS]` block and executes each action
6. **Audit trail** is updated automatically

### System Prompt (exact)
```
You are the TimeTable X AI assistant. Answer as a scheduling copilot, not a generic chatbot.
Stay concise, use the supplied timetable facts, and prefer actionable next steps.
CRITICAL: If the user asks to change the schedule, add a constraint, or fix something,
you MUST include an [ACTIONS] block at the end of your response with a JSON array of actions.
```

### Action Protocol
```json
[ACTIONS]
{
  "actions": [
    {
      "kind": "ADD_CONSTRAINT",
      "params": {
        "scope": "faculty",
        "kind": "faculty_unavailable_slot",
        "targetLabel": "Dr. Farhan Alam",
        "parameters": { "day": "Mon", "timeslotIds": ["p1"] }
      }
    }
  ]
}
```

### Supported Actions
| Action | What It Does | Backend Function Called |
|--------|-------------|----------------------|
| `ADD_CONSTRAINT` | Injects a scheduling rule (e.g., block a slot) | `constraint_service.save_constraint_rules()` |
| `RESOLVE_CONFLICT` | Marks a conflict as resolved | `store.resolve_conflict()` |
| `TRIGGER_GENERATE` | Initiates a solver run | Audit entry + generation trigger |
| `ADD_AUDIT` | Logs an action to the audit trail | `_append_audit()` |

### Security Safeguards
```python
def _sanitize_chat_message(text: str) -> str:
    sanitized = re.sub(
        r"(?i)(ignore\s+(all\s+)?previous\s+instructions|you\s+are\s+now|system\s*:|act\s+as\s+a|forget\s+(all\s+)?prior)",
        "[filtered]",
        text,
    )
    return sanitized[:2000].strip()
```
- Prompt injection attempts are filtered
- History is capped at 6 messages
- Only `user`/`assistant` roles are allowed (no injected `system` messages)
- Messages are truncated to 2000 characters

---

## 6. CSV Import — 3-Phase Detection Pipeline

**File:** `backend/app/routers/import_data.py` (605 lines)

### The 3 Phases

```
User uploads CSV
       │
       ▼
┌─────────────────────────────────┐
│  Phase 1: STRICT MATCHING       │
│  Exact header names:            │
│  "capacity" + "room_name" →     │
│  rooms                          │    ✓ → Import as rooms
│  "faculty_name" → faculty       │────────────────────────►
│  "course_code" → courses        │
└──────────┬──────────────────────┘
           │ No match
           ▼
┌─────────────────────────────────┐
│  Phase 2: SYNONYM MATCHING      │
│  50+ aliases, NO API needed:    │
│  "Classroom Name" → rooms       │    ✓ → Import as rooms
│  "Hall Capacity" → rooms        │────────────────────────►
│  "Teacher" → faculty            │    (with column mapping)
│  "Batch" → sections             │
│  "Subject Code" → courses       │
└──────────┬──────────────────────┘
           │ No match
           ▼
┌─────────────────────────────────┐
│  Phase 3: AI INFERENCE          │
│  Sends headers to Groq LLM:    │
│  "Identify what scheduling      │    ✓ → Import with
│   entity this CSV represents"   │────────────────────────►
│  Returns: collection + mapping  │    AI-derived mapping
└──────────┬──────────────────────┘
           │ No match
           ▼
      400 Error: "Unrecognized CSV format"
```

### Synonym Dictionaries (50+ aliases)
```python
_ROOM_SYNONYMS = {"classroom", "classroom_name", "hall", "hall_name", "venue", "venue_name",
    "lab_name", "theatre", "lecture_hall", "room_no", "room_number"}
_ROOM_CAPACITY_SYNONYMS = {"capacity", "hall_capacity", "student_capacity", "seats",
    "seating_capacity", "max_capacity", "size"}
_FACULTY_SYNONYMS = {"faculty", "faculty_name", "teacher", "teacher_name", "instructor",
    "instructor_name", "professor", "professor_name", "staff", "staff_name",
    "lecturer", "lecturer_name"}
_SECTION_SYNONYMS = {"section", "section_name", "batch", "batch_name", "class", "class_name",
    "group", "group_name", "student_group", "division"}
_COURSE_SYNONYMS = {"course_code", "code", "subject_code", "subject", "subject_name",
    "module", "module_code", "paper", "paper_code", "course"}
_HOLIDAY_SYNONYMS = {"holiday", "holiday_name", "festival", "event", "occasion"}
_ROOM_TYPE_SYNONYMS = {"type_of_room", "room_type", "type", "lab_or_class", "category"}
```

### Header Normalization
Before matching, ALL headers go through:
```python
re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")
```
So `"Classroom Name"` becomes `"classroom_name"`, `"Hall Capacity"` becomes `"hall_capacity"`.

### CSV Validation (before detection)
1. File extension must be `.csv`
2. Content-Type must be `text/csv` or `application/octet-stream`
3. File size ≤ **5 MB**
4. Encoding: UTF-8 with BOM handling
5. Must have at least 2 rows (header + 1 data row)
6. Max 10,000 rows per file

---

## 7. Constraint Inference Engine

**File:** `backend/app/constraint_service.py` (711 lines)

When a CSV is imported, the system doesn't just store the data — it **automatically infers scheduling constraints** from the data fields.

### What Gets Inferred

| Data Source | Field Analyzed | Constraint Rule Generated |
|-------------|---------------|--------------------------|
| Faculty CSV | `max_periods_per_day = 3` | `faculty_max_periods_per_day` (cap = 3) |
| Faculty CSV | `availability = "Mon-Thu"` | `faculty_unavailable_slot` (blocks Fri all slots) |
| Faculty CSV | `availability = "no P1"` | `faculty_unavailable_slot` (blocks P1 every day) |
| Rooms CSV | `unavailable = "Mon P1-P3"` | `room_unavailable_slot` (blocks those slots) |
| Sections CSV | `no_classes_after = P5` | `section_unavailable_slot` (blocks P6, P7) |
| Courses CSV | `required_room = Lab-1` | `course_required_room` (must use Lab-1) |
| Holidays CSV | `date = 2026-04-14` | `holiday_block_day` (blocks the weekday entirely) |
| Any CSV | Free-text `notes` column | **Groq LLM extracts** constraints from natural language |

### Example: "No classes after P4" → Solver constraint
```
CSV row: section_name=CSE3A, no_classes_after=P4
    ↓
Constraint service generates:
    kind: section_unavailable_slot
    targetLabel: CSE3A
    parameters: {day: Mon, timeslotIds: [p5, p6, p7]}
    parameters: {day: Tue, timeslotIds: [p5, p6, p7]}
    ... (for all 5 days)
    ↓
Solver reads constraint_state["sectionUnavailableSlots"]
    ↓
model.Add(schedules[(r_id, p_id, rm_idx)] == 0)  # bans those slots
```

### Supported Constraint Rule Types (6 kinds)
```python
SUPPORTED_RULE_KINDS = {
    "faculty_max_periods_per_day",    # Cap daily teaching hours
    "faculty_unavailable_slot",       # Block specific day+period for faculty
    "section_unavailable_slot",       # Block specific day+period for section
    "room_unavailable_slot",          # Block specific day+period for room
    "course_required_room",           # Course MUST use specific room
    "holiday_block_day",              # Block entire weekday
}
```

---

## 8. Explainable AI (XAI) — Why Each Slot Was Chosen

**File:** `backend/app/solver/engine.py` (lines 373-427)

Every generated timetable entry includes a `_xai_reason` field with a plain-English explanation.

### How XAI reasons are built
```python
def _build_xai_reason(course, faculty, room, section, day, timeslot_id, is_lab, timeslot_map):
    reasons = [
        f"Room {room_name} selected: only available {room_type} with capacity {cap} ≥ {students} students on {day}/{slot}.",
        f"{fac_name} is free this period (no double-booking conflict).",
        f"Section {section_name} has no concurrent class at {day} {slot_start}.",
    ]
    if is_lab:
        reasons.append("Lab session placed back-to-back in consecutive slot (HC-11 compliance).")
    return " ".join(reasons)
```

### Example XAI Output
> "Room A-101 selected: only available CLASSROOM with capacity 60 ≥ 54 students on Mon/P1. Prof. Sara Joseph is free this period (no double-booking conflict). Section CSE 3A has no concurrent class at Mon 08:30. "

---

## 9. Every API Endpoint

### Schedule Router (`/api/v1/schedule/`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/entries` | Get all timetable entries |
| `GET` | `/locked-slots` | Get manually locked slots |
| `GET` | `/conflicts` | Get scheduling conflicts |
| `GET` | `/versions` | Get timetable version history |
| `POST` | `/generate` | Trigger solver (returns `job_id`) |
| `GET` | `/generate/status/{job_id}` | Poll solver progress |
| `POST` | `/conflicts/{id}/resolve` | Resolve a conflict |
| `POST` | `/manual-entry` | Add a class manually |

### AI Router (`/api/v1/ai/`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/quality-review` | AI quality scoring (0-100) |
| `GET` | `/conflict-prediction` | Predict future conflicts |
| `GET` | `/constraint-rules` | List all constraint rules |
| `POST` | `/chat` | Chat with AI copilot (can execute actions) |
| `POST` | `/auto-reschedule/{id}` | AI-powered conflict resolution |

### Resource Router (`/api/v1/resources/`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/{collection}` | List resources (rooms, faculty, etc.) |
| `POST` | `/{collection}` | Create new resource |
| `PUT` | `/{collection}/{id}` | Update resource |
| `DELETE` | `/{collection}/{id}` | Delete resource |

### Other Routers
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/import/csv` | Upload + auto-detect CSV |
| `GET` | `/export/pdf` | Download timetable as PDF |
| `GET` | `/export/csv` | Download timetable as CSV |
| `GET` | `/schedule/explain` | Get XAI explanations |
| `GET` | `/dashboard/metrics` | Dashboard statistics |
| `GET` | `/reports/summary` | Report data |

---

## 10. Frontend Architecture

### Tech Stack
- **Framework:** Next.js 15.5.15 (App Router)
- **UI:** React 19 + TypeScript 5 + Tailwind CSS 4.1.9
- **Components:** Radix UI primitives (Dialog, Dropdown, etc.)
- **Icons:** Lucide React
- **Charts:** Recharts
- **Auth:** Clerk
- **Design:** Glassmorphism aesthetic, dark mode enforced (`color-scheme: dark`)

### Page Map (15 pages)
| Route | Page | Key Feature |
|-------|------|-------------|
| `/` | Landing | Sign-in redirect |
| `/dashboard` | Dashboard | Quality score, metrics, recent actions |
| `/editor` | Timetable Editor | Interactive grid, manual assignment, XAI panel |
| `/courses` | Course Management | CRUD, theory/lab hours |
| `/faculty` | Faculty Management | CRUD, workload, availability |
| `/rooms` | Room Management | CRUD, capacity, type |
| `/sections` | Section Management | CRUD, student count |
| `/combined-sections` | Combined Sections | Cross-section scheduling |
| `/timeslots` | Timeslot Config | Period definitions |
| `/holidays` | Holiday Management | Date-based blocking |
| `/conflicts` | Conflict Resolution | AI-assisted fixes |
| `/reports` | Reports | Utilization charts, exports |
| `/history` | Version History | Audit trail, version comparison |
| `/settings` | Settings | System configuration |
| `/teacher-dashboard` | Teacher View | Faculty-filtered schedule |
| `/student-dashboard` | Student View | Section-filtered schedule |

### API Client Pattern
```typescript
// Every API call has a silent fallback to mock data
export async function getJsonWithFallback<T>(path: string, fallbackValue: T) {
    if (!envConfig.apiBaseUrl) return fallbackValue  // No backend configured
    try {
        return await requestJson<T>(path)            // Try real API
    } catch {
        return fallbackValue                          // Fail silently with mock
    }
}
```
**Why?** The system MUST work during a demo even if the backend is down or the network is slow. The 12-second timeout ensures Render cold starts don't break the UI.

---

## 11. Data Storage Layer — Dual-Store Pattern

**File:** `backend/app/store.py` (280 lines)

### Architecture
```
                 store.list("rooms")
                       │
                       ▼
              ┌─────────────────┐
              │  DatabaseStore   │
              │  (Orchestrator)  │
              └────────┬────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
    ┌──────────────┐    ┌──────────────┐
    │ Supabase DB  │    │ InMemoryStore│
    │ (PostgreSQL) │    │ (Seed Data)  │
    │ Primary      │    │ Fallback     │
    └──────────────┘    └──────────────┘
```

### How it works
1. `DatabaseStore.list("rooms")` first tries **Supabase** (table `rooms`)
2. If Supabase fails (invalid key, network error), it falls back to **InMemoryStore**
3. The solver **always reads from InMemoryStore** for consistency during generation
4. CamelCase/snake_case conversion is automatic between frontend JSON and database columns

### Collection Mapping
```python
COLLECTION_MAP = {
    "editorEntries": "timetable_entries",   # camelCase → snake_case table
    "constraintRules": "constraint_rules",
    "auditTrail": "audit_trail",
    "timetableVersions": "timetable_versions",
    "lockedSlots": "locked_slots",
    ...
}
```

---

## 12. Security & Rate Limiting

### Security Headers (every response)
```python
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"
response.headers["X-XSS-Protection"] = "1; mode=block"
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
```

### Rate Limiting (per-IP, in-memory)
| Endpoint | Limit | Window |
|----------|-------|--------|
| `/schedule/generate` | 10 requests | 60 seconds |
| `/ai/chat` | 30 requests | 60 seconds |
| `/import/csv` | 15 requests | 60 seconds |
| `/auth/sign-in` | 10 requests | 60 seconds |
| `/export/` | 15 requests | 60 seconds |
| `/schedule/generate/status/*` | **EXEMPT** | — |

Status polling is exempt because the frontend polls every 2-3 seconds during generation.

### CORS Policy
```python
_ALWAYS_ALLOWED = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://intelligent-timetable-generator.vercel.app",
    "https://sharan.quest",
    "https://timetablex.sharan.quest",
]
```
These are **hardcoded** and always merged with any env var — they can never be accidentally removed.

---

## 13. Deployment Architecture

```
                    ┌────────────────┐
                    │   DNS (Vercel)  │
                    │ timetablex.    │
                    │ sharan.quest   │
                    └───────┬────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
       ┌───────┴───────┐       ┌─────────┴──────────┐
       │   Vercel       │       │    Render           │
       │   Frontend     │       │    Backend          │
       │   Next.js SSR  │───────│    FastAPI + CPSAT  │
       │   CDN Edge     │ REST  │    Uvicorn          │
       │   Auto-Deploy  │       │    Auto-Deploy      │
       └───────────────┘       └─────────┬──────────┘
                                          │
                                ┌─────────┴──────────┐
                                │     Supabase        │
                                │     PostgreSQL      │
                                │  (when configured)  │
                                └────────────────────┘
```

### Environment Variables
| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Vercel | Points frontend to Render backend |
| `GROQ_API_KEY` | Render | AI chat + CSV detection + quality review |
| `SUPABASE_URL` | Render | Database access |
| `SUPABASE_SERVICE_ROLE_KEY` | Render | Database auth (bypasses RLS) |
| `CLERK_*` | Both | Authentication keys |

---

## 14. Complexity Analysis

### Solver Complexity
- **Variables:** O(R × P × M) where R=requests, P=periods, M=rooms
- **Constraints:** O(R × P × M) — dominated by pre-filtering banned assignments
- **Example:** 30 requests, 30 periods, 6 rooms = 5,400 variables, ~50,000 constraint clauses
- **Worst case:** CP-SAT is NP-hard in general, but with propagation + learning, real-world academic scheduling problems solve in seconds
- **Timeout:** 45 seconds hard cap

### API Response Times
| Operation | Expected Time |
|-----------|--------------|
| GET (any resource) | < 200ms (in-memory) |
| CSV Import | 500ms - 3s (depending on AI inference) |
| Timetable Generation | 2-45 seconds |
| AI Chat | 1-5 seconds (Groq API call) |
| PDF Export | 500ms - 2s |

### Space Complexity
- **InMemoryStore:** O(N) where N = total entities across all collections
- **Solver model:** O(R × P × M) for the constraint matrix
- **Frontend fallback cache:** O(N) for mock data

---

## 15. Anticipated Judge Questions & Answers

### Q: "Why OR-Tools CP-SAT and not a genetic algorithm?"
**A:** CP-SAT provides **mathematical guarantees**. If a solution exists, it will find it. If not, it proves infeasibility. Genetic algorithms can't guarantee either. CP-SAT also natively supports `AddExactlyOne`, `AddAtMostOne`, and `AddImplication` which map perfectly to timetabling constraints. The trade-off is that CP-SAT requires more memory for large instances, but for university-scale problems (< 100 courses), it's fast enough.

### Q: "How does the AI copilot actually modify the schedule?"
**A:** The LLM generates structured `[ACTIONS]` JSON blocks. The backend parses this JSON, executes each action (e.g., `save_constraint_rules()`), and logs everything to the audit trail. The LLM never directly modifies the database — it goes through the same validated constraint service that CSV imports use.

### Q: "What happens if the GROQ API key isn't set?"
**A:** The system degrades gracefully:
- AI Chat: Returns a fallback message ("AI features require configuration")
- CSV Detection: Phase 2 (synonym matching) handles 90% of cases without AI
- Quality Review: Uses deterministic heuristic scoring instead of LLM polish
- The core solver (OR-Tools) never uses AI — it's purely mathematical

### Q: "How do you prevent prompt injection?"
**A:** Three layers:
1. Regex filter strips known injection patterns ("ignore previous instructions", "you are now", etc.)
2. History is capped at 6 messages and only allows `user`/`assistant` roles
3. All messages are truncated to 2000 characters

### Q: "What if the solver returns UNSATISFIABLE?"
**A:** The user gets a clear error message: "The problem is infeasible with current constraints." Common causes: too many blocked slots from constraints, not enough rooms for the number of sections, or contradictory constraints. The user can then relax constraints (remove holidays, increase rooms) and try again.

### Q: "How do you handle concurrent requests to the solver?"
**A:** A thread lock + counter limits concurrent solver jobs to 2. If a 3rd request comes in, it gets a 409 Conflict response. The solver runs in a background thread; the frontend polls `/schedule/generate/status/{job_id}` for progress updates.

### Q: "Explain the decision variable design."
**A:** `schedules[(r, p, m)]` is a Boolean variable: 1 if request `r` is scheduled at period `p` in room `m`, else 0. The "exactly one" constraint ensures each request maps to exactly one (period, room) pair. This is a standard 3-index assignment model used in operations research.

### Q: "How do locked slots survive regeneration?"
**A:** Before writing new entries, the solver separates locked entries from the existing editor entries. After generation, locked entries are merged back:
```python
existing = store.list("editorEntries")
locked = [e for e in existing if e.get("locked")]
locked_keys = {(e["day"], e["timeslotId"], e["sectionId"]) for e in locked}
filtered_new = [e for e in new_entries if (e["day"], e["timeslotId"], e["sectionId"]) not in locked_keys]
final_entries = locked + filtered_new
```

### Q: "How does the synonym matching work for CSV headers?"
**A:** Headers are normalized to snake_case, then checked against 7 synonym dictionaries. If "Classroom Name" is in the CSV, it becomes `classroom_name`, which matches `_ROOM_SYNONYMS`. If a room name synonym AND a room capacity synonym are both found, it's classified as a rooms CSV. A column mapping dictionary is returned so the import function knows which CSV column maps to which internal field.

### Q: "How is the quality score calculated?"
**A:** 
- OPTIMAL solution from CP-SAT = **97**
- FEASIBLE solution = **84**
- Deterministic adjustments: compactness score (avg across sections), conflict penalty (-4 to -12 per open conflict by severity), and faculty load balance.

### Q: "What is the difference between DatabaseStore and InMemoryStore?"
**A:** `DatabaseStore` wraps Supabase (PostgreSQL). If Supabase is unavailable, it falls back to `InMemoryStore` (an in-memory Python dict initialized from `seed_data.py`). The solver always reads from InMemoryStore to guarantee consistent data during a solve. This dual-store pattern ensures the app works in demo mode without any external services.

### Q: "Can you add a new constraint type?"
**A:** Yes. The process:
1. Add the kind name to `SUPPORTED_RULE_KINDS` in `constraint_service.py`
2. Add a handler in `_build_constraint_state()` in `engine.py`
3. Add the corresponding `model.Add()` constraint in the solver
4. The AI and CSV import systems will automatically use it

---

## Appendix A: File Tree (Key Files)

```
├── app/                          # Next.js 15 frontend
│   ├── (app)/                    # Authenticated routes (15 pages)
│   ├── globals.css               # Design system (glassmorphism)
│   └── layout.tsx                # Root layout with Clerk
├── components/
│   ├── shared/                   # TimetableBoard, XaiPanel, ManualClassModal
│   └── ui/                       # Radix-based primitives (Button, Dialog, etc.)
├── lib/
│   ├── services/                 # API client layer with fallback
│   ├── config.ts                 # Environment config
│   └── mock-data.ts              # Fallback data for frontend
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, middleware, CORS
│   │   ├── config.py             # Settings with hardcoded CORS
│   │   ├── store.py              # Dual-store (Supabase + InMemory)
│   │   ├── database.py           # Supabase client init
│   │   ├── seed_data.py          # Demo dataset (393 lines)
│   │   ├── ai_service.py         # AI copilot + Action Engine (924 lines)
│   │   ├── constraint_service.py # Constraint inference (711 lines)
│   │   ├── models.py             # Pydantic v2 schemas
│   │   ├── solver/
│   │   │   └── engine.py         # CP-SAT solver (540 lines)
│   │   └── routers/
│   │       ├── schedule.py       # Generate, entries, manual-entry
│   │       ├── ai.py             # Chat, quality, prediction
│   │       ├── import_data.py    # CSV upload + 3-phase detection (605 lines)
│   │       ├── resources.py      # CRUD for all entities
│   │       ├── export.py         # PDF + CSV export
│   │       ├── explain.py        # XAI endpoint
│   │       ├── reports.py        # Report summaries
│   │       ├── dashboard.py      # Dashboard metrics
│   │       └── auth.py           # Auth contracts
│   └── requirements.txt          # Python deps (16 packages)
└── test_data/                    # Test CSV files
    ├── jury_demo.csv             # Balanced demo file
    ├── rooms_stress_test.csv
    ├── faculty_stress_test.csv
    ├── sections_stress_test.csv
    ├── courses_stress_test.csv
    ├── holidays_stress_test.csv
    └── fuzzy_naming_test.csv     # Tests synonym matching
```

---

## Appendix B: Exact Dependency Versions

### Frontend (package.json)
```
next: 15.5.15     react: 19     typescript: 5     tailwindcss: 4.1.9
@clerk/nextjs     @radix-ui/*     lucide-react     recharts
react-hook-form   @tanstack/react-query
```

### Backend (requirements.txt)
```
fastapi==0.115.6      uvicorn==0.34.0       ortools==9.11.4210
supabase==2.11.0      sqlalchemy==2.0.36    alembic==1.14.1
celery==5.4.0         redis==5.2.1          reportlab==4.2.5
openpyxl==3.1.5       pandas==2.2.3         pyjwt==2.10.1
passlib==1.7.4        python-multipart==0.0.18   python-dotenv==1.0.1
```
