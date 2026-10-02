import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

const Onboarding = ({ onComplete, onStepChange }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState(null);
  const { tutorialStep, hasImportedRoadmap, completeTutorial } = useRoadmap();

  const getTargetElementId = (step) => {
    switch (step) {
      case 1:
        return 'roadmap-nav-item';
      case 2:
        return 'import-roadmap-btn';
      case 3:
        return 'first-task-item';
      default:
        return '';
    }
  };

  const updatePosition = useCallback(() => {
    const targetId = getTargetElementId(tutorialStep);
    if (!targetId) {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(targetId);
    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect(rect);
    setPosition({
      top: rect.bottom + 10,
      left: rect.left
    });
    setArrowPosition({
      top: rect.top - 20,
      left: rect.left + rect.width / 2 - 10
    });
  }, [tutorialStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition]);

  // Auto-advance tutorial when roadmap is imported
  useEffect(() => {
    if (hasImportedRoadmap && tutorialStep < 3) {
      onStepChange(3);
    }
  }, [hasImportedRoadmap, tutorialStep, onStepChange]);

  const getTooltipContent = (step) => {
    switch (step) {
      case 1:
        return {
          title: "Step 1: Navigate to Roadmap",
          text: "Click on the Roadmap tab to view your learning journey and import your study curriculum.",
          icon: <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
        };
      case 2:
        return {
          title: "Step 2: Import Your Roadmap",
          text: "Click the Import button to paste your curriculum JSON or use our sample template to get started.",
          icon: <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">2</div>
        };
      case 3:
        return {
          title: "Step 3: Track Your Progress",
          text: "Check off subtasks as you finish studying. Your statistics and achievements will update automatically!",
          icon: <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">✓</div>
        };
      default:
        return {
          title: "Welcome to Learning Tracker!",
          text: "Let's take a quick tour to get you started on your learning journey.",
          icon: <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">👋</div>
        };
    }
  };

  const handleNext = () => {
    if (tutorialStep < 3) {
      onStepChange(tutorialStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (hasImportedRoadmap) {
      onComplete();
    } else {
      alert("Please import a roadmap before skipping the tutorial, or click 'Import Sample Roadmap' in the roadmap tab.");
    }
  };

  const tooltip = getTooltipContent(tutorialStep);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay with hole for target element - only rendered when targetRect exists */}
      {targetRect && (
        <div className="absolute inset-0 pointer-events-auto">
          {/* Top overlay */}
          <div 
            className="absolute bg-black bg-opacity-50 left-0 right-0"
            style={{ top: 0, height: `${Math.max(0, targetRect.top - 10)}px` }}
          />
          {/* Left overlay */}
          <div 
            className="absolute bg-black bg-opacity-50 top-0 bottom-0"
            style={{ 
              left: 0, 
              width: `${Math.max(0, targetRect.left - 10)}px`,
              top: `${Math.max(0, targetRect.top - 10)}px`,
              height: `${targetRect.height + 20}px`
            }}
          />
          {/* Right overlay */}
          <div 
            className="absolute bg-black bg-opacity-50 top-0 bottom-0"
            style={{ 
              left: `${targetRect.right + 10}px`,
              right: 0,
              top: `${Math.max(0, targetRect.top - 10)}px`,
              height: `${targetRect.height + 20}px`
            }}
          />
          {/* Bottom overlay */}
          <div 
            className="absolute bg-black bg-opacity-50 left-0 right-0"
            style={{ 
              top: `${targetRect.bottom + 10}px`,
              bottom: 0
            }}
          />
        </div>
      )}
      
      {/* Arrow */}
      {targetRect && tooltip.icon && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            top: `${arrowPosition.top}px`,
            left: `${arrowPosition.left}px`
          }}
        >
          <ArrowRight className="w-5 h-5 text-yellow-400 animate-bounce" />
        </div>
      )}

      {/* Tooltip */}
      <div
        className="absolute z-50 bg-white rounded-lg shadow-lg p-6 max-w-sm pointer-events-auto"
        style={{
          top: targetRect ? `${position.top}px` : '40%',
          left: targetRect ? `${position.left}px` : 'calc(50% - 180px)'
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {tooltip.icon}
            <div>
              <h3 className="font-semibold text-gray-900">{tooltip.title}</h3>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 ml-4"
            title={hasImportedRoadmap ? "Skip tutorial" : "Import roadmap to skip"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mb-6">{tooltip.text}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  step <= tutorialStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {hasImportedRoadmap && tutorialStep < 3 && (
              <button
                onClick={() => completeTutorial()}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Skip
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium transition-colors flex items-center hover:bg-blue-600"
            >
              {tutorialStep === 3 ? 'Get Started' : 'Next'}
              <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
