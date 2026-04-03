from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any

from .seed_data import clone_seed_data


COLLECTION_MAP = {
    "departments": "departments",
    "courses": "courses",
    "faculty": "faculty",
    "rooms": "rooms",
    "sections": "sections",
    "combined-sections": "combinedSections",
    "timeslots": "timeslots",
    "holidays": "holidays",
}


class InMemoryStore:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.data = clone_seed_data()

    def list(self, key: str) -> list[dict[str, Any]]:
        return deepcopy(self.data[key])

    def get(self, key: str, item_id: str) -> dict[str, Any]:
        for item in self.data[key]:
            if item.get("id") == item_id:
                return deepcopy(item)
        raise KeyError(f"{key}:{item_id} not found")

    def create(self, collection: str, payload: dict[str, Any]) -> dict[str, Any]:
        key = COLLECTION_MAP[collection]
        item_id = payload.get("id")
        if not item_id:
            raise ValueError("Payload must include an id field.")
        if any(existing.get("id") == item_id for existing in self.data[key]):
            raise ValueError(f"{collection} item '{item_id}' already exists.")
        self.data[key].append(deepcopy(payload))
        return deepcopy(payload)

    def update(self, collection: str, item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        key = COLLECTION_MAP[collection]
        for index, current in enumerate(self.data[key]):
            if current.get("id") == item_id:
                updated = {**current, **deepcopy(payload), "id": item_id}
                self.data[key][index] = updated
                return deepcopy(updated)
        raise KeyError(f"{collection}:{item_id} not found")

    def delete(self, collection: str, item_id: str) -> None:
        key = COLLECTION_MAP[collection]
        for index, current in enumerate(self.data[key]):
            if current.get("id") == item_id:
                del self.data[key][index]
                return
        raise KeyError(f"{collection}:{item_id} not found")

    def sign_in(self, email: str) -> dict[str, Any]:
        user = deepcopy(self.data["demoUser"])
        user["email"] = email or user["email"]
        return user

    def forgot_password(self, email: str) -> dict[str, Any]:
        return {
            "ok": True,
            "message": f"Reset instructions queued for {email}.",
        }

    def generate(self, scope: str) -> dict[str, Any]:
        draft_version = self.data["timetableVersions"][1]
        draft_version["generatedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        draft_version["notes"] = f"Latest {scope} generation completed with locked-slot preservation."

        return {
            "ok": True,
            "message": f"{scope.title()} generation completed for the current draft.",
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


store = InMemoryStore()
