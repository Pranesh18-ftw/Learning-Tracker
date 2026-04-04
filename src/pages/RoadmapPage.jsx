import React, { useState } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import { Upload } from 'lucide-react';
import TaskTree from '../components/TaskTree';

const RoadmapPage = () => {
  const { importRoadmap, updateSubjectDeadline, showTutorial, hasImportedRoadmap } = useRoadmap();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [deadlineModal, setDeadlineModal] = useState({ show: false, subjectId: null, deadline: '' });
  const [importError, setImportError] = useState('');

  const sampleRoadmapData = {
    subjects: [
      {
        name: "Web Development",
        phases: [
          {
            name: "HTML & CSS Fundamentals",
            tasks: [
              {
                name: "Learn HTML Basics",
                subtasks: [
                  { name: "Understand HTML structure" },
                  { name: "Learn common HTML tags" },
                  { name: "Create first HTML page" }
                ]
              },
              {
                name: "Master CSS Styling",
                subtasks: [
                  { name: "CSS selectors and properties" },
                  { name: "Flexbox and Grid layouts" },
                  { name: "Responsive design principles" }
                ]
              }
            ]
          },
          {
            name: "JavaScript Programming",
            tasks: [
              {
                name: "JavaScript Fundamentals",
                subtasks: [
                  { name: "Variables and data types" },
                  { name: "Functions and scope" },
                  { name: "DOM manipulation" }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "React Development",
        phases: [
          {
            name: "React Basics",
            tasks: [
              {
                name: "Components and Props",
                subtasks: [
                  { name: "Create functional components" },
                  { name: "Pass props between components" },
                  { name: "Understand component lifecycle" }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  const loadSampleData = () => {
    setImportText(JSON.stringify(sampleRoadmapData, null, 2));
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setImportError('Please enter JSON data');
      return;
    }
    
    try {
      const success = importRoadmap(importText);
      if (success) {
        setShowImportModal(false);
        setImportText('');
        setImportError('');
      } else {
        setImportError('Failed to import data. Please check your JSON format.');
      }
    } catch (error) {
      setImportError('Invalid JSON format. Please check your syntax.');
    }
  };

  const handleSaveDeadline = () => {
    if (deadlineModal.subjectId && deadlineModal.deadline) {
      updateSubjectDeadline(deadlineModal.subjectId, deadlineModal.deadline);
      setDeadlineModal({ show: false, subjectId: null, deadline: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tutorial Message */}
      {showTutorial && !hasImportedRoadmap && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="font-semibold text-blue-900">Welcome to Learning Tracker!</h3>
              <p className="text-blue-700 text-sm">To get started, you need to import your learning roadmap. Click the "Import Roadmap" button below.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Roadmap</h1>
          <p className="text-gray-500 mt-1">Manage your learning subjects and tasks</p>
        </div>
        <button
          id="import-roadmap-btn"
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import Roadmap
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Import Roadmap (JSON)</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste your JSON roadmap data:
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{
  "subjects": [
    {
      "name": "Subject Name",
      "phases": [
        {
          "name": "Phase Name",
          "tasks": [
            {
              "name": "Task Name",
              "subtasks": [
                {"name": "Subtask Name"}
              ]
            }
          ]
        }
      ]
    }
  ]
}'
              />
            </div>

            {importError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">JSON Format Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Root object must have a "subjects" array</li>
                <li>• Each subject needs "name" and "phases" array</li>
                <li>• Each phase needs "name" and "tasks" array</li>
                <li>• Each task needs "name" and "subtasks" array</li>
                <li>• Subtasks can be empty: "subtasks": []</li>
                <li>• IDs will be auto-generated</li>
                <li>• Subtasks will default to completed: false</li>
              </ul>
              
              <button
                onClick={loadSampleData}
                className="mt-3 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                Load Sample Data
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Tree */}
      <TaskTree />

      {/* Deadline Modal */}
      {deadlineModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Set Subject Deadline</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline Date:
              </label>
              <input
                type="date"
                value={deadlineModal.deadline}
                onChange={(e) => setDeadlineModal(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveDeadline}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Deadline
              </button>
              <button
                onClick={() => setDeadlineModal({ show: false, subjectId: null, deadline: '' })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
