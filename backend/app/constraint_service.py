from __future__ import annotations

import json
import re
import uuid
from copy import deepcopy
from typing import Any

from .store import store

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
DAY_ALIASES = {
    "mon": "Mon",
    "monday": "Mon",
    "tue": "Tue",
    "tues": "Tue",
    "tuesday": "Tue",
    "wed": "Wed",
    "wednesday": "Wed",
    "thu": "Thu",
    "thur": "Thu",
    "thurs": "Thu",
    "thursday": "Thu",
    "fri": "Fri",
    "friday": "Fri",
}
SUPPORTED_RULE_KINDS = {
    "faculty_max_periods_per_day",
    "faculty_unavailable_slot",
    "section_unavailable_slot",
    "room_unavailable_slot",
    "course_required_room",
    "holiday_block_day",
}
TIMESLOT_RE = re.compile(r"\b(?:p[1-7]|period\s*[1-7]|lunch)\b", re.IGNORECASE)


def list_constraint_rules() -> list[dict[str, Any]]:
    src = store.fallback if hasattr(store, "fallback") else store
    return deepcopy(src.data.get("constraintRules", []))


def save_constraint_rules(source_file: str, rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    src = store.fallback if hasattr(store, "fallback") else store
    current = src.data.setdefault("constraintRules", [])
    rule_map = {_rule_identity(rule): deepcopy(rule) for rule in current if rule.get("sourceFile") != source_file}
    for rule in rules:
        rule_map[_rule_identity(rule)] = deepcopy(rule)
    src.data["constraintRules"] = list(rule_map.values())
    return deepcopy(src.data["constraintRules"])


def infer_constraints_from_rows(
    *,
    file_name: str,
    collection: str,
    rows: list[dict[str, str]],
) -> tuple[list[dict[str, Any]], str | None]:
    deterministic_rules = _deterministic_rules(file_name=file_name, collection=collection, rows=rows)
    groq_rules, assistant_note = _groq_rules(file_name=file_name, collection=collection, rows=rows)
    merged: dict[str, dict[str, Any]] = {}
    for rule in deterministic_rules + groq_rules:
        merged[_rule_identity(rule)] = rule

    rules = list(merged.values())
    if assistant_note:
        note = assistant_note
    elif rules:
        note = (
            f"Applied {len(rules)} file-aware scheduling constraint"
            f"{'' if len(rules) == 1 else 's'} from {file_name}. The next generation run will honor them."
        )
    else:
        note = "No hard constraints were inferred from this file, so generation will use the imported records only."

    return rules, note


def _deterministic_rules(
    *,
    file_name: str,
    collection: str,
    rows: list[dict[str, str]],
) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for row in rows:
        if collection == "faculty":
            rules.extend(_faculty_rules(file_name, row))
        elif collection == "rooms":
            rules.extend(_room_rules(file_name, row))
        elif collection == "sections":
            rules.extend(_section_rules(file_name, row))
        elif collection == "courses":
            rules.extend(_course_rules(file_name, row))
        elif collection == "holidays":
            rules.extend(_holiday_rules(file_name, row))
    return rules


def _faculty_rules(file_name: str, row: dict[str, str]) -> list[dict[str, Any]]:
    target_id, target_label = _resolve_target("faculty", row.get("id") or row.get("faculty_id"), row.get("name") or row.get("faculty_name") or row.get("faculty"))
    if not target_label:
        return []

    rules: list[dict[str, Any]] = []
    max_per_day = _coerce_int(row.get("max_periods_per_day") or row.get("max periods per day") or row.get("daily_limit"))
    if max_per_day:
        rules.append(
            _make_rule(
                file_name=file_name,
                scope="faculty",
                kind="faculty_max_periods_per_day",
                target_id=target_id,
                target_label=target_label,
                detail=f"{target_label} limited to {max_per_day} periods per day.",
                parameters={"maxPeriodsPerDay": max_per_day},
            )
        )

    rules.extend(_availability_rules(file_name, target_id, target_label, row.get("availability", "")))
    for column in ("unavailable_slots", "blocked_slots", "availability", "constraints", "notes", "remarks"):
        rules.extend(
            _slot_rules_from_text(
                file_name=file_name,
                scope="faculty",
                kind="faculty_unavailable_slot",
                target_id=target_id,
                target_label=target_label,
                raw=row.get(column, ""),
            )
        )
    return rules


def _availability_rules(file_name: str, target_id: str | None, target_label: str, raw: str) -> list[dict[str, Any]]:
    text = raw.strip()
    if not text:
        return []

    rules: list[dict[str, Any]] = []
    lower = text.lower()
    mentioned_days = _extract_days(lower)
    if mentioned_days and len(mentioned_days) < len(WEEKDAYS):
        missing_days = [day for day in WEEKDAYS if day not in mentioned_days]
        for day in missing_days:
            rules.append(
                _make_rule(
                    file_name=file_name,
                    scope="faculty",
                    kind="faculty_unavailable_slot",
                    target_id=target_id,
                    target_label=target_label,
                    detail=f"{target_label} is unavailable for all periods on {day}.",
                    parameters={"day": day, "timeslotIds": _non_lunch_timeslot_ids()},
                )
            )

    blocked_slots = _extract_timeslots(lower)
    if re.search(r"\bno\s+p[1-7]\b", lower) and blocked_slots:
        active_days = mentioned_days or WEEKDAYS
        for day in active_days:
            rules.append(
                _make_rule(
                    file_name=file_name,
                    scope="faculty",
                    kind="faculty_unavailable_slot",
                    target_id=target_id,
                    target_label=target_label,
                    detail=f"{target_label} is unavailable on {day} during {', '.join(slot.upper() for slot in blocked_slots)}.",
                    parameters={"day": day, "timeslotIds": blocked_slots},
                )
            )
    return rules


def _room_rules(file_name: str, row: dict[str, str]) -> list[dict[str, Any]]:
    target_id, target_label = _resolve_target("room", row.get("id") or row.get("room_id"), row.get("name") or row.get("room_name") or row.get("room"))
    if not target_label:
        return []

    rules: list[dict[str, Any]] = []
    for column in ("reserved_slots", "unavailable_slots", "blocked_slots", "constraints", "notes", "remarks"):
        rules.extend(
            _slot_rules_from_text(
                file_name=file_name,
                scope="room",
                kind="room_unavailable_slot",
                target_id=target_id,
                target_label=target_label,
                raw=row.get(column, ""),
            )
        )
    return rules


def _section_rules(file_name: str, row: dict[str, str]) -> list[dict[str, Any]]:
    target_id, target_label = _resolve_target("section", row.get("id") or row.get("section_id"), row.get("name") or row.get("section_name") or row.get("section"))
    if not target_label:
        return []

    rules: list[dict[str, Any]] = []
    for column in ("blocked_slots", "unavailable_slots", "constraints", "notes", "remarks"):
        rules.extend(
            _slot_rules_from_text(
                file_name=file_name,
                scope="section",
                kind="section_unavailable_slot",
                target_id=target_id,
                target_label=target_label,
                raw=row.get(column, ""),
            )
        )

    no_classes_after = _normalize_timeslot(row.get("no_classes_after") or row.get("no classes after") or "")
    if no_classes_after:
        blocked_timeslots = _timeslots_after(no_classes_after)
        if blocked_timeslots:
            for day in WEEKDAYS:
                rules.append(
                    _make_rule(
                        file_name=file_name,
                        scope="section",
                        kind="section_unavailable_slot",
                        target_id=target_id,
                        target_label=target_label,
                        detail=f"{target_label} cannot be placed after {no_classes_after.upper()} on {day}.",
                        parameters={"day": day, "timeslotIds": blocked_timeslots},
                    )
                )
    return rules


def _course_rules(file_name: str, row: dict[str, str]) -> list[dict[str, Any]]:
    target_id, target_label = _resolve_target("course", row.get("id") or row.get("course_id"), row.get("code") or row.get("course_code") or row.get("name") or row.get("course_name"))
    if not target_label:
        return []

    rules: list[dict[str, Any]] = []
    required_room = (
        row.get("required_room")
        or row.get("must_use_room")
        or row.get("room_requirement")
        or row.get("lab_room")
    )
    if required_room:
        room_id, room_label = _resolve_target("room", None, required_room)
        room_label = room_label or required_room.strip()
        parameters: dict[str, Any] = {"roomName": room_label}
        if room_id:
            parameters["roomId"] = room_id
        rules.append(
            _make_rule(
                file_name=file_name,
                scope="course",
                kind="course_required_room",
                target_id=target_id,
                target_label=target_label,
                detail=f"{target_label} should be scheduled in {room_label}.",
                parameters=parameters,
            )
        )

    return rules


def _holiday_rules(file_name: str, row: dict[str, str]) -> list[dict[str, Any]]:
    day = _weekday_from_date(row.get("date", ""))
    if not day:
        return []
    name = row.get("name") or row.get("holiday") or "Uploaded holiday"
    return [
        _make_rule(
            file_name=file_name,
            scope="global",
            kind="holiday_block_day",
            target_id=None,
            target_label=name,
            detail=f"{name} blocks all timetable placements on {day}.",
            parameters={"day": day},
        )
    ]


def _slot_rules_from_text(
    *,
    file_name: str,
    scope: str,
    kind: str,
    target_id: str | None,
    target_label: str,
    raw: str,
) -> list[dict[str, Any]]:
    if not raw:
        return []

    rules: list[dict[str, Any]] = []
    for day, timeslot_ids in _extract_day_slot_pairs(raw):
        rules.append(
            _make_rule(
                file_name=file_name,
                scope=scope,
                kind=kind,
                target_id=target_id,
                target_label=target_label,
                detail=f"{target_label} is unavailable on {day} during {', '.join(slot.upper() for slot in timeslot_ids)}.",
                parameters={"day": day, "timeslotIds": timeslot_ids},
            )
        )
    return rules


def _groq_rules(
    *,
    file_name: str,
    collection: str,
    rows: list[dict[str, str]],
) -> tuple[list[dict[str, Any]], str | None]:
    preview_rows = []
    for row in rows[:12]:
        relevant = {key: value for key, value in row.items() if value and _is_note_like_header(key)}
        if not relevant:
            continue
        target_hint = row.get("name") or row.get("faculty_name") or row.get("section_name") or row.get("course_code") or row.get("code")
        if target_hint:
            relevant["_target"] = target_hint
        preview_rows.append(relevant)

    if not preview_rows:
        return [], None

    try:
        from .ai_service import _groq_chat  # Imported lazily to avoid coupling import-time side effects.
    except Exception:
        return [], None

    content = _groq_chat(
        [
            {
                "role": "system",
                "content": (
                    "You extract hard scheduling constraints from uploaded timetable CSV rows. "
                    "Return JSON only with schema "
                    "{\"assistantNote\": string, \"rules\": [{\"kind\": string, \"targetType\": string, "
                    "\"target\": string, \"parameters\": object, \"reason\": string}]}. "
                    "Allowed kinds: faculty_max_periods_per_day, faculty_unavailable_slot, "
                    "section_unavailable_slot, room_unavailable_slot, course_required_room, holiday_block_day. "
                    "Only output constraints that are explicitly supported by the provided row text. "
                    "Do not invent entities, timeslots, or days."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "fileName": file_name,
                        "collection": collection,
                        "rows": preview_rows,
                    }
                ),
            },
        ],
        max_completion_tokens=700,
    )
    if not content:
        return [], None

    payload = _extract_json_payload(content)
    if not isinstance(payload, dict):
        return [], None

    assistant_note = payload.get("assistantNote")
    candidates = payload.get("rules")
    if not isinstance(candidates, list):
        return [], assistant_note if isinstance(assistant_note, str) else None

    rules: list[dict[str, Any]] = []
    for candidate in candidates:
        rule = _validate_groq_rule(file_name, candidate)
        if rule:
            rules.append(rule)

    return rules, assistant_note if isinstance(assistant_note, str) else None


