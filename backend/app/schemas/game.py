from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum


class Background(str, Enum):
    WARRIOR = "warrior"
    HERBALIST = "herbalist"
    MAGE = "mage"


class Stats(BaseModel):
    strength: int
    dexterity: int
    intelligence: int
    perception: int


class EquipmentSlots(BaseModel):
    weapon: Optional[str] = None
    armor: Optional[str] = None
    accessory1: Optional[str] = None
    accessory2: Optional[str] = None


class PlayerSchema(BaseModel):
    name: str
    background: Background
    stats: Stats
    hp: int
    max_hp: int
    mp: int
    max_mp: int
    gold: int
    inventory: list[dict[str, Any]]
    equipment: EquipmentSlots
    recipes: list[str]
    choices: dict[str, Any]


class CombatState(BaseModel):
    enemy_id: str
    enemy_hp: int
    enemy_max_hp: int
    turn: int
    player_buffs: list[dict[str, Any]]
    enemy_buffs: list[dict[str, Any]]


class GameStateSchema(BaseModel):
    chapter: str
    scene: str
    player: PlayerSchema
    flags: dict[str, Any]
    combat: Optional[CombatState] = None


class ActionRequest(BaseModel):
    action_type: str  # "choice", "attack", "use_item", "flee", etc.
    action_data: Optional[dict[str, Any]] = None


class ActionResponse(BaseModel):
    success: bool
    message: str
    narrative: list[str]  # Story text to display
    game_state: Optional[GameStateSchema] = None
    available_actions: list[dict[str, Any]]
    dice_result: Optional[dict[str, Any]] = None


class SaveSlotInfo(BaseModel):
    slot: int
    character_name: Optional[str]
    chapter: Optional[str]
    updated_at: Optional[str]
    is_empty: bool
