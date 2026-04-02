import React from 'react';
import { CheckCircle, Circle, X } from 'lucide-react';

const SubtaskConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  subtaskName, 
  isCompleted 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {isCompleted ? 'Mark as Incomplete?' : 'Mark as Complete?'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <Circle className="w-6 h-6 text-gray-400" />
          )}
          <p className="text-gray-700 font-medium">{subtaskName}</p>
        </div>

        <p className="text-gray-600 mb-6">
          {isCompleted 
            ? 'Are you sure you want to mark this subtask as incomplete? This will undo the completion.'
            : 'Are you sure you want to mark this subtask as complete?'
          }
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isCompleted
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubtaskConfirmModal;
