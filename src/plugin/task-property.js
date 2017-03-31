import createTaskInstance from './task-instance'
import createTaskScheduler from './task-scheduler'
import createTaskPolicy from './modifiers/task-policy'
import createTaskSubscriber from './modifiers/task-subscriber'
import createTaskListeners from './modifiers/task-listeners'

/**
 * A {TaskProperty}
 * @param {Vue} host - the Vue component instance
 * @param {Function} operation - the task method to run
 * @param {Object} policy - the task scheduling policy
 * @constructor Task Property
 */
export default function createTaskProperty(host, operation, provider, autorun = true) {
  let { policy, ...policyModifiers } = createTaskPolicy(),
      { events, watchers } = createTaskListeners(host),
      { subscriptions, ...subscriber } = createTaskSubscriber(host)

  return {
    // reactive data
    isActive: false,
    isIdle: true,
    isAborted: false,
    state: 'idle',
    // last instance data (set by scheduler)
    lastCalled: null,
    lastStarted: null,
    lastResolved: null,
    lastRejected: null,
    lastCanceled: null,
    // default helper instance (can be used for when `last-` is undefined)
    default: createTaskInstance(function * () {}),

    /*
     * Data that needs to be updated when instances
     * are added to the scheduler's running queue.
     */
    _updateReactive() {
      let { scheduler } = this
      this.isActive = scheduler.running.isActive
      this.isIdle = !scheduler.running.isActive
      this.state = this.isActive ? 'active' : 'idle'
    },

    /**
     * Creates a new task instance and schedules it to run.
     */
    run(...params) {
      if (!this.scheduler) this.scheduler = createTaskScheduler(this, policy)
      this.isAborted = false
      let instanceData = { params, operation: operation.bind(host, ...params) },
          ti = createTaskInstance(instanceData, subscriber, provider)
      if (autorun) this.scheduler.schedule(ti)
      return ti
    },

    /**
     * Cancels all scheduled task instances.
     */
    abort() {
      let canceledInstances, { scheduler } = this
      if (scheduler && scheduler.isActive) {
        canceledInstances = scheduler.clear()
        this.isAborted = true
      }
      return canceledInstances || []
    },

    /**
     * Task modifiers.
     */
    ...policyModifiers,
    ...events,
    ...watchers,
    ...subscriptions
  }
}
