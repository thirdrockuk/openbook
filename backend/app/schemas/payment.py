import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator

VALID_METHODS = {"cash", "bank_transfer", "cheque", "other"}


class PaymentCreate(BaseModel):
    amount_pence: int
    method: str = "cash"
    reference: Optional[str] = None
    note: Optional[str] = None
    received_at: Optional[datetime] = None

    @field_validator("amount_pence")
    @classmethod
    def amount_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return v

    @field_validator("method")
    @classmethod
    def method_must_be_valid(cls, v: str) -> str:
        if v not in VALID_METHODS:
            raise ValueError(f"Method must be one of: {', '.join(sorted(VALID_METHODS))}")
        return v


class PaymentRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    amount_pence: int
    currency: str
    provider: str
    provider_txn_id: Optional[str] = None
    note: Optional[str] = None
    received_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
