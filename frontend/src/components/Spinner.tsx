interface SpinnerProps {
  /** 大小：sm=16px, md=24px, lg=32px */
  size?: 'sm' | 'md' | 'lg';
  /** 顏色 class (預設 text-amber-400) */
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

/**
 * 簡潔的旋轉載入指示器
 */
export default function Spinner({ size = 'md', className = 'text-amber-400' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeMap[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="載入中"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
