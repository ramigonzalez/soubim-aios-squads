"""Tests for S3-compatible recording storage (Story 13.1) — in-memory fake client, no network."""

import asyncio
import logging
from datetime import datetime

import pytest
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from app.api.routes import meetings
from app.config import settings
from app.database.models import Organization, Project, Source, User
from tests.org_helpers import make_org_member
from app.services import recordings, storage


class FakeS3:
    """Minimal in-memory stand-in for the boto3 S3 client."""

    def __init__(self):
        self.objects: dict[str, bytes] = {}
        self.content_types: dict[str, str] = {}

    def upload_file(self, path, bucket, key, ExtraArgs=None, Config=None):
        with open(path, "rb") as fh:
            self.objects[key] = fh.read()
        self.content_types[key] = (ExtraArgs or {}).get("ContentType")

    def upload_fileobj(self, fileobj, bucket, key, ExtraArgs=None, Config=None):
        data = b""
        while True:
            chunk = fileobj.read(4)
            if not chunk:
                break
            data += chunk
        self.objects[key] = data
        self.content_types[key] = (ExtraArgs or {}).get("ContentType")

    def head_object(self, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject")
        return {"ContentLength": len(self.objects[Key]), "ContentType": self.content_types.get(Key)}

    def list_objects_v2(self, Bucket, Prefix="", MaxKeys=1000):
        keys = sorted(k for k in self.objects if k.startswith(Prefix))[:MaxKeys]
        return {"Contents": [{"Key": k} for k in keys]} if keys else {}

    def delete_object(self, Bucket, Key):
        self.objects.pop(Key, None)

    def generate_presigned_url(self, op, Params, ExpiresIn):
        return f"https://storage.test/{Params['Bucket']}/{Params['Key']}?X-Amz-Expires={ExpiresIn}"


class FakeResponse:
    def __init__(self, chunks, headers=None):
        self._chunks = chunks
        self.headers = headers or {}

    def raise_for_status(self):
        pass

    def iter_raw(self):
        return iter(self._chunks)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture
def fake_s3(monkeypatch):
    fake = FakeS3()
    monkeypatch.setattr(storage, "get_client", lambda: fake)
    monkeypatch.setattr(settings, "s3_endpoint", "http://s3.test")
    monkeypatch.setattr(settings, "s3_access_key_id", "k")
    monkeypatch.setattr(settings, "s3_secret_access_key", "s")
    monkeypatch.setattr(settings, "s3_bucket", "bucket")
    return fake


@pytest.fixture(autouse=True)
def recordings_dir(tmp_path, monkeypatch):
    local = tmp_path / "local"
    local.mkdir()
    monkeypatch.setattr(recordings, "RECORDINGS_DIR", local)
    return local


@pytest.fixture
def user(db_session: Session, org) -> User:
    u = User(email="dir@soubim.com", password_hash="x", name="Gabriela", role="director")
    db_session.add(u)
    make_org_member(db_session, u, "admin", org)  # Story 12.2: access comes from org membership
    db_session.commit()
    return u


def _soubim(db: Session) -> Organization:
    o = db.query(Organization).filter(Organization.slug == "soubim").first()
    if o is None:
        o = Organization(name="Soubim", slug="soubim")
        db.add(o)
        db.commit()
    return o


@pytest.fixture
def org(db_session: Session) -> Organization:
    return _soubim(db_session)


def make_source(db: Session, org_id=None) -> Source:
    """Source in a project owned by ``org_id`` (default: Soubim — owner is NOT NULL since 12.2)."""
    project = Project(name="D/SEASON", owner_organization_id=org_id or _soubim(db).id)
    db.add(project)
    db.flush()
    source = Source(
        project_id=project.id, source_type="meeting", title="Quinzenal", occurred_at=datetime(2026, 9, 4),
        ingestion_status="processed", included=True, raw_content="x", ai_summary="s",
    )
    db.add(source)
    db.commit()
    return source


class TestKeysAndSettings:
    def test_key_namespaced_by_org(self):
        assert storage.recording_key("o1", "s1", ".MP4") == "org/o1/sources/s1/recording.mp4"
        assert storage.recording_key("o1", "s1", "webm") == "org/o1/sources/s1/recording.webm"

    def test_key_falls_back_to_unknown_org(self):
        assert storage.recording_key(None, "s1") == "org/unknown/sources/s1/recording.mp4"

    def test_disabled_without_full_config(self, monkeypatch):
        monkeypatch.setattr(settings, "s3_bucket", None)
        assert not storage.is_enabled()

    def test_enabled_with_full_config(self, fake_s3):
        assert storage.is_enabled()


class TestStorageService:
    def test_put_head_presign_delete(self, fake_s3, tmp_path):
        f = tmp_path / "v.mp4"
        f.write_bytes(b"video")
        assert storage.put_file(str(f), "k.mp4") == 5
        assert storage.head("k.mp4") == {"size": 5, "content_type": "video/mp4"}
        assert "k.mp4?X-Amz-Expires=60" in storage.presigned_get("k.mp4", 60)
        storage.delete("k.mp4")
        assert storage.head("k.mp4") is None

    def test_size_guard_on_file(self, fake_s3, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "recording_max_bytes", 4)
        f = tmp_path / "v.mp4"
        f.write_bytes(b"12345")
        with pytest.raises(storage.RecordingTooLarge):
            storage.put_file(str(f), "k.mp4")
        assert fake_s3.objects == {}

    def test_stream_from_url(self, fake_s3):
        resp = FakeResponse([b"abc", b"defg", b"h"], {"content-length": "8"})
        size = storage.put_stream_from_url("https://x/v.mp4", "k.mp4", http_get=lambda u: resp)
        assert size == 8
        assert fake_s3.objects["k.mp4"] == b"abcdefgh"

    def test_stream_refuses_declared_size_over_limit(self, fake_s3, monkeypatch):
        monkeypatch.setattr(settings, "recording_max_bytes", 5)
        resp = FakeResponse([b"abcdefgh"], {"content-length": "8"})
        with pytest.raises(storage.RecordingTooLarge):
            storage.put_stream_from_url("https://x/v.mp4", "k.mp4", http_get=lambda u: resp)
        assert fake_s3.objects == {}

    def test_stream_aborts_when_body_outgrows_limit(self, fake_s3, monkeypatch):
        monkeypatch.setattr(settings, "recording_max_bytes", 5)
        resp = FakeResponse([b"abc", b"def", b"ghi"])  # no content-length
        with pytest.raises(storage.RecordingTooLarge):
            storage.put_stream_from_url("https://x/v.mp4", "k.mp4", http_get=lambda u: resp)
        assert fake_s3.objects == {}


class TestMeetingEndpoint:
    def get(self, db, source, user):
        return asyncio.run(meetings.get_meeting(source.id, db=db, user=user))

    def test_presigned_url_when_object_exists(self, db_session, user, org, fake_s3):
        source = make_source(db_session, org.id)
        key = storage.recording_key(str(org.id), str(source.id), ".mp4")
        fake_s3.objects[key] = b"video"
        data = self.get(db_session, source, user)
        assert data["recording"] == {
            "type": "file",
            "url": f"https://storage.test/bucket/{key}?X-Amz-Expires={recordings.LINK_TTL_SECONDS}",
        }

    def test_other_orgs_object_is_not_served(self, db_session, user, org, fake_s3):
        source = make_source(db_session, org.id)
        fake_s3.objects[storage.recording_key("someone-else", str(source.id))] = b"video"
        assert self.get(db_session, source, user)["recording"] is None

    def test_falls_back_to_local_when_object_missing(self, db_session, user, org, fake_s3, recordings_dir):
        source = make_source(db_session, org.id)
        (recordings_dir / f"{source.id}.mp4").write_bytes(b"video")
        url = self.get(db_session, source, user)["recording"]["url"]
        assert url.startswith(f"/api/recordings/{source.id}?expires=")

    def test_falls_back_to_local_when_storage_disabled(self, db_session, user, recordings_dir):
        source = make_source(db_session)
        (recordings_dir / f"{source.id}.mp4").write_bytes(b"video")
        assert self.get(db_session, source, user)["recording"]["url"].startswith("/api/recordings/")

    def test_falls_back_when_storage_errors(self, db_session, user, fake_s3, recordings_dir, monkeypatch):
        source = make_source(db_session)
        (recordings_dir / f"{source.id}.mp4").write_bytes(b"video")

        def boom(prefix):
            raise RuntimeError("down")

        monkeypatch.setattr(storage, "find_key", boom)
        assert self.get(db_session, source, user)["recording"]["url"].startswith("/api/recordings/")


class TestScripts:
    @pytest.fixture(autouse=True)
    def _restore_logging(self):
        yield
        logging.disable(logging.NOTSET)  # the scripts silence INFO logs at import

    def test_attach_uploads_to_storage(self, db_session, org, fake_s3, tmp_path, recordings_dir):
        from scripts.attach_recording import attach_file

        source = make_source(db_session, org.id)
        video = tmp_path / "in.MP4"
        video.write_bytes(b"video")
        msg = attach_file(db_session, source, video)
        key = f"org/{org.id}/sources/{source.id}/recording.mp4"
        assert fake_s3.objects[key] == b"video"
        assert fake_s3.content_types[key] == "video/mp4"
        assert key in msg
        assert list(recordings_dir.iterdir()) == []

    def test_attach_replaces_previous_extension(self, db_session, org, fake_s3, tmp_path):
        from scripts.attach_recording import attach_file

        source = make_source(db_session, org.id)
        old = storage.recording_key(str(org.id), str(source.id), ".webm")
        fake_s3.objects[old] = b"old"
        video = tmp_path / "in.mp4"
        video.write_bytes(b"new")
        attach_file(db_session, source, video)
        assert old not in fake_s3.objects
        assert len(fake_s3.objects) == 1

    def test_attach_local_when_storage_disabled(self, db_session, tmp_path, recordings_dir):
        from scripts.attach_recording import attach_file

        source = make_source(db_session)
        video = tmp_path / "in.mp4"
        video.write_bytes(b"video")
        attach_file(db_session, source, video)
        assert (recordings_dir / f"{source.id}.mp4").read_bytes() == b"video"

    def test_attach_size_guard(self, db_session, fake_s3, tmp_path, monkeypatch):
        from scripts.attach_recording import attach_file

        monkeypatch.setattr(settings, "recording_max_bytes", 2)
        source = make_source(db_session)
        video = tmp_path / "in.mp4"
        video.write_bytes(b"video")
        with pytest.raises(storage.RecordingTooLarge):
            attach_file(db_session, source, video)
        assert fake_s3.objects == {}

    def test_migrate_dry_run_then_real_keeps_local(self, db_session, org, fake_s3, recordings_dir):
        from scripts.migrate_recordings_to_storage import migrate

        source = make_source(db_session, org.id)
        local = recordings_dir / f"{source.id}.mp4"
        local.write_bytes(b"video")
        (recordings_dir / "orphan.mp4").write_bytes(b"x")  # no Source -> skipped

        assert migrate(db_session, dry_run=True, out=lambda m: None) == {"migrated": 1, "skipped": 1, "failed": 0}
        assert fake_s3.objects == {}

        assert migrate(db_session, out=lambda m: None)["migrated"] == 1
        assert fake_s3.objects[f"org/{org.id}/sources/{source.id}/recording.mp4"] == b"video"
        assert local.exists()

        # idempotent: second run skips the already-stored file
        assert migrate(db_session, out=lambda m: None)["migrated"] == 0

    def test_migrate_delete_local(self, db_session, org, fake_s3, recordings_dir):
        from scripts.migrate_recordings_to_storage import migrate

        source = make_source(db_session, org.id)
        local = recordings_dir / f"{source.id}.mp4"
        local.write_bytes(b"video")
        migrate(db_session, delete_local=True, out=lambda m: None)
        assert not local.exists()
        assert len(fake_s3.objects) == 1

    def test_migrate_delete_local_dry_run_deletes_nothing(self, db_session, org, fake_s3, recordings_dir):
        from scripts.migrate_recordings_to_storage import migrate

        source = make_source(db_session, org.id)
        local = recordings_dir / f"{source.id}.mp4"
        local.write_bytes(b"video")
        migrate(db_session, dry_run=True, delete_local=True, out=lambda m: None)
        assert local.exists()


@pytest.mark.skipif(
    not settings.is_storage_configured() or not __import__("os").getenv("RUN_S3_INTEGRATION"),
    reason="set RUN_S3_INTEGRATION=1 with S3_* configured (local SeaweedFS) to run",
)
class TestSeaweedFSIntegration:
    def test_roundtrip_private_with_range(self, tmp_path):
        import httpx

        storage._client = None  # use the real client
        key = "org/test/sources/integration/recording.mp4"
        f = tmp_path / "v.mp4"
        f.write_bytes(b"0123456789" * 100)
        try:
            storage.put_file(str(f), key)
            assert storage.head(key)["size"] == 1000
            url = storage.presigned_get(key, 60)
            r = httpx.get(url, headers={"Range": "bytes=10-19"})
            assert r.status_code == 206 and r.content == b"0123456789"
            assert httpx.get(url.split("?")[0]).status_code in (401, 403)
        finally:
            storage.delete(key)
            storage._client = None
