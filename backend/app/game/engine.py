"""Core game engine for processing player actions and managing game state."""
import json
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass

from app.game.dice import check, DifficultyModifier, DiceResult


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
        self._load_chapter_data()

    def _load_chapter_data(self) -> None:
        """Load chapter data from JSON files."""
        chapter = self.state.get("chapter", "prologue")
        chapter_file = DATA_PATH / "chapters" / f"{chapter}.json"

        if chapter_file.exists():
            with open(chapter_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._scenes = data.get("scenes", {})

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
            state_changes = dict(data.get("state_changes", {}))
            next_scene = data.get("next_scene")
            if next_scene:
                self.state["scene"] = next_scene
                state_changes["scene"] = next_scene
                self._load_chapter_data()
        else:
            narrative = data.get("failure_text", ["檢定失敗。"])
            success = False
            state_changes = {}

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
        # Placeholder for combat system
        return ActionResult(
            success=True,
            message="戰鬥系統開發中",
            narrative=["戰鬥功能正在開發中..."],
            state_changes={},
            available_actions=self._get_available_actions(),
        )

    def _handle_use_item(self, data: dict) -> ActionResult:
        """Handle item usage."""
        item_id = data.get("item_id", "")
        # Placeholder for inventory system
        return ActionResult(
            success=True,
            message=f"使用物品: {item_id}",
            narrative=[f"你使用了 {item_id}。"],
            state_changes={},
            available_actions=self._get_available_actions(),
        )

    def _handle_continue(self, data: dict) -> ActionResult:
        """Handle continue/next action."""
        next_scene = data.get("next_scene", "")

        if next_scene:
            self.state["scene"] = next_scene
            self._load_chapter_data()

        scene = self.get_current_scene()

        return ActionResult(
            success=True,
            message="繼續",
            narrative=scene.get("narrative", ["..."]),
            state_changes={"scene": next_scene} if next_scene else {},
            available_actions=scene.get("actions", self._get_available_actions()),
            scene_type=scene.get("type", "narrative"),
            combat_info=scene.get("combat_info"),
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
