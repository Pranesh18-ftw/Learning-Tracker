import React from 'react';
import { X, CheckCircle2, Circle, BookOpen, FolderOpen, FileText, List } from 'lucide-react';

const TaskDetails = ({ task, subjectName, phaseName, onClose }) => {
  if (!task) return null;

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-800 pr-4">Task Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Subject */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Subject</p>
            <p className="text-gray-800 font-medium">{subjectName}</p>
          </div>
        </div>

        {/* Phase */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FolderOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Phase</p>
            <p className="text-gray-800 font-medium">{phaseName}</p>
          </div>
        </div>

        {/* Task */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${task.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-600" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Task</p>
            <p className={`text-gray-800 font-medium ${task.completed ? 'line-through opacity-60' : ''}`}>
              {task.name}
            </p>
          </div>
        </div>

        {/* Subtasks */}
        {hasSubtasks && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <List className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Subtasks</p>
                <p className="text-sm text-gray-600">{task.subtasks.length} items</p>
              </div>
            </div>
            
            <ul className="space-y-3 ml-2">
              {task.subtasks.map((subtask, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0"></span>
                  <span className="text-gray-700 text-sm">{subtask}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description if available */}
        {task.description && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Description</p>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed ml-2">
              {task.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetails;
