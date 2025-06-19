/**
 * Data Archiver Module
 * Handles long-term scalability by archiving old data and extracting distilled wisdom
 * Keeps working memory lean while preserving the lessons learned from past experiences
 */

import { bus } from './utils/event-bus.js';

export class DataArchiver {
  constructor(dataPersistence, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.eventBus = eventBus || bus;

    // Archive thresholds (configurable)
    this.archiveThresholds = {
      learningHistoryMonths: 18, // Archive completed topics older than 18 months
      htaBranchYears: 1, // Archive completed branches older than 1 year
      maxWorkingMemorySize: 10000, // Max items in working memory
      wisdomExtractThreshold: 5 // Min items needed to extract wisdom
    };

    this.setupEventListeners();

    // Only show initialization message in terminal mode (not MCP)
    if (process.stdin.isTTY) {
      console.log('📦 DataArchiver initialized - Ready for intelligent archiving');
    }
  }

  setupEventListeners() {
    // Listen for system clock ticks to perform archiving
    this.eventBus.on('system:strategic_insights', this.onStrategicAnalysis.bind(this), 'DataArchiver');
    this.eventBus.on('data:archive_requested', this.performArchiving.bind(this), 'DataArchiver');
  }

  /**
   * Main archiving process triggered during system analysis
   */
  async onStrategicAnalysis({ projectId, _eventMetadata }) {
    try {
      // Check if archiving is needed
      const archiveNeeded = await this.assessArchiveNeeds(projectId);

      if (archiveNeeded) {
        console.log('📦 DataArchiver: Archive threshold reached - beginning intelligent archiving');
        await this.performArchiving({ projectId });
      }
    } catch (error) {
      console.error('❌ DataArchiver analysis failed:', error.message);
      await this.dataPersistence.logError('DataArchiver.onStrategicAnalysis', error);
    }
  }

  /**
   * Assess whether archiving is needed
   * @param {string} projectId - Project ID to assess
   * @returns {boolean} Whether archiving is needed
   */
  async assessArchiveNeeds(projectId) {
    try {
      // Check learning history size
      const learningHistory = await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');

      // Calculate archiving needs
      const learningHistorySize = learningHistory?.completedTopics?.length || 0;
      const htaBranchCount = htaData?.strategicBranches?.length || 0;

      // Check if we've hit size thresholds
      const exceedsSize = learningHistorySize > this.archiveThresholds.maxWorkingMemorySize;

      // Check if we have old data that needs archiving
      const hasOldLearningData = this.hasOldLearningData(learningHistory);
      const hasOldHtaData = this.hasOldHtaData(htaData);

      return exceedsSize || hasOldLearningData || hasOldHtaData;

    } catch (error) {
      console.error('⚠️ Error assessing archive needs:', error.message);
      return false;
    }
  }

  /**
   * Check if learning history has old data that should be archived
   * @param {Object} learningHistory - Learning history data
   * @returns {boolean} Whether old data exists
   */
  hasOldLearningData(learningHistory) {
    if (!learningHistory?.completedTopics) {return false;}

    const archiveThreshold = new Date();
    archiveThreshold.setMonth(archiveThreshold.getMonth() - this.archiveThresholds.learningHistoryMonths);

    return learningHistory.completedTopics.some(topic => {
      const completedDate = new Date(topic.completedAt);
      return completedDate < archiveThreshold;
    });
  }

  /**
   * Check if HTA data has old completed branches that should be archived
   * @param {Object} htaData - HTA data
   * @returns {boolean} Whether old branches exist
   */
  hasOldHtaData(htaData) {
    if (!htaData?.strategicBranches) {return false;}

    const archiveThreshold = new Date();
    archiveThreshold.setFullYear(archiveThreshold.getFullYear() - this.archiveThresholds.htaBranchYears);

    return htaData.strategicBranches.some(branch => {
      if (branch.status !== 'completed') {return false;}
      const completedDate = new Date(branch.completedAt || branch.lastUpdated);
      return completedDate < archiveThreshold;
    });
  }

