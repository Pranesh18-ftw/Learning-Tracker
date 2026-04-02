import React, { useState } from 'react';
import { ArrowRight, X, Upload, Target, CheckCircle } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

const Onboarding = ({ onComplete, onStepChange }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const { tutorialStep, hasImportedRoadmap, completeTutorial } = useRoadmap();

  React.useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(getTargetElementId(tutorialStep));
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 10,
          left: rect.left
        });
        setArrowPosition({
          top: rect.top - 20,
          left: rect.left + rect.width / 2 - 10
        });
        
        // Store element rect for creating overlay hole
        setTargetRect(rect);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [tutorialStep]);

  // Auto-advance tutorial when roadmap is imported
  React.useEffect(() => {
    if (hasImportedRoadmap && tutorialStep < 3) {
      onStepChange(3);
    }
  }, [hasImportedRoadmap, tutorialStep, onStepChange]);

  const [targetRect, setTargetRect] = React.useState(null);

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

  const getTooltipContent = (step) => {
    switch (step) {
      case 1:
        return {
          title: "Step 1: Navigate to Roadmap",
          text: "First, let's go to the Roadmap page where you can import your learning data. Click on the Roadmap tab in the navigation.",
          icon: <Target className="w-8 h-8 text-blue-500" />
        };
      case 2:
        return {
          title: "Step 2: Import Your Learning Roadmap",
          text: "Click the 'Import Roadmap' button to add your learning structure. You can paste JSON data or use our sample data to get started quickly.",
          icon: <Upload className="w-8 h-8 text-green-500" />
        };
      case 3:
        return {
          title: "Step 3: Start Learning!",
          text: hasImportedRoadmap 
            ? "Great! Your roadmap is imported. Now you can start with your first task. Navigate to the Dashboard to begin tracking your progress!"
            : "Import your roadmap data to unlock all features and start your learning journey.",
          icon: <CheckCircle className="w-8 h-8 text-purple-500" />
        };
      default:
        return { title: "", text: "", icon: null };
    }
  };

  const handleNext = () => {
    if (tutorialStep === 3) {
      completeTutorial();
    } else {
      onStepChange(tutorialStep + 1);
    }
  };

  const handleSkip = () => {
    if (hasImportedRoadmap) {
      completeTutorial();
    }
  };

  const tooltip = getTooltipContent(tutorialStep);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay with hole for target element */}
      <div className="absolute inset-0 pointer-events-auto">
        {/* Top overlay */}
        <div 
          className="absolute bg-black bg-opacity-50 left-0 right-0"
          style={{ top: 0, height: targetRect ? `${targetRect.top - 10}px` : '0' }}
        />
        {/* Left overlay */}
        <div 
          className="absolute bg-black bg-opacity-50 top-0 bottom-0"
          style={{ 
            left: 0, 
            width: targetRect ? `${targetRect.left - 10}px` : '0',
            top: targetRect ? `${targetRect.top - 10}px` : '0',
            height: targetRect ? `${targetRect.height + 20}px` : '0'
          }}
        />
        {/* Right overlay */}
        <div 
          className="absolute bg-black bg-opacity-50 top-0 bottom-0"
          style={{ 
            left: targetRect ? `${targetRect.right + 10}px` : '0',
            right: 0,
            top: targetRect ? `${targetRect.top - 10}px` : '0',
            height: targetRect ? `${targetRect.height + 20}px` : '0'
          }}
        />
        {/* Bottom overlay */}
        <div 
          className="absolute bg-black bg-opacity-50 left-0 right-0"
          style={{ 
            top: targetRect ? `${targetRect.bottom + 10}px` : '0',
            bottom: 0
          }}
        />
      </div>
      
      {/* Arrow */}
      {tooltip.icon && (
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
          top: `${position.top}px`,
          left: `${position.left}px`
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