def _validate_groq_rule(file_name: str, candidate: Any) -> dict[str, Any] | None:
    if not isinstance(candidate, dict):
        return None

    kind = str(candidate.get("kind", "")).strip()
    if kind not in SUPPORTED_RULE_KINDS:
        return None

    target_type = str(candidate.get("targetType", "")).strip().lower()
    target = str(candidate.get("target", "")).strip()
    reason = str(candidate.get("reason", "")).strip() or "Inferred from uploaded file notes."
    parameters = candidate.get("parameters")
    if not target_type or not isinstance(parameters, dict):
        return None

    target_id, target_label = _resolve_target(target_type, None, target)
    target_label = target_label or target or None
    if kind != "holiday_block_day" and not target_label:
        return None

    if kind == "faculty_max_periods_per_day":
        max_per_day = _coerce_int(parameters.get("maxPeriodsPerDay"))
        if not max_per_day:
            return None
        return _make_rule(
            file_name=file_name,
            scope="faculty",
            kind=kind,
            target_id=target_id,
            target_label=target_label,
            detail=reason,
            parameters={"maxPeriodsPerDay": max_per_day},
        )

    if kind in {"faculty_unavailable_slot", "section_unavailable_slot", "room_unavailable_slot"}:
        day = _normalize_day(parameters.get("day"))
        timeslot_ids = [_normalize_timeslot(item) for item in parameters.get("timeslotIds", []) if _normalize_timeslot(item)]
        if not day or not timeslot_ids:
            return None
        return _make_rule(
            file_name=file_name,
            scope=target_type,
            kind=kind,
            target_id=target_id,
            target_label=target_label,
            detail=reason,
            parameters={"day": day, "timeslotIds": _dedup_strings(timeslot_ids)},
        )

    if kind == "course_required_room":
        room_name = str(parameters.get("roomName") or parameters.get("room") or "").strip()
        room_id, resolved_room_name = _resolve_target("room", parameters.get("roomId"), room_name)
        resolved_room_name = resolved_room_name or room_name
        if not resolved_room_name:
            return None
        clean_parameters: dict[str, Any] = {"roomName": resolved_room_name}
        if room_id:
            clean_parameters["roomId"] = room_id
        return _make_rule(
            file_name=file_name,
            scope="course",
            kind=kind,
            target_id=target_id,
            target_label=target_label,
            detail=reason,
            parameters=clean_parameters,
        )

    if kind == "holiday_block_day":
        day = _normalize_day(parameters.get("day"))
        if not day:
            return None
        return _make_rule(
            file_name=file_name,
            scope="global",
            kind=kind,
            target_id=None,
            target_label=target_label,
            detail=reason,
            parameters={"day": day},
        )

    return None


