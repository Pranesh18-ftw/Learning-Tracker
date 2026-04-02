import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { ChevronDown, BookOpen } from 'lucide-react';

const SubjectSelector = () => {
  const { subjects, selectedSubjectId, selectedSubject, setSelectedSubjectId } = useRoadmap();

  if (subjects.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary-600" />
        <select
          value={selectedSubjectId || ''}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer min-w-[200px]"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" />
      </div>
      {selectedSubject?.description && (
        <p className="text-sm text-gray-500 mt-1 ml-7">{selectedSubject.description}</p>
      )}
    </div>
  );
};

export default SubjectSelector;
