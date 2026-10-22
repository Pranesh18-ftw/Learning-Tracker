/**
 * whyResolver.js
 *
 * System Integration Pass — Global "Why" Resolver (Prompt #19)
 *
 * Traces:
 * CURRENT TASK
 *      ↓
 * WHY AM I DOING THIS?
 *      ↓
 * CAPABILITY
 *      ↓
 * TRAJECTORY
 */

import { resolveTrajectoryDestination, ROLE_CAPABILITY_CLUSTERS } from './trajectoryResolver';

/**
 * Resolves the "Why" trace for any given learning task or concept
 */
export function resolveTaskWhyTrace(taskOrSubtask) {
  if (!taskOrSubtask) return null;

  const destination = resolveTrajectoryDestination();
  const taskName = (taskOrSubtask.name || taskOrSubtask.taskName || '').toLowerCase();
  const desc = (taskOrSubtask.description || '').toLowerCase();
  const searchCorpus = `${taskName} ${desc}`;

  // Find matching capability in role clusters
  const clusters = ROLE_CAPABILITY_CLUSTERS['embedded systems'] || [];
  for (const cluster of clusters) {
    for (const cap of cluster.capabilities) {
      const isMatch = (cap.conceptMatch || []).some(m => searchCorpus.includes(m.toLowerCase()));
      if (isMatch) {
        return {
          conceptName: taskOrSubtask.name || taskOrSubtask.taskName,
          capabilityName: cap.name,
          clusterName: cluster.clusterName,
          whyItMatters: cap.whyItMatters,
          targetRole: destination.primaryRole || 'Embedded Systems Internship',
          targetTimeline: destination.targetTimeline || '2027 Placement'
        };
      }
    }
  }

  // Fallback grounded trace based on domain
  return {
    conceptName: taskOrSubtask.name || taskOrSubtask.taskName || 'Active Engineering Challenge',
    capabilityName: taskOrSubtask.taskName || 'Technical Core Foundations',
    clusterName: taskOrSubtask.subjectName || 'Core Systems',
    whyItMatters: 'Builds first-principles foundational problem-solving necessary for technical engineering mastery.',
    targetRole: destination.primaryRole || 'Embedded Systems Internship',
    targetTimeline: destination.targetTimeline || '2027 Placement'
  };
}
