from __future__ import annotations

import re
import sys
from copy import deepcopy
from datetime import datetime
from typing import Any

from .seed_data import clone_seed_data
from .database import supabase

COLLECTION_MAP = {
    "departments": "departments",
    "courses": "courses",
    "faculty": "faculty",
    "rooms": "rooms",
    "sections": "sections",
    "combined-sections": "combined_sections",
    "combinedSections": "combined_sections",
    "timeslots": "timeslots",
    "holidays": "holidays",
    "conflicts": "conflicts",
    "auditTrail": "audit_trail",
    "timetableVersions": "timetable_versions",
    "editorEntries": "timetable_entries",
    "lockedSlots": "locked_slots",
}

def snake_to_camel(snake_str: str) -> str:
    if not snake_str: return ""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def camel_to_snake(camel_str: str) -> str:
    return re.sub(r'(?<!^)(?=[A-Z])', '_', camel_str).lower()

def to_camel_case(data: Any) -> Any:
    if isinstance(data, list):
        return [to_camel_case(i) for i in data]
    elif isinstance(data, dict):
        return {snake_to_camel(k): to_camel_case(v) for k, v in data.items()}
    return data

def to_snake_case(data: Any) -> Any:
    if isinstance(data, list):
        return [to_snake_case(i) for i in data]
    elif isinstance(data, dict):
        return {camel_to_snake(k): to_snake_case(v) for k, v in data.items()}
    return data


