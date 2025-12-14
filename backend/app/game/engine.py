"""Core game engine for processing player actions and managing game state."""
import json
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass

from app.game.dice import check, DifficultyModifier, DiceResult
from app.game.combat import combat_system, AttackType, CombatState
from app.game.inventory import inventory_system


DATA_PATH = Path(__file__).parent / "data"


@dataclass
class ActionResult:
    """Result of processing a player action."""
    success: bool
    message: str
    narrative: list[str]
    state_changes: dict[str, Any]
    available_actions: list[dict[str, Any]]
    dice_result: Optional[dict[str, Any]] = None
    scene_type: Optional[str] = None
    combat_info: Optional[dict[str, Any]] = None


class GameEngine:
    """Main game engine that processes player actions."""

    def __init__(self, game_state: dict):
        self.state = game_state
        self._scenes: dict[str, dict] = {}
        self._combat_state: Optional[CombatState] = None
        self._load_chapter_data()
        self._init_combat_if_needed()

    def _load_chapter_data(self) -> None:
        """Load chapter data from JSON files."""
        chapter = self.state.get("chapter", "prologue")
        chapter_file = DATA_PATH / "chapters" / f"{chapter}.json"

        if chapter_file.exists():
            with open(chapter_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._scenes = data.get("scenes", {})

    def _init_combat_if_needed(self) -> None:
        """Initialize or restore combat state if current scene is combat."""
        scene = self.get_current_scene()
        if scene.get("type") == "combat":
            # Check if combat state already exists in game_state
            saved_combat = self.state.get("combat")
            if saved_combat:
                # Restore from saved state
                self._combat_state = CombatState(
                    enemy_id=saved_combat["enemy_id"],
                    enemy_name=saved_combat["enemy_name"],
                    enemy_hp=saved_combat["enemy_hp"],
                    enemy_max_hp=saved_combat["enemy_max_hp"],
                    enemy_evasion=saved_combat["enemy_evasion"],
                    enemy_armor=saved_combat.get("enemy_armor", 0),
                    turn=saved_combat.get("turn", 1),
                    is_active=saved_combat.get("is_active", True),
                    player_hp=saved_combat.get("player_hp", self.state.get("player", {}).get("hp", 20)),
                    player_max_hp=saved_combat.get("player_max_hp", self.state.get("player", {}).get("max_hp", 20)),
                )
            else:
                # Initialize new combat
                combat_info = scene.get("combat_info", {})
                enemy_id = combat_info.get("enemy_id", "shadow_bug")
                self._combat_state = combat_system.init_combat(enemy_id, self.state)

    def get_current_scene(self) -> dict:
        """Get the current scene data."""
        scene_id = self.state.get("scene", "")
        return self._scenes.get(scene_id, {})

    def process_action(self, action_type: str, action_data: Optional[dict] = None) -> ActionResult:
        """
        Process a player action and return the result.

        Args:
            action_type: Type of action (choice, attack, use_item, etc.)
            action_data: Additional data for the action

        Returns:
            ActionResult with narrative, state changes, and available actions
        """
        action_data = action_data or {}

        # Route to appropriate handler
        handlers = {
            "start": self._handle_start,
            "resume": self._handle_resume,
            "choice": self._handle_choice,
            "skill_check": self._handle_skill_check,
            "attack": self._handle_attack,
            "use_item": self._handle_use_item,
            "continue": self._handle_continue,
            "cancel": self._handle_cancel,
        }

        handler = handlers.get(action_type, self._handle_unknown)
        return handler(action_data)

    def _handle_start(self, data: dict) -> ActionResult:
        """Handle game start - initialize player and show first scene."""
        scene = self.get_current_scene()

        if not scene:
            # No scene data, return initial narrative
            return ActionResult(
                success=True,
                message="遊戲開始",
                narrative=self._get_opening_narrative(),
                state_changes={},
                available_actions=self._get_available_actions(),
            )

        return ActionResult(
            success=True,
            message="場景載入",
            narrative=scene.get("narrative", []),
            state_changes={},
            available_actions=scene.get("actions", []),
            scene_type=scene.get("type", "narrative"),
            combat_info=scene.get("combat_info"),
        )

    def _handle_resume(self, data: dict) -> ActionResult:
        """Handle game resume - load current scene without full narrative."""
        scene = self.get_current_scene()

        if not scene:
            return ActionResult(
                success=True,
                message="遊戲恢復",
                narrative=["繼續你的冒險..."],
                state_changes={},
                available_actions=[],
            )

        # 恢復時顯示當前場景的簡短描述
        resume_narrative = scene.get("resume_narrative", scene.get("narrative", []))

        return ActionResult(
            success=True,
            message="遊戲恢復",
            narrative=resume_narrative,
            state_changes={},
            available_actions=scene.get("actions", []),
            scene_type=scene.get("type", "narrative"),
            combat_info=scene.get("combat_info"),
        )

    def _handle_choice(self, data: dict) -> ActionResult:
        """Handle player choice selection."""
        choice_id = data.get("choice_id", "")
        scene = self.get_current_scene()
        choices = scene.get("choices", {})

        if choice_id not in choices:
            return ActionResult(
                success=False,
                message="無效的選擇",
                narrative=["請選擇有效的選項。"],
                state_changes={},
                available_actions=self._get_available_actions(),
            )

        choice = choices[choice_id]

        # Check if choice requires a skill check
        if "skill_check" in choice:
            return self._perform_skill_check(choice)

        # Process choice result
        return self._process_choice_result(choice)

    def _handle_skill_check(self, data: dict) -> ActionResult:
        """Handle a skill check action."""
        attribute = data.get("attribute", "perception")
        difficulty = data.get("difficulty", "normal")

        # Get player attribute value
        player = self.state.get("player", {})
        stats = player.get("stats", {})
        attr_value = stats.get(attribute, 2)

        # Map difficulty string to enum
        diff_map = {
            "easy": DifficultyModifier.EASY,
            "normal": DifficultyModifier.NORMAL,
            "hard": DifficultyModifier.HARD,
            "extreme": DifficultyModifier.VERY_HARD,
        }
        diff_mod = diff_map.get(difficulty, DifficultyModifier.NORMAL)

        # Perform check
        result, roll, target = check(attr_value, diff_mod)

        dice_result = {
            "roll": roll,
            "target": target,
            "result": result.value,
            "attribute": attribute,
            "attribute_value": attr_value,
        }

        # Determine narrative based on result
        if result in (DiceResult.CRITICAL_SUCCESS, DiceResult.SUCCESS):
            narrative = data.get("success_text", ["檢定成功！"])
            success = True
            # 優先使用 success_state_changes，否則使用通用 state_changes
            raw_changes = data.get("success_state_changes") or data.get("state_changes") or {}
            state_changes = dict(raw_changes)
            next_scene = data.get("next_scene")
            if next_scene:
                self.state["scene"] = next_scene
                state_changes["scene"] = next_scene
                self._load_chapter_data()
                # 檢查新場景的 on_enter_state_changes（如獲得物品）
                new_scene = self.get_current_scene()
                on_enter = new_scene.get("on_enter_state_changes", {})
                if on_enter:
                    state_changes.update(on_enter)
        else:
            narrative = data.get("failure_text", ["檢定失敗。"])
            success = False
            # 失敗時使用 failure_state_changes
            raw_changes = data.get("failure_state_changes") or {}
            state_changes = dict(raw_changes)

        # 取得下一步行動
        next_actions = data.get("next_actions")
        if next_actions:
            available_actions = next_actions
        else:
            available_actions = self._get_available_actions()

        return ActionResult(
            success=success,
            message=f"{'成功' if success else '失敗'}（{roll}/{target}）",
            narrative=narrative if isinstance(narrative, list) else [narrative],
            state_changes=state_changes,
            available_actions=available_actions,
            dice_result=dice_result,
        )

    def _handle_attack(self, data: dict) -> ActionResult:
        """Handle combat attack action."""
        # Initialize combat if not already
        if not self._combat_state:
            scene = self.get_current_scene()
            combat_info = scene.get("combat_info", {})
            enemy_id = data.get("enemy_id", combat_info.get("enemy_id", "shadow_bug"))
            self._combat_state = combat_system.init_combat(enemy_id, self.state)

        if not self._combat_state:
            return ActionResult(
                success=False,
                message="無法開始戰鬥",
                narrative=["找不到敵人資料。"],
                state_changes={},
                available_actions=self._get_available_actions(),
            )

        # Determine attack type
        attack_type_str = data.get("attack_type", "melee")
        attack_type_map = {
            "melee": AttackType.MELEE,
            "ranged": AttackType.RANGED,
            "magic": AttackType.MAGIC,
        }
        attack_type = attack_type_map.get(attack_type_str, AttackType.MELEE)

        # Check if using light-based item/attack
        is_light_attack = data.get("is_light", False)

        # Get weapon damage (default 5)
        weapon_damage = data.get("weapon_damage", 5)

        # Execute player attack
        attack_result = combat_system.player_attack(
            self._combat_state,
            self.state,
            attack_type,
            weapon_damage,
            is_light_attack
        )

        narrative = attack_result.narrative.copy()
        state_changes: dict[str, Any] = {}

        # Update combat info
        combat_info = {
            "enemy_name": self._combat_state.enemy_name,
            "enemy_hp": self._combat_state.enemy_hp,
            "enemy_max_hp": self._combat_state.enemy_max_hp,
            "enemy_evasion": self._combat_state.enemy_evasion,
            "enemy_attack": "",
            "enemy_weakness": "",
        }

        if attack_result.enemy_defeated:
            # Victory!
            rewards = combat_system.get_victory_rewards(self._combat_state.enemy_id)
            narrative.append("")
            narrative.append("【戰鬥勝利！】")

            # Add drops to narrative
            if rewards["items"]:
                for item in rewards["items"]:
                    narrative.append(f"獲得：{item['name']} x{item['quantity']}")
            if rewards["gold"] > 0:
                narrative.append(f"獲得：{rewards['gold']} 金幣")

            # State changes for rewards
            state_changes["combat_victory"] = True
            state_changes["drops"] = rewards["items"]
            state_changes["gold_gained"] = rewards["gold"]
            state_changes["combat"] = None  # Clear combat state

            # Move to post-combat scene
            scene = self.get_current_scene()
            post_combat_scene = scene.get("post_combat_scene", "post_combat")

            self._combat_state = None  # Clear combat

            return ActionResult(
                success=True,
                message="戰鬥勝利",
                narrative=narrative,
                state_changes=state_changes,
                available_actions=[{
                    "id": "continue_after_combat",
                    "type": "continue",
                    "label": "繼續",
                    "data": {"next_scene": post_combat_scene}
                }],
                scene_type="narrative",
                combat_info=None,
            )

        # Enemy counter-attack
        narrative.append("")
        narrative.append(f"【{self._combat_state.enemy_name}的回合】")

        enemy_attack = combat_system.enemy_attack(self._combat_state, self.state)
        narrative.extend(enemy_attack.narrative)

        # Update player HP in state
        player = self.state.get("player", {})
        player["hp"] = enemy_attack.player_hp
        state_changes["player_hp"] = enemy_attack.player_hp

        # Check if player is defeated
        if enemy_attack.player_hp <= 0:
            narrative.append("")
            narrative.append("你倒下了...")
            narrative.append("【遊戲結束】")

            return ActionResult(
                success=False,
                message="戰鬥失敗",
                narrative=narrative,
                state_changes=state_changes,
                available_actions=[],  # Game over, no actions
                scene_type="combat",
                combat_info=combat_info,
            )

        # Increment turn
        self._combat_state.turn += 1

        # Save combat state for persistence
        state_changes["combat"] = {
            "enemy_id": self._combat_state.enemy_id,
            "enemy_name": self._combat_state.enemy_name,
            "enemy_hp": self._combat_state.enemy_hp,
            "enemy_max_hp": self._combat_state.enemy_max_hp,
            "enemy_evasion": self._combat_state.enemy_evasion,
            "enemy_armor": self._combat_state.enemy_armor,
            "turn": self._combat_state.turn,
            "is_active": True,
            "player_hp": self._combat_state.player_hp,
            "player_max_hp": self._combat_state.player_max_hp,
        }

        # Continue combat - return available combat actions
        combat_actions = self._get_combat_actions()

        return ActionResult(
            success=True,
            message=f"第 {self._combat_state.turn} 回合",
            narrative=narrative,
            state_changes=state_changes,
            available_actions=combat_actions,
            scene_type="combat",
            combat_info=combat_info,
            dice_result={
                "roll": attack_result.dice_roll,
                "target": attack_result.target_number,
                "result": "success" if attack_result.success else "failure",
            },
        )

    def _get_combat_actions(self) -> list[dict[str, Any]]:
        """Get available combat actions."""
        actions = [
            {
                "id": "attack_melee",
                "type": "attack",
                "label": "近戰攻擊（力量）",
                "data": {"attack_type": "melee"}
            },
        ]

        # Check if player has ranged weapon
        player = self.state.get("player", {})
        equipment = player.get("equipment", {})

        # Add magic attack if player has enough MP
        mp = player.get("mp", 0)
        if mp >= 3:
            actions.append({
                "id": "attack_magic",
                "type": "attack",
                "label": "魔法攻擊（智力，消耗 3 MP）",
                "data": {"attack_type": "magic", "mp_cost": 3}
            })

        # Add use item option
        inventory = player.get("inventory", [])
        usable_items = [i for i in inventory if i.get("type") in ("consumable", "potion")]
        if usable_items:
            actions.append({
                "id": "use_item_combat",
                "type": "use_item",
                "label": "使用物品",
                "data": {}
            })

        return actions

    def _handle_use_item(self, data: dict) -> ActionResult:
        """Handle item usage."""
        item_id = data.get("item_id", "")

        # If no item specified, return list of usable items
        if not item_id:
            return self._show_usable_items()

        player = self.state.get("player", {})
        inventory = player.get("inventory", [])

        # Check if player has the item
        if not inventory_system.has_item(inventory, item_id):
            return ActionResult(
                success=False,
                message="物品不存在",
                narrative=["你沒有這個物品。"],
                state_changes={},
                available_actions=self._get_available_actions(),
            )

        # Check if in combat
        in_combat = self._combat_state is not None

        # Use the item
        result = inventory_system.use_item(item_id, player, in_combat)

        if not result.success:
            return ActionResult(
                success=False,
                message=result.message,
                narrative=result.narrative,
                state_changes={},
                available_actions=self._get_available_actions(),
            )

        state_changes: dict[str, Any] = {}

        # Apply HP change
        if result.hp_change != 0:
            new_hp = min(player.get("max_hp", 20), player.get("hp", 0) + result.hp_change)
            player["hp"] = new_hp
            state_changes["player_hp"] = new_hp

        # Apply MP change
        if result.mp_change != 0:
            new_mp = min(player.get("max_mp", 10), player.get("mp", 0) + result.mp_change)
            player["mp"] = new_mp
            state_changes["player_mp"] = new_mp

        # Remove consumed item
        if result.item_consumed:
            inventory, _ = inventory_system.remove_item_from_inventory(inventory, item_id, 1)
            player["inventory"] = inventory
            state_changes["inventory_changed"] = True

        # Update combat state if in combat
        if in_combat and self._combat_state:
            self._combat_state.player_hp = player.get("hp", self._combat_state.player_hp)
            # Save combat state
            state_changes["combat"] = {
                "enemy_id": self._combat_state.enemy_id,
                "enemy_name": self._combat_state.enemy_name,
                "enemy_hp": self._combat_state.enemy_hp,
                "enemy_max_hp": self._combat_state.enemy_max_hp,
                "enemy_evasion": self._combat_state.enemy_evasion,
                "enemy_armor": self._combat_state.enemy_armor,
                "turn": self._combat_state.turn,
                "is_active": True,
                "player_hp": self._combat_state.player_hp,
                "player_max_hp": self._combat_state.player_max_hp,
            }

        # Get appropriate next actions
        if in_combat:
            available_actions = self._get_combat_actions()
            scene_type = "combat"
            combat_info = {
                "enemy_name": self._combat_state.enemy_name,
                "enemy_hp": self._combat_state.enemy_hp,
                "enemy_max_hp": self._combat_state.enemy_max_hp,
                "enemy_evasion": self._combat_state.enemy_evasion,
                "enemy_attack": "",
                "enemy_weakness": "",
            } if self._combat_state else None
        else:
            available_actions = self._get_available_actions()
            scene_type = None
            combat_info = None

        return ActionResult(
            success=True,
            message=result.message,
            narrative=result.narrative,
            state_changes=state_changes,
            available_actions=available_actions,
            scene_type=scene_type,
            combat_info=combat_info,
        )

    def _show_usable_items(self) -> ActionResult:
        """Show list of usable items as actions."""
        player = self.state.get("player", {})
        inventory = player.get("inventory", [])
        in_combat = self._combat_state is not None

        usable = inventory_system.get_usable_items(inventory, in_combat)

        if not usable:
            narrative = ["你沒有可以使用的物品。"]
            if in_combat:
                return ActionResult(
                    success=False,
                    message="沒有可用物品",
                    narrative=narrative,
                    state_changes={},
                    available_actions=self._get_combat_actions(),
                    scene_type="combat",
                    combat_info={
                        "enemy_name": self._combat_state.enemy_name,
                        "enemy_hp": self._combat_state.enemy_hp,
                        "enemy_max_hp": self._combat_state.enemy_max_hp,
                        "enemy_evasion": self._combat_state.enemy_evasion,
                        "enemy_attack": "",
                        "enemy_weakness": "",
                    } if self._combat_state else None,
                )
            return ActionResult(
                success=False,
                message="沒有可用物品",
                narrative=narrative,
                state_changes={},
                available_actions=self._get_available_actions(),
            )

        # Build item selection actions
        actions = []
        for item in usable:
            actions.append({
                "id": f"use_{item['id']}",
                "type": "use_item",
                "label": f"{item['name']} x{item['quantity']}",
                "data": {"item_id": item["id"]}
            })

        # Add back/cancel option
        if in_combat:
            actions.append({
                "id": "cancel_item",
                "type": "cancel",
                "label": "返回",
                "data": {}
            })

        return ActionResult(
            success=True,
            message="選擇物品",
            narrative=["選擇要使用的物品："],
            state_changes={},
            available_actions=actions,
            scene_type="combat" if in_combat else None,
            combat_info={
                "enemy_name": self._combat_state.enemy_name,
                "enemy_hp": self._combat_state.enemy_hp,
                "enemy_max_hp": self._combat_state.enemy_max_hp,
                "enemy_evasion": self._combat_state.enemy_evasion,
                "enemy_attack": "",
                "enemy_weakness": "",
            } if self._combat_state else None,
        )

    def _handle_continue(self, data: dict) -> ActionResult:
        """Handle continue/next action."""
        next_scene = data.get("next_scene", "")
        state_changes: dict[str, Any] = {}

        if next_scene:
            self.state["scene"] = next_scene
            state_changes["scene"] = next_scene
            self._load_chapter_data()

        scene = self.get_current_scene()

        # 檢查場景是否有進入時的狀態變化（如獲得物品）
        on_enter = scene.get("on_enter_state_changes", {})
        if on_enter:
            state_changes.update(on_enter)

        return ActionResult(
            success=True,
            message="繼續",
            narrative=scene.get("narrative", ["..."]),
            state_changes=state_changes,
            available_actions=scene.get("actions", self._get_available_actions()),
            scene_type=scene.get("type", "narrative"),
            combat_info=scene.get("combat_info"),
        )

    def _handle_cancel(self, data: dict) -> ActionResult:
        """Handle cancel action (return to previous menu)."""
        in_combat = self._combat_state is not None

        if in_combat:
            return ActionResult(
                success=True,
                message="取消",
                narrative=[],
                state_changes={},
                available_actions=self._get_combat_actions(),
                scene_type="combat",
                combat_info={
                    "enemy_name": self._combat_state.enemy_name,
                    "enemy_hp": self._combat_state.enemy_hp,
                    "enemy_max_hp": self._combat_state.enemy_max_hp,
                    "enemy_evasion": self._combat_state.enemy_evasion,
                    "enemy_attack": "",
                    "enemy_weakness": "",
                } if self._combat_state else None,
            )

        return ActionResult(
            success=True,
            message="取消",
            narrative=[],
            state_changes={},
            available_actions=self._get_available_actions(),
        )

    def _handle_unknown(self, data: dict) -> ActionResult:
        """Handle unknown action type."""
        return ActionResult(
            success=False,
            message="未知的行動",
            narrative=["無法執行此行動。"],
            state_changes={},
            available_actions=self._get_available_actions(),
        )

    def _perform_skill_check(self, choice: dict) -> ActionResult:
        """Perform a skill check for a choice."""
        check_data = choice["skill_check"]
        return self._handle_skill_check({
            **check_data,
            "success_text": choice.get("success_text", []),
            "failure_text": choice.get("failure_text", []),
            "state_changes": choice.get("state_changes", {}),
            "success_state_changes": choice.get("success_state_changes"),
            "failure_state_changes": choice.get("failure_state_changes"),
            "next_scene": choice.get("next_scene"),
            "next_actions": choice.get("next_actions"),
        })

    def _process_choice_result(self, choice: dict) -> ActionResult:
        """Process a direct choice result."""
        next_scene = choice.get("next_scene")
        state_changes = dict(choice.get("state_changes", {}))

        if next_scene:
            self.state["scene"] = next_scene
            state_changes["scene"] = next_scene
            self._load_chapter_data()
            # 檢查新場景的 on_enter_state_changes（如獲得物品）
            scene = self.get_current_scene()
            on_enter = scene.get("on_enter_state_changes", {})
            if on_enter:
                state_changes.update(on_enter)
        else:
            scene = self.get_current_scene()

        return ActionResult(
            success=True,
            message="選擇完成",
            narrative=choice.get("narrative", []),
            state_changes=state_changes,
            available_actions=choice.get("next_actions", self._get_available_actions()),
            scene_type=scene.get("type", "narrative") if next_scene else None,
            combat_info=scene.get("combat_info") if next_scene else None,
        )

    def _get_available_actions(self) -> list[dict[str, Any]]:
        """Get available actions for current scene."""
        scene = self.get_current_scene()
        return scene.get("actions", [])

    def _get_opening_narrative(self) -> list[str]:
        """Get the opening narrative for a new game."""
        return [
            "黑暗。",
            "",
            "你聽見師父的聲音，彷彿從很遠的地方傳來。",
            "",
            "「記住，孩子...光與暗從不對立...」",
            "",
            "聲音漸漸模糊。",
            "",
            "「三稜聖杯...碎片...你必須...」",
            "",
            "你猛然醒來。",
            "",
            "冷汗浸濕了後背。窗外，殘月如鉤。",
            "桌上，師父的最後一封信靜靜躺著。",
            "信封上只有一行字：「廢棄燈塔，答案在那裡。」",
        ]
