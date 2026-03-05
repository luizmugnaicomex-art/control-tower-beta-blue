
import React from 'react';

interface KpiCardProps {
    icon: string;
    title: string;
    value: string;
    unit?: string;
    color?: string;      // e.g. "text-red-600", "text-green-600"
    highlight?: boolean;
    onClick?: () => void;
    isActive?: boolean;
    calculationLogic?: string; // New prop for calculation explanation
}

const KpiCard: React.FC<KpiCardProps> = ({
    icon,
    title,
    value,
    unit,
    color = 'text-red-600',       // BYD primary accent
    highlight = false,
    onClick,
    isActive = false,
    calculationLogic,
}) => {
    // Decide border/ring based on state
    const borderClasses = (() => {
        if (isActive) {
            // Strong focus state (clicked KPI / drill-down active)
            return 'border-red-600 ring-2 ring-red-200';
        }
        if (highlight) {
            // Important KPI but not currently active
            if (color.includes('red')) return 'border-red-500';
            if (color.includes('amber') || color.includes('yellow')) return 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]';
            return 'border-gray-300';
        }
        return 'border-gray-100';
    })();

    // Value color: use KPI color only when highlight/active, otherwise neutral
    const valueColor = highlight || isActive ? color : 'text-gray-900';

    // Icon color: subtle when neutral, accent when highlight/active
    const iconColor =
        highlight || isActive ? color : 'text-gray-400';

    // Hover/interactive behaviour
    const interactiveClasses = onClick
        ? 'cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5 hover:border-red-400'
        : '';

    return (
        <div
            onClick={onClick}
            className={`
                bg-white p-4 rounded-xl shadow-sm
                flex flex-col justify-between
                border-2 ${borderClasses} ${interactiveClasses}
                relative group/card
            `}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center w-full">
                    <span className={`material-icons mr-2 text-base ${iconColor}`}>
                        {icon}
                    </span>
                    <h3 className="text-xs font-semibold tracking-wide text-gray-600 uppercase flex-1">
                        {title}
                    </h3>
                    
                    {/* Info Icon & Tooltip */}
                    {calculationLogic && (
                        <div className="relative group/tooltip ml-2" onClick={(e) => e.stopPropagation()}>
                            <span className="material-icons text-gray-300 text-sm hover:text-gray-500 cursor-help">
                                info
                            </span>
                            <div className="pointer-events-none absolute right-0 bottom-full mb-2 w-56 p-3 bg-gray-800 text-white text-[11px] rounded shadow-lg opacity-0 transition-opacity group-hover/tooltip:opacity-100 z-50 font-normal leading-relaxed">
                                <span className="font-bold block mb-1 text-gray-300 border-b border-gray-600 pb-1">Logic:</span>
                                {calculationLogic}
                                {/* Arrow */}
                                <div className="absolute top-full right-1 -mt-1 mr-1 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 flex items-baseline">
                <p className={`text-3xl font-bold leading-tight ${valueColor}`}>
                    {value}
                    {unit && (
                        <span className="ml-1 text-lg font-medium text-gray-600">
                            {unit}
                        </span>
                    )}
                </p>
            </div>

            {(highlight || isActive) && (
                <p className="mt-2 text-[11px] text-gray-500">
                    {isActive
                        ? 'Filter applied to table.'
                        : 'Key performance indicator for current view.'}
                </p>
            )}
        </div>
    );
};

export default KpiCard;
