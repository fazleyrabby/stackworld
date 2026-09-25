import { ScenarioDefinition } from './types';

/**
 * Scenario 4: "The Synchronous Job Crisis" (Spec Phase 12 — Queues & Asynchronous Processing)
 *
 * Lesson: When an API endpoint performs slow background work (invoice PDF generation)
 * inline inside the HTTP request, every worker thread is pinned for seconds at a time.
 * A traffic surge saturates the API and checkout starts failing. The fix is moving
 * slow work OFF the request path onto a job queue drained by dedicated workers.
 */
export const jobQueueScenario: ScenarioDefinition = {
  id: 'scenario-4-job-queues',
  title: 'The Synchronous Job Crisis',
  difficulty: 'Advanced',
  estimatedMinutes: 8,
  prerequisites: ['Backend APIs', 'Relational Databases', 'Basic Concurrency'],
  learningObjectives: [
    'See how a slow synchronous endpoint (PDF generation) pins API workers and collapses throughput',
    'Understand the queue-based pattern: accept the job fast (202), process it in the background',
    'Recognize that a queue WITHOUT workers only hides the backlog instead of draining it',
    'Compare vertical API scaling vs asynchronous offload on cost, reliability, and simplicity',
  ],
  startingBudgetMonthly: 55.0,
  stages: [
    {
      id: 'stage_baseline',
      title: '1. Checkout API Baseline',
      targetRps: 6,
      instructions: 'Buyers place orders. The Billing API generates each invoice PDF synchronously before responding.',
    },
    {
      id: 'stage_surge',
      title: '2. Bulk Order Surge Inbound',
      targetRps: 30,
      instructions: 'A B2B customer imports 10,000 orders overnight! Every request pins an API worker for PDF rendering.',
    },
    {
      id: 'stage_degraded',
      title: '3. API Workers Pinned — Checkout Failing',
      targetRps: 34,
      instructions: 'The Billing API is CPU-pinned by inline PDF jobs. New checkout requests are queuing and timing out!',
    },
    {
      id: 'stage_solution_applied',
      title: '4. Verifying Async Job Pipeline',
      targetRps: 34,
      instructions: 'Sustain traffic for 12 seconds with the API healthy and checkout requests completing end to end.',
    },
    {
      id: 'stage_victory',
      title: '5. Asynchronous Processing Achieved',
      targetRps: 34,
      instructions: 'Incident resolved! Slow work now flows through a queue drained by workers, keeping checkout fast.',
    },
  ],
  availableSolutions: [
    {
      id: 'sol_async_queue',
      name: 'Job Queue + Dedicated Workers',
      tagline: 'Accept instantly, render PDFs in the background',
      category: 'queue',
      costMonthlyDelta: 12.0,
      complexity: 'Medium',
      reliability: 'Very High',
      description: 'Move invoice PDF generation off the request path. The API pushes a job onto a BullMQ (Redis) queue and returns 202 Accepted in milliseconds. Dedicated worker processes drain the queue at their own pace, and the API no longer touches CPU-heavy rendering.',
      pros: [
        'Checkout latency drops to milliseconds — PDF time becomes irrelevant to the user',
        'Workers scale independently: add consumers when the backlog grows',
        'Natural backpressure: the queue absorbs bursts instead of crashing the API',
      ],
      cons: [
        '+$12/month for the queue and worker instance',
        'Eventual consistency: the invoice is ready seconds later, not instantly',
        'New failure surface: stuck jobs need retries and a dead-letter queue',
      ],
      appliedExplanation: 'Async pipeline live! API enqueues jobs and responds with 202. Workers drain the queue in the background.',
    },
    {
      id: 'sol_vertical_billing',
      name: 'Upgrade Billing API Instance',
      tagline: 'Bigger CPU to chew through PDFs inline',
      category: 'vertical',
      costMonthlyDelta: 30.0,
      complexity: 'Low',
      reliability: 'Moderate',
      description: 'Resize the Billing API VM to a 4x larger instance so it can render more PDFs per second inside the request. Buys time, but every invoice still blocks an HTTP worker.',
      pros: [
        'Fastest to deploy — no code changes required',
        'Keeps the synchronous flow simple for now',
      ],
      cons: [
        'Every future traffic bump requires an even bigger (pricier) box',
        'Request workers are still pinned by slow PDF jobs — latency stays high',
        'Single point of failure: one overloaded host takes down checkout',
      ],
      appliedExplanation: 'Billing API resized to 4vCPU/8GB. It can chew through more inline PDFs — for now.',
    },
    {
      id: 'sol_queue_only',
      name: 'Deploy Queue Only (No Workers)',
      tagline: 'Fast 202 responses… into an empty inbox',
      category: 'queue',
      costMonthlyDelta: 5.0,
      complexity: 'Low',
      reliability: 'Moderate',
      description: 'Push jobs onto a Redis queue and respond immediately — but never add a consumer to process them. Requests get fast, but invoices silently pile up unprocessed. A classic async-washing trap!',
      pros: [
        'Checkout responds instantly (green dashboards!)',
        'Cheap (+$5/month) and quick to ship',
      ],
      cons: [
        'Nobody is consuming the queue — the backlog grows forever',
        'Customers never receive their invoices; the failure is hidden, not solved',
        'Monitoring only the API will never reveal the problem',
      ],
      appliedExplanation: 'Queue deployed, but with zero workers attached. Jobs pile up unprocessed…',
    },
  ],
  successConditions: {
    minSustainedSeconds: 12,
    maxErrorRate: 0.02,
    requiredHealth: 'HEALTHY',
  },
};