def _make_rule(
    *,
    file_name: str,
    scope: str,
    kind: str,
    target_id: str | None,
    target_label: str | None,
    detail: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": f"rule-{uuid.uuid4().hex[:8]}",
        "scope": scope,
        "kind": kind,
        "targetId": target_id,
        "targetLabel": target_label,
        "detail": detail,
        "parameters": parameters,
        "sourceFile": file_name,
        "enabled": True,
    }


def _resolve_target(target_type: str, target_id: str | None, target_label: str | None) -> tuple[str | None, str | None]:
    items = _collection_items(target_type)
    by_id = {str(item.get("id")): item for item in items if item.get("id")}
    if target_id and str(target_id) in by_id:
        item = by_id[str(target_id)]
        return str(item.get("id")), _item_label(target_type, item)

    normalized_target = _normalize_lookup(target_label)
    if not normalized_target:
        return None, target_label.strip() if isinstance(target_label, str) and target_label.strip() else None

    for item in items:
        candidates = {
            _normalize_lookup(item.get("id")),
            _normalize_lookup(item.get("name")),
            _normalize_lookup(item.get("code")),
            _normalize_lookup(item.get("label")),
        }
        candidates.discard("")
        if normalized_target in candidates:
            return str(item.get("id")), _item_label(target_type, item)

    return None, target_label.strip() if isinstance(target_label, str) and target_label.strip() else None


