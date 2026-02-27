"""Background job scheduler using APScheduler.

Manages scheduled background jobs for the application. Currently supports
Gmail email polling with configurable intervals.

Story 7.4: Backend Gmail API Poller
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings

logger = logging.getLogger(__name__)

# Minimum poll interval to prevent quota exhaustion
MIN_POLL_INTERVAL_MINUTES = 5


def _run_gmail_poll():
    """
    Wrapper function executed by the scheduler.

    Imports inside the function to avoid circular imports at startup.
    """
    from app.services.gmail_poller import gmail_poller_service

    logger.info("Scheduler: Running Gmail poll cycle")
    try:
        stats = gmail_poller_service.run_poll_cycle()
        logger.info(f"Scheduler: Gmail poll complete -- {stats}")
    except Exception as e:
        logger.error(f"Scheduler: Gmail poll failed with unhandled exception: {e}")


class AppScheduler:
    """Manages background job scheduling for the application."""

    def __init__(self):
        self._scheduler = BackgroundScheduler()
        self._gmail_job = None

    def start(self):
        """
        Start the background scheduler and register jobs.

        Called on FastAPI startup event.
        """
        if not settings.is_gmail_configured():
            logger.info(
                "Scheduler: Gmail credentials not configured -- "
                "Gmail poller disabled. Set GMAIL_CLIENT_ID, "
                "GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN to enable."
            )
            return

        # Enforce minimum interval
        interval_minutes = max(
            settings.gmail_poll_interval_minutes,
            MIN_POLL_INTERVAL_MINUTES,
        )

        if interval_minutes != settings.gmail_poll_interval_minutes:
            logger.warning(
                f"Scheduler: GMAIL_POLL_INTERVAL_MINUTES="
                f"{settings.gmail_poll_interval_minutes} "
                f"is below minimum ({MIN_POLL_INTERVAL_MINUTES}). "
                f"Using {MIN_POLL_INTERVAL_MINUTES} minutes."
            )

        logger.info(
            f"Scheduler: Registering Gmail poller -- "
            f"interval={interval_minutes}m, "
            f"label_filter='{settings.gmail_label_filter}', "
            f"max_results={settings.gmail_max_results_per_poll}"
        )

        self._gmail_job = self._scheduler.add_job(
            _run_gmail_poll,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id="gmail_poller",
            name="Gmail Email Poller",
            max_instances=1,  # Prevent overlapping runs
            coalesce=True,  # Skip missed runs instead of catching up
            misfire_grace_time=60,  # Allow 60s late start before considering misfired
        )

        self._scheduler.start()
        logger.info(
            f"Scheduler: Started. Gmail poller next run: "
            f"{self._gmail_job.next_run_time}"
        )

    def shutdown(self):
        """
        Gracefully shut down the scheduler.

        Called on FastAPI shutdown event.
        """
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("Scheduler: Shut down")

    def get_status(self) -> dict:
        """Return scheduler status for admin monitoring endpoint."""
        if not self._scheduler.running:
            return {"running": False, "jobs": []}

        jobs = []
        for job in self._scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": (
                        job.next_run_time.isoformat() if job.next_run_time else None
                    ),
                }
            )

        return {"running": True, "jobs": jobs}


# Singleton instance
app_scheduler = AppScheduler()
