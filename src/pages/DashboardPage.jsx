import React from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import DashboardTasks from '../components/DashboardTasks';

const DashboardPage = () => {
  const { subjects } = useRoadmap();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your learning command center</p>
      </div>

      <DashboardTasks />
    </div>
  );
};

export default DashboardPage;
