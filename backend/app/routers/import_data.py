from __future__ import annotations

import csv
import io
import re
import uuid
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..constraint_service import infer_constraints_from_rows, save_constraint_rules
from ..models import ImportCsvResponse
from ..store import store
import json


router = APIRouter(prefix="/import", tags=["import"])


MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/csv", response_model=ImportCsvResponse)
async def import_csv(file: UploadFile = File(...)) -> ImportCsvResponse:
    """
    Import CSV payloads, update the canonical scheduling dataset, and infer
    file-driven constraint rules that the solver can honor on the next run.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Must upload a CSV file.")

    # HIGH-3: Validate content type
    if file.content_type and file.content_type not in ("text/csv", "application/vnd.ms-excel", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected a CSV file.")

    # HIGH-3: Read with size limit to prevent OOM
    content = await file.read(MAX_CSV_SIZE_BYTES + 1)
    if len(content) > MAX_CSV_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"CSV file too large. Maximum size is {MAX_CSV_SIZE_BYTES // (1024 * 1024)} MB.")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded.") from error

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file empty or invalid format.")

    rows = [_normalize_row(row) for row in reader]
    rows = [row for row in rows if any(value for value in row.values())]
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file has headers but no usable rows.")

    fieldnames = set(rows[0].keys())
    collection, ai_mapping = _infer_collection(fieldnames)
    if not collection:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unrecognized CSV format. Supported uploads include rooms, courses, faculty, sections, "
                "and holidays with clear header names."
            ),
        )

    imported_count = 0
    if collection == "rooms":
        imported_count = _import_rooms(rows, ai_mapping)
    elif collection == "courses":
        imported_count = _import_courses(rows, ai_mapping)
    elif collection == "faculty":
        imported_count = _import_faculty(rows, ai_mapping)
    elif collection == "sections":
        imported_count = _import_sections(rows, ai_mapping)
    elif collection == "holidays":
        imported_count = _import_holidays(rows)


    constraints, assistant_note = infer_constraints_from_rows(
        file_name=file.filename,
        collection=collection,
        rows=rows,
    )
    if constraints:
        save_constraint_rules(file.filename, constraints)

    return ImportCsvResponse(
        message=(
            f"Imported {imported_count} {collection} row"
            f"{'' if imported_count == 1 else 's'} from {file.filename}."
        ),
        collection=collection,
        importedCount=imported_count,
        constraintsApplied=len(constraints),
        constraints=constraints,
        assistantNote=assistant_note,
    )


@router.post("/manual")
async def import_manual(
    room_name: Optional[str] = Form(None),
    capacity: Optional[int] = Form(None),
    target_branch: Optional[str] = Form(None),
    section_name: Optional[str] = Form(None),
    student_count: Optional[int] = Form(None),
    course_code: Optional[str] = Form(None),
    course_name: Optional[str] = Form(None),
    theory_hours: Optional[int] = Form(None),
    faculty_name: Optional[str] = Form(None),
):
    """
    Accept manual form inputs from the Admin Dashboard.
    Creates rooms, sections, and courses simultaneously for immediate constraint solving.
    """
    added: list[str] = []
    department_id = _resolve_department_id(target_branch)
    section_id = _build_section_id(section_name, department_id) if section_name and department_id else None

    if room_name and capacity:
        payload = {
            "id": _find_existing("rooms", room_name) or f"rm-{uuid.uuid4().hex[:6]}",
            "name": room_name,
            "block": "Manual Block",
            "capacity": int(capacity),
            "roomType": "LAB" if "lab" in room_name.lower() else "CLASSROOM",
            "departmentExclusive": department_id,
            "utilization": 0,
        }
        _upsert("rooms", payload, natural_key=room_name)
        added.append(f"Room {room_name}")

    if section_name and department_id and student_count:
        payload = {
            "id": section_id or f"sec-{uuid.uuid4().hex[:6]}",
            "name": _display_section_name(section_name, department_id),
            "departmentId": department_id,
            "semester": _infer_semester_from_section(section_name),
            "studentCount": int(student_count),
            "advisor": "Pending Admin",
            "compactness": 100,
        }
        _upsert("sections", payload, natural_key=payload["name"])
        added.append(f"Section {payload['name']}")

    if course_code and course_name and theory_hours:
        faculty_id = _resolve_faculty_id(faculty_name) or "fac-001"
        payload = {
            "id": _find_existing("courses", course_code) or course_code.lower(),
            "code": course_code.upper(),
            "name": course_name,
            "departmentId": department_id or "cse",
            "semester": _infer_semester_from_section(section_name),
            "theoryHours": int(theory_hours),
            "practicalHours": 0,
            "labRequired": False,
            "facultyId": faculty_id,
            "sectionIds": [section_id] if section_id else [],
            "status": "scheduled",
        }
        _upsert("courses", payload, natural_key=payload["code"])
        added.append(f"Course {payload['code']}")

    if not added:
        raise HTTPException(status_code=400, detail="No valid data provided.")

    return {
        "status": "success",
        "message": f"Successfully injected: {', '.join(added)} to the generation pool!",
    }


def _normalize_row(row: dict[str, Any]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in row.items():
        header = _normalize_header(key)
        normalized[header] = str(value).strip() if value is not None else ""
    return normalized


def _normalize_header(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _infer_collection(fieldnames: set[str]) -> tuple[str | None, dict | None]:
    # 1. Strict deterministic matching (Fast)
    if "capacity" in fieldnames and {"name", "room_name", "room"} & fieldnames:
        return "rooms", None
    if {"max_periods_per_day", "weekly_load", "availability", "faculty_name"} & fieldnames:
        return "faculty", None
    if {"student_count", "advisor", "section_name", "section"} & fieldnames:
        return "sections", None
    if {"theory_hours", "practical_hours", "course_code", "code"} & fieldnames:
        return "courses", None
    if "date" in fieldnames and {"impact", "holiday", "name"} & fieldnames:
        return "holidays", None

    # 2. Synonym-based matching (no API needed)
    result = _synonym_infer_collection(fieldnames)
    if result[0]:
        return result

    # 3. AI-powered matching (Flexible, needs GROQ_API_KEY)
    return _ai_infer_collection(fieldnames)


# ── Synonym dictionaries for fuzzy header detection ──
_ROOM_SYNONYMS = {
    "classroom", "classroom_name", "hall", "hall_name", "venue", "venue_name",
    "lab_name", "theatre", "lecture_hall", "room_no", "room_number",
}
_ROOM_CAPACITY_SYNONYMS = {
    "capacity", "hall_capacity", "student_capacity", "seats", "seating_capacity",
    "max_capacity", "size",
}
_FACULTY_SYNONYMS = {
    "faculty", "faculty_name", "teacher", "teacher_name", "instructor",
    "instructor_name", "professor", "professor_name", "staff", "staff_name",
    "lecturer", "lecturer_name",
}
_SECTION_SYNONYMS = {
    "section", "section_name", "batch", "batch_name", "class", "class_name",
    "group", "group_name", "student_group", "division",
}
_COURSE_SYNONYMS = {
    "course_code", "code", "subject_code", "subject", "subject_name",
    "module", "module_code", "paper", "paper_code", "course",
}
_HOLIDAY_SYNONYMS = {
    "holiday", "holiday_name", "festival", "event", "occasion",
}
_ROOM_TYPE_SYNONYMS = {
    "type_of_room", "room_type", "type", "lab_or_class", "category",
}


def _synonym_infer_collection(fieldnames: set[str]) -> tuple[str | None, dict | None]:
    has_room_name = bool(fieldnames & _ROOM_SYNONYMS)
    has_room_cap = bool(fieldnames & _ROOM_CAPACITY_SYNONYMS)
    has_faculty = bool(fieldnames & _FACULTY_SYNONYMS)
    has_section = bool(fieldnames & _SECTION_SYNONYMS)
    has_course = bool(fieldnames & _COURSE_SYNONYMS)
    has_holiday = bool(fieldnames & _HOLIDAY_SYNONYMS)
    has_room_type = bool(fieldnames & _ROOM_TYPE_SYNONYMS)

    if has_room_name and (has_room_cap or has_room_type):
        mapping = {}
        for h in fieldnames:
            if h in _ROOM_SYNONYMS: mapping["name"] = h
            if h in _ROOM_CAPACITY_SYNONYMS: mapping["capacity"] = h
            if h in _ROOM_TYPE_SYNONYMS: mapping["room_type"] = h
        return "rooms", mapping

    if has_faculty:
        mapping = {}
        for h in fieldnames:
            if h in _FACULTY_SYNONYMS: mapping["name"] = h
        return "faculty", mapping

    if has_section:
        mapping = {}
        for h in fieldnames:
            if h in _SECTION_SYNONYMS: mapping["name"] = h
        return "sections", mapping

    if has_course:
        mapping = {}
        for h in fieldnames:
            if h in _COURSE_SYNONYMS: mapping["code"] = h
        return "courses", mapping

    if has_holiday and "date" in fieldnames:
        mapping = {}
        for h in fieldnames:
            if h in _HOLIDAY_SYNONYMS: mapping["name"] = h
        return "holidays", mapping

    return None, None


def _ai_infer_collection(fieldnames: set[str]) -> tuple[str | None, dict | None]:
    try:
        from ..ai_service import _groq_chat
        headers_str = ", ".join(fieldnames)
        prompt = (
            "Identify what scheduling entity this CSV represents based on its headers. "
            "Return JSON only: {\"collection\": \"rooms|faculty|sections|courses|holidays|none\", \"mapping\": {\"name\": \"csv_header_for_name\", \"id\": \"csv_id\", \"capacity\": \"csv_cap\", \"code\": \"csv_code\"}} "
            f"Headers: {headers_str}"
        )
        response = _groq_chat([{"role": "user", "content": prompt}], max_completion_tokens=250)
        if not response: return None, None
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if not match: return None, None
        data = json.loads(match.group(0))
        col = data.get("collection")
        mapping = data.get("mapping", {})
        if col in {"rooms", "faculty", "sections", "courses", "holidays"}:
            return col, mapping
    except Exception:
        return None, None
    return None, None




def _import_rooms(rows: list[dict[str, str]], ai_mapping: dict[str, str] = None) -> int:
    imported = 0
    m = ai_mapping or {}
    for row in rows:
        name = row.get(m.get("name")) or row.get("name") or row.get("room_name") or row.get("room") or row.get("classroom")

        if not name:
            continue
        room_id = _find_existing("rooms", name) or row.get("id") or row.get("room_id") or f"rm-{uuid.uuid4().hex[:6]}"
        room_type = row.get(m.get("room_type")) or row.get(m.get("type")) or row.get("room_type") or row.get("type")
        payload = {
            "id": room_id,
            "name": name,
            "block": row.get(m.get("block")) or row.get("block") or row.get("building") or "Main Block",
            "capacity": _coerce_int(row.get(m.get("capacity"))) or _coerce_int(row.get("capacity")) or 30,
            "roomType": _normalize_room_type(room_type, name),
            "departmentExclusive": _resolve_department_id(
                row.get(m.get("department")) or row.get("department_exclusive") or row.get("department_id") or row.get("department")
            ),
            "utilization": _coerce_int(row.get(m.get("utilization"))) or _coerce_int(row.get("utilization")) or 0,
        }

        _upsert("rooms", payload, natural_key=name)
        imported += 1
    return imported


def _import_faculty(rows: list[dict[str, str]], ai_mapping: dict[str, str] = None) -> int:
    imported = 0
    m = ai_mapping or {}
    for row in rows:
        name = row.get(m.get("name")) or row.get("name") or row.get("faculty_name") or row.get("faculty") or row.get("instructor") or row.get("teacher")

        if not name:
            continue
        faculty_id = _find_existing("faculty", name) or row.get(m.get("id")) or row.get("id") or row.get("faculty_id") or f"fac-{uuid.uuid4().hex[:6]}"
        weekly_load = _coerce_int(row.get(m.get("weekly_load"))) or _coerce_int(row.get("weekly_load")) or 12
        availability = row.get(m.get("availability")) or row.get("availability") or "Mon-Fri, all day"
        payload = {
            "id": faculty_id,
            "name": name,
            "designation": row.get(m.get("designation")) or row.get("designation") or "Faculty",
            "departmentId": _resolve_department_id(row.get(m.get("department")) or row.get("department_id") or row.get("department") or row.get("branch")) or "cse",
            "maxPeriodsPerDay": _coerce_int(row.get(m.get("max_periods"))) or _coerce_int(row.get("max_periods_per_day")) or _coerce_int(row.get("max_periods")) or 4,
            "weeklyLoad": weekly_load,
            "availability": availability,
            "preferences": _split_multi(row.get(m.get("preferences")) or row.get("preferences") or row.get("preferred_rooms") or row.get("preferred_slots")),
            "status": _derive_faculty_status(weekly_load, availability),
        }

        _upsert("faculty", payload, natural_key=name)
        imported += 1
    return imported


def _import_sections(rows: list[dict[str, str]], ai_mapping: dict[str, str] = None) -> int:
    imported = 0
    m = ai_mapping or {}
    for row in rows:
        section_name = row.get(m.get("name")) or row.get("name") or row.get("section_name") or row.get("section") or row.get("batch") or row.get("class")

        if not section_name:
            continue
        department_id = _resolve_department_id(row.get(m.get("department")) or row.get("department_id") or row.get("department") or row.get("branch")) or "cse"
        display_name = _display_section_name(section_name, department_id)
        section_id = _find_existing("sections", display_name) or row.get(m.get("id")) or row.get("id") or row.get("section_id") or _build_section_id(section_name, department_id)
        payload = {
            "id": section_id,
            "name": display_name,
            "departmentId": department_id,
            "semester": _coerce_int(row.get(m.get("semester"))) or _coerce_int(row.get("semester")) or _infer_semester_from_section(section_name),
            "studentCount": _coerce_int(row.get(m.get("student_count"))) or _coerce_int(row.get("student_count")) or 30,
            "advisor": row.get(m.get("advisor")) or row.get("advisor") or "Pending Advisor",
            "compactness": _coerce_int(row.get(m.get("compactness"))) or _coerce_int(row.get("compactness")) or 100,
        }

        _upsert("sections", payload, natural_key=display_name)
        imported += 1
    return imported


def _import_courses(rows: list[dict[str, str]], ai_mapping: dict[str, str] = None) -> int:
    imported = 0
    m = ai_mapping or {}
    for row in rows:
        code = (row.get(m.get("code")) or row.get("code") or row.get("course_code") or "").upper()

        if not code:
            continue

        department_id = _resolve_department_id(row.get(m.get("department")) or row.get("department_id") or row.get("department") or row.get("branch")) or "cse"
        theory_hours = _coerce_int(row.get(m.get("theory_hours"))) or _coerce_int(row.get("theory_hours")) or 0
        practical_hours = _coerce_int(row.get(m.get("practical_hours"))) or _coerce_int(row.get("practical_hours")) or 0
        section_ids = _resolve_section_ids(row.get(m.get("sections")) or row.get("section_ids") or row.get("sections") or "", department_id)
        faculty_id = _resolve_faculty_id(row.get(m.get("faculty")) or row.get("faculty_id") or row.get("faculty_name") or row.get("faculty")) or "fac-001"

        payload = {
            "id": _find_existing("courses", code) or row.get(m.get("id")) or row.get("id") or row.get("course_id") or code.lower(),
            "code": code,
            "name": row.get(m.get("name")) or row.get("name") or row.get("course_name") or "Unknown Course",
            "departmentId": department_id,
            "semester": _coerce_int(row.get(m.get("semester"))) or _coerce_int(row.get("semester")) or _infer_semester_from_sections(section_ids),
            "theoryHours": theory_hours,
            "practicalHours": practical_hours,
            "labRequired": practical_hours > 0 or _coerce_bool(row.get(m.get("lab_required"))) or _coerce_bool(row.get("lab_required")),
            "facultyId": faculty_id,
            "sectionIds": section_ids,
            "status": row.get(m.get("status")) or row.get("status") or "scheduled",
        }

        _upsert("courses", payload, natural_key=code)
        imported += 1
    return imported


def _import_holidays(rows: list[dict[str, str]]) -> int:
    imported = 0
    for row in rows:
        date = row.get("date")
        if not date:
            continue
        name = row.get("name") or row.get("holiday") or "Uploaded Holiday"
        holiday_id = row.get("id") or f"hol-{uuid.uuid4().hex[:6]}"
        existing_id = _find_existing_holiday(name=name, date=date)
        payload = {
            "id": existing_id or holiday_id,
            "name": name,
            "date": date,
            "scope": row.get("scope") or "University",
            "impact": row.get("impact") or "Solver blocks all slots automatically.",
        }
        _upsert("holidays", payload, natural_key=f"{name}:{date}")
        imported += 1
    return imported


def _upsert(collection: str, payload: dict[str, Any], natural_key: str) -> dict[str, Any]:
    existing_id = _find_existing(collection, natural_key) or payload["id"]
    payload = {**payload, "id": existing_id}
    try:
        return store.update(collection, existing_id, payload)
    except KeyError:
        return store.create(collection, payload)


def _find_existing(collection: str, lookup: str | None) -> str | None:
    if not lookup:
        return None
    normalized = _normalize_lookup(lookup)
    for item in _existing_items(collection):
        candidates = {
            _normalize_lookup(item.get("id")),
            _normalize_lookup(item.get("name")),
            _normalize_lookup(item.get("code")),
        }
        if normalized in candidates:
            return str(item.get("id"))
    return None


def _find_existing_holiday(*, name: str, date: str) -> str | None:
    normalized_name = _normalize_lookup(name)
    for item in _existing_items("holidays"):
        if _normalize_lookup(item.get("name")) == normalized_name and str(item.get("date")) == date:
            return str(item.get("id"))
    return None


def _existing_items(collection: str) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    src = store.fallback if hasattr(store, "fallback") else store
    for item in src.list(collection):
        if item.get("id"):
            merged[str(item["id"])] = item
    for item in store.list(collection):
        if item.get("id"):
            merged[str(item["id"])] = item
    return list(merged.values())


def _resolve_department_id(raw: str | None) -> str | None:
    if not raw:
        return None
    normalized = _normalize_lookup(raw)
    for department in _existing_items("departments"):
        candidates = {
            _normalize_lookup(department.get("id")),
            _normalize_lookup(department.get("name")),
            _normalize_lookup(department.get("shortCode")),
        }
        if normalized in candidates:
            return str(department.get("id"))
    return raw.strip().lower()


def _resolve_faculty_id(raw: str | None) -> str | None:
    return _find_existing("faculty", raw)


def _resolve_section_ids(raw: str, department_id: str) -> list[str]:
    tokens = _split_multi(raw)
    if not tokens:
        return []
    section_ids: list[str] = []
    for token in tokens:
        existing_id = _find_existing("sections", token)
        if existing_id:
            section_ids.append(existing_id)
            continue
        section_ids.append(_build_section_id(token, department_id))
    return _dedup(section_ids)


def _split_multi(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [token.strip() for token in re.split(r"[;,|]", raw) if token.strip()]


def _normalize_room_type(room_type: str | None, room_name: str) -> str:
    candidate = (room_type or "").strip().upper()
    if candidate in {"CLASSROOM", "LAB"}:
        return candidate
    return "LAB" if "lab" in room_name.lower() else "CLASSROOM"


def _display_section_name(section_name: str, department_id: str) -> str:
    cleaned = section_name.strip().upper()
    if cleaned.startswith(department_id.upper()):
        return cleaned.replace("-", " ")
    return f"{department_id.upper()} {cleaned}"


def _build_section_id(section_name: str, department_id: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", section_name.strip().lower()).strip("-")
    if normalized.startswith(department_id):
        return normalized
    return f"{department_id}-{normalized}"


def _infer_semester_from_section(section_name: str | None) -> int:
    if not section_name:
        return 1
    match = re.search(r"(\d+)", section_name)
    if match:
        return int(match.group(1))
    return 1


def _infer_semester_from_sections(section_ids: list[str]) -> int:
    if not section_ids:
        return 1
    section_map = {item["id"]: item for item in _existing_items("sections")}
    semesters = [section_map[section_id].get("semester") for section_id in section_ids if section_id in section_map]
    if semesters:
        return int(semesters[0] or 1)
    return _infer_semester_from_section(section_ids[0])


def _derive_faculty_status(weekly_load: int, availability: str) -> str:
    availability_lower = availability.lower()
    if weekly_load >= 16:
        return "high_load"
    if "no p7" in availability_lower or "limited" in availability_lower or "tue-fri" in availability_lower:
        return "limited"
    return "balanced"


def _coerce_int(value: str | None) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(str(value).strip())
    except ValueError:
        return None


def _coerce_bool(value: str | None) -> bool:
    if not value:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y"}


def _normalize_lookup(value: Any) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).strip().lower())


def _dedup(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result
