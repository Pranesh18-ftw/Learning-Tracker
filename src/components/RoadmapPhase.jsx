import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { CheckCircle2, Circle, Clock, Lock, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

const TaskItem = ({ task, onTaskClick, onSubtaskClick, isSelected, subjectId, phaseId }) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;

  const { toggleSubtask } = useRoadmap()

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isSelected ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-100'}`}>
      {/* Main Task Row */}
      <button
        onClick={() => onTaskClick(task)}
        className="w-full flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors text-left"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
        )}
        <span className={`text-sm flex-1 ${task.completed ? 'text-gray-800 line-through opacity-60' : 'text-gray-700'}`}>
          {task.name}
        </span>
        {hasSubtasks && (
          <span className="text-xs text-gray-500 mr-2">
            {completedSubtasks}/{task.subtasks.length}
          </span>
        )}
        {hasSubtasks && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90 text-primary-500' : ''}`} />
      </button>
      
      {/* Subtasks List */}
      {expanded && hasSubtasks && (
        <div className="px-3 pb-3 bg-gray-50">
          <ul className="ml-8 space-y-1">
            {task.subtasks.map(subtask => (
              <div
                key={subtask.id}
                onClick={() =>
                  toggleSubtask(subjectId, phaseId, task.id, subtask.id)
                }
                style={{
                  cursor: "pointer",
                  textDecoration: subtask.completed ? "line-through" : "none",
                  color: subtask.completed ? "green" : "black"
                }}
              >
                {subtask.name}
              </div>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const RoadmapPhase = ({ phase, subjectId, phaseId, isExpanded, onToggle, onTaskToggle, onSubtaskToggle, selectedTaskId }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'locked':
        return 'text-gray-500';
      default:
        return 'text-gray-600';
    }
  };

  const completedTasks = phase.tasks?.filter(task => task.completed).length || 0;
  const totalTasks = phase.tasks?.length || 0;

  return (
    <div className="border rounded-lg overflow-hidden transition-all">
      {/* Phase Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {getStatusIcon(phase.status)}
          <div>
            <h3 className="font-semibold text-gray-800">{phase.name}</h3>
            {phase.description && (
              <p className="text-sm text-gray-500 mt-1">{phase.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {completedTasks}/{totalTasks} tasks
          </span>
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </button>

      {/* Tasks List */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 space-y-3">
          {phase.tasks?.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onTaskClick={onTaskToggle}
              onSubtaskClick={onSubtaskToggle}
              isSelected={selectedTaskId === task.id}
              subjectId={subjectId}
              phaseId={phaseId}
            />
          ))}
          {(!phase.tasks || phase.tasks.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500">No tasks in this phase yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Tasks will appear here when you add them to this phase.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoadmapPhase;
