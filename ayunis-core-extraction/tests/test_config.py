from app.config import Settings


def test_connection_settings_fall_back_to_the_backend_env_names() -> None:
    settings = Settings(
        MINIO_ROOT_USER="root",
        MINIO_ROOT_PASSWORD="rootpw",
        REDIS_HOST="redis",
        REDIS_PORT=6380,
        REDIS_PASSWORD="secret",
    )

    assert (settings.minio_access_key, settings.minio_secret_key) == ("root", "rootpw")
    assert settings.redis_url == "redis://:secret@redis:6380/0"


def test_explicit_connection_settings_win() -> None:
    settings = Settings(
        MINIO_ACCESS_KEY="key",
        MINIO_SECRET_KEY="secret",
        MINIO_ROOT_USER="root",
        REDIS_URL="redis://elsewhere:1/2",
        REDIS_PASSWORD="ignored",
    )

    assert (settings.minio_access_key, settings.minio_secret_key) == ("key", "secret")
    assert settings.redis_url == "redis://elsewhere:1/2"


def test_empty_env_values_mean_the_default() -> None:
    settings = Settings.model_validate(
        {"REDIS_HOST": "", "REDIS_PORT": "", "MINIO_USE_SSL": "", "MAX_CONCURRENT_JOBS": ""}
    )

    assert settings.redis_url == "redis://localhost:6379/0"
    assert settings.minio_use_ssl is False
    assert settings.max_concurrent_jobs == 4
