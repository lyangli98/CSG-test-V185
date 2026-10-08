import { GripVertical } from 'lucide-react';

export default function DragHandle({ size = 16 }: { size?: number }) {
  return (
    <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition flex items-center justify-center flex-shrink-0">
      <GripVertical size={size} />
    </div>
  );
}
