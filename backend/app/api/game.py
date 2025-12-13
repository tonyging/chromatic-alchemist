from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.game_save import GameSave
from app.schemas.game import SaveSlotInfo, GameStateSchema, ActionRequest, ActionResponse


router = APIRouter()


@router.get("/saves", response_model=list[SaveSlotInfo])
async def get_save_slots(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all save slots for current user"""
    result = await db.execute(
        select(GameSave).where(GameSave.user_id == current_user.id)
    )
    saves = result.scalars().all()

    # Build response with all 3 slots
    slots = []
    save_by_slot = {save.slot: save for save in saves}

    for slot_num in [1, 2, 3]:
        if slot_num in save_by_slot:
            save = save_by_slot[slot_num]
            game_state = save.game_state or {}
            slots.append(SaveSlotInfo(
                slot=slot_num,
                character_name=save.character_name,
                chapter=game_state.get("chapter"),
                updated_at=save.updated_at.isoformat() if save.updated_at else None,
                is_empty=False
            ))
        else:
            slots.append(SaveSlotInfo(
                slot=slot_num,
                character_name=None,
                chapter=None,
                updated_at=None,
                is_empty=True
            ))

    return slots


@router.post("/saves/{slot}/new")
async def create_new_game(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new game in specified slot"""
    if slot not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Invalid slot number")

    # Check if slot already has a save
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot
        )
    )
    existing_save = result.scalar_one_or_none()

    if existing_save:
        raise HTTPException(status_code=400, detail="Slot already in use. Delete first.")

    # Create new save with initial state
    initial_state = {
        "chapter": "prologue",
        "scene": "dream_opening",
        "player": None,  # Will be set during character creation
        "flags": {},
        "combat": None
    }

    new_save = GameSave(
        user_id=current_user.id,
        slot=slot,
        game_state=initial_state
    )
    db.add(new_save)
    await db.commit()

    return {"success": True, "message": "New game created", "slot": slot}


@router.get("/saves/{slot}", response_model=dict)
async def load_game(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Load game from specified slot"""
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot
        )
    )
    save = result.scalar_one_or_none()

    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    return {
        "success": True,
        "game_state": save.game_state,
        "character_name": save.character_name
    }


@router.delete("/saves/{slot}")
async def delete_save(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete save in specified slot"""
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot
        )
    )
    save = result.scalar_one_or_none()

    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    await db.delete(save)
    await db.commit()

    return {"success": True, "message": "Save deleted"}


@router.post("/saves/{slot}/action", response_model=ActionResponse)
async def perform_action(
    slot: int,
    action: ActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform a game action"""
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot
        )
    )
    save = result.scalar_one_or_none()

    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    # TODO: Implement game engine logic
    # This is a placeholder response
    return ActionResponse(
        success=True,
        message="Action processed",
        narrative=["This feature is under development."],
        game_state=None,
        available_actions=[]
    )
