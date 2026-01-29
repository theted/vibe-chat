import type { StatusCardProps } from '../types';

/**
 * StatusCard Component - Displays a compact status summary with icon and label
 */
const StatusCard = ({
  icon,
  iconBackgroundClass = 'bg-gray-100',
  iconTextClass = 'text-gray-600',
  title,
  subtitle,
  statusText,
  statusIndicatorClass = 'bg-green-500',
  statusTextClass = 'text-green-600',
}: StatusCardProps) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBackgroundClass}`}>
        <span className={`text-lg ${iconTextClass}`}>{icon}</span>
      </div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${statusIndicatorClass}`}></div>
      <span className={`text-sm font-medium ${statusTextClass}`}>{statusText}</span>
    </div>
  </div>
);

export default StatusCard;
