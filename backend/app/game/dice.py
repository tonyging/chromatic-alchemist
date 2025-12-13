import random
from typing import Tuple
from enum import Enum


class DifficultyModifier(Enum):
    EASY = 20
    NORMAL = 0
    HARD = -20
    VERY_HARD = -40


class DiceResult(Enum):
    CRITICAL_SUCCESS = "critical_success"
    SUCCESS = "success"
    FAILURE = "failure"
    CRITICAL_FAILURE = "critical_failure"


def roll_d100() -> int:
    """Roll a d100 (1-100)"""
    return random.randint(1, 100)


def roll_d6() -> int:
    """Roll a d6 (1-6)"""
    return random.randint(1, 6)


def calculate_success_rate(attribute: int, difficulty: DifficultyModifier) -> int:
    """
    Calculate success rate based on attribute and difficulty.
    Formula: attribute × 20% + difficulty modifier
    """
    base_rate = attribute * 20
    modified_rate = base_rate + difficulty.value
    # Clamp between 5 and 95 (always 5% chance of success/failure)
    return max(5, min(95, modified_rate))


def check(attribute: int, difficulty: DifficultyModifier = DifficultyModifier.NORMAL) -> Tuple[DiceResult, int, int]:
    """
    Perform a skill check.

    Returns:
        Tuple of (result, roll, success_rate)
    """
    success_rate = calculate_success_rate(attribute, difficulty)
    roll = roll_d100()

    # Critical results
    if roll <= 5:
        return DiceResult.CRITICAL_SUCCESS, roll, success_rate
    elif roll >= 96:
        return DiceResult.CRITICAL_FAILURE, roll, success_rate

    # Normal results
    if roll <= success_rate:
        return DiceResult.SUCCESS, roll, success_rate
    else:
        return DiceResult.FAILURE, roll, success_rate


def roll_damage(base_damage: int, attribute_bonus: int) -> int:
    """
    Calculate damage with attribute bonus.
    Attribute bonus = attribute // 2
    """
    return base_damage + attribute_bonus


def get_attribute_bonus(attribute: int) -> int:
    """Get damage bonus from attribute (attribute // 2)"""
    return attribute // 2
