import { X } from 'lucide-react';
import { useState } from 'react';
import { ALL_FEATURES, Feature } from '../types/features';

interface FeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  enabledFeatures: string[];
  onUpdateFeatures: (conversationId: string, features: string[]) => void;
}

export default function FeaturesModal({
  isOpen,
  onClose,
  conversationId,
  enabledFeatures,
  onUpdateFeatures,
}: FeaturesModalProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(enabledFeatures);

  if (!isOpen) return null;

  const toggleFeature = (featureId: string) => {
    if (selectedFeatures.includes(featureId)) {
      setSelectedFeatures(selectedFeatures.filter(id => id !== featureId));
    } else {
      setSelectedFeatures([...selectedFeatures, featureId]);
    }
  };

  const handleSave = () => {
    onUpdateFeatures(conversationId, selectedFeatures);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">全部功能</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-4">
            {ALL_FEATURES.map((feature) => (
              <button
                key={feature.id}
                onClick={() => toggleFeature(feature.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                  selectedFeatures.includes(feature.id)
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs text-center leading-tight ${
                  selectedFeatures.includes(feature.id)
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-700'
                }`}>
                  {feature.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