class InMemoryStore:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.data = clone_seed_data()

    def list(self, key: str) -> list[dict[str, Any]]:
        return deepcopy(self.data.get(key, []))

    def get(self, key: str, item_id: str) -> dict[str, Any]:
        for item in self.data.get(key, []):
            if item.get("id") == item_id:
                return deepcopy(item)
        raise KeyError(f"{key}:{item_id} not found")

    def create(self, collection: str, payload: dict[str, Any]) -> dict[str, Any]:
        key = collection if collection in self.data else COLLECTION_MAP.get(collection, collection)
        item_id = payload.get("id")
        if not item_id:
            raise ValueError("Payload must include an id field.")
        if any(existing.get("id") == item_id for existing in self.data.get(key, [])):
            raise ValueError(f"{collection} item '{item_id}' already exists.")
        if key not in self.data: self.data[key] = []
        self.data[key].append(deepcopy(payload))
        return deepcopy(payload)

    def update(self, collection: str, item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        key = collection if collection in self.data else COLLECTION_MAP.get(collection, collection)
        for index, current in enumerate(self.data.get(key, [])):
            if current.get("id") == item_id:
                updated = {**current, **deepcopy(payload), "id": item_id}
                self.data[key][index] = updated
                return deepcopy(updated)
        raise KeyError(f"{collection}:{item_id} not found")

    def delete(self, collection: str, item_id: str) -> None:
        key = collection if collection in self.data else COLLECTION_MAP.get(collection, collection)
        for index, current in enumerate(self.data.get(key, [])):
            if current.get("id") == item_id:
                del self.data[key][index]
                return
        raise KeyError(f"{collection}:{item_id} not found")

    def sign_in(self, email: str) -> dict[str, Any]:
        user = deepcopy(self.data["demoUser"])
        user["email"] = email or user["email"]
        return user

    def forgot_password(self, email: str) -> dict[str, Any]:
        return {"ok": True, "message": f"Reset instructions queued for {email}."}

    def generate(self, scope: str) -> dict[str, Any]:
        draft_version = self.data["timetableVersions"][1]
        draft_version["generatedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        draft_version["notes"] = f"Latest {scope} generation completed."
        return {
            "ok": True,
            "message": f"{scope.title()} generation completed.",
            "versionId": draft_version["id"],
            "qualityScore": draft_version["qualityScore"],
        }

    def resolve_conflict(self, conflict_id: str, resolution: str | None = None) -> dict[str, Any]:
        for index, conflict in enumerate(self.data["conflicts"]):
            if conflict["id"] == conflict_id:
                updated = deepcopy(conflict)
                updated["status"] = "resolved"
                self.data["conflicts"][index] = updated
                self.data["dashboardMetrics"]["unresolvedConflicts"] = sum(
                    1 for item in self.data["conflicts"] if item["status"] == "open"
                )
                self.data["auditTrail"].insert(
                    0,
                    {
                        "id": f"evt-resolve-{conflict_id}",
                        "actor": "API Workflow",
                        "action": "Resolved conflict",
                        "target": resolution or updated["title"],
                        "timestamp": "just now",
                        "tone": "success",
                    },
                )
                self.data["dashboardMetrics"]["recentActions"] = deepcopy(self.data["auditTrail"][:4])
                return deepcopy(updated)
        raise KeyError(f"conflicts:{conflict_id} not found")


class DatabaseStore:
    def __init__(self) -> None:
        self.fallback = InMemoryStore()
        self.use_db = supabase is not None

    def list(self, key: str) -> list[dict[str, Any]]:
        table_name = COLLECTION_MAP.get(key, key)
        if not self.use_db:
            return self.fallback.list(key)
        
        try:
            response = supabase.table(table_name).select("*").execute()
            return to_camel_case(response.data)
        except Exception as e:
            print(f"DB Error list({key}): {e}", file=sys.stderr)
            return self.fallback.list(key)

    def get(self, key: str, item_id: str) -> dict[str, Any]:
        table_name = COLLECTION_MAP.get(key, key)
        if not self.use_db:
            return self.fallback.get(key, item_id)
            
        try:
            response = supabase.table(table_name).select("*").eq("id", item_id).execute()
            if not response.data:
                raise KeyError(f"{key}:{item_id} not found")
            return to_camel_case(response.data[0])
        except Exception as e:
            print(f"DB Error get({key}): {e}", file=sys.stderr)
            return self.fallback.get(key, item_id)

    def create(self, collection: str, payload: dict[str, Any]) -> dict[str, Any]:
        table_name = COLLECTION_MAP.get(collection, collection)
        if not self.use_db:
            return self.fallback.create(collection, payload)
            
        snake_payload = to_snake_case(payload)
        try:
            response = supabase.table(table_name).insert(snake_payload).execute()
            if not response.data:
                raise ValueError(f"Failed to create in {collection}")
            return to_camel_case(response.data[0])
        except Exception as e:
            print(f"DB Error create({collection}): {e}", file=sys.stderr)
            return self.fallback.create(collection, payload)

    def update(self, collection: str, item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        table_name = COLLECTION_MAP.get(collection, collection)
        if not self.use_db:
            return self.fallback.update(collection, item_id, payload)
            
        snake_payload = to_snake_case(payload)
        try:
            response = supabase.table(table_name).update(snake_payload).eq("id", item_id).execute()
            if not response.data:
                raise KeyError(f"{collection}:{item_id} not found")
            return to_camel_case(response.data[0])
        except Exception as e:
            print(f"DB Error update({collection}): {e}", file=sys.stderr)
            return self.fallback.update(collection, item_id, payload)

    def delete(self, collection: str, item_id: str) -> None:
        table_name = COLLECTION_MAP.get(collection, collection)
        if not self.use_db:
            return self.fallback.delete(collection, item_id)
            
        try:
            supabase.table(table_name).delete().eq("id", item_id).execute()
        except Exception as e:
            print(f"DB Error delete({collection}): {e}", file=sys.stderr)
            self.fallback.delete(collection, item_id)

    def get_dashboard_metrics(self) -> dict[str, Any]:
        # Aggregate real data from tables, mixing with fallback for placeholders
        metrics = deepcopy(self.fallback.data["dashboardMetrics"])
        
        if not self.use_db:
            return metrics
            
        try:
            # Update values based on actual DB counts
            conflicts = self.list("conflicts")
            metrics["unresolvedConflicts"] = sum(1 for c in conflicts if c.get("status") == "open")
            
            audit = self.list("auditTrail")
            metrics["recentActions"] = audit[:4]
            
            versions = self.list("timetableVersions")
            active = next((v for v in versions if v.get("status") == "ACTIVE"), metrics["activeVersion"])
            draft = next((v for v in versions if v.get("status") == "DRAFT"), metrics["draftVersion"])
            metrics["activeVersion"] = active
            metrics["draftVersion"] = draft
            
            return metrics
        except Exception as e:
            print(f"DB Error get_dashboard_metrics: {e}", file=sys.stderr)
            return metrics

    def get_report_summary(self) -> dict[str, Any]:
        # Simple exposure of the reportSummary object with live versions if possible
        summary = deepcopy(self.fallback.data["reportSummary"])
        return summary

    def sign_in(self, email: str) -> dict[str, Any]:
        return self.fallback.sign_in(email)

    def forgot_password(self, email: str) -> dict[str, Any]:
        return self.fallback.forgot_password(email)

    def generate(self, scope: str) -> dict[str, Any]:
        return self.fallback.generate(scope)

    def resolve_conflict(self, conflict_id: str, resolution: str | None = None) -> dict[str, Any]:
        # First attempt to resolve in DB if applicable
        if self.use_db:
            try:
                self.update("conflicts", conflict_id, {"status": "resolved"})
            except Exception as e:
                print(f"DB Error resolve_conflict: {e}", file=sys.stderr)
        
        return self.fallback.resolve_conflict(conflict_id, resolution)


store = DatabaseStore()

