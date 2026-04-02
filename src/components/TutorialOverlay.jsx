import React, { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';

const TutorialOverlay = ({ currentStep, onComplete, onStepChange }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(getTargetElementId(currentStep));
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
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep]);

  const getTargetElementId = (step) => {
    switch (step) {
      case 1:
        return 'roadmap-nav-item';
      case 2:
        return 'import-roadmap-btn';
      default:
        return '';
    }
  };

  const getTooltipContent = (step) => {
    switch (step) {
      case 1:
        return {
          title: "Start here",
          text: "Click Roadmap to create your learning structure."
        };
      case 2:
        return {
          title: "Import your roadmap",
          text: "Paste your roadmap here to begin."
        };
      default:
        return { title: "", text: "" };
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const tooltip = getTooltipContent(currentStep);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto" />
      
      {/* Arrow */}
      <div
        className="absolute z-50 pointer-events-none"
        style={{
          top: `${arrowPosition.top}px`,
          left: `${arrowPosition.left}px`
        }}
      >
        <ArrowRight className="w-5 h-5 text-yellow-400 animate-bounce" />
      </div>

      {/* Tooltip */}
      <div
        className="absolute z-50 bg-white rounded-lg shadow-lg p-4 max-w-sm pointer-events-auto"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{tooltip.title}</h3>
          <button
            onClick={onComplete}
            className="text-gray-400 hover:text-gray-600 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-4">{tooltip.text}</p>
        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  step === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center"
          >
            {currentStep === 2 ? 'Got it' : 'Next'}
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
