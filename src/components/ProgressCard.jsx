import React from 'react';

const ProgressCard = ({ title, progress, color, icon: Icon }) => {
  const getColorClasses = (color) => {
    const colorMap = {
      green: 'bg-green-500 text-green-600',
      blue: 'bg-blue-500 text-blue-600',
      purple: 'bg-purple-500 text-purple-600',
      orange: 'bg-orange-500 text-orange-600',
      red: 'bg-red-500 text-red-600',
      gray: 'bg-gray-500 text-gray-600',
    };
    return colorMap[color] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);
  const bgColorClass = colorClasses.split(' ')[0];
  const textColorClass = colorClasses.split(' ')[1];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColorClass} bg-opacity-10`}>
          {Icon && <Icon className={`w-6 h-6 ${textColorClass}`} />}
        </div>
        <span className="text-2xl font-bold text-gray-800">{progress}%</span>
      </div>
      
      <h3 className="text-gray-600 text-sm font-medium mb-2">{title}</h3>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`${bgColorClass} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <p className="text-xs text-gray-400">
        {progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started'}
      </p>
    </div>
  );
};

export default ProgressCard;