  /**
   * Perform comprehensive archiving process
   * @param {Object} params - Archiving parameters
   * @param {string} params.projectId - Project ID to archive
   */
  async performArchiving({ projectId }) {
    try {
      console.log(`📦 Beginning archiving process for project: ${projectId}`);

      const archiveResults = {
        projectId,
        archivedAt: new Date().toISOString(),
        learningHistory: {},
        htaData: {},
        wisdomGenerated: []
      };

      // Archive learning history
      archiveResults.learningHistory = await this.archiveLearningHistory(projectId);

      // Archive HTA data
      archiveResults.htaData = await this.archiveHtaData(projectId);

      // Generate and store distilled wisdom
      archiveResults.wisdomGenerated = await this.generateDistilledWisdom(projectId, archiveResults);

      // Log archiving completion
      await this.dataPersistence.saveProjectData(
        projectId,
        'archive_log.json',
        await this.updateArchiveLog(projectId, archiveResults)
      );

      // Emit archiving completed event
      this.eventBus.emit('data:archiving_completed', archiveResults, 'DataArchiver');

      console.log('✅ Archiving completed:', {
        learningItemsArchived: archiveResults.learningHistory.itemsArchived || 0,
        htaBranchesArchived: archiveResults.htaData.branchesArchived || 0,
        wisdomPiecesGenerated: archiveResults.wisdomGenerated.length
      });

      return archiveResults;

    } catch (error) {
      console.error('❌ Archiving process failed:', error.message);
      await this.dataPersistence.logError('DataArchiver.performArchiving', error);
      throw error;
    }
  }

  /**
   * Archive old learning history data
   * @param {string} projectId - Project ID
   * @returns {Object} Archive results for learning history
   */
  async archiveLearningHistory(projectId) {
    try {
      const learningHistory = await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');

      if (!learningHistory?.completedTopics) {
        return { itemsArchived: 0, message: 'No learning history to archive' };
      }

      const archiveThreshold = new Date();
      archiveThreshold.setMonth(archiveThreshold.getMonth() - this.archiveThresholds.learningHistoryMonths);

      // Separate old and current data
      const itemsToArchive = [];
      const currentItems = [];

      learningHistory.completedTopics.forEach(topic => {
        const completedDate = new Date(topic.completedAt);
        if (completedDate < archiveThreshold) {
          itemsToArchive.push(topic);
        } else {
          currentItems.push(topic);
        }
      });

      if (itemsToArchive.length === 0) {
        return { itemsArchived: 0, message: 'No items old enough to archive' };
      }

      // Load existing archive or create new one
      let archive;
      try {
        archive = await this.dataPersistence.loadProjectData(projectId, 'learning_history_archive.json');
        // Ensure archive has the required structure
        if (!archive.archivedTopics) {
          archive.archivedTopics = [];
        }
        if (!archive.archiveMetadata) {
          archive.archiveMetadata = {
            totalArchivedSessions: 0,
            oldestEntry: null,
            newestEntry: null
          };
        }
      } catch (error) {
        archive = {
          createdAt: new Date().toISOString(),
          archivedTopics: [],
          archiveMetadata: {
            totalArchivedSessions: 0,
            oldestEntry: null,
            newestEntry: null
          }
        };
      }

      // Add items to archive with archiving metadata
      const archivedItems = itemsToArchive.map(item => ({
        ...item,
        archivedAt: new Date().toISOString(),
        archiveReason: 'age_threshold_exceeded'
      }));

      archive.archivedTopics.push(...archivedItems);
      archive.archiveMetadata.totalArchivedSessions = archive.archivedTopics.length;
      archive.archiveMetadata.lastArchived = new Date().toISOString();

      // Update oldest and newest entry dates if we have archived topics
      if (archive.archivedTopics.length > 0) {
        const allDates = archive.archivedTopics.map(t => new Date(t.completedAt));
        archive.archiveMetadata.oldestEntry = new Date(Math.min(...allDates)).toISOString();
        archive.archiveMetadata.newestEntry = new Date(Math.max(...allDates)).toISOString();
      }

      // Save updated archive
      await this.dataPersistence.saveProjectData(projectId, 'learning_history_archive.json', archive);

      // Update current learning history with remaining items
      const updatedLearningHistory = {
        ...learningHistory,
        completedTopics: currentItems,
        lastArchived: new Date().toISOString(),
        totalItemsArchived: (learningHistory.totalItemsArchived || 0) + itemsToArchive.length
      };

      await this.dataPersistence.saveProjectData(projectId, 'learning_history.json', updatedLearningHistory);

      return {
        itemsArchived: itemsToArchive.length,
        itemsRemaining: currentItems.length,
        archiveThreshold: archiveThreshold.toISOString(),
        archivedItems: archivedItems.map(item => ({
          title: item.title,
          completedAt: item.completedAt,
          difficulty: item.difficulty
        }))
      };

    } catch (error) {
      console.error('❌ Learning history archiving failed:', error.message);
      throw error;
    }
  }

