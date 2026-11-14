import { ListOrdered } from 'lucide-react';

/**
 * QFlow Logo
 * variant: "full" (icon + name + tagline) | "compact" (icon + name) | "icon" (icon only)
 * size:    "sm" | "md" | "lg"
 */
const sizes = {
  sm: { box: 32, icon: 18, name: 'text-lg',  tag: 'text-[8px]'  },
  md: { box: 44, icon: 24, name: 'text-2xl', tag: 'text-[10px]' },
  lg: { box: 56, icon: 30, name: 'text-3xl', tag: 'text-xs'     },
};

export default function Logo({ variant = 'full', size = 'md' }) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Icon box */}
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: s.box, height: s.box, backgroundColor: '#2d6a4f' }}
      >
        <ListOrdered size={s.icon} color="#ffffff" strokeWidth={2.2} />
      </div>

      {/* Text — hidden in icon-only mode */}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <span
            className={`${s.name} font-bold tracking-tight`}
            style={{ color: '#1b4332' }}
          >
            QFlow
          </span>
          {variant === 'full' && (
            <span
              className={`${s.tag} font-semibold tracking-widest uppercase mt-0.5`}
              style={{ color: '#40916c' }}
            >
              Smart Queue Management
            </span>
          )}
        </div>
      )}
    </div>
  );
}
