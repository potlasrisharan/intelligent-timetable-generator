from __future__ import annotations

from fastapi import APIRouter

from ..models import AuthUser, ForgotPasswordRequest, MessageResponse, SignInRequest
from ..store import store

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sign-in", response_model=AuthUser)
def sign_in(payload: SignInRequest) -> AuthUser:
    return AuthUser.model_validate(store.sign_in(payload.email))


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
    return MessageResponse.model_validate(store.forgot_password(payload.email))
