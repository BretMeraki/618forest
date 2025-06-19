/**
 * HTA Logic Utilities
 * Centralised helper for determining which HTA nodes are available to act on.
 * Keeping this logic in one place prevents subtle drift between modules.
 */

/**
 * Return all frontier nodes whose prerequisites are satisfied.
 *
 * @param {Array<Object>} frontierNodes - All nodes in the current frontier/tree.
 * @param {Array<Object>} completedNodes - Sub-set of nodes that have been completed.
 * @returns {Array<Object>} nodes ready to be worked on.
 */
export function getAvailableNodes(frontierNodes = [], completedNodes = []) {
  const completedIds = new Set(completedNodes.map(n => n.id));
  const completedTitles = new Set(completedNodes.map(n => n.title));

  return frontierNodes.filter(node => {
    if (!node || node.completed) return false;
    if (!node.prerequisites || node.prerequisites.length === 0) return true;

    // All prerequisites must be met by id OR by title.
    return node.prerequisites.every(prereq =>
      completedIds.has(prereq) || completedTitles.has(prereq)
    );
  });
}
