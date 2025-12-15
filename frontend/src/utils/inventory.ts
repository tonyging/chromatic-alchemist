/**
 * 物品欄工具函數
 */

import type { InventoryItem } from '../types';

/**
 * 物品分組結果
 */
export interface InventoryGroups {
  potion: InventoryItem[];
  equipment: InventoryItem[];
  material: InventoryItem[];
  other: InventoryItem[];
}

/**
 * 將物品按類型分組（用於物品欄顯示）
 * @param inventory - 物品列表
 * @returns 分組後的物品
 */
export function groupInventoryByType(inventory: InventoryItem[]): InventoryGroups {
  const groups: InventoryGroups = {
    potion: [],
    equipment: [],
    material: [],
    other: [],
  };

  inventory.forEach((item) => {
    if (item.type === 'consumable' || item.type === 'potion') {
      groups.potion.push(item);
    } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
      groups.equipment.push(item);
    } else if (item.type === 'material') {
      groups.material.push(item);
    } else {
      groups.other.push(item);
    }
  });

  return groups;
}
