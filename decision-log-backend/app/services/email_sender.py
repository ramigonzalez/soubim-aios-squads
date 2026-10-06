"""Pluggable email sending (Story 12.5).

No provider is chosen yet (Resend / Postmark / SES — open decision). Code depends only on the
``EmailSender`` interface; the default ``LogEmailSender`` writes the message to the backend log
**in development/test only**. Elsewhere it logs that a message was not delivered, without its
body, because the body carries a secret invitation link (the admin copies the link from the
API/UI instead).

To plug a provider: implement ``send`` and return it from ``get_email_sender``.
"""

import logging
from typing import Protocol

from app.config import settings

logger = logging.getLogger(__name__)

_DEV_ENVIRONMENTS = ("development", "test")


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> bool:
        """Send a message; return True when it was handed to a provider."""


class LogEmailSender:
    """Development sender: prints the message to the log; never delivers."""

    def send(self, to: str, subject: str, body: str) -> bool:
        if settings.environment.lower() in _DEV_ENVIRONMENTS:
            logger.info("[email not sent — dev log sender] to=%s subject=%s\n%s", to, subject, body)
        else:
            logger.warning("No email provider configured: message to %s was not sent", to)
        return False


def get_email_sender() -> EmailSender:
    return LogEmailSender()
