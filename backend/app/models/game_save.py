from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GameSave(Base):
    __tablename__ = "game_saves"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    slot: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3

    # Character info
    character_name: Mapped[str] = mapped_column(String(50), nullable=True)

    # Game state stored as JSON
    game_state: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)

    # Relationships
    user = relationship("User", back_populates="game_saves")

    __table_args__ = (
        # Each user can only have one save per slot
        {"sqlite_autoincrement": True},
    )
