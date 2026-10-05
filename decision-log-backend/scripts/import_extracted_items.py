"""Import an extraction JSON ({"items": [...]}) into a meeting Source (Story 7.10).

Usage (from decision-log-backend/):
  PYTHONPATH=. venv/bin/python scripts/import_extracted_items.py SOURCE_ID ITEMS_JSON \
      [--approver EMAIL] [--replace] [--dry-run]

--replace   delete the source's existing items first
--dry-run   validate and report, then roll back
"""
import argparse
import collections
import json
import logging
import sys

logging.disable(logging.INFO)

from app.database.models import Source, User  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.item_import import import_items  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source_id")
    parser.add_argument("items_json")
    parser.add_argument("--approver", help="email of the director recorded as approver")
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    with open(args.items_json, encoding="utf-8") as f:
        data = json.load(f)
    items = data["items"] if isinstance(data, dict) else data

    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == args.source_id).first()
        if source is None:
            print(f"Source {args.source_id} not found", file=sys.stderr)
            return 1
        approver_id = None
        if args.approver:
            user = db.query(User).filter(User.email == args.approver).first()
            if user is None:
                print(f"Approver {args.approver} not found", file=sys.stderr)
                return 1
            approver_id = user.id

        created, skipped = import_items(db, source, items, approver_id=approver_id, replace=args.replace)
        by_type = collections.Counter(i.item_type for i in created)
        print(f"{len(created)} items ({dict(by_type)}), {skipped} skipped by validation -> source '{source.title}'")
        if args.dry_run:
            db.rollback()
            print("dry run: rolled back")
        else:
            db.commit()
            print(f"committed; source status = {source.ingestion_status}")
        return 0
    except ValueError as e:
        db.rollback()
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
