from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.game_save import GameSave
from app.schemas.game import SaveSlotInfo, GameStateSchema, ActionRequest, ActionResponse, NewGameRequest
from app.game.engine import GameEngine


router = APIRouter()


@router.get("/saves", response_model=list[SaveSlotInfo])
async def get_save_slots(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all save slots for current user"""
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.deleted_at.is_(None)
        )
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


@router.post("/saves/{slot}/new", response_model=ActionResponse)
async def create_new_game(
    slot: int,
    request: NewGameRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new game in specified slot"""
    if slot not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Invalid slot number")

    # Check if slot already has a save (exclude soft-deleted)
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot,
            GameSave.deleted_at.is_(None)
        )
    )
    existing_save = result.scalar_one_or_none()

    if existing_save:
        raise HTTPException(status_code=400, detail="Slot already in use. Delete first.")

    # Calculate stats: use custom stats if provided, else default
    if request.stats:
        if not request.stats.validate_stats():
            raise HTTPException(status_code=400, detail="Stats must total 9 points with each stat between 1-5")
        base_stats = {
            "strength": request.stats.strength,
            "dexterity": request.stats.dexterity,
            "intelligence": request.stats.intelligence,
            "perception": request.stats.perception,
        }
    else:
        base_stats = {"strength": 2, "dexterity": 2, "intelligence": 2, "perception": 2}

    # Apply background bonus
    starting_items: list[dict] = []
    if request.background.value == "warrior":
        base_stats["strength"] += 1
        starting_items = [{"id": "red_potion", "name": "紅光藥水", "quantity": 2}]
    elif request.background.value == "herbalist":
        base_stats["perception"] += 1
        starting_items = [{"id": "green_potion", "name": "綠光藥水", "quantity": 2}]
    elif request.background.value == "mage":
        base_stats["intelligence"] += 1
        starting_items = [{"id": "blue_potion", "name": "藍光藥水", "quantity": 2}]

    # Calculate derived stats
    max_hp = 20 + (base_stats["strength"] * 2)
    max_mp = 10 + (base_stats["intelligence"] * 2)

    # Create player data
    player_data = {
        "name": request.character_name,
        "background": request.background.value,
        "stats": base_stats,
        "hp": max_hp,
        "max_hp": max_hp,
        "mp": max_mp,
        "max_mp": max_mp,
        "gold": 50,
        "inventory": starting_items,
        "equipment": {"weapon": None, "armor": None, "accessory1": None, "accessory2": None},
        "recipes": [],
        "choices": {}
    }

    # Create initial game state
    initial_state = {
        "chapter": "prologue",
        "scene": "dream_opening",
        "player": player_data,
        "flags": {},
        "combat": None
    }

    new_save = GameSave(
        user_id=current_user.id,
        slot=slot,
        character_name=request.character_name,
        game_state=initial_state
    )
    db.add(new_save)
    await db.commit()

    # Get initial scene narrative
    engine = GameEngine(initial_state)
    action_result = engine.process_action("start", {})

    return ActionResponse(
        success=True,
        message="New game created",
        narrative=action_result.narrative,
        game_state=None,
        available_actions=action_result.available_actions,
        scene_type=action_result.scene_type,
        combat_info=action_result.combat_info,
    )


@router.get("/saves/{slot}", response_model=ActionResponse)
async def load_game(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Load game from specified slot"""
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot,
            GameSave.deleted_at.is_(None)
        )
    )
    save = result.scalar_one_or_none()

    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    # 用 GameEngine 取得當前場景的 narrative 和 actions
    engine = GameEngine(save.game_state)
    action_result = engine.process_action("resume", {})

    return ActionResponse(
        success=True,
        message="Game loaded",
        narrative=action_result.narrative,
        game_state=None,
        available_actions=action_result.available_actions,
        scene_type=action_result.scene_type,
        combat_info=action_result.combat_info,
    )


@router.delete("/saves/{slot}")
async def delete_save(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete save in specified slot"""
    result = await db.execute(
        select(GameSave).where(
            GameSave.user_id == current_user.id,
            GameSave.slot == slot,
            GameSave.deleted_at.is_(None)
        )
    )
    save = result.scalar_one_or_none()

    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    # Soft delete (use naive UTC datetime to match DB column type)
    save.deleted_at = datetime.utcnow()
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
            GameSave.slot == slot,
            GameSave.deleted_at.is_(None)
        )
    )
    save = result.scalar_one_or_none()

    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    # Process action through game engine
    engine = GameEngine(save.game_state)
    action_result = engine.process_action(action.action_type, action.action_data or {})

    # Update game state if there are changes
    if action_result.state_changes:
        updated_state = {**save.game_state}

        # Apply scene change
        if "scene" in action_result.state_changes:
            updated_state["scene"] = action_result.state_changes["scene"]

        # Apply flag changes
        if "flags" in action_result.state_changes:
            updated_state["flags"] = {
                **updated_state.get("flags", {}),
                **action_result.state_changes["flags"]
            }

        # Apply damage
        if "damage" in action_result.state_changes:
            player = updated_state.get("player", {})
            if player:
                player["hp"] = max(0, player.get("hp", 0) - action_result.state_changes["damage"])
                updated_state["player"] = player

        # Apply item additions
        if "add_item" in action_result.state_changes:
            item = action_result.state_changes["add_item"]
            player = updated_state.get("player", {})
            if player:
                inventory = player.get("inventory", [])
                inventory.append(item)
                player["inventory"] = inventory
                updated_state["player"] = player

        save.game_state = updated_state
        flag_modified(save, "game_state")
        await db.commit()

    return ActionResponse(
        success=action_result.success,
        message=action_result.message,
        narrative=action_result.narrative,
        game_state=None,  # Send full state updates separately if needed
        available_actions=action_result.available_actions,
        dice_result=action_result.dice_result,
        scene_type=action_result.scene_type,
        combat_info=action_result.combat_info,
    )
