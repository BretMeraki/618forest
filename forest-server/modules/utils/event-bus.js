/**
 * Event Bus Module
 * Provides centralized event-driven communication between modules
 * Decouples modules by allowing them to emit events and listen for events
 * without direct knowledge of each other.
 */

class EventBus {
  constructor() {
    this.listeners = {};
    this.debugMode = false; // Set to true for event debugging
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to handle the event
   * @param {string} listenerName - Optional name for debugging
   */
  on(event, callback, listenerName = 'anonymous') {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push({
      callback,
      listenerName,
      registeredAt: new Date().toISOString()
    });

    if (this.debugMode) {
      console.log(`🎧 Event listener "${listenerName}" registered for "${event}"`);
    }
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {string} emitterName - Optional name of the emitter for debugging
   */
  emit(event, data = {}, emitterName = 'unknown') {
    if (this.debugMode) {
      console.log(`📢 Event "${event}" emitted by "${emitterName}" with data:`, data);
    }

    if (this.listeners[event]) {
      const eventMetadata = {
        event,
        emittedAt: new Date().toISOString(),
        emittedBy: emitterName,
        listenerCount: this.listeners[event].length
      };

      this.listeners[event].forEach(({ callback, listenerName }) => {
        try {
          if (this.debugMode) {
            console.log(`🔄 Calling listener "${listenerName}" for event "${event}"`);
          }

          // Pass both the data and metadata to listeners
          callback({ ...data, _eventMetadata: eventMetadata });
        } catch (error) {
          console.error(`❌ Error in event listener "${listenerName}" for event "${event}":`, error.message);
          // Continue processing other listeners even if one fails
        }
      });
    } else if (this.debugMode) {
      console.log(`📢 Event "${event}" emitted but no listeners registered`);
    }
  }

  /**
   * Remove event listener(s)
   * @param {string} event - Event name
   * @param {Function|string} callbackOrName - Callback function or listener name to remove
   */
  off(event, callbackOrName) {
    if (!this.listeners[event]) {
      return false;
    }

    const originalLength = this.listeners[event].length;

    if (typeof callbackOrName === 'string') {
      // Remove by listener name
      this.listeners[event] = this.listeners[event].filter(
        listener => listener.listenerName !== callbackOrName
      );
    } else {
      // Remove by callback function
      this.listeners[event] = this.listeners[event].filter(
        listener => listener.callback !== callbackOrName
      );
    }

    const removed = originalLength - this.listeners[event].length;

    if (this.debugMode && removed > 0) {
      console.log(`🗑️ Removed ${removed} listener(s) for event "${event}"`);
    }

    return removed > 0;
  }

  /**
   * Get list of all registered events and their listener counts
   * @returns {Object} Event summary
   */
  getEventSummary() {
    const summary = {};
    for (const [event, listeners] of Object.entries(this.listeners)) {
      summary[event] = {
        listenerCount: listeners.length,
        listeners: listeners.map(l => ({
          name: l.listenerName,
          registeredAt: l.registeredAt
        }))
      };
    }
    return summary;
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether to enable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🐛 Event bus debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all listeners for all events (useful for testing)
   */
  clearAll() {
    const eventCount = Object.keys(this.listeners).length;
    this.listeners = {};
    if (this.debugMode) {
      console.log(`🧹 Cleared all listeners for ${eventCount} events`);
    }
  }
}

// Create and export a singleton instance
export const bus = new EventBus();

// Export the class for testing or multiple instances
export { EventBus };