"""Inventory system for managing player items."""
import json
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass
from enum import Enum


DATA_PATH = Path(__file__).parent / "data"


class ItemCategory(str, Enum):
    CONSUMABLE = "consumable"
    MATERIAL = "material"
    WEAPON = "weapon"
    ARMOR = "armor"
    ACCESSORY = "accessory"
    KEY_ITEM = "key_item"
    AMMO = "ammo"
    MISC = "misc"


@dataclass
class UseItemResult:
    """Result of using an item."""
    success: bool
    message: str
    narrative: list[str]
    hp_change: int = 0
    mp_change: int = 0
    status_cured: Optional[str] = None
    buff_applied: Optional[str] = None
    item_consumed: bool = True


class InventorySystem:
    """Handles all inventory-related logic."""

    def __init__(self):
        self._items: dict[str, dict] = {}
        self._load_item_data()

    def _load_item_data(self) -> None:
        """Load item definitions from JSON."""
        item_file = DATA_PATH / "items.json"
        if item_file.exists():
            with open(item_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Flatten all categories into single dict
                for category in data.values():
                    if isinstance(category, dict):
                        self._items.update(category)

    def get_item(self, item_id: str) -> Optional[dict]:
        """Get item data by ID."""
        return self._items.get(item_id)

    def get_item_name(self, item_id: str) -> str:
        """Get item display name."""
        item = self.get_item(item_id)
        return item.get("name", item_id) if item else item_id

    def can_use_item(self, item_id: str, in_combat: bool = False) -> tuple[bool, str]:
        """Check if an item can be used."""
        item = self.get_item(item_id)
        if not item:
            return False, "找不到該物品。"

        item_type = item.get("type", "")

        # Only consumables can be "used"
        if item_type not in ("consumable", "misc"):
            return False, f"{item.get('name', item_id)} 無法使用。"

        # Check combat restriction
        if in_combat and not item.get("usable_in_combat", False):
            return False, "這個物品無法在戰鬥中使用。"

        return True, ""

    def use_item(
        self,
        item_id: str,
        player_state: dict,
        in_combat: bool = False
    ) -> UseItemResult:
        """
        Use a consumable item.

        Args:
            item_id: ID of the item to use
            player_state: Current player state dict
            in_combat: Whether currently in combat

        Returns:
            UseItemResult with effects and narrative
        """
        item = self.get_item(item_id)
        if not item:
            return UseItemResult(
                success=False,
                message="物品不存在",
                narrative=["找不到該物品。"],
                item_consumed=False,
            )

        can_use, reason = self.can_use_item(item_id, in_combat)
        if not can_use:
            return UseItemResult(
                success=False,
                message="無法使用",
                narrative=[reason],
                item_consumed=False,
            )

        effect = item.get("effect", {})
        effect_type = effect.get("type", "")
        item_name = item.get("name", item_id)

        narrative = [f"你使用了{item_name}。"]
        hp_change = 0
        mp_change = 0
        status_cured = None
        buff_applied = None

        # Process effect
        if effect_type == "heal_hp":
            value = effect.get("value", 0)
            current_hp = player_state.get("hp", 0)
            max_hp = player_state.get("max_hp", 20)
            actual_heal = min(value, max_hp - current_hp)
            hp_change = actual_heal

            if actual_heal > 0:
                narrative.append(f"恢復了 {actual_heal} 點 HP。")
            else:
                narrative.append("HP 已經是滿的了。")

        elif effect_type == "heal_mp":
            value = effect.get("value", 0)
            current_mp = player_state.get("mp", 0)
            max_mp = player_state.get("max_mp", 10)
            actual_heal = min(value, max_mp - current_mp)
            mp_change = actual_heal

            if actual_heal > 0:
                narrative.append(f"恢復了 {actual_heal} 點 MP。")
            else:
                narrative.append("MP 已經是滿的了。")

        elif effect_type == "regen_hp":
            value = effect.get("value", 0)
            duration = effect.get("duration", 3)
            buff_applied = f"regen_{value}_{duration}"
            narrative.append(f"接下來 {duration} 回合，每回合恢復 {value} HP。")

        elif effect_type == "cure_status":
            status = effect.get("status", "")
            status_cured = status
            status_names = {
                "poison": "中毒",
                "blind": "致盲",
                "fear": "恐懼",
            }
            narrative.append(f"解除了{status_names.get(status, status)}狀態。")

        elif effect_type == "cure_all_status":
            status_cured = "all"
            narrative.append("解除了所有異常狀態。")

        elif effect_type == "buff":
            buff_id = effect.get("buff_id", "")
            buff_applied = buff_id
            buff_names = {
                "fire_resist": "火焰抗性",
                "ice_resist": "冰霜抗性",
            }
            narrative.append(f"獲得了{buff_names.get(buff_id, buff_id)}效果。")

        elif effect_type == "damage_aoe":
            value = effect.get("value", 0)
            narrative.append(f"對所有敵人造成 {value} 點傷害！")

        return UseItemResult(
            success=True,
            message=f"使用了{item_name}",
            narrative=narrative,
            hp_change=hp_change,
            mp_change=mp_change,
            status_cured=status_cured,
            buff_applied=buff_applied,
            item_consumed=True,
        )

    def add_item_to_inventory(
        self,
        inventory: list[dict],
        item_id: str,
        quantity: int = 1
    ) -> list[dict]:
        """
        Add item to inventory, stacking if possible.

        Args:
            inventory: Current inventory list
            item_id: ID of item to add
            quantity: Number to add

        Returns:
            Updated inventory list
        """
        item_data = self.get_item(item_id)
        if not item_data:
            return inventory

        # Check if item already exists in inventory
        for inv_item in inventory:
            if inv_item.get("id") == item_id:
                inv_item["quantity"] = inv_item.get("quantity", 1) + quantity
                return inventory

        # Add new item entry
        inventory.append({
            "id": item_id,
            "name": item_data.get("name", item_id),
            "type": item_data.get("type", "misc"),
            "quantity": quantity,
        })

        return inventory

    def remove_item_from_inventory(
        self,
        inventory: list[dict],
        item_id: str,
        quantity: int = 1
    ) -> tuple[list[dict], bool]:
        """
        Remove item from inventory.

        Args:
            inventory: Current inventory list
            item_id: ID of item to remove
            quantity: Number to remove

        Returns:
            (Updated inventory list, success bool)
        """
        for i, inv_item in enumerate(inventory):
            if inv_item.get("id") == item_id:
                current_qty = inv_item.get("quantity", 1)
                if current_qty < quantity:
                    return inventory, False

                if current_qty == quantity:
                    inventory.pop(i)
                else:
                    inv_item["quantity"] = current_qty - quantity

                return inventory, True

        return inventory, False

    def has_item(self, inventory: list[dict], item_id: str, quantity: int = 1) -> bool:
        """Check if inventory has enough of an item."""
        for inv_item in inventory:
            if inv_item.get("id") == item_id:
                return inv_item.get("quantity", 0) >= quantity
        return False

    def get_usable_items(
        self,
        inventory: list[dict],
        in_combat: bool = False
    ) -> list[dict]:
        """Get list of items that can be used."""
        usable = []
        for inv_item in inventory:
            item_id = inv_item.get("id", "")
            can_use, _ = self.can_use_item(item_id, in_combat)
            if can_use:
                item_data = self.get_item(item_id)
                usable.append({
                    "id": item_id,
                    "name": inv_item.get("name", item_id),
                    "quantity": inv_item.get("quantity", 1),
                    "description": item_data.get("description", "") if item_data else "",
                })
        return usable

    def calculate_weight(self, inventory: list[dict]) -> float:
        """Calculate total inventory weight."""
        total = 0.0
        for inv_item in inventory:
            item_id = inv_item.get("id", "")
            item_data = self.get_item(item_id)
            if item_data:
                weight = item_data.get("weight", 0)
                quantity = inv_item.get("quantity", 1)
                total += weight * quantity
        return total

    def get_carry_capacity(self, player_state: dict) -> float:
        """Calculate player's carry capacity."""
        stats = player_state.get("stats", {})
        strength = stats.get("strength", 2)
        base_capacity = 10 + strength

        # Check for weight belt accessory
        equipment = player_state.get("equipment", {})
        # TODO: Check equipped accessories for carry bonus

        return base_capacity

    def is_overweight(self, inventory: list[dict], player_state: dict) -> bool:
        """Check if player is over carry capacity."""
        weight = self.calculate_weight(inventory)
        capacity = self.get_carry_capacity(player_state)
        return weight > capacity

    def get_weapon_damage(self, player_state: dict) -> tuple[int, str, bool]:
        """
        Get equipped weapon's damage and type.

        Returns:
            (damage, attribute, is_light)
        """
        equipment = player_state.get("equipment", {})
        weapon_id = equipment.get("weapon")

        if not weapon_id:
            # Unarmed
            return 2, "strength", False

        weapon = self.get_item(weapon_id)
        if not weapon:
            return 2, "strength", False

        return (
            weapon.get("damage", 2),
            weapon.get("attribute", "strength"),
            weapon.get("is_light", False)
        )


# Global inventory system instance
inventory_system = InventorySystem()
