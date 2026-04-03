from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status

from ..models import (
    CombinedSection,
    Course,
    DeleteResponse,
    Department,
    Faculty,
    GenericMutationPayload,
    Holiday,
    Room,
    Section,
    Timeslot,
)
from ..store import store

router = APIRouter(prefix="/resources", tags=["resources"])

ResourceCollection = Literal[
    "departments",
    "courses",
    "faculty",
    "rooms",
    "sections",
    "combined-sections",
    "timeslots",
    "holidays",
]


@router.get("/departments", response_model=list[Department])
def get_departments() -> list[Department]:
    return [Department.model_validate(item) for item in store.list("departments")]


@router.get("/courses", response_model=list[Course])
def get_courses() -> list[Course]:
    return [Course.model_validate(item) for item in store.list("courses")]


@router.get("/faculty", response_model=list[Faculty])
def get_faculty() -> list[Faculty]:
    return [Faculty.model_validate(item) for item in store.list("faculty")]


@router.get("/rooms", response_model=list[Room])
def get_rooms() -> list[Room]:
    return [Room.model_validate(item) for item in store.list("rooms")]


@router.get("/sections", response_model=list[Section])
def get_sections() -> list[Section]:
    return [Section.model_validate(item) for item in store.list("sections")]


@router.get("/combined-sections", response_model=list[CombinedSection])
def get_combined_sections() -> list[CombinedSection]:
    return [CombinedSection.model_validate(item) for item in store.list("combinedSections")]


@router.get("/timeslots", response_model=list[Timeslot])
def get_timeslots() -> list[Timeslot]:
    return [Timeslot.model_validate(item) for item in store.list("timeslots")]


@router.get("/holidays", response_model=list[Holiday])
def get_holidays() -> list[Holiday]:
    return [Holiday.model_validate(item) for item in store.list("holidays")]


@router.post("/collection/{collection}", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_resource(collection: ResourceCollection, payload: GenericMutationPayload) -> dict[str, Any]:
    try:
        return store.create(collection, payload.data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.put("/collection/{collection}/{item_id}", response_model=dict[str, Any])
def update_resource(
    collection: ResourceCollection,
    item_id: str,
    payload: GenericMutationPayload,
) -> dict[str, Any]:
    try:
        return store.update(collection, item_id, payload.data)
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.delete("/collection/{collection}/{item_id}", response_model=DeleteResponse)
def delete_resource(collection: ResourceCollection, item_id: str) -> DeleteResponse:
    try:
        store.delete(collection, item_id)
        return DeleteResponse(message=f"Deleted {collection} item '{item_id}'.")
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
