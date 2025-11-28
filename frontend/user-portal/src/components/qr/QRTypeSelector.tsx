import {
  Link,
  Phone,
  MessageSquare,
  Mail,
  Wifi,
  User,
  Calendar,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRContentType, QR_TYPES } from './qr-types';

const IconMap = {
  Link,
  Phone,
  MessageSquare,
  Mail,
  Wifi,
  User,
  Calendar,
  MapPin,
};

interface QRTypeSelectorProps {
  value: QRContentType;
  onChange: (type: QRContentType) => void;
}

export default function QRTypeSelector({ value, onChange }: QRTypeSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {QR_TYPES.map((item) => {
        const Icon = IconMap[item.icon as keyof typeof IconMap];
        const isActive = value === item.type;

        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onChange(item.type)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-all',
              isActive
                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-gray-500')} />
            <span className="font-medium">{item.label}</span>
            <span className={cn('text-[10px]', isActive ? 'text-primary/70' : 'text-gray-400')}>
              {item.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