  /**
   * Archive old HTA branches and their tasks
   * @param {string} projectId - Project ID
   * @returns {Object} Archive results for HTA data
   */
  async archiveHtaData(projectId) {
    try {
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');

      if (!htaData?.strategicBranches) {
        return { branchesArchived: 0, message: 'No HTA data to archive' };
      }

      const archiveThreshold = new Date();
      archiveThreshold.setFullYear(archiveThreshold.getFullYear() - this.archiveThresholds.htaBranchYears);

      // Separate branches to archive and keep
      const branchesToArchive = [];
      const currentBranches = [];

      htaData.strategicBranches.forEach(branch => {
        if (branch.status === 'completed') {
          const completedDate = new Date(branch.completedAt || branch.lastUpdated);
          if (completedDate < archiveThreshold) {
            branchesToArchive.push(branch);
          } else {
            currentBranches.push(branch);
          }
        } else {
          currentBranches.push(branch);
        }
      });

      if (branchesToArchive.length === 0) {
        return { branchesArchived: 0, message: 'No branches old enough to archive' };
      }

      // Load existing HTA archive or create new one
      let htaArchive;
      try {
        htaArchive = await this.dataPersistence.loadProjectData(projectId, 'hta_archive.json');
        // Ensure archive has the required structure
        if (!htaArchive.archivedBranches) {
          htaArchive.archivedBranches = [];
        }
        if (!htaArchive.archiveMetadata) {
          htaArchive.archiveMetadata = {
            totalArchivedBranches: 0,
            totalArchivedTasks: 0,
            oldestEntry: null,
            newestEntry: null
          };
        }
      } catch (error) {
        htaArchive = {
          createdAt: new Date().toISOString(),
          archivedBranches: [],
          archiveMetadata: {
            totalArchivedBranches: 0,
            totalArchivedTasks: 0,
            oldestEntry: null,
            newestEntry: null
          }
        };
      }

      // Calculate total tasks being archived
      const totalTasksArchived = branchesToArchive.reduce((total, branch) => {
        return total + (branch.tasks?.length || 0);
      }, 0);

      // Add branches to archive with metadata
      const archivedBranches = branchesToArchive.map(branch => ({
        ...branch,
        archivedAt: new Date().toISOString(),
        archiveReason: 'completion_age_threshold'
      }));

      htaArchive.archivedBranches.push(...archivedBranches);
      htaArchive.archiveMetadata.totalArchivedBranches = htaArchive.archivedBranches.length;
      htaArchive.archiveMetadata.totalArchivedTasks += totalTasksArchived;
      htaArchive.archiveMetadata.lastArchived = new Date().toISOString();

      // Update oldest and newest entry dates if we have archived branches
      if (htaArchive.archivedBranches.length > 0) {
        const allDates = htaArchive.archivedBranches.map(b => new Date(b.completedAt || b.lastUpdated));
        htaArchive.archiveMetadata.oldestEntry = new Date(Math.min(...allDates)).toISOString();
        htaArchive.archiveMetadata.newestEntry = new Date(Math.max(...allDates)).toISOString();
      }

      // Save updated HTA archive
      await this.dataPersistence.saveProjectData(projectId, 'hta_archive.json', htaArchive);

      // Update current HTA data with remaining branches
      const updatedHtaData = {
        ...htaData,
        strategicBranches: currentBranches,
        lastArchived: new Date().toISOString(),
        totalBranchesArchived: (htaData.totalBranchesArchived || 0) + branchesToArchive.length
      };

      await this.dataPersistence.saveProjectData(projectId, 'hta.json', updatedHtaData);

      return {
        branchesArchived: branchesToArchive.length,
        tasksArchived: totalTasksArchived,
        branchesRemaining: currentBranches.length,
        archiveThreshold: archiveThreshold.toISOString(),
        archivedBranches: archivedBranches.map(branch => ({
          title: branch.title,
          status: branch.status,
          completedAt: branch.completedAt,
          taskCount: branch.tasks?.length || 0
        }))
      };

    } catch (error) {
      console.error('❌ HTA archiving failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate distilled wisdom from archived data
   * @param {string} projectId - Project ID
   * @param {Object} archiveResults - Results from archiving process
   * @returns {Array} Generated wisdom entries
   */
  async generateDistilledWisdom(projectId, archiveResults) {
    try {
      const wisdomEntries = [];

      // Generate wisdom from learning history
      if (archiveResults.learningHistory.itemsArchived > 0) {
        const learningWisdom = await this.extractLearningWisdom(projectId, archiveResults.learningHistory);
        wisdomEntries.push(...learningWisdom);
      }

      // Generate wisdom from HTA branches
      if (archiveResults.htaData.branchesArchived > 0) {
        const branchWisdom = await this.extractBranchWisdom(projectId, archiveResults.htaData);
        wisdomEntries.push(...branchWisdom);
      }

      // Save wisdom to persistent store
      if (wisdomEntries.length > 0) {
        const wisdomStore = await this.updateWisdomStore(projectId, wisdomEntries);
        await this.dataPersistence.saveProjectData(projectId, 'wisdom.json', wisdomStore);
      }

      return wisdomEntries;

    } catch (error) {
      console.error('❌ Wisdom generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract wisdom from archived learning history
   * @param {string} projectId - Project ID
   * @param {Object} learningArchiveResults - Learning archive results
   * @returns {Array} Learning wisdom entries
   */
  async extractLearningWisdom(projectId, learningArchiveResults) {
    try {
      // Load the archived items to analyze
      const archive = await this.dataPersistence.loadProjectData(projectId, 'learning_history_archive.json');
      const recentlyArchived = archive.archivedTopics.filter(topic =>
        topic.archivedAt === learningArchiveResults.archivedItems[0]?.archivedAt
      );

      if (recentlyArchived.length < this.archiveThresholds.wisdomExtractThreshold) {
        return []; // Not enough data to extract meaningful wisdom
      }

      // Analyze patterns in the archived data
      const totalBreakthroughs = recentlyArchived.filter(t => t.breakthrough).length;
      const averageDifficulty = recentlyArchived.reduce((sum, t) => sum + (t.difficulty || 3), 0) / recentlyArchived.length;
      const uniqueBranches = new Set(recentlyArchived.map(t => t.branch || 'general')).size;

      // Extract key learnings
      const keyLearnings = recentlyArchived
        .filter(t => t.learned && t.learned.length > 20) // Substantial learnings
        .map(t => t.learned)
        .slice(0, 5); // Top 5

      // Extract most challenging topics
      const challengingTopics = recentlyArchived
        .filter(t => t.difficulty >= 4)
        .sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))
        .slice(0, 3)
        .map(t => t.title);

      // Generate wisdom summary
      const wisdomEntry = {
        type: 'learning_history_wisdom',
        generatedAt: new Date().toISOString(),
        timespan: {
          oldestEntry: Math.min(...recentlyArchived.map(t => new Date(t.completedAt))),
          newestEntry: Math.max(...recentlyArchived.map(t => new Date(t.completedAt))),
          itemCount: recentlyArchived.length
        },
        insights: {
          totalTopicsCompleted: recentlyArchived.length,
          breakthroughRate: `${(totalBreakthroughs / recentlyArchived.length * 100).toFixed(1)}%`,
          averageDifficulty: averageDifficulty.toFixed(1),
          branchDiversity: uniqueBranches,
          keyLearnings,
          challengingTopics
        },
        summaryLearning: this.generateLearningSummary(recentlyArchived, totalBreakthroughs, keyLearnings),
        applicableContexts: this.identifyApplicableContexts(recentlyArchived)
      };

      return [wisdomEntry];

    } catch (error) {
      console.error('❌ Learning wisdom extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Extract wisdom from archived HTA branches
   * @param {string} projectId - Project ID
   * @param {Object} htaArchiveResults - HTA archive results
   * @returns {Array} Branch wisdom entries
   */
  async extractBranchWisdom(projectId, htaArchiveResults) {
    try {
      // Load the archived branches to analyze
      const archive = await this.dataPersistence.loadProjectData(projectId, 'hta_archive.json');
      const recentlyArchived = archive.archivedBranches.filter(branch =>
        branch.archivedAt === htaArchiveResults.archivedBranches[0]?.archivedAt
      );

      const wisdomEntries = [];

      // Generate wisdom for each significant branch
      for (const branch of recentlyArchived) {
        if (branch.tasks && branch.tasks.length >= this.archiveThresholds.wisdomExtractThreshold) {
          const branchWisdom = await this.archiveBranch(branch);
          wisdomEntries.push(branchWisdom);
        }
      }

      // Generate collective wisdom if multiple branches archived
      if (recentlyArchived.length > 1) {
        const collectiveWisdom = this.generateCollectiveBranchWisdom(recentlyArchived);
        wisdomEntries.push(collectiveWisdom);
      }

      return wisdomEntries;

    } catch (error) {
      console.error('❌ Branch wisdom extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Archive a single branch and extract its wisdom (as described in the user request)
   * @param {Object} branch - Branch to archive
   * @returns {Object} Distilled wisdom from the branch
   */
  async archiveBranch(branch) {
    const completedTasks = branch.tasks.filter(task => task.status === 'completed');
    const totalBreakthroughs = completedTasks.filter(t => t.breakthrough).length;
    const keyLearnings = completedTasks
      .map(t => t.learned)
      .filter(learned => learned && learned.length > 20)
      .slice(0, 5); // Get top 5

    const distilledWisdom = {
      type: 'strategic_branch_wisdom',
      branchTitle: branch.title,
      dateArchived: new Date().toISOString(),
      branchMetadata: {
        originalCreatedAt: branch.createdAt,
        completedAt: branch.completedAt,
        duration: this.calculateDuration(branch.createdAt, branch.completedAt)
      },
      achievements: {
        totalTasks: completedTasks.length,
        breakthroughs: totalBreakthroughs,
        breakthroughRate: `${(totalBreakthroughs / completedTasks.length * 100).toFixed(1)}%`,
        averageTaskDifficulty: this.calculateAverageTaskDifficulty(completedTasks)
      },
      keyInsights: {
        summaryLearnings: `Key lessons included: ${keyLearnings.join(', ')}. This branch was crucial for developing foundational skills.`,
        criticalBreakthroughs: completedTasks.filter(t => t.breakthrough).map(t => ({
          title: t.title,
          insight: t.learned,
          difficulty: t.difficulty
        })),
        strategicValue: this.assessStrategicValue(branch, completedTasks)
      },
      applicablePrinciples: this.extractApplicablePrinciples(completedTasks),
      futureRelevance: this.assessFutureRelevance(branch, completedTasks)
    };

    return distilledWisdom;
  }

  /**
   * Generate collective wisdom from multiple archived branches
   * @param {Array} branches - Recently archived branches
   * @returns {Object} Collective wisdom entry
   */
  generateCollectiveBranchWisdom(branches) {
    const totalTasks = branches.reduce((sum, b) => sum + (b.tasks?.length || 0), 0);
    const totalBreakthroughs = branches.reduce((sum, b) => {
      return sum + (b.tasks?.filter(t => t.breakthrough)?.length || 0);
    }, 0);

    return {
      type: 'collective_strategic_wisdom',
      generatedAt: new Date().toISOString(),
      scope: {
        branchCount: branches.length,
        totalTasks,
        totalBreakthroughs,
        timespan: {
          earliest: Math.min(...branches.map(b => new Date(b.createdAt))),
          latest: Math.max(...branches.map(b => new Date(b.completedAt || b.lastUpdated)))
        }
      },
      strategicPatterns: {
        mostSuccessfulApproaches: this.identifySuccessfulApproaches(branches),
        emergingThemes: this.identifyEmergingThemes(branches),
        evolutionPattern: this.analyzeEvolutionPattern(branches)
      },
      distilledPrinciples: this.extractDistilledPrinciples(branches),
      recommendationsForFuture: this.generateFutureRecommendations(branches)
    };
  }

  /**
   * Update the wisdom store with new entries
   * @param {string} projectId - Project ID
   * @param {Array} newWisdomEntries - New wisdom entries to add
   * @returns {Object} Updated wisdom store
   */
  async updateWisdomStore(projectId, newWisdomEntries) {
    try {
      // Load existing wisdom store
      let wisdomStore;
      try {
        wisdomStore = await this.dataPersistence.loadProjectData(projectId, 'wisdom.json');
      } catch (error) {
        wisdomStore = {
          createdAt: new Date().toISOString(),
          wisdomEntries: [],
          metadata: {
            totalEntries: 0,
            lastUpdated: null,
            categories: {}
          }
        };
      }

      // Add new entries
      wisdomStore.wisdomEntries.push(...newWisdomEntries);
      wisdomStore.metadata.totalEntries = wisdomStore.wisdomEntries.length;
      wisdomStore.metadata.lastUpdated = new Date().toISOString();

      // Update category counts
      newWisdomEntries.forEach(entry => {
        const category = entry.type;
        wisdomStore.metadata.categories[category] = (wisdomStore.metadata.categories[category] || 0) + 1;
      });

      return wisdomStore;

    } catch (error) {
      console.error('❌ Wisdom store update failed:', error.message);
      throw error;
    }
  }

  /**
   * Update the archive log with results
   * @param {string} projectId - Project ID
   * @param {Object} archiveResults - Archive results to log
   * @returns {Object} Updated archive log
   */
  async updateArchiveLog(projectId, archiveResults) {
    try {
      let archiveLog;
      try {
        archiveLog = await this.dataPersistence.loadProjectData(projectId, 'archive_log.json');
        // Ensure archive log has the required structure
        if (!archiveLog.archiveSessions) {
          archiveLog.archiveSessions = [];
        }
        if (!archiveLog.metadata) {
          archiveLog.metadata = {
            totalSessions: 0,
            totalItemsArchived: 0,
            totalWisdomGenerated: 0
          };
        }
      } catch (error) {
        archiveLog = {
          createdAt: new Date().toISOString(),
          archiveSessions: [],
          metadata: {
            totalSessions: 0,
            totalItemsArchived: 0,
            totalWisdomGenerated: 0
          }
        };
      }

      // Add new archive session
      archiveLog.archiveSessions.push({
        sessionId: `archive_${Date.now()}`,
        ...archiveResults
      });

      // Update metadata
      archiveLog.metadata.totalSessions = archiveLog.archiveSessions.length;
      archiveLog.metadata.totalItemsArchived += (archiveResults.learningHistory.itemsArchived || 0) + (archiveResults.htaData.branchesArchived || 0);
      archiveLog.metadata.totalWisdomGenerated += archiveResults.wisdomGenerated.length;
      archiveLog.metadata.lastArchived = archiveResults.archivedAt;

      return archiveLog;

    } catch (error) {
      console.error('❌ Archive log update failed:', error.message);
      throw error;
    }
  }

  // Helper methods for wisdom extraction

  generateLearningSummary(topics, breakthroughs, keyLearnings) {
    const topicCount = topics.length;
    const breakthroughRate = (breakthroughs / topicCount * 100).toFixed(0);

    return `Over ${topicCount} completed learning topics, achieved ${breakthroughs} breakthroughs (${breakthroughRate}% breakthrough rate). ` +
           `Key insights developed: ${keyLearnings.slice(0, 2).join('; ')}. ` +
           'This period demonstrated strong learning momentum with consistent skill development.';
  }

  identifyApplicableContexts(topics) {
    const branches = [...new Set(topics.map(t => t.branch).filter(Boolean))];
    const difficulties = topics.map(t => t.difficulty || 3);
    const avgDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;

    return {
      primaryBranches: branches.slice(0, 3),
      difficultyRange: `${Math.min(...difficulties)}-${Math.max(...difficulties)}`,
      optimalDifficulty: avgDifficulty.toFixed(1),
      applicableWhen: [
        'Starting new strategic branches',
        'Facing similar difficulty challenges',
        'Building foundational knowledge'
      ]
    };
  }

  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {return `${diffDays} days`;}
    if (diffDays < 365) {return `${Math.floor(diffDays / 30)} months`;}
    return `${Math.floor(diffDays / 365)} years`;
  }

  calculateAverageTaskDifficulty(tasks) {
    if (tasks.length === 0) {return 0;}
    const difficulties = tasks.map(t => t.difficulty || 3);
    return (difficulties.reduce((a, b) => a + b, 0) / difficulties.length).toFixed(1);
  }

  assessStrategicValue(branch, tasks) {
    const breakthroughCount = tasks.filter(t => t.breakthrough).length;
    const avgDifficulty = this.calculateAverageTaskDifficulty(tasks);

    if (breakthroughCount >= 3 && avgDifficulty >= 4) {return 'High - Multiple breakthroughs with challenging complexity';}
    if (breakthroughCount >= 2 || avgDifficulty >= 4) {return 'Medium - Significant learning or high complexity';}
    return 'Low - Foundational development';
  }

  extractApplicablePrinciples(tasks) {
    const principles = [];

    // Extract patterns from breakthrough tasks
    const breakthroughs = tasks.filter(t => t.breakthrough);
    if (breakthroughs.length > 0) {
      principles.push(`Breakthrough pattern: ${breakthroughs.length} major insights achieved through persistent effort`);
    }

    // Extract difficulty progression patterns
    const difficulties = tasks.map(t => t.difficulty || 3);
    const difficultyTrend = this.analyzeDifficultyTrend(difficulties);
    if (difficultyTrend !== 'stable') {
      principles.push(`Difficulty progression: ${difficultyTrend} complexity over time`);
    }

    return principles;
  }

  assessFutureRelevance(branch, tasks) {
    const breakthroughRate = tasks.filter(t => t.breakthrough).length / tasks.length;
    const avgDifficulty = this.calculateAverageTaskDifficulty(tasks);

    if (breakthroughRate > 0.3 && avgDifficulty >= 4) {
      return 'High - Foundational insights applicable to future strategic work';
    } else if (breakthroughRate > 0.2 || avgDifficulty >= 4) {
      return 'Medium - Specific techniques and approaches remain valuable';
    } else {
      return 'Low - Historical context, limited direct application';
    }
  }

  identifySuccessfulApproaches(branches) {
    // Analyze patterns across successful branches
    const successfulBranches = branches.filter(b => {
      const tasks = b.tasks || [];
      const breakthroughRate = tasks.filter(t => t.breakthrough).length / tasks.length;
      return breakthroughRate > 0.2; // 20% breakthrough rate considered successful
    });

    return successfulBranches.map(b => ({
      title: b.title,
      successFactor: 'High breakthrough rate',
      keyApproach: this.extractKeyApproach(b)
    }));
  }

  identifyEmergingThemes(branches) {
    const allTasks = branches.flatMap(b => b.tasks || []);
    const themes = {};

    // Analyze branch titles and task patterns
    branches.forEach(branch => {
      const words = branch.title.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4) { // Focus on meaningful words
          themes[word] = (themes[word] || 0) + 1;
        }
      });
    });

    return Object.entries(themes)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, frequency: count }));
  }

  analyzeEvolutionPattern(branches) {
    // Sort by creation date and analyze progression
    const sortedBranches = branches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const difficulties = sortedBranches.map(b => {
      const tasks = b.tasks || [];
      return this.calculateAverageTaskDifficulty(tasks);
    });

    return this.analyzeDifficultyTrend(difficulties);
  }

  extractDistilledPrinciples(branches) {
    return [
      'Strategic branches benefit from breakthrough-focused task design',
      'Difficulty progression should align with learning capacity',
      'Consistent effort over time yields exponential returns',
      'Cross-branch learning accelerates overall development'
    ];
  }

  generateFutureRecommendations(branches) {
    const avgTaskCount = branches.reduce((sum, b) => sum + (b.tasks?.length || 0), 0) / branches.length;
    const avgBreakthroughRate = branches.reduce((sum, b) => {
      const tasks = b.tasks || [];
      return sum + (tasks.filter(t => t.breakthrough).length / Math.max(tasks.length, 1));
    }, 0) / branches.length;

    return [
      `Optimal branch size: ${Math.round(avgTaskCount)} tasks for completion`,
      `Target breakthrough rate: ${(avgBreakthroughRate * 100).toFixed(0)}% for strategic value`,
      'Archive completed branches annually to maintain focus',
      'Leverage archived wisdom when planning similar strategic work'
    ];
  }

  extractKeyApproach(branch) {
    const tasks = branch.tasks || [];
    const breakthroughs = tasks.filter(t => t.breakthrough);

    if (breakthroughs.length > 0) {
      return 'Breakthrough-driven methodology';
    } else if (tasks.length > 10) {
      return 'Comprehensive systematic approach';
    } else {
      return 'Focused tactical execution';
    }
  }

  analyzeDifficultyTrend(difficulties) {
    if (difficulties.length < 2) {return 'stable';}

    const first = difficulties[0];
    const last = difficulties[difficulties.length - 1];
    const change = last - first;

    if (change > 0.5) {return 'increasing';}
    if (change < -0.5) {return 'decreasing';}
    return 'stable';
  }

  /**
   * Get archiver status and metrics
   * @returns {Object} Archiver status
   */
  getStatus() {
    return {
      archiveThresholds: this.archiveThresholds,
      isActive: true,
      lastArchiveCheck: this.lastAnalysis?.get('archive_check') || 'Never'
    };
  }

  /**
   * Manual trigger for archiving process
   * @param {string} projectId - Project ID to archive
   * @returns {Object} Archive results
   */
  async triggerManualArchiving(projectId) {
    console.log('📦 Manual archiving triggered');
    return await this.performArchiving({ projectId });
  }

  /**
   * Configure archive thresholds
   * @param {Object} newThresholds - New threshold configuration
   */
  configureThresholds(newThresholds) {
    this.archiveThresholds = { ...this.archiveThresholds, ...newThresholds };
    console.log('📦 Archive thresholds updated:', this.archiveThresholds);
  }
}