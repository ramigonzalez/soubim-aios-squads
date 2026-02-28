"""Background job scheduler using APScheduler.

Manages scheduled background jobs for the application.
Supports Gmail email polling (Story 7.4) and Google Drive folder monitoring (Story 10.3).
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


def _run_drive_poll():
    """Wrapper for Drive folder poll cycle (Story 10.3)."""
    from app.database.session import SessionLocal
    from app.services.drive_monitor import DriveMonitor

    logger.info("Scheduler: Running Drive folder poll cycle")
    try:
        db = SessionLocal()
        monitor = DriveMonitor(db)
        monitor.poll_all_projects()
        logger.info("Scheduler: Drive poll complete")
    except Exception as e:
        logger.error(f"Scheduler: Drive poll failed: {e}")
    finally:
        if 'db' in locals():
            db.close()


class AppScheduler:
    """Manages background job scheduling for the application."""

    def __init__(self):
        self._scheduler = BackgroundScheduler()
        self._gmail_job = None
        self._drive_job = None

    def start(self):
        """
        Start the background scheduler and register jobs.

        Called on FastAPI startup event.
        """
        jobs_registered = 0

        # Gmail poller (Story 7.4)
        if settings.is_gmail_configured():
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
                max_instances=1,
                coalesce=True,
                misfire_grace_time=60,
            )
            jobs_registered += 1
        else:
            logger.info(
                "Scheduler: Gmail credentials not configured -- "
                "Gmail poller disabled."
            )

        # Google Drive folder monitor (Story 10.3)
        if settings.is_drive_configured():
            drive_interval = max(
                settings.drive_poll_interval_minutes,
                MIN_POLL_INTERVAL_MINUTES,
            )
            self._drive_job = self._scheduler.add_job(
                _run_drive_poll,
                trigger=IntervalTrigger(minutes=drive_interval),
                id="drive_monitor",
                name="Google Drive Folder Monitor",
                max_instances=1,
                coalesce=True,
                misfire_grace_time=60,
            )
            jobs_registered += 1
            logger.info(
                f"Scheduler: Drive monitor registered -- interval={drive_interval}m"
            )
        else:
            logger.info(
                "Scheduler: Google Drive not configured -- "
                "Drive monitor disabled."
            )

        if jobs_registered == 0:
            logger.info("Scheduler: No polling jobs configured — scheduler idle")
            return

        self._scheduler.start()
        logger.info(f"Scheduler: Started with {jobs_registered} job(s)")

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