def _collection_items(target_type: str) -> list[dict[str, Any]]:
    collection = {
        "faculty": "faculty",
        "section": "sections",
        "room": "rooms",
        "course": "courses",
    }.get(target_type)
    if not collection:
        return []
    src = store.fallback if hasattr(store, "fallback") else store
    return src.list(collection)


def _item_label(target_type: str, item: dict[str, Any]) -> str | None:
    if target_type == "course":
        return item.get("code") or item.get("name")
    return item.get("name") or item.get("label") or item.get("id")


def _extract_day_slot_pairs(raw: str) -> list[tuple[str, list[str]]]:
    text = raw.strip()
    if not text:
        return []

    pairs: list[tuple[str, list[str]]] = []
    segments = [segment.strip() for segment in re.split(r"[;\n]+", text) if segment.strip()]
    for segment in segments:
        segment_lower = segment.lower()
        days = _extract_days(segment_lower)
        if not days:
            days = WEEKDAYS if "weekday" in segment_lower or "every day" in segment_lower or "daily" in segment_lower else []
        timeslots = _extract_timeslots(segment_lower)
        if "all day" in segment_lower and days:
            timeslots = _non_lunch_timeslot_ids()
        if not days and timeslots and re.search(r"\bno\s+p[1-7]\b", segment_lower):
            days = WEEKDAYS
        if days and timeslots:
            for day in days:
                pairs.append((day, timeslots))
    return _dedup_day_slot_pairs(pairs)


