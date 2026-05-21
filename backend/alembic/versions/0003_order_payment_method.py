"""add payment_method to orders

Revision ID: 0003_order_payment_method
Revises: 0002_payment_methods
Create Date: 2026-05-20

"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_order_payment_method"
down_revision: Union[str, None] = "0002_payment_methods"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("payment_method", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "payment_method")
