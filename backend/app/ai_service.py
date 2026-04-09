from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime
from typing import Any

from .config import settings
from .store import store

logger = logging.getLogger(__name__)

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
TIMESLOT_ORDER = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]
DAY_LOOKUP = {
    "monday": "Mon",
    "tuesday": "Tue",
    "wednesday": "Wed",
    "thursday": "Thu",
    "friday": "Fri",
}
SEVERITY_WEIGHT = {
    "critical": 12,
    "high": 8,
    "medium": 4,
    "low": 2,
}
CONFIDENCE_BY_SEVERITY = {
    "critical": 96,
    "high": 88,
    "medium": 76,
    "low": 64,
}


def _now_label() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def _safe_list(key: str) -> list[dict[str, Any]]:
    return store.list(key)


def _safe_get_conflict(conflict_id: str) -> dict[str, Any]:
    for conflict in _safe_list("conflicts"):
        if conflict.get("id") == conflict_id:
            return conflict
    raise KeyError(f"conflicts:{conflict_id} not found")


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _extract_course_codes(values: list[str]) -> list[str]:
    return [value for value in values if re.fullmatch(r"[A-Z]{2,}\d{3}", value)]


def _extract_faculty_names(values: list[str]) -> list[str]:
    return [value for value in values if value.startswith(("Dr.", "Prof."))]


def _extract_day(value: str) -> str | None:
    lower = value.lower()
    for name, short in DAY_LOOKUP.items():
        if name in lower:
            return short
    return None


def _extract_timeslot(value: str) -> str | None:
    match = re.search(r"\bP([1-7])\b", value.upper())
    if not match:
        return None
    return f"p{match.group(1)}"


def _section_id_from_text(values: list[str], sections: list[dict[str, Any]]) -> str | None:
    for value in values:
        normalized = _normalize(value)
        for section in sections:
            if normalized in {_normalize(section["id"]), _normalize(section["name"])}:
                return section["id"]
    return None


def _slot_label(day: str, timeslot_id: str, room_name: str) -> str:
    return f"{day} {timeslot_id.upper()} in {room_name}"


def _append_audit(action: str, target: str, tone: str = "success") -> None:
    audit_event = {
        "id": f"evt-ai-{datetime.now().strftime('%H%M%S%f')}",
        "actor": "AI Scheduler",
        "action": action,
        "target": target,
        "timestamp": "just now",
        "tone": tone,
    }
    fallback = store.fallback.data
    fallback.setdefault("auditTrail", []).insert(0, audit_event)
    fallback["dashboardMetrics"]["recentActions"] = list(fallback["auditTrail"][:4])


def _sync_entry(entry_id: str, payload: dict[str, Any]) -> None:
    try:
        store.update("editorEntries", entry_id, payload)
    except Exception:
        pass

    try:
        store.fallback.update("editorEntries", entry_id, payload)
    except Exception:
        pass


def _groq_chat(messages: list[dict[str, str]], max_completion_tokens: int = 500) -> str | None:
    if not settings.groq_api_key:
        logger.warning("Groq API key is not configured; using fallback AI response.")
        return None

    payload = json.dumps(
        {
            "model": settings.groq_model,
            "messages": messages,
            "temperature": 0.2,
            "max_completion_tokens": max_completion_tokens,
        }
    ).encode("utf-8")
    url = f"{settings.groq_base_url.rstrip('/')}/chat/completions"
    request = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.groq_api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error_body = ""
        try:
            error_body = error.read().decode("utf-8")
        except Exception:
            error_body = "<unavailable>"
        logger.warning(
            "Groq chat completion failed with HTTP %s for model %s: %s",
            error.code,
            settings.groq_model,
            error_body,
        )
        return None
    except urllib.error.URLError as error:
        logger.warning("Groq chat completion failed with network error: %s", error)
        return None
    except TimeoutError:
        logger.warning("Groq chat completion timed out for model %s.", settings.groq_model)
        return None
    except json.JSONDecodeError as error:
        logger.warning("Groq chat completion returned invalid JSON: %s", error)
        return None

    choices = data.get("choices") or []
    if not choices:
        logger.warning("Groq chat completion returned no choices for model %s.", settings.groq_model)
        return None

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    return None


def _polish_with_groq(system_prompt: str, user_prompt: str, fallback: str) -> str:
    reply = _groq_chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    return reply or fallback


