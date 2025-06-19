// Integrated Task Pool
// Gathers a capped list of available tasks from all active projects without exposing sensitive project data.

export class IntegratedTaskPool {
  /**
   * @param {import('../modules/data-persistence.js').DataPersistence} dataPersistence
   * @param {import('../modules/project-management.js').ProjectManagement} projectManagement
   */
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  /**
   * Return lightweight task objects across all active projects.
   * @param {number} limitPerProject  max tasks per project
   */
  async getTaskPool(limitPerProject = 30) {
    const projectsResp = await this.projectManagement.listProjects();
    const projectIdsArr = Array.isArray(projectsResp) ? projectsResp : (projectsResp.projects || []);

    const pool = [];

    for (const p of projectIdsArr) {
      const projectId = typeof p === 'string' ? p : p.id || p.project_id || p.name;
      if (!projectId) {continue;}
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      if (!config) {continue;}
      const pathName = config.activePath || 'general';
      const hta = await this._loadPathHTA(projectId, pathName);
      if (!hta || !Array.isArray(hta.frontierNodes)) {continue;}

      const completedIds = new Set(hta.frontierNodes.filter(n => n.completed).map(n => n.id));
      const available = hta.frontierNodes
        .filter(n => !n.completed)
        .filter(n => {
          if (!n.prerequisites || n.prerequisites.length === 0) {return true;}
          return n.prerequisites.every(pr => completedIds.has(pr));
        })
        .sort((a, b) => (b.priority || 200) - (a.priority || 200))
        .slice(0, limitPerProject)
        .map(n => ({
          id: n.id,
          project_id: projectId,
          title: (n.title || '').slice(0, 40),
          est_minutes: typeof n.duration === 'string' ? this._parseDuration(n.duration) : (n.duration || 30),
          difficulty: n.difficulty || 1,
          priority: n.priority || 200
        }));

      pool.push(...available);
    }

    return pool;
  }

  async _loadPathHTA(projectId, pathName) {
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'hta.json');
    }
    return await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
  }

  _parseDuration(str) {
    const num = parseInt(str, 10);
    if (isNaN(num)) {return 30;}
    return num;
  }
}