"""Integration tests for recommendations API endpoints with stubbed dependencies."""

from __future__ import annotations

from datetime import date, datetime, timezone
from types import ModuleType, SimpleNamespace
import sys

import pytest
from httpx import ASGITransport, AsyncClient

if "aiokafka" not in sys.modules:
    aiokafka_stub = ModuleType("aiokafka")

    class _DummyKafkaClient:
        def __init__(self, *_, **__):
            pass

        async def start(self):  # pragma: no cover - helper for import only
            return None

        async def stop(self):  # pragma: no cover - helper for import only
            return None

    aiokafka_stub.AIOKafkaProducer = _DummyKafkaClient
    aiokafka_stub.AIOKafkaConsumer = _DummyKafkaClient
    aiokafka_stub.TopicPartition = SimpleNamespace
    sys.modules["aiokafka"] = aiokafka_stub

    errors_module = ModuleType("aiokafka.errors")

    class KafkaError(RuntimeError):
        pass

    errors_module.KafkaError = KafkaError
    sys.modules["aiokafka.errors"] = errors_module


from recommendations import schemas
from recommendations.main import app
from recommendations.security import AuthContext, get_authenticated_user
from recommendations.service import NoRecommendationsError, get_recommendation_service


class StubRecommendationService:
    """Minimal service double that records inputs and returns canned responses."""

    def __init__(
        self,
        catalog: schemas.RulesCatalogResponse,
        response: schemas.RecommendationQueryResponse,
    ) -> None:
        self._catalog = catalog
        self._response = response
        self.calls: list[tuple[schemas.RecommendationQueryPayload, str | None]] = []

    def get_catalog(self) -> schemas.RulesCatalogResponse:
        return self._catalog

    @property
    def response(self) -> schemas.RecommendationQueryResponse:
        return self._response

    async def build_response(
        self,
        payload: schemas.RecommendationQueryPayload,
        *,
        auth_header: str | None,
    ) -> schemas.RecommendationQueryResponse:
        self.calls.append((payload, auth_header))
        return self._response


@pytest.fixture
def stub_catalog() -> schemas.RulesCatalogResponse:
    return schemas.RulesCatalogResponse(
        version="test.v1",
        updated=date(2024, 1, 15),
        sources=[schemas.RuleSource(id="agro:1", title="Agro Test Guide", year=2023)],
        botanical_families=[
            schemas.BotanicalFamily(
                key="fabaceae",
                name_ru="Бобовые",
                name_latin="Fabaceae",
                common_pests=["паутинный клещ"],
                common_diseases=["ржавчина"],
            )
        ],
        crops=[
            schemas.CropRuleSummary(
                crop_id=19,
                crop_name="Горох",
                botanical_family="fabaceae",
                rotation_interval_years=schemas.RotationInterval(min=2, recommended=4),
                good_predecessors=[
                    schemas.PositivePredecessor(
                        crop_reference="17",
                        rating="excellent",
                        reason="Лучший предшественник",
                    )
                ],
                bad_predecessors=[
                    schemas.NegativePredecessor(
                        crop_reference="1",
                        reason="Слишком короткий перерыв",
                    )
                ],
                incompatible_families=["solanaceae"],
                soil_requirements=schemas.SoilRequirement(
                    ph_range=schemas.SoilPhRange(min=6.0, max=7.5),
                    soil_type=["чернозём"],
                    organic_matter="средняя",
                    drainage="хороший",
                ),
            )
        ],
    )


@pytest.fixture
def stub_response(stub_catalog: schemas.RulesCatalogResponse) -> schemas.RecommendationQueryResponse:
    return schemas.RecommendationQueryResponse(
        field_id="field-1",
        target_season="spring",
        target_year=2025,
        generated_at=datetime(2024, 5, 1, 10, 0, tzinfo=timezone.utc),
        request_id="req-test",
        data_version=stub_catalog.version,
        recommendations=[
            schemas.RecommendationItem(
                crop_id=19,
                crop_name="Горох",
                botanical_family="fabaceae",
                score=0.91,
                priority="high",
                reasons=[
                    schemas.RecommendationReason(
                        rule_id="fixture_rule",
                        title="Rule",
                        impact="positive",
                        detail="Совместимо с историей поля",
                    )
                ],
                soil_match=schemas.SoilMatch(score=0.88, notes=["pH в норме"]),
                warnings=["Контролировать влажность"],
                required_actions=["Добавить калий"],
            )
        ],
        filters_applied=["limit=1", "soil_profile=true"],
    )


@pytest.fixture
def stub_service(
    stub_catalog: schemas.RulesCatalogResponse,
    stub_response: schemas.RecommendationQueryResponse,
) -> StubRecommendationService:
    return StubRecommendationService(stub_catalog, stub_response)


@pytest.fixture
def fake_auth_context() -> AuthContext:
    return AuthContext(
        user_id=7,
        name="QA Engineer",
        email="qa@example.com",
        is_verified=True,
        bearer_token="Bearer stub-token",
    )


@pytest.fixture
async def api_client(
    stub_service: StubRecommendationService,
    fake_auth_context: AuthContext,
    monkeypatch: pytest.MonkeyPatch,
):
    async def _fake_get_authenticated_user(request):
        request.state.auth_context = fake_auth_context
        return fake_auth_context

    monkeypatch.setattr("recommendations.main.get_authenticated_user", _fake_get_authenticated_user)

    def _override_service() -> StubRecommendationService:
        return stub_service

    async def _override_auth() -> AuthContext:
        return fake_auth_context

    app.dependency_overrides[get_recommendation_service] = _override_service
    app.dependency_overrides[get_authenticated_user] = _override_auth

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_rules_catalog_endpoint_returns_stubbed_data(
    api_client: AsyncClient,
    stub_catalog: schemas.RulesCatalogResponse,
):
    response = await api_client.get("/recommendations/rules")
    assert response.status_code == 200
    payload = response.json()
    assert payload["version"] == stub_catalog.version
    assert payload["botanical_families"][0]["key"] == stub_catalog.botanical_families[0].key
    assert payload["crops"][0]["rotation_interval_years"]["recommended"] == 4


@pytest.mark.asyncio
async def test_query_endpoint_returns_recommendations_and_passes_payload(
    api_client: AsyncClient,
    stub_service: StubRecommendationService,
    fake_auth_context: AuthContext,
):
    payload = {
        "field_id": "field-1",
        "target_season": "spring",
        "target_year": 2025,
        "history": [
            {"year": 2024, "season": "autumn", "crop_id": 19, "crop_name": "Горох"}
        ],
        "preferred_crops": [19, 19],
        "constraints": {
            "avoid_botanical_families": ["solanaceae"],
            "exclude_crop_ids": [1],
            "require_organic_matter": "средняя",
            "prefer_cover_crops": True,
        },
        "limit": 1,
    }

    response = await api_client.post(
        "/recommendations/query",
        json=payload,
        headers={"Authorization": "Bearer client-token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["request_id"] == stub_service.response.request_id
    assert body["data_version"] == stub_service.response.data_version
    assert body["recommendations"][0]["crop_id"] == 19

    assert stub_service.calls, "service should receive the validated payload"
    captured_payload, auth_header = stub_service.calls[0]
    assert captured_payload.field_id == payload["field_id"]
    assert captured_payload.constraints.exclude_crop_ids == [1]
    assert auth_header == fake_auth_context.bearer_token


@pytest.mark.asyncio
async def test_query_endpoint_maps_domain_errors_to_http(
    stub_catalog: schemas.RulesCatalogResponse,
    stub_response: schemas.RecommendationQueryResponse,
    fake_auth_context: AuthContext,
    monkeypatch: pytest.MonkeyPatch,
):
    failing_service = StubRecommendationService(stub_catalog, stub_response)

    async def _raise(*_, **__):
        raise NoRecommendationsError("not found")

    failing_service.build_response = _raise  # type: ignore[assignment]

    async def _fake_get_authenticated_user(request):
        request.state.auth_context = fake_auth_context
        return fake_auth_context

    monkeypatch.setattr("recommendations.main.get_authenticated_user", _fake_get_authenticated_user)

    async def _override_auth() -> AuthContext:
        return fake_auth_context

    def _override_service() -> StubRecommendationService:
        return failing_service

    app.dependency_overrides[get_authenticated_user] = _override_auth
    app.dependency_overrides[get_recommendation_service] = _override_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/recommendations/query",
            json={
                "field_id": "field-error",
                "target_season": "spring",
                "target_year": 2025,
                "history": [
                    {"year": 2024, "season": "autumn", "crop_id": 19, "crop_name": "Горох"}
                ],
                "limit": 1,
            },
            headers={"Authorization": "Bearer x"},
        )

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "resource.not_found"
    assert body["error"]["detail"] == "not found"
    assert body["request_id"]

    app.dependency_overrides.clear()
