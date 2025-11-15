from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from .. import schemas
from ..service import (
    FieldAccessDeniedError,
    FieldHistoryUnavailableError,
    NoRecommendationsError,
    RecommendationService,
    RecommendationServiceError,
    get_recommendation_service,
)
from ..security import AuthContext, get_authenticated_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])
logger = logging.getLogger(__name__)


def _get_rules_catalog(service: RecommendationService) -> schemas.RulesCatalogResponse:
    try:
        return service.get_catalog()
    except FileNotFoundError as exc:  # pragma: no cover - defensive logging
        logger.error("Rules dataset not found")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rules dataset is not available on this instance.",
        ) from exc
    except ValueError as exc:  # pragma: no cover - defensive logging
        logger.exception("Rules dataset contains invalid data")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rules dataset cannot be parsed.",
        ) from exc


@router.post(
    "/query",
    response_model=schemas.RecommendationQueryResponse,
    summary="Рассчитать рекомендации по севообороту",
    status_code=status.HTTP_200_OK,
)
async def query_recommendations(
    payload: schemas.RecommendationQueryPayload,
    request: Request,
    service: RecommendationService = Depends(get_recommendation_service),
    auth: AuthContext = Depends(get_authenticated_user),
) -> schemas.RecommendationQueryResponse:
    auth_header = auth.bearer_token
    try:
        return await service.build_response(payload, auth_header=auth_header)
    except FieldAccessDeniedError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except FieldHistoryUnavailableError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except NoRecommendationsError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RecommendationServiceError as exc:
        request_id = getattr(request.state, "request_id", "n/a")
        logger.exception("Failed to calculate recommendations (request_id=%s)", request_id)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервис рекомендаций временно недоступен.",
        ) from exc


@router.get(
    "/rules",
    response_model=schemas.RulesCatalogResponse,
    summary="Получить опубликованные правила севооборота",
)
async def list_rules(
    service: RecommendationService = Depends(get_recommendation_service),
) -> schemas.RulesCatalogResponse:
    return _get_rules_catalog(service)
