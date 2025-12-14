"""Combat system for handling battles between player and enemies."""
import json
import random
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from enum import Enum

from app.game.dice import check, DifficultyModifier, DiceResult


DATA_PATH = Path(__file__).parent / "data"


class AttackType(str, Enum):
    MELEE = "melee"      # 力量
    RANGED = "ranged"    # 敏捷
    MAGIC = "magic"      # 智力


@dataclass
class AttackResult:
    """Result of an attack action."""
    success: bool
    damage: int
    is_critical: bool
    is_miss: bool
    narrative: list[str]
    enemy_defeated: bool
    enemy_hp: int
    dice_roll: int
    target_number: int


@dataclass
class EnemyAttackResult:
    """Result of enemy's counter attack."""
    damage: int
    effect: Optional[str]
    narrative: list[str]
    player_hp: int


@dataclass
class CombatState:
    """Current state of combat."""
    enemy_id: str
    enemy_name: str
    enemy_hp: int
    enemy_max_hp: int
    enemy_evasion: int
    enemy_armor: int
    turn: int
    is_active: bool
    player_hp: int
    player_max_hp: int


class CombatSystem:
    """Handles all combat-related logic."""

    def __init__(self):
        self._enemies: dict = {}
        self._load_enemy_data()

    def _load_enemy_data(self) -> None:
        """Load enemy definitions from JSON."""
        enemy_file = DATA_PATH / "enemies.json"
        if enemy_file.exists():
            with open(enemy_file, "r", encoding="utf-8") as f:
                self._enemies = json.load(f)

    def get_enemy(self, enemy_id: str) -> Optional[dict]:
        """Get enemy data by ID."""
        return self._enemies.get(enemy_id)

    def init_combat(self, enemy_id: str, player_state: dict) -> Optional[CombatState]:
        """Initialize combat with an enemy."""
        enemy = self.get_enemy(enemy_id)
        if not enemy:
            return None

        player = player_state.get("player", {})
        return CombatState(
            enemy_id=enemy_id,
            enemy_name=enemy["name"],
            enemy_hp=enemy["hp"],
            enemy_max_hp=enemy["max_hp"],
            enemy_evasion=enemy["evasion"],
            enemy_armor=enemy.get("armor", 0),
            turn=1,
            is_active=True,
            player_hp=player.get("hp", 20),
            player_max_hp=player.get("max_hp", 20),
        )

    def player_attack(
        self,
        combat_state: CombatState,
        player_state: dict,
        attack_type: AttackType,
        weapon_damage: int = 5,
        is_light_attack: bool = False
    ) -> AttackResult:
        """Process player's attack action."""
        player = player_state.get("player", {})
        stats = player.get("stats", {})

        # Determine attribute based on attack type
        attr_map = {
            AttackType.MELEE: "strength",
            AttackType.RANGED: "dexterity",
            AttackType.MAGIC: "intelligence",
        }
        attr_name = attr_map.get(attack_type, "strength")
        attr_value = stats.get(attr_name, 2)

        # Calculate hit chance (base: attr * 20%, enemy evasion reduces it)
        # Effective target = attr * 20 + 10 (base bonus) - enemy_evasion
        # Clamped to 5-95 range (always 5% chance to miss/hit)
        base_target = attr_value * 20 + 10
        target = max(5, min(95, base_target - combat_state.enemy_evasion))

        # Roll 1d100
        roll = random.randint(1, 100)

        # Determine result
        is_critical = roll <= 5
        is_fumble = roll >= 96
        hit = roll <= target or is_critical

        narrative = []

        if is_fumble:
            # Critical failure
            narrative.append("你的攻擊完全偏離了目標！")
            narrative.append(f"（骰出 {roll}，大失敗）")
            return AttackResult(
                success=False,
                damage=0,
                is_critical=False,
                is_miss=True,
                narrative=narrative,
                enemy_defeated=False,
                enemy_hp=combat_state.enemy_hp,
                dice_roll=roll,
                target_number=target,
            )

        if not hit:
            # Miss
            narrative.append(f"{combat_state.enemy_name}靈巧地躲開了你的攻擊！")
            narrative.append(f"（骰出 {roll}，需要 {target} 以下）")
            return AttackResult(
                success=False,
                damage=0,
                is_critical=False,
                is_miss=True,
                narrative=narrative,
                enemy_defeated=False,
                enemy_hp=combat_state.enemy_hp,
                dice_roll=roll,
                target_number=target,
            )

        # Calculate damage
        base_damage = weapon_damage
        attr_bonus = attr_value  # +1 damage per attribute point

        # Check for weakness bonus
        enemy_data = self.get_enemy(combat_state.enemy_id)
        weakness_bonus = 0
        if is_light_attack and enemy_data and enemy_data.get("weakness") == "light":
            weakness_bonus = enemy_data.get("weakness_bonus", 2)
            narrative.append("光系攻擊對暗影生物造成額外傷害！")

        # Critical doubles damage
        multiplier = 2 if is_critical else 1

        total_damage = (base_damage + attr_bonus + weakness_bonus) * multiplier
        total_damage = max(1, total_damage - combat_state.enemy_armor)

        # Apply damage
        new_enemy_hp = max(0, combat_state.enemy_hp - total_damage)
        combat_state.enemy_hp = new_enemy_hp

        # Build narrative
        if is_critical:
            narrative.append("完美的一擊！")
            narrative.append(f"你的攻擊精準命中{combat_state.enemy_name}的要害！")
            narrative.append(f"（骰出 {roll}，大成功！傷害翻倍）")
        else:
            narrative.append(f"你的攻擊命中了{combat_state.enemy_name}！")
            narrative.append(f"（骰出 {roll}，成功）")

        narrative.append(f"造成 {total_damage} 點傷害！")
        narrative.append(f"{combat_state.enemy_name} HP: {new_enemy_hp}/{combat_state.enemy_max_hp}")

        enemy_defeated = new_enemy_hp <= 0
        if enemy_defeated:
            narrative.append("")
            narrative.append(f"{combat_state.enemy_name}倒下了！")

        return AttackResult(
            success=True,
            damage=total_damage,
            is_critical=is_critical,
            is_miss=False,
            narrative=narrative,
            enemy_defeated=enemy_defeated,
            enemy_hp=new_enemy_hp,
            dice_roll=roll,
            target_number=target,
        )

    def enemy_attack(
        self,
        combat_state: CombatState,
        player_state: dict
    ) -> EnemyAttackResult:
        """Process enemy's attack on player."""
        enemy_data = self.get_enemy(combat_state.enemy_id)
        if not enemy_data:
            return EnemyAttackResult(
                damage=0,
                effect=None,
                narrative=["敵人無法行動。"],
                player_hp=combat_state.player_hp,
            )

        player = player_state.get("player", {})
        stats = player.get("stats", {})

        # Enemy attack selection (simple: random from available attacks)
        attacks = enemy_data.get("attacks", [])
        if not attacks:
            return EnemyAttackResult(
                damage=0,
                effect=None,
                narrative=["敵人猶豫不決。"],
                player_hp=combat_state.player_hp,
            )

        attack = random.choice(attacks)

        # Player dodge check based on dexterity
        dex = stats.get("dexterity", 2)
        dodge_target = dex * 10 + 5  # Base dodge chance

        roll = random.randint(1, 100)
        dodged = roll <= dodge_target

        narrative = []
        narrative.append(attack.get("description", f"{combat_state.enemy_name}發動攻擊！"))

        if dodged:
            narrative.append(f"你靈活地閃避了攻擊！")
            narrative.append(f"（迴避骰 {roll}，需要 {dodge_target} 以下）")
            return EnemyAttackResult(
                damage=0,
                effect=None,
                narrative=narrative,
                player_hp=combat_state.player_hp,
            )

        # Calculate damage
        base_damage = attack.get("damage", 4)
        # Could add player armor reduction here

        new_player_hp = max(0, combat_state.player_hp - base_damage)
        combat_state.player_hp = new_player_hp

        narrative.append(f"你受到 {base_damage} 點傷害！")
        narrative.append(f"HP: {new_player_hp}/{combat_state.player_max_hp}")

        # Check for status effects
        effect = None
        effect_chance = attack.get("effect_chance", 0)
        if attack.get("effect") and random.randint(1, 100) <= effect_chance:
            effect = attack.get("effect")
            narrative.append(f"你陷入了{effect}狀態！")

        return EnemyAttackResult(
            damage=base_damage,
            effect=effect,
            narrative=narrative,
            player_hp=new_player_hp,
        )

    def get_victory_rewards(self, enemy_id: str) -> dict:
        """Get rewards for defeating an enemy."""
        enemy = self.get_enemy(enemy_id)
        if not enemy:
            return {"items": [], "gold": 0, "exp": 0}

        drops = enemy.get("drops", [])
        gold = 0
        items = []

        for drop in drops:
            if drop.get("id") == "gold":
                gold += drop.get("quantity", 0)
            else:
                items.append(drop)

        return {
            "items": items,
            "gold": gold,
            "exp": enemy.get("exp", 10),
        }


# Global combat system instance
combat_system = CombatSystem()