def _extract_days(text: str) -> list[str]:
    days: list[str] = []
    for token in re.findall(r"\b(?:mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?)\b", text):
        normalized = DAY_ALIASES.get(token.lower())
        if normalized:
            days.append(normalized)

    for start, end in re.findall(
        r"\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?)\s*-\s*"
        r"(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?)\b",
        text,
    ):
        start_day = DAY_ALIASES.get(start.lower())
        end_day = DAY_ALIASES.get(end.lower())
        if start_day and end_day:
            start_idx = WEEKDAYS.index(start_day)
            end_idx = WEEKDAYS.index(end_day)
            days.extend(WEEKDAYS[start_idx : end_idx + 1])

    return _dedup_strings(days)


def _extract_timeslots(text: str) -> list[str]:
    timeslots = [_normalize_timeslot(match.group(0)) for match in TIMESLOT_RE.finditer(text)]
    return _dedup_strings([slot for slot in timeslots if slot])


def _normalize_timeslot(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).strip().lower()
    if text == "lunch":
        return "lunch"
    match = re.search(r"p(?:eriod)?\s*([1-7])", text)
    if match:
        return f"p{match.group(1)}"
    return None


def _normalize_day(value: Any) -> str | None:
    if not value:
        return None
    return DAY_ALIASES.get(str(value).strip().lower())


def _timeslots_after(slot_id: str) -> list[str]:
    timeslots = _non_lunch_timeslot_ids()
    if slot_id not in timeslots:
        return []
    index = timeslots.index(slot_id)
    return timeslots[index + 1 :]


def _non_lunch_timeslot_ids() -> list[str]:
    src = store.fallback if hasattr(store, "fallback") else store
    return [item["id"] for item in src.list("timeslots") if not item.get("isLunch")]


def _weekday_from_date(value: str) -> str | None:
    try:
        from datetime import datetime

        return WEEKDAYS[datetime.strptime(value.strip(), "%Y-%m-%d").weekday()]
    except Exception:
        return None


def _coerce_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _normalize_lookup(value: Any) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).strip().lower())


def _rule_identity(rule: dict[str, Any]) -> str:
    payload = {
        "kind": rule.get("kind"),
        "scope": rule.get("scope"),
        "targetId": rule.get("targetId"),
        "targetLabel": rule.get("targetLabel"),
        "parameters": rule.get("parameters", {}),
    }
    return json.dumps(payload, sort_keys=True)


def _dedup_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _dedup_day_slot_pairs(values: list[tuple[str, list[str]]]) -> list[tuple[str, list[str]]]:
    merged: dict[str, list[str]] = {}
    for day, timeslots in values:
        merged.setdefault(day, [])
        merged[day].extend(timeslots)
    return [(day, _dedup_strings(timeslots)) for day, timeslots in merged.items()]


def _is_note_like_header(header: str) -> bool:
    lower = header.lower()
    keywords = (
        "note",
        "constraint",
        "availability",
        "blocked",
        "unavailable",
        "reserved",
        "required_room",
        "must_use_room",
        "daily_limit",
        "max_periods",
        "max periods",
    )
    return any(keyword in lower for keyword in keywords)


def _extract_json_payload(content: str) -> Any:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    for candidate in (cleaned, _first_json_block(cleaned)):
        if not candidate:
            continue
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    return None


def _first_json_block(content: str) -> str | None:
    for opener, closer in (("{", "}"), ("[", "]")):
        start = content.find(opener)
        end = content.rfind(closer)
        if start != -1 and end != -1 and end > start:
            return content[start : end + 1]
    return None
