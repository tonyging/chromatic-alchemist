interface Action {
  id: string;
  type: string;
  label: string;
  data?: Record<string, unknown>;
}

interface ActionButtonListProps {
  actions: Action[];
  onAction: (action: Action) => void;
  isLoading: boolean;
  /** 是否在戰鬥中 */
  inCombat: boolean;
  /** 是否為緊湊模式（手機版用較大的間距） */
  compact?: boolean;
}

/**
 * 動作按鈕列表元件
 * 顯示可用的動作選項
 */
export default function ActionButtonList({ actions, onAction, isLoading, inCombat, compact = false }: ActionButtonListProps) {
  if (actions.length === 0) return null;

  if (compact) {
    // 手機版：垂直排列，較大間距
    return (
      <div className="bg-gray-800 border-t border-gray-700 p-2">
        <div className="flex flex-col gap-1.5">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => onAction(action)}
              disabled={isLoading}
              className={`w-full py-2.5 px-3 rounded-lg transition-all text-sm
                ${inCombat
                  ? 'bg-red-900/50 border border-red-700 active:bg-red-800/60'
                  : 'bg-gray-700 border border-gray-600 active:bg-gray-600'}
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
                disabled:opacity-50`}
              aria-label={`選項 ${index + 1}: ${action.label}`}
            >
              <span className="text-gray-100">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 桌面版：顯示數字快捷鍵
  return (
    <div className="p-3 border-t border-gray-700 bg-gray-800/80">
      <div className="space-y-1.5">
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            disabled={isLoading}
            className={`w-full py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-between
              ${inCombat
                ? 'bg-red-900/50 hover:bg-red-800/60 border border-red-700 hover:border-red-500'
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-amber-500'}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
              disabled:opacity-50`}
            aria-label={`選項 ${index + 1}: ${action.label}`}
          >
            <span className="text-gray-100">{action.label}</span>
            {index < 9 && (
              <span className="text-gray-500 text-[10px] ml-2 shrink-0">[{index + 1}]</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
