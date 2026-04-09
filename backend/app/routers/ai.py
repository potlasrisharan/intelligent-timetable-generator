from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..ai_service import (
    auto_reschedule_conflict,
    build_conflict_prediction,
    build_quality_review,
    chat_with_assistant,
)
from ..constraint_service import list_constraint_rules
from ..models import (
    AiChatRequest,
    AiChatResponse,
    AutoRescheduleResponse,
    ConflictPredictionResponse,
    ConstraintRule,
    QualityReviewResponse,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/quality-review", response_model=QualityReviewResponse)
def get_quality_review() -> QualityReviewResponse:
    return QualityReviewResponse.model_validate(build_quality_review())


@router.get("/conflict-prediction", response_model=ConflictPredictionResponse)
def get_conflict_prediction() -> ConflictPredictionResponse:
    return ConflictPredictionResponse.model_validate(build_conflict_prediction())


@router.get("/constraint-rules", response_model=list[ConstraintRule])
def get_constraint_rules() -> list[ConstraintRule]:
    return [ConstraintRule.model_validate(item) for item in list_constraint_rules()]


@router.post("/chat", response_model=AiChatResponse)
def post_chat_message(payload: AiChatRequest) -> AiChatResponse:
    return AiChatResponse.model_validate(
        chat_with_assistant(
            payload.message,
            [message.model_dump() for message in payload.history],
            payload.page,
        )
    )


@router.post("/auto-reschedule/{conflict_id}", response_model=AutoRescheduleResponse)
def post_auto_reschedule(conflict_id: str) -> AutoRescheduleResponse:
    try:
        return AutoRescheduleResponse.model_validate(auto_reschedule_conflict(conflict_id))
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
