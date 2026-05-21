"""add payment method fields to events

Revision ID: 0002_payment_methods
Revises: 0001_initial
Create Date: 2026-05-20

"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002_payment_methods"
down_revision: Union[str, None] = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("allow_bank_transfer", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("events", sa.Column("allow_card_payment", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("events", sa.Column("bank_transfer_details", sa.Text(), nullable=False, server_default=""))
    op.add_column("events", sa.Column("stripe_account_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "stripe_account_id")
    op.drop_column("events", "bank_transfer_details")
    op.drop_column("events", "allow_card_payment")
    op.drop_column("events", "allow_bank_transfer")