def build_quality_review() -> dict[str, Any]:
    conflicts = [item for item in _safe_list("conflicts") if item.get("status") != "resolved"]
    courses = _safe_list("courses")
    sections = _safe_list("sections")
    faculty = _safe_list("faculty")
    rooms = _safe_list("rooms")

    avg_compactness = round(
        sum(section.get("compactness", 0) for section in sections) / max(len(sections), 1)
    )
    avg_room_utilization = round(
        sum(room.get("utilization", 0) for room in rooms) / max(len(rooms), 1)
    )
    review_courses = [course for course in courses if course.get("status") == "review"]
    draft_courses = [course for course in courses if course.get("status") == "draft"]
    stressed_faculty = [
        member for member in faculty if member.get("status") in {"high_load", "limited"}
    ]

    score = 100
    score -= sum(SEVERITY_WEIGHT.get(conflict.get("severity", "low"), 2) for conflict in conflicts)
    score -= len(review_courses) * 2
    score -= len(draft_courses) * 3
    score -= len(stressed_faculty) * 2
    score -= max(0, 84 - avg_compactness) // 2
    score = max(28, min(99, score))

    strengths: list[str] = []
    if avg_compactness >= 84:
        strengths.append(f"Section compactness is averaging {avg_compactness}%, which keeps student days reasonably tight.")
    if 65 <= avg_room_utilization <= 85:
        strengths.append(f"Average room utilization is {avg_room_utilization}%, a healthy range for day-to-day scheduling.")
    balanced_count = sum(1 for member in faculty if member.get("status") == "balanced")
    if balanced_count >= max(1, len(faculty) // 2):
        strengths.append(f"{balanced_count} faculty members are already in a balanced load state.")

    suggestions: list[dict[str, Any]] = []
    if conflicts:
        top_conflict = sorted(
            conflicts,
            key=lambda item: SEVERITY_WEIGHT.get(item.get("severity", "low"), 0),
            reverse=True,
        )[0]
        suggestions.append(
            {
                "id": "quality-conflict-focus",
                "title": f"Resolve {top_conflict['title']}",
                "detail": "Clearing the highest-severity conflict will improve timetable quality and reduce downstream scheduling churn.",
                "impact": "high",
                "category": "quality",
            }
        )
    if review_courses or draft_courses:
        suggestions.append(
            {
                "id": "quality-course-readiness",
                "title": "Finalize review and draft courses",
                "detail": f"{len(review_courses) + len(draft_courses)} course records still need confirmation before the next full generation.",
                "impact": "high" if draft_courses else "medium",
                "category": "quality",
            }
        )
    if avg_compactness < 85:
        suggestions.append(
            {
                "id": "quality-compactness",
                "title": "Tighten low-compactness sections",
                "detail": "Prioritize sections with long idle gaps to improve student experience and make room usage steadier.",
                "impact": "medium",
                "category": "quality",
            }
        )
    if stressed_faculty:
        suggestions.append(
            {
                "id": "quality-workload",
                "title": "Reduce faculty overload risk",
                "detail": "Rebalance high-load or limited-availability faculty before running another regeneration cycle.",
                "impact": "medium",
                "category": "quality",
            }
        )

    summary = (
        f"Current timetable quality is {score}/100 with {len(conflicts)} open conflicts, "
        f"{len(review_courses) + len(draft_courses)} courses still under review, and average compactness of {avg_compactness}%."
    )
    assistant_note = _polish_with_groq(
        "You are an academic scheduling analyst. Keep your response concise, actionable, and grounded in the supplied facts.",
        json.dumps(
            {
                "score": score,
                "summary": summary,
                "strengths": strengths,
                "suggestions": suggestions,
            }
        ),
        "Focus on the top conflict first, then clean up draft course data before the next full generation.",
    )

    return {
        "generatedAt": _now_label(),
        "score": score,
        "summary": summary,
        "strengths": strengths,
        "suggestions": suggestions,
        "assistantNote": assistant_note,
    }


def build_conflict_prediction() -> dict[str, Any]:
    conflicts = [item for item in _safe_list("conflicts") if item.get("status") != "resolved"]
    courses = _safe_list("courses")
    faculty = _safe_list("faculty")
    rooms = _safe_list("rooms")
    lab_courses = [course for course in courses if course.get("labRequired")]
    lab_rooms = [room for room in rooms if room.get("roomType") == "LAB"]

    predictions: list[dict[str, Any]] = [
        {
            "id": f"pred-{conflict['id']}",
            "title": conflict["title"],
            "detail": conflict["description"],
            "severity": conflict["severity"],
            "confidence": CONFIDENCE_BY_SEVERITY.get(conflict["severity"], 70),
            "affected": conflict["affected"],
            "suggestion": (conflict.get("suggestedFixes") or ["Review the affected schedule inputs"])[0],
        }
        for conflict in conflicts
    ]

    draft_like_courses = [course for course in courses if course.get("status") in {"draft", "review"}]
    if draft_like_courses:
        predictions.append(
            {
                "id": "pred-course-readiness",
                "title": "Course readiness may block a clean generation",
                "detail": f"{len(draft_like_courses)} course definitions still need review or final approval.",
                "severity": "medium",
                "confidence": 78,
                "affected": [course["code"] for course in draft_like_courses[:4]],
                "suggestion": "Confirm course loads and faculty ownership before the next full run.",
            }
        )

    overloaded_faculty = [member for member in faculty if member.get("status") == "high_load"]
    if overloaded_faculty:
        predictions.append(
            {
                "id": "pred-faculty-overload",
                "title": "Faculty overload is likely during generation",
                "detail": "Current faculty load patterns suggest at least one overload scenario will recur without rebalancing.",
                "severity": "high",
                "confidence": 84,
                "affected": [member["name"] for member in overloaded_faculty],
                "suggestion": "Shift one theory block away from overloaded faculty before a full regenerate.",
            }
        )

    if lab_courses and len(lab_courses) > len(lab_rooms) * 2:
        predictions.append(
            {
                "id": "pred-lab-pressure",
                "title": "Lab room pressure is rising",
                "detail": "The number of lab-heavy courses is starting to outpace the practical room inventory.",
                "severity": "medium",
                "confidence": 72,
                "affected": [course["code"] for course in lab_courses[:4]],
                "suggestion": "Spread lab blocks across more days or reserve large spaces earlier in the week.",
            }
        )

    predictions.sort(
        key=lambda item: (
            SEVERITY_WEIGHT.get(item["severity"], 0),
            item["confidence"],
        ),
        reverse=True,
    )
    predictions = predictions[:5]

    summary = f"{len(predictions)} likely blockers were detected before the next generation run."
    assistant_note = _polish_with_groq(
        "You are a timetable risk analyst. Summarize the pre-generation blockers in two short sentences.",
        json.dumps({"summary": summary, "predictions": predictions}),
        "Resolve the high-confidence blockers first, especially the overload and room-capacity risks.",
    )

    return {
        "generatedAt": _now_label(),
        "summary": summary,
        "predictions": predictions,
        "assistantNote": assistant_note,
    }


def _is_slot_available(
    entries: list[dict[str, Any]],
    *,
    day: str,
    timeslot_id: str,
    room_name: str,
    faculty_name: str,
    section_id: str,
    ignore_entry_id: str,
) -> bool:
    for entry in entries:
        if entry.get("id") == ignore_entry_id:
            continue
        if entry.get("day") != day or entry.get("timeslotId") != timeslot_id:
            continue
        if entry.get("roomName") == room_name:
            return False
        if entry.get("facultyName") == faculty_name:
            return False
        if entry.get("sectionId") == section_id:
            return False
    return True


def _candidate_rooms(
    room_name: str,
    entry_type: str,
    minimum_capacity: int,
    rooms: list[dict[str, Any]],
) -> list[str]:
    current_room = next((room for room in rooms if room.get("name") == room_name), None)
    matching_type = current_room.get("roomType") if current_room else ("LAB" if entry_type == "LAB" else "CLASSROOM")
    candidate_names = [room_name]
    for room in sorted(rooms, key=lambda item: item.get("capacity", 0), reverse=True):
        if room.get("name") == room_name:
            continue
        if room.get("capacity", 0) < minimum_capacity:
            continue
        if room.get("roomType") == matching_type or room.get("capacity", 0) >= minimum_capacity + 20:
            candidate_names.append(room["name"])
    return candidate_names


def _update_local_entry(entries: list[dict[str, Any]], entry_id: str, payload: dict[str, Any]) -> None:
    for entry in entries:
        if entry.get("id") == entry_id:
            entry.update(payload)
            break
    _sync_entry(entry_id, payload)


def _auto_fix_capacity(
    conflict: dict[str, Any],
    entries: list[dict[str, Any]],
    rooms: list[dict[str, Any]],
    sections: list[dict[str, Any]],
    combined_sections: list[dict[str, Any]],
) -> dict[str, Any]:
    course_codes = _extract_course_codes(conflict.get("affected", []))
    day = _extract_day(f"{conflict.get('title', '')} {conflict.get('description', '')}")
    affected_rooms = {
        room["name"]
        for room in rooms
        if room["name"] in set(conflict.get("affected", [])) or room["name"] in conflict.get("description", "")
    }

    matching_entries = [
        entry
        for entry in entries
        if (not course_codes or entry.get("courseCode") in course_codes)
        and (not day or entry.get("day") == day)
        and (not affected_rooms or entry.get("roomName") in affected_rooms)
    ]

    if not matching_entries:
        return {
            "ok": True,
            "applied": False,
            "conflictId": conflict["id"],
            "resolution": "",
            "summary": "AI could not find a matching scheduled block to move for this capacity conflict.",
            "changes": [],
        }

    section_sizes = {section["id"]: section.get("studentCount", 0) for section in sections}
    required_capacity = max(section_sizes.get(entry["sectionId"], 0) for entry in matching_entries)
    for combined in combined_sections:
        if combined.get("courseCode") in course_codes:
            required_capacity = max(required_capacity, combined.get("combinedStudentCount", 0))

    target_room = next(
        (
            room
            for room in sorted(rooms, key=lambda item: item.get("capacity", 0), reverse=True)
            if room.get("capacity", 0) >= required_capacity and room.get("name") not in affected_rooms
        ),
        None,
    )
    if target_room is None:
        target_room = sorted(rooms, key=lambda item: item.get("capacity", 0), reverse=True)[0]

    changes: list[dict[str, Any]] = []
    for entry in matching_entries:
        from_label = _slot_label(entry["day"], entry["timeslotId"], entry["roomName"])
        _update_local_entry(
            entries,
            entry["id"],
            {
                "roomName": target_room["name"],
                "note": f"AI moved this block to {target_room['name']} to reduce room-capacity pressure.",
            },
        )
        changes.append(
            {
                "entryId": entry["id"],
                "courseCode": entry["courseCode"],
                "fromLabel": from_label,
                "toLabel": _slot_label(entry["day"], entry["timeslotId"], target_room["name"]),
                "rationale": "The block was reassigned to a larger room to keep the combined section within capacity.",
            }
        )

    resolution = f"Moved {', '.join(course_codes) or 'the affected block'} to {target_room['name']}."
    return {
        "ok": True,
        "applied": True,
        "conflictId": conflict["id"],
        "resolution": resolution,
        "summary": resolution,
        "changes": changes,
    }


def _auto_fix_overload(
    conflict: dict[str, Any],
    entries: list[dict[str, Any]],
    rooms: list[dict[str, Any]],
    sections: list[dict[str, Any]],
) -> dict[str, Any]:
    faculty_names = _extract_faculty_names(conflict.get("affected", []))
    faculty_name = faculty_names[0] if faculty_names else None
    overloaded_day = _extract_day(f"{conflict.get('title', '')} {conflict.get('description', '')}") or "Tue"
    course_codes = _extract_course_codes(conflict.get("affected", []))
    section_sizes = {section["id"]: section.get("studentCount", 0) for section in sections}

    candidates = [
        entry
        for entry in entries
        if entry.get("facultyName") == faculty_name
        and entry.get("day") == overloaded_day
        and not entry.get("locked")
    ]
    if course_codes:
        candidates.sort(key=lambda entry: 0 if entry.get("courseCode") in course_codes else 1)

    preferred_slots: list[tuple[str, str | None]] = []
    for fix in conflict.get("suggestedFixes", []):
        preferred_day = _extract_day(fix)
        preferred_timeslot = _extract_timeslot(fix)
        if preferred_day:
            preferred_slots.append((preferred_day, preferred_timeslot))

    for entry in candidates:
        room_options = _candidate_rooms(
            entry["roomName"],
            entry["type"],
            section_sizes.get(entry["sectionId"], 0),
            rooms,
        )
        slot_checks = preferred_slots + [
            (day, entry["timeslotId"])
            for day in DAYS
            if day != overloaded_day
        ]

        fallback_slots = [
            (day, timeslot_id)
            for day in DAYS
            if day != overloaded_day
            for timeslot_id in TIMESLOT_ORDER
        ]

        for day, timeslot_id in slot_checks + fallback_slots:
            if timeslot_id is None:
                continue
            for room_name in room_options:
                if _is_slot_available(
                    entries,
                    day=day,
                    timeslot_id=timeslot_id,
                    room_name=room_name,
                    faculty_name=entry["facultyName"],
                    section_id=entry["sectionId"],
                    ignore_entry_id=entry["id"],
                ):
                    from_label = _slot_label(entry["day"], entry["timeslotId"], entry["roomName"])
                    _update_local_entry(
                        entries,
                        entry["id"],
                        {
                            "day": day,
                            "timeslotId": timeslot_id,
                            "roomName": room_name,
                            "note": f"AI moved this block from {overloaded_day} to reduce faculty overload.",
                        },
                    )
                    return {
                        "ok": True,
                        "applied": True,
                        "conflictId": conflict["id"],
                        "resolution": f"Moved {entry['courseCode']} to {day} {timeslot_id.upper()} for {entry['facultyName']}.",
                        "summary": f"AI rescheduled {entry['courseCode']} away from {overloaded_day} to ease {entry['facultyName']}'s overload.",
                        "changes": [
                            {
                                "entryId": entry["id"],
                                "courseCode": entry["courseCode"],
                                "fromLabel": from_label,
                                "toLabel": _slot_label(day, timeslot_id, room_name),
                                "rationale": "The block was moved to a free slot where the same faculty, section, and room constraints stay valid.",
                            }
                        ],
                    }

    return {
        "ok": True,
        "applied": False,
        "conflictId": conflict["id"],
        "resolution": "",
        "summary": "AI could not find a safe alternate slot for this faculty overload yet.",
        "changes": [],
    }


def _auto_fix_compactness(
    conflict: dict[str, Any],
    entries: list[dict[str, Any]],
    rooms: list[dict[str, Any]],
    sections: list[dict[str, Any]],
) -> dict[str, Any]:
    section_id = _section_id_from_text(conflict.get("affected", []), sections)
    course_codes = _extract_course_codes(conflict.get("affected", []))
    section_sizes = {section["id"]: section.get("studentCount", 0) for section in sections}

    candidates = [
        entry
        for entry in entries
        if (section_id and entry.get("sectionId") == section_id)
        or (course_codes and entry.get("courseCode") in course_codes)
    ]

    for entry in candidates:
        room_options = _candidate_rooms(
            entry["roomName"],
            entry["type"],
            section_sizes.get(entry["sectionId"], 0),
            rooms,
        )
        current_index = TIMESLOT_ORDER.index(entry["timeslotId"]) if entry["timeslotId"] in TIMESLOT_ORDER else None
        if current_index is None:
            continue
        preferred_slots = []
        if current_index > 0:
            preferred_slots.append(TIMESLOT_ORDER[current_index - 1])
        if current_index < len(TIMESLOT_ORDER) - 1:
            preferred_slots.append(TIMESLOT_ORDER[current_index + 1])

        for timeslot_id in preferred_slots:
            for room_name in room_options:
                if _is_slot_available(
                    entries,
                    day=entry["day"],
                    timeslot_id=timeslot_id,
                    room_name=room_name,
                    faculty_name=entry["facultyName"],
                    section_id=entry["sectionId"],
                    ignore_entry_id=entry["id"],
                ):
                    from_label = _slot_label(entry["day"], entry["timeslotId"], entry["roomName"])
                    _update_local_entry(
                        entries,
                        entry["id"],
                        {
                            "timeslotId": timeslot_id,
                            "roomName": room_name,
                            "note": "AI pulled this block closer to adjacent classes to improve compactness.",
                        },
                    )
                    return {
                        "ok": True,
                        "applied": True,
                        "conflictId": conflict["id"],
                        "resolution": f"Moved {entry['courseCode']} to {entry['day']} {timeslot_id.upper()} for a tighter section flow.",
                        "summary": f"AI tightened the {entry['sectionId'].upper()} schedule by shifting {entry['courseCode']} closer to neighboring classes.",
                        "changes": [
                            {
                                "entryId": entry["id"],
                                "courseCode": entry["courseCode"],
                                "fromLabel": from_label,
                                "toLabel": _slot_label(entry["day"], timeslot_id, room_name),
                                "rationale": "The block was moved into a nearby open slot to reduce the section's idle gap.",
                            }
                        ],
                    }

    return {
        "ok": True,
        "applied": False,
        "conflictId": conflict["id"],
        "resolution": "",
        "summary": "AI could not find a compactness improvement that keeps all constraints safe.",
        "changes": [],
    }


def auto_reschedule_conflict(conflict_id: str) -> dict[str, Any]:
    conflict = _safe_get_conflict(conflict_id)
    entries = _safe_list("editorEntries")
    rooms = _safe_list("rooms")
    sections = _safe_list("sections")
    combined_sections = _safe_list("combinedSections")

    title = conflict.get("title", "").lower()
    if "capacity" in title:
        result = _auto_fix_capacity(conflict, entries, rooms, sections, combined_sections)
    elif "overload" in title:
        result = _auto_fix_overload(conflict, entries, rooms, sections)
    else:
        result = _auto_fix_compactness(conflict, entries, rooms, sections)

    if result.get("applied"):
        store.resolve_conflict(conflict_id, result.get("resolution"))
        _append_audit("Applied AI auto-reschedule", result["summary"])
        result["assistantNote"] = _polish_with_groq(
            "You are a scheduling assistant. Summarize the applied reschedule in one short paragraph.",
            json.dumps(result),
            result["summary"],
        )
    else:
        result["assistantNote"] = _polish_with_groq(
            "You are a scheduling assistant. Explain briefly why this reschedule could not be applied yet.",
            json.dumps(result),
            result["summary"],
        )

    return result


def _suggested_prompts(page: str | None) -> list[str]:
    if page == "conflicts":
        return [
            "What is the highest-risk conflict right now?",
            "Which conflict should I fix before publishing?",
            "How can I reduce overload without hurting quality?",
        ]
    return [
        "Why is the quality score not higher?",
        "What should I fix before the next generation?",
        "Summarize the main timetable risks for me.",
    ]


def _fallback_chat_reply(message: str, page: str | None) -> str:
    quality = build_quality_review()
    prediction = build_conflict_prediction()
    lower = message.lower()

    if "quality" in lower or "score" in lower:
        top_suggestion = quality["suggestions"][0]["title"] if quality["suggestions"] else "resolve the top conflict"
        return f"{quality['summary']} The fastest improvement would be to {top_suggestion.lower()}."
    if "predict" in lower or "before generation" in lower or "risk" in lower:
        first_prediction = prediction["predictions"][0] if prediction["predictions"] else None
        if first_prediction:
            return (
                f"{prediction['summary']} The highest-confidence blocker is {first_prediction['title'].lower()} "
                f"with a suggested action to {first_prediction['suggestion'].lower()}."
            )
        return "No major blockers are predicted right now, but I would still refresh the conflict check before generating."
    if "resched" in lower or "fix" in lower or "conflict" in lower:
        return (
            "Start with the highest-severity open conflict. If it is a room-capacity or overload issue, "
            "the AI auto-reschedule action can usually apply a safe first-pass fix."
        )
    if page == "conflicts":
        return "I can help you prioritize conflict cleanup. Focus on critical room-capacity issues first, then faculty overloads, then compactness improvements."
    return "I can help you review quality, predict blockers before generation, and suggest where to auto-reschedule first."


def chat_with_assistant(message: str, history: list[dict[str, str]], page: str | None) -> dict[str, Any]:
    quality = build_quality_review()
    prediction = build_conflict_prediction()
    context = {
        "quality": {
            "score": quality["score"],
            "summary": quality["summary"],
            "suggestions": quality["suggestions"][:3],
        },
        "prediction": {
            "summary": prediction["summary"],
            "predictions": prediction["predictions"][:3],
        },
    }

    reply = _groq_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are the TimeTable X AI assistant. Answer as a scheduling copilot, not a generic chatbot. "
                    "Stay concise, use the supplied timetable facts, and prefer actionable next steps."
                ),
            },
            {
                "role": "system",
                "content": f"Current scheduling context: {json.dumps(context)}",
            },
            *history[-6:],
            {"role": "user", "content": message},
        ],
        max_completion_tokens=650,
    )

    if not reply:
        reply = _fallback_chat_reply(message, page)

    return {
        "ok": True,
        "reply": reply,
        "suggestedPrompts": _suggested_prompts(page),
    }
