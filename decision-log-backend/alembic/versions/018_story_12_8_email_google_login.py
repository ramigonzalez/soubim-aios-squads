"""Story 12.8: case-insensitive emails + Sign in with Google requests.

Revision ID: 018_story_12_8
Revises: 016_story_12_6
Create Date: 2026-10-06

Changes:
- users.email: stripped and lowercased; unique index on lower(email) (uq_users_email_lower).
  Fails (nothing changed) when two users share an email case-insensitively: merge or rename
  them by hand first. organization_invitations.email is lowercased too (already normalized by code).
- users.google_sub: Google account id (ID token ``sub``) bound on the first Google sign-in (unique).
- google_login_requests: OAuth state / nonce / PKCE verifier / one-time login code (short lived).

Downgrade drops the table, users.google_sub and the index; emails stay lowercased (the original case is not kept).
Note: 017 is taken by another branch; the down_revision is renumbered on merge.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision = '018_story_12_8'
down_revision = '016_story_12_6'
branch_labels = None
depends_on = None

MAX_LISTED = 20


def upgrade() -> None:
    conn = op.get_bind()
    collisions = conn.execute(sa.text(
        "SELECT lower(trim(email)) AS email, count(*) AS n FROM users "
        "GROUP BY lower(trim(email)) HAVING count(*) > 1 ORDER BY 1"
    )).fetchall()
    if collisions:
        listed = ", ".join(f"{row.email} ({row.n} users)" for row in collisions[:MAX_LISTED])
        more = f" and {len(collisions) - MAX_LISTED} more" if len(collisions) > MAX_LISTED else ""
        raise RuntimeError(
            "018_story_12_8: cannot make emails case-insensitive, these users share an email "
            f"ignoring case: {listed}{more}. Merge, rename or delete the duplicates, then run the migration again."
        )

    conn.execute(sa.text("UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email))"))
    conn.execute(sa.text(
        "UPDATE organization_invitations SET email = lower(trim(email)) WHERE email <> lower(trim(email))"
    ))
    op.create_index('uq_users_email_lower', 'users', [sa.text('lower(email)')], unique=True)
    op.add_column('users', sa.Column('google_sub', sa.String(255), nullable=True))
    op.create_unique_constraint('uq_users_google_sub', 'users', ['google_sub'])

    op.create_table(
        'google_login_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('state_nonce', sa.String(64), nullable=False, unique=True),
        sa.Column('oidc_nonce', sa.String(64), nullable=False),
        sa.Column('code_verifier', sa.String(128), nullable=True),
        sa.Column('browser_key_hash', sa.String(64), nullable=False),
        sa.Column(
            'invitation_id', postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organization_invitations.id', ondelete='CASCADE'), nullable=True,
        ),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('google_sub', sa.String(255), nullable=True),
        sa.Column('login_code_hash', sa.String(64), nullable=True, unique=True),
        sa.Column('callback_at', sa.DateTime(), nullable=True),
        sa.Column('consumed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_google_login_requests_expires', 'google_login_requests', ['expires_at'])


def downgrade() -> None:
    op.drop_index('idx_google_login_requests_expires', table_name='google_login_requests')
    op.drop_table('google_login_requests')
    op.drop_constraint('uq_users_google_sub', 'users', type_='unique')
    op.drop_column('users', 'google_sub')
    op.drop_index('uq_users_email_lower', table_name='users')
