"""Encryption at rest for third-party OAuth tokens (Story 13.3).

Fernet (AES-128-CBC + HMAC-SHA256) with the key in TOKEN_ENCRYPTION_KEY.
Generate one with: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
Changing the key makes stored tokens unreadable: users then reconnect.
"""

from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


class TokenEncryptionError(Exception):
    """Key missing/invalid, or ciphertext not produced with the current key."""


def _fernet(key: Optional[str] = None) -> Fernet:
    key = key if key is not None else settings.token_encryption_key
    if not key:
        raise TokenEncryptionError("TOKEN_ENCRYPTION_KEY is not set")
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except (ValueError, TypeError) as exc:
        raise TokenEncryptionError("TOKEN_ENCRYPTION_KEY is not a valid Fernet key") from exc


def is_key_valid(key: Optional[str] = None) -> bool:
    try:
        _fernet(key)
        return True
    except TokenEncryptionError:
        return False


def encrypt_token(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise TokenEncryptionError("stored token cannot be decrypted with the current key") from exc
