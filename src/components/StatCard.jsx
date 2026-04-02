import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }) => {
  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 ${getTrendColor(trend)}`}>
              <span className="text-sm font-medium">
                {trend === 'up' ? '+' : '-'}{trendValue}%
              </span>
              <span className="text-xs text-gray-500">vs last week</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className="p-3 bg-primary-50 rounded-lg">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
