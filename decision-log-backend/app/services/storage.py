"""S3-compatible object storage for recordings (Story 13.1).

One code path for SeaweedFS (local dev), Cloudflare R2 and Backblaze B2: path-style
addressing, SigV4, multipart uploads, presigned GET links (Range works natively).
The bucket is private; access is only through presigned, expiring links.

Lifecycle (no automation yet): configure a bucket lifecycle rule at the provider to expire
originals N days after processing (R2: object lifecycle rules; B2: Lifecycle Settings;
SeaweedFS: filer TTL), e.g. prefix `org/` expire after 90 days.
"""

import logging
import os
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

PART_SIZE = 16 * 1024 * 1024


class StorageError(Exception):
    """Storage is unavailable or an operation failed."""


class RecordingTooLarge(StorageError):
    """The recording exceeds RECORDING_MAX_BYTES."""


def is_enabled() -> bool:
    return settings.is_storage_configured()


_client: Any = None


def get_client() -> Any:
    """Lazily build the boto3 S3 client (tests replace this with a fake)."""
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config

        _client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
    return _client


def _transfer_config():
    from boto3.s3.transfer import TransferConfig

    return TransferConfig(multipart_threshold=PART_SIZE, multipart_chunksize=PART_SIZE)


def check_size(size: int) -> None:
    if size > settings.recording_max_bytes:
        raise RecordingTooLarge(f"{size} bytes exceeds the limit of {settings.recording_max_bytes} bytes")


def put_file(path: str, key: str, content_type: str = "video/mp4") -> int:
    """Upload a local file (multipart for large files). Returns its size in bytes."""
    size = os.path.getsize(path)
    check_size(size)
    get_client().upload_file(path, settings.s3_bucket, key, ExtraArgs={"ContentType": content_type},
                             Config=_transfer_config())
    return size


def put_stream_from_url(url: str, key: str, content_type: str = "video/mp4",
                        expected_size: Optional[int] = None, http_get=None) -> int:
    """Stream an HTTP download straight into the bucket, without a local file (Story 13.4).

    Returns the stored size. Refuses before downloading when Content-Length (or expected_size)
    exceeds the size guard, and aborts mid-stream if the body outgrows it.
    `http_get(url)` must return a context manager yielding a response with
    raise_for_status(), headers and iter_raw() (httpx streaming API); injectable for tests.
    """
    if http_get is None:
        import httpx

        def http_get(u):
            return httpx.stream("GET", u, follow_redirects=True, timeout=120)

    with http_get(url) as response:
        response.raise_for_status()
        declared = expected_size or int(response.headers.get("content-length") or 0)
        if declared:
            check_size(declared)
        counter = _CountingReader(response.iter_raw())
        get_client().upload_fileobj(counter, settings.s3_bucket, key, ExtraArgs={"ContentType": content_type},
                                    Config=_transfer_config())
    return counter.total


class _CountingReader:
    """File-like wrapper over a bytes iterator; counts bytes and raises above the size limit."""

    def __init__(self, chunks):
        self._chunks = iter(chunks)
        self._buf = b""
        self.total = 0

    def read(self, size: int = -1) -> bytes:
        while size < 0 or len(self._buf) < size:
            try:
                chunk = next(self._chunks)
            except StopIteration:
                break
            self._buf += chunk
            self.total += len(chunk)
            check_size(self.total)
        if size < 0:
            data, self._buf = self._buf, b""
        else:
            data, self._buf = self._buf[:size], self._buf[size:]
        return data


def head(key: str) -> Optional[dict]:
    """Object metadata ({size, content_type}) or None if it does not exist."""
    from botocore.exceptions import ClientError

    try:
        meta = get_client().head_object(Bucket=settings.s3_bucket, Key=key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return None
        raise StorageError(str(exc)) from exc
    return {"size": meta["ContentLength"], "content_type": meta.get("ContentType")}


def find_key(prefix: str) -> Optional[str]:
    """First object key under a prefix (finds recording.<ext> without knowing the extension)."""
    resp = get_client().list_objects_v2(Bucket=settings.s3_bucket, Prefix=prefix, MaxKeys=1)
    contents = resp.get("Contents") or []
    return contents[0]["Key"] if contents else None


def delete(key: str) -> None:
    get_client().delete_object(Bucket=settings.s3_bucket, Key=key)


def presigned_get(key: str, expires: int) -> str:
    """Expiring signed GET link (supports Range requests)."""
    return get_client().generate_presigned_url(
        "get_object", Params={"Bucket": settings.s3_bucket, "Key": key}, ExpiresIn=expires
    )


def presigned_put(key: str, content_type: str, expires: int) -> str:
    """Expiring signed PUT link: the browser uploads straight to the bucket (Story 13.5).

    The Content-Type is part of the signature, so the browser must send exactly this header.
    """
    return get_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.s3_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def recording_prefix(org_id: Optional[str], source_id: str) -> str:
    return f"org/{org_id or 'unknown'}/sources/{source_id}/recording."


def recording_key(org_id: Optional[str], source_id: str, ext: str = ".mp4") -> str:
    """org/<org_id>/sources/<source_id>/recording.<ext> (org/unknown/... if the project has no org)."""
    return recording_prefix(org_id, source_id) + ext.lstrip(".").lower()


def thumbnail_key(org_id: Optional[str], source_id: str) -> str:
    """org/<org_id>/sources/<source_id>/thumbnail.jpg (Story 13.12)."""
    return f"org/{org_id or 'unknown'}/sources/{source_id}/thumbnail.jpg"


def fathom_preview_key(user_id: str, recording_id: str) -> str:
    """previews/user/<user_id>/fathom/<recording_id>.jpg (Story 13.15): private to the user, outside org/."""
    return f"previews/user/{user_id}/fathom/{recording_id}.jpg"
