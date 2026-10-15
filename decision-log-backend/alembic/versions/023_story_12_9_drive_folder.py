"""Story 12.9: Drive folder chosen by the organization (shared with the service account).

Revision ID: 023_story_12_9
Revises: 022_story_12_13
Create Date: 2026-10-15

Changes:
- projects.drive_folder_name: the folder's name when it was chosen (shown in the project settings
  without calling Google on every page load).
- projects.drive_poll_error: why the last Drive poll of this project failed (e.g. the folder is no
  longer shared with the service account); NULL when the last poll worked.
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = '023_story_12_9'
down_revision = '022_story_12_13'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('drive_folder_name', sa.String(255), nullable=True))
    op.add_column('projects', sa.Column('drive_poll_error', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'drive_poll_error')
    op.drop_column('projects', 'drive_folder_name')
