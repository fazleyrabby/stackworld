StackWorld

A visual, gamified infrastructure and full-stack engineering simulator.

0. Purpose

StackWorld is an interactive 2D simulation game designed to teach software engineering, web development, infrastructure, DevOps, cloud architecture, system design, reliability, and production operations through progressively harder scenarios.

The learner starts with a simple static website and eventually operates a production-grade distributed system.

The fundamental learning loop is:

BUILD
  ↓
DEPLOY
  ↓
OBSERVE
  ↓
TRAFFIC INCREASES
  ↓
SYSTEM DEGRADES
  ↓
DIAGNOSE
  ↓
COMPARE SOLUTIONS
  ↓
IMPLEMENT
  ↓
TEST
  ↓
SCALE
  ↓
OPTIMIZE
  ↓
NEW FAILURE
  ↺

The project is primarily a learning tool and personal engineering project, but its architecture should be designed so it can eventually become a polished public product.

⸻

1. Product Philosophy

1.1 Core principle

Do not teach infrastructure primarily through documentation.

Teach it through consequences.

The learner should be able to see:

User request
    ↓
DNS
    ↓
CDN
    ↓
Load Balancer
    ↓
Application
    ↓
Cache
    ↓
Database
    ↓
Storage

and understand what happens when one component becomes:

* overloaded
* unavailable
* misconfigured
* expensive
* slow
* insecure
* incorrectly scaled

⸻

1.2 Target users

Beginner

Has basic knowledge of:

* HTML
* CSS
* JavaScript
* basic Git
* basic HTTP

Should be able to start without knowing:

* Linux administration
* Docker
* AWS
* Kubernetes
* networking
* distributed systems

Junior engineer

Should learn:

* backend deployment
* databases
* caching
* Docker
* reverse proxies
* CI/CD
* monitoring
* logging
* scaling
* production debugging

Mid-level engineer

Should learn:

* load balancing
* horizontal scaling
* replicas
* queues
* failure domains
* caching strategies
* database scaling
* networking
* capacity planning
* observability
* cloud architecture

Senior-level learner

Should practice:

* architecture trade-offs
* reliability
* distributed systems
* multi-region architecture
* disaster recovery
* consistency
* availability
* security
* cost optimization
* performance engineering
* incident response

The system must never assume that “senior” means “use Kubernetes/AWS.”

Complexity must be justified by requirements.

⸻

2. Product Goals

The product must teach the learner to answer:

What should I build?

Where should I deploy it?

How should I configure it?

Why does this architecture work?

When does it stop working?

How do I know what broke?

What are my possible fixes?

What are the trade-offs?

How much does each architecture cost?

How do I make the system more reliable?

How do I know when additional complexity is unnecessary?

⸻

3. Non-Goals

Do NOT initially attempt to build:

* a real cloud provider
* a complete Linux kernel emulator
* a complete AWS clone
* production Kubernetes
* a real-world cloud billing integration
* a full IDE
* multiplayer
* 3D graphics
* realistic physical data centers
* unrestricted arbitrary code execution
* a perfect network simulator
* an AI tutor that controls the entire experience

The simulation should be conceptually realistic, not necessarily physically identical to real infrastructure.

⸻

4. Core Experience

The entire product revolves around a visual infrastructure world.

Example:

                         INTERNET
                             │
                             ▼
                    ┌────────────────┐
                    │      DNS       │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │      CDN       │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ LOAD BALANCER  │
                    └───────┬────────┘
                       ┌────┴────┐
                       ▼         ▼
                    APP-01    APP-02
                       │         │
                       └────┬────┘
                            ▼
                         REDIS
                            │
                            ▼
                       POSTGRES

This is not merely a diagram.

Every node has:

* state
* resources
* cost
* health
* configuration
* logs
* metrics
* dependencies
* failure modes

Connections have:

* latency
* bandwidth
* packet loss
* throughput
* availability

The system is alive.

⸻

5. Visual Direction

5.1 Initial technology

Use a 2D procedural graphical world.

Stack:
* React (UI Shell & HUD)
* TypeScript
* HTML5 Canvas (High-DPI / Retina scaled 2D context for simulation world)
* CSS for HUD / Inspector UI
* Native requestAnimationFrame interpolation (no heavy external tweening libraries)

Architecture:
* Pure Canvas 2D for the simulation canvas: handles nodes, connection lines, animated packet particles, and selection highlights at steady 60-120 FPS.
* World-to-Screen coordinate transform matrix (camera: pan X/Y, zoom level 0.25x to 3.0x).
* HTML/React UI Overlay: Top Bar, Inspector Panel, Event Drawer, and Simulation Controls live as clean DOM elements over the canvas.

Do not use a heavy 3D engine or full DOM-based graph renderers initially.

The infrastructure visualization should feel like:
* a strategy game
* a systems diagram
* a miniature living world

rather than an enterprise dashboard.

⸻

5.2 Visual hierarchy

The learner should always understand:

WORLD
  ↓
INFRASTRUCTURE
  ↓
SERVICE
  ↓
RESOURCE
  ↓
REQUEST
  ↓
FAILURE

Example zoom levels:

Level 1

Internet
Datacenter
Cloud
VPS

Level 2

Load Balancer
App
Database
Cache
Storage

Level 3

CPU
RAM
Disk
Network
Processes
Connections

Level 4

Request
Response
Query
Cache hit
Cache miss
Error

⸻

6. Visual Behavior

Everything important should be visually observable.

Examples:

Request

A small animated packet moves:

USER → CDN → LB → APP → DB

Database query

A separate request travels from application to database.

Cache hit

The request takes a shorter path.

Cache miss

The request continues toward the database.

CPU overload

Machine visual becomes increasingly busy.

Memory pressure

Memory indicator increases and eventually causes:

swap
↓
latency
↓
OOM
↓
process crash

Network congestion

Connections visibly become slower.

Server failure

The machine becomes unavailable.

Recovery

Traffic is redirected and the system recovers.

Visual feedback should reinforce the underlying concept.

⸻

7. User Interface

The UI should have five major areas.

┌─────────────────────────────────────────────────────┐
│ TOP BAR                                             │
│ Scenario | Time | Money | Health | Requests        │
├───────────────────────┬─────────────────────────────┤
│                       │                             │
│                       │     INSPECTOR               │
│                       │                             │
│   SIMULATION WORLD    │     Selected component      │
│                       │                             │
│                       │     Metrics                 │
│                       │     Config                  │
│                       │     Logs                    │
│                       │     Cost                    │
│                       │                             │
├───────────────────────┴─────────────────────────────┤
│ EVENT / LOG / ALERT PANEL                           │
├─────────────────────────────────────────────────────┤
│ CONTROLS                                            │
│ Pause | Play | Speed | Traffic | Inject Failure    │
└─────────────────────────────────────────────────────┘

⸻

8. Simulation Controls

Provide:

* Pause
* Play
* 0.5×
* 1×
* 2×
* 5×
* 10×
* Step simulation

The learner must be able to pause the world while diagnosing a failure.

⸻

9. Core Simulation Engine

The simulation must be deterministic when given the same:
* scenario
* seed
* configuration
* actions

This makes debugging, automated testing, and replay possible.

Timing & Tick Model:
* Fixed-timestep tick loop: 20 Hz (50ms per simulation tick).
* Decoupled from rendering: The engine ticks deterministically regardless of display refresh rate (60Hz, 120Hz, 144Hz).
* Simulation speeds (0.5×, 1×, 2×, 5×, 10×) simply adjust the number of fixed ticks processed per real-time second.
* Snapshot emission: At each tick, the engine produces an immutable state snapshot for the UI and Canvas renderer.
* Visual interpolation: The Canvas render loop uses delta time between the previous and current snapshot to interpolate moving packets smoothly at full screen refresh rate.

Architecture:

SimulationEngine
├── World
├── Clock (Fixed 20 Hz accumulator)
├── EventQueue
├── TrafficEngine
├── NetworkEngine
├── ResourceEngine
├── ServiceEngine
├── FailureEngine
├── MetricsEngine
├── CostEngine
└── EventLogger

⸻

10. Entity Model

Every infrastructure component is an entity.

Base interface concept:

interface InfrastructureEntity {
  id: string;
  type: EntityType;
  name: string;
  status: HealthStatus;
  resources: ResourceState;
  configuration: Record<string, unknown>;
  dependencies: string[];
  metrics: Metrics;
  cost: CostState;
}

Entity types should eventually include:

User
Internet
DNS
CDN
LoadBalancer
Server
VM
Container
Process
Application
API
Cache
Database
DatabaseReplica
Queue
ObjectStorage
BlockStorage
Volume
Network
Subnet
Router
Firewall
Gateway
Monitoring
LogService
Backup
Region
AvailabilityZone

⸻

11. Resource Model

Every compute resource should track:

CPU
RAM
Disk
Network
Connections
Power/Cost

Example:

{
  "cpu": {
    "capacity": 4,
    "used": 3.2
  },
  "memory": {
    "capacity": 8192,
    "used": 7168
  },
  "disk": {
    "capacity": 100000,
    "used": 42000
  },
  "network": {
    "bandwidthMbps": 1000,
    "usedMbps": 620
  }
}

⸻

12. Health Model

Health is not binary.

Use:

HEALTHY
DEGRADED
OVERLOADED
FAILING
DOWN
RECOVERING

A system can remain technically available while being degraded.

Example:

HTTP 200
Latency: 4.8s
CPU: 99%

This should be represented as:

DEGRADED

not healthy.

⸻

13. Traffic Simulation

Traffic is one of the primary game mechanics.

Traffic sources:

Normal users

GET /
GET /products
GET /api/products
POST /login

Bots

high-frequency GET requests
scrapers
crawlers

Attackers

Simulated attacks should remain abstract and educational.

Examples:

* request flooding
* connection exhaustion
* abnormal traffic spikes
* expensive endpoint abuse
* repeated authentication attempts

Do not implement real offensive attack tooling.

The goal is understanding system resilience.

⸻

14. Traffic Parameters

Traffic should be configurable:

Requests/sec
Concurrent users
Request size
Response size
Read/write ratio
Endpoint distribution
Geographic distribution
Bot percentage
Attack percentage
Traffic burst

Example:

Users: 10,000
Requests/sec: 1,200
Read: 95%
Write: 5%
Bots: 8%
Attack traffic: 2%

⸻

15. Request Lifecycle

Every request follows a route.

Example:

User
 ↓
DNS
 ↓
CDN
 ↓
LoadBalancer
 ↓
Application
 ↓
Cache
 ↓
Database
 ↓
Application
 ↓
LoadBalancer
 ↓
CDN
 ↓
User

The engine calculates:

latency
status
resource consumption
cost
errors

⸻

16. Metrics

Every relevant component exposes metrics.

Minimum:

CPU utilization
Memory utilization
Disk utilization
Network utilization
Requests/sec
Errors/sec
Latency
p50
p95
p99
Throughput
Connections
Queue depth
Cache hit rate
Database queries
Database connections

Metrics should be available visually and historically.

⸻

17. Logs

Every service should produce simplified but realistic logs.

Example:

12:31:04 INFO  request GET /products 200 42ms
12:31:05 INFO  request GET /products 200 38ms
12:31:08 WARN  database latency 840ms
12:31:09 WARN  connection pool 92%
12:31:10 ERROR database connection timeout

Logs should be searchable.

Eventually support:

* filtering
* severity
* service
* timestamp
* keyword

⸻

18. Cost Simulation

Every infrastructure component has a simulated cost.

Cost categories:

Compute
Storage
Bandwidth
Requests
Database
Load balancing
CDN
Monitoring
Backups
IP/networking
Managed services

Cost must update based on usage where appropriate.

Example:

Monthly estimate
Compute             $12.40
Database            $18.20
Storage              $2.10
Bandwidth            $4.30
Monitoring           $1.40
───────────────────────────
TOTAL               $38.40

The exact real-world pricing model should be abstracted.

The goal is architectural cost reasoning, not billing accuracy.

⸻

19. Architecture Recommendation Engine

The game must recommend architectural options without forcing a single answer.

For every problem:

PROBLEM
  ↓
WHY IT HAPPENED
  ↓
POSSIBLE SOLUTIONS
  ↓
TRADE-OFFS
  ↓
RECOMMENDED OPTIONS

Example:

⚠ Database overloaded
Cause:
Too many read queries.
Solutions:
1. Add cache
2. Add read replica
3. Optimize queries
4. Upgrade database
5. Add connection pooling

Each solution contains:

Cost
Complexity
Reliability
Performance
Scalability
Operational burden
When to use
When NOT to use

⸻

20. Engineering Judgment

The game must sometimes recommend doing nothing.

Example:

Current system:
100 users
50 req/sec
2 CPU
4GB RAM
Kubernetes:
❌ unnecessary complexity

The learner should understand:

More infrastructure does not automatically mean better engineering.

⸻

21. Scenario System

Scenarios are data-driven.

Do not hard-code scenarios into UI components.

Structure:

/scenarios
  /01-static-site
  /02-database
  /03-backend
  /04-cache
  /05-load-balancing
  ...

Each scenario should define:

id:
title:
description:
difficulty:
prerequisites:
startingState:
objectives:
events:
failureModes:
availableSolutions:
successCriteria:
learningObjectives:

⸻

22. Learning Path

The learning path should be represented as a graph.

FOUNDATIONS
     │
     ▼
STATIC WEBSITE
     │
     ▼
DEPLOYMENT
     │
     ▼
HTTP + DNS
     │
     ├──────────────┐
     ▼              ▼
BACKEND          CDN
     │
     ▼
DATABASE
     │
     ▼
CACHE
     │
     ▼
CONTAINERIZATION
     │
     ▼
CI/CD
     │
     ▼
OBSERVABILITY
     │
     ▼
LOAD BALANCING
     │
     ▼
SCALING
     │
     ▼
DISTRIBUTED SYSTEMS

Learning paths must be editable through scenario metadata.

Do not require code changes to reorder or add learning modules.

⸻

23. Learning Module Structure

Each module should contain:

Concept
↓
Simple explanation
↓
Interactive demonstration
↓
Guided scenario
↓
Failure
↓
Diagnosis
↓
Multiple solutions
↓
Free-form challenge
↓
Assessment

⸻

24. Teaching Style

Never begin with jargon.

Bad:

Configure horizontal pod autoscaling based on CPU utilization.

Good:

Your application is receiving more requests than one machine can handle.

Then:

One way to solve this is to run multiple copies of the application.

Then introduce:

This is called horizontal scaling.

Then:

Kubernetes can automate this, but it isn’t always necessary.

The learner should discover the concept before being given the terminology.

⸻

25. Difficulty Model

Each scenario should have:

Concept complexity
Operational complexity
Failure complexity
Architecture complexity

Difficulty should increase progressively.

⸻

26. Phase 1 — Simulation Foundation

Goal

Create the visual world and simulation engine.

Build:

* React application
* TypeScript
* 2D world
* pan/zoom
* entities
* connections
* simulation clock
* pause/play
* selection
* inspector
* metrics
* event system

Create only:

Internet
Server
User

Implement:

User → Server → Response

No database.

No Docker.

No cloud.

No AI.

⸻

27. Phase 2 — Static Website

Scenario:

Deploy a static website.

Components:

User
DNS
StaticHost

Deployment options:

Static hosting
VPS
Cloud object storage

Simulate:

* requests
* bandwidth
* latency
* traffic
* cost

Failure examples:

traffic spike
bandwidth limit
server overload
server unavailable

Teach:

* hosting
* DNS
* HTTP
* latency
* bandwidth
* availability

⸻

28. Phase 3 — Traffic & Failure Engine

Add:

TrafficGenerator
BotTraffic
AttackTraffic
FailureInjector

Add:

CPU pressure
RAM pressure
network saturation
connection saturation
request queue
latency
errors

Implement controlled failures.

Example:

Traffic:
100 req/s → 1000 req/s
Server:
CPU 45% → 100%
Latency:
50ms → 2400ms
Result:
system degraded

⸻

29. Phase 4 — Backend

Add:

Frontend
Backend/API

Architecture:

User
 ↓
Frontend
 ↓
API

Teach:

* frontend/backend separation
* API requests
* server-side processing
* environment variables
* ports
* processes

Failures:

API overloaded
API unavailable
slow endpoint
connection saturation

⸻

30. Phase 5 — Database

Add:

PostgreSQL-like database

Architecture:

User
 ↓
Frontend
 ↓
Backend
 ↓
Database

Simulate:

queries
connections
reads
writes
storage
locks
latency

Failures:

database CPU saturation
memory pressure
connection exhaustion
slow queries
storage exhaustion

Solutions:

query optimization
indexes
connection pooling
larger database
cache
replica

⸻

31. Phase 6 — Caching

Add:

Redis-like cache

Architecture:

Backend
   │
   ├── Cache HIT → response
   │
   └── Cache MISS
          ↓
       Database

Teach:

* caching
* cache hit/miss
* TTL
* invalidation
* stale data
* memory limits

⸻

32. Phase 7 — Containers

Add:

Docker-like container runtime

Users should be able to:

create container
configure image
configure ports
configure CPU
configure RAM
mount volume
connect network
start
stop
restart

Teach:

* containers
* images
* ports
* volumes
* environment variables
* isolation

Do not initially emulate the Docker engine completely.

Model the important concepts.

⸻

33. Phase 8 — VPS Architecture

Introduce:

VPS

The learner chooses:

CPU
RAM
Disk
OS
Region
Network

Deployment choices:

bare metal-ish process
Docker
reverse proxy
Docker Compose

Teach:

* server administration
* SSH
* processes
* ports
* firewall
* reverse proxy
* resource management

⸻

34. Phase 9 — Reverse Proxy & Load Balancer

Add:

Nginx-like reverse proxy

Then:

Load Balancer

Architecture:

             Load Balancer
              /        \
          APP-01      APP-02

Teach:

* horizontal scaling
* health checks
* routing
* sticky sessions
* failover
* redundancy

Failure:

APP-01 dies

System should automatically route traffic to APP-02 if configured correctly.

⸻

35. Phase 10 — Storage

Add:

Block Volume
Object Storage
Local Disk

Teach:

* ephemeral vs persistent data
* volumes
* backups
* object storage
* storage capacity
* durability

⸻

36. Phase 11 — Database Replication

Add:

Primary
Read Replica

Architecture:

              Backend
             /       \
         Writes      Reads
            │          │
            ▼          ▼
         Primary    Replica

Teach:

* replication
* read scaling
* replication lag
* failover
* consistency

⸻

37. Phase 12 — Queues & Asynchronous Processing

Add:

Queue
Worker

Architecture:

API
 │
 ▼
Queue
 │
 ├── Worker 1
 ├── Worker 2
 └── Worker 3

Teach:

* asynchronous work
* background jobs
* retries
* dead-letter queues
* backpressure

⸻

38. Phase 13 — CI/CD

Introduce:

Git
 ↓
Build
 ↓
Test
 ↓
Deploy

Teach:

* commits
* branches
* build
* tests
* deployment
* rollback
* deployment failures

⸻

39. Phase 14 — Observability

Add:

Metrics
Logs
Traces
Alerts

Teach:

Monitoring ≠ Logging
Logging ≠ Tracing

Create incident scenarios.

Example:

Users report slow requests.
Dashboard:
CPU normal
RAM normal
DB normal
Tracing:
API → external service = 2.4 seconds

Learner must investigate.

⸻

40. Phase 15 — Networking

Introduce:

VPC
Subnet
Private Network
Public Network
Firewall
Gateway
NAT

Visualize:

              INTERNET
                  │
             Public subnet
                  │
             Load Balancer
                  │
          ┌───────┴───────┐
          │ Private subnet│
          │               │
        APP-01          APP-02
          │               │
          └───────┬───────┘
                  │
               DATABASE

Teach:

* public/private networking
* ports
* routing
* firewall rules
* security boundaries

⸻

41. Phase 16 — Cloud Architecture

Introduce abstract cloud providers.

Do not make the product dependent on one provider.

Providers:

Vercel-like
Netlify-like
Generic VPS
AWS-like

Eventually optionally:

GCP-like
Azure-like

Each provider has:

Compute
Storage
Networking
Database
Serverless
CDN
Monitoring

The learner chooses based on requirements.

⸻

42. Serverless

Teach serverless only when appropriate.

Example:

Simple API
Low traffic
Bursty workload

Compare:

VPS
Container
Serverless
Managed service

Show:

Cost
Cold starts
Control
Complexity
Scaling
Operational burden

⸻

43. Kubernetes

Kubernetes should appear only when the learner has encountered the problems Kubernetes solves.

First show:

Manual containers
 ↓
Multiple containers
 ↓
Multiple machines
 ↓
Deployment complexity
 ↓
Failure recovery
 ↓
Scheduling problem

Then:

There are systems designed to automate these problems.

Introduce Kubernetes.

Teach:

Cluster
Node
Pod
Deployment
Service
Ingress
ConfigMap
Secret
Volume
Autoscaling

Do not turn Kubernetes into a checklist.

⸻

44. AWS-like Architecture

Eventually introduce services analogous to:

Compute
Object Storage
Managed Database
Load Balancer
CDN
DNS
Queues
Monitoring
Container Runtime
Container Orchestration
Serverless

Do not require exact provider APIs.

Teach architectural concepts first.

⸻

45. Architecture Comparison

Every scenario should support comparison.

Example:

Requirement:
10,000 users
500 req/s
99.9% availability
$50/month budget

Compare:

Architecture	Cost	Complexity	Reliability	Scalability
Single VPS	Low	Low	Low	Low
2 VPS + LB	Medium	Medium	High	Medium
Managed cloud	Medium/High	Medium	High	High
Kubernetes	High	Very High	High	Very High

The game should explain why.

⸻

46. Scenario Failure Design

Every major scenario should contain at least:

Easy failure
Medium failure
Complex failure

Example:

Easy

Server CPU overload.

Medium

Database connection exhaustion.

Complex

Cache failure causes database overload which causes application latency which causes load balancer health checks to fail.

The learner must identify the root cause rather than treating every symptom.

⸻

47. Root Cause Analysis

Incidents should distinguish:

Symptom
Cause
Root cause
Contributing factor

Example:

SYMPTOM
Website is slow.
↓
CAUSE
Database latency increased.
↓
ROOT CAUSE
Connection pool exhausted.
↓
CONTRIBUTING FACTOR
Traffic increased 5×.

⸻

48. Incident System

Every incident should provide:

Timeline
Metrics
Logs
Architecture
Alerts
User reports

The learner must investigate.

Eventually score:

Detection
Diagnosis
Solution
Reliability
Cost
Complexity
Recovery time

⸻

49. Multiple Solutions

Never force one solution unless technically necessary.

Example:

Problem:
Application overloaded.

Possible:

A. Bigger server
B. More servers
C. Cache
D. Optimize application
E. Queue work
F. CDN

Each solution must explain:

Advantages
Disadvantages
Cost
Complexity
Limitations
Best use case

⸻

50. Architectural Consequences

Every decision should modify the simulation.

Example:

Add CDN

Results:

Origin requests ↓
Bandwidth ↓
Latency ↓
Cost ↑ slightly
Cache invalidation complexity ↑

Example:

Add replica

Results:

Read capacity ↑
Database cost ↑
Replication lag introduced
Operational complexity ↑

The learner must experience the trade-off.

⸻

51. Optimization Challenges

Introduce explicit challenges:

Cost optimization

Reduce monthly cost by 30% while maintaining 99.9% availability.

Performance

Keep p95 latency below 200ms.

Reliability

Survive any single application server failure.

Scale

Handle 10× current traffic.

Recovery

Restore the system within 5 minutes.

Security

Prevent public access to the database.

⸻

52. Gamification

Gamification should reward understanding, not clicking.

Possible progression:

XP
Badges
Achievements
Scenario completion
Architecture score
Reliability score
Cost score
Performance score

Example achievements:

First Deployment
First Incident
First Database
First Backup
Zero Downtime Deployment
Survived 10× Traffic
First Replica
First Load Balancer
First Disaster Recovery
Cost Optimizer
Production Ready

⸻

53. Architecture Score

Each project receives:

Performance       82
Reliability       71
Security          64
Cost              91
Scalability       76
Complexity        84
Observability     55

Do not collapse everything into one score.

The learner should see trade-offs.

⸻

54. Sandbox Mode

After completing guided scenarios, unlock sandbox mode.

The learner starts with:

Budget
Requirements
Traffic
Availability target

Then builds whatever architecture they want.

Example:

Budget: $100/month
Traffic: 1000 req/s
Availability: 99.9%
Region: 1

The learner creates the system freely.

⸻

55. Challenge Generator

Eventually generate architecture challenges.

Example:

Build a system for:
100k daily users
5k peak requests/sec
95% reads
5% writes
Requirements:
99.9% availability
<$200/month
Backup every 6 hours
Recovery within 1 hour

The learner designs the architecture.

⸻

56. Progressive Realism

The simulation should have three levels.

Conceptual

Abstract:

Server
Database
Cache

Intermediate

Expose:

CPU
RAM
ports
connections
latency
storage

Advanced

Expose:

connection pools
replication lag
queue depth
failure domains
network latency
packet loss
capacity

The same concept becomes deeper as the learner progresses.

⸻

57. Real vs Simulated Infrastructure

The simulation must clearly distinguish:

SIMULATED

from:

REAL

The product should never imply that simulated AWS pricing, Linux behavior, or networking is production-accurate.

Use educational abstractions.

⸻

58. Optional Real Integration — Future

A future advanced mode may allow:

Deploy this architecture to a real VPS.

Potential integrations:

* Docker
* SSH
* GitHub
* cloud providers

This is NOT part of the initial product.

Keep the simulation engine independent so real execution can be added later.

⸻

59. Architecture

Recommended high-level structure:

apps/
  web/
packages/
  simulation/
  entities/
  scenarios/
  learning/
  metrics/
  networking/
  traffic/
  failures/
  costs/
  recommendations/
  ui/
  shared/

Core separation:

React UI
   │
   ▼
Application State
   │
   ▼
Simulation Engine
   │
   ├── Traffic
   ├── Network
   ├── Resources
   ├── Services
   ├── Failures
   ├── Metrics
   └── Cost

The simulation engine must NOT depend on React.

⸻

60. State Management

Use a predictable state architecture.

Recommended:

Zustand

or another lightweight state manager.

Keep simulation state separate from UI state.

Example:

Simulation State
- entities
- connections
- metrics
- events
- time
- scenario
- budget
UI State
- selected entity
- panels
- zoom
- camera
- modal state

⸻

61. Persistence

Save projects locally initially.

Use:

IndexedDB

or another browser-native persistence layer.

Project format:

{
  "version": 1,
  "scenario": "static-site",
  "seed": 12345,
  "entities": [],
  "connections": [],
  "configuration": {},
  "progress": {},
  "metrics": {}
}

Version saved projects.

Future versions may migrate older saves.

⸻

62. Scenario Schema

Example:

id: static-site-traffic
title: Keep The Website Online
difficulty: beginner
prerequisites:
  - html
  - http
  - dns
startingBudget: 20
learningObjectives:
  - understand static hosting
  - understand traffic
  - understand bandwidth
  - diagnose overload
startingState:
  entities:
    - id: user-group-1
      type: user
      count: 100
      position: { x: 100, y: 300 }
    - id: host-1
      type: static_host
      cpu: 2
      memory: 4096
      position: { x: 500, y: 300 }
  connections:
    - from: user-group-1
      to: host-1
      bandwidthMbps: 100
      latencyMs: 25
events:
  - type: traffic_increase
    atTick: 1200
    multiplier: 5
failureModes:
  - cpu_overload
  - bandwidth_saturation
solutions:
  - scale_vertically
  - add_cdn
  - add_second_server
evaluation:
  successConditions:
    - type: sustain_traffic
      durationTicks: 600
      minRps: 500
      maxErrorRate: 0.01
    - type: budget_limit
      maxCost: 25
  failureConditions:
    - type: continuous_downtime
      maxConsecutiveDownTicks: 200
    - type: budget_exceeded
      maxCost: 40

⸻

63. Event System

Everything in the simulation should be event-driven.

Examples:

REQUEST_STARTED
REQUEST_COMPLETED
REQUEST_FAILED
SERVER_STARTED
SERVER_STOPPED
SERVER_FAILED
DATABASE_QUERY
DATABASE_SLOW
CACHE_HIT
CACHE_MISS
TRAFFIC_CHANGED
RESOURCE_THRESHOLD_REACHED
INCIDENT_STARTED
INCIDENT_RESOLVED

This makes replay and debugging easier.

⸻

64. Rules Engine

Avoid hardcoding behavior everywhere.

Create rules such as:

if CPU > 90%
    latency increases
if RAM > 95%
    process failure probability increases
if disk > 90%
    write latency increases
if network > bandwidth
    packet delay increases
if database connections >= max
    queries queue
if cache hit rate increases
    database traffic decreases

Rules should be composable.

⸻

65. Failure Engine

Failures must be controllable.

Each failure:

interface FailureDefinition {
  id: string;
  targetTypes: EntityType[];
  trigger:
    | "manual"
    | "traffic"
    | "time"
    | "probability"
    | "threshold";
  effects: Effect[];
  symptoms: Symptom[];
  rootCauses: string[];
  recoveryConditions: RecoveryCondition[];
}

⸻

66. AI / Assistant Layer

AI should NOT control the simulation.

It can eventually provide:

* explanations
* hints
* architecture reviews
* debugging guidance
* post-incident summaries

The simulation itself must remain deterministic.

The learner should be able to complete scenarios without AI.

⸻

67. Hint System

Hints should be progressive.

Hint 1

Something is consuming too many resources.

Hint 2

Check the application’s CPU utilization.

Hint 3

CPU is saturated because traffic increased.

Hint 4

You could scale vertically or horizontally.

Hint 5

Compare the cost and reliability of both approaches.

Do not reveal the answer immediately.

⸻

68. Explanation System

Every component has a simple explanation.

Example:

Load Balancer

A load balancer distributes incoming requests across multiple application servers.

Then:

Why use it?

One server may not be enough.

What does it solve?

Traffic distribution and availability.

What does it NOT solve?

A broken database.

This format should be used throughout the product.

⸻

69. Glossary

Every technical term should be clickable.

Example:

Horizontal scaling

opens:

Horizontal scaling means adding more machines or application instances
instead of making one machine larger.

With visual demonstration.

⸻

70. Roadmap Alignment

Use established engineering learning paths as curriculum references.

Relevant areas include:

Frontend
Backend
Full Stack
DevOps
Docker
Kubernetes
AWS
Networking
Databases
System Design
SRE
Security

Do not blindly reproduce another roadmap.

Translate concepts into interactive experiences.

⸻

71. Project Lifecycle

The learner should eventually experience the entire lifecycle:

IDEA
 ↓
REQUIREMENTS
 ↓
ARCHITECTURE
 ↓
DEVELOPMENT
 ↓
GIT
 ↓
TESTING
 ↓
BUILD
 ↓
DEPLOYMENT
 ↓
MONITORING
 ↓
TRAFFIC
 ↓
INCIDENT
 ↓
DEBUGGING
 ↓
SCALING
 ↓
OPTIMIZATION
 ↓
BACKUP
 ↓
DISASTER RECOVERY
 ↓
MAINTENANCE
 ↓
ITERATION

⸻

72. Product Scenario Progression

The canonical progression should be:

01 Hello World
02 Static Website
03 DNS + HTTP
04 Deployment
05 Traffic Simulation
06 Backend
07 Database
08 Caching
09 Authentication
10 Docker
11 VPS
12 Reverse Proxy
13 Load Balancer
14 Multiple App Servers
15 Persistent Storage
16 Database Replication
17 Queues
18 CI/CD
19 Monitoring
20 Logging
21 Networking
22 Cloud Services
23 Serverless
24 Autoscaling
25 Kubernetes
26 Distributed Systems
27 High Availability
28 Disaster Recovery
29 Multi-Region
30 Cost Optimization
31 Security
32 Production Architecture

This is a starting curriculum, not a rigid final list.

⸻

73. Authentication Scenario

Eventually introduce:

User
 ↓
Frontend
 ↓
Auth
 ↓
Backend
 ↓
Database

Teach:

* sessions
* tokens
* cookies
* secrets
* rate limiting
* authentication failures

Do not teach offensive security techniques.

⸻

74. Security Model

Security should be represented through architecture.

Teach:

Public vs Private
Firewall
Secrets
Least privilege
Database isolation
TLS
Authentication
Authorization
Backups
Audit logs
Rate limiting

Example incident:

Database is publicly reachable.

The learner must fix the network architecture.

⸻

75. Disaster Recovery

Introduce:

Backup
Restore
Replication
Failover
Recovery Point Objective
Recovery Time Objective

Challenge:

Database has been destroyed. Recover the application.

Measure:

RTO
RPO
data loss
recovery cost

⸻

76. Production Readiness Review

At the end of advanced projects:

Production Readiness
Architecture      PASS
Performance       PASS
Reliability       WARN
Security          FAIL
Observability     PASS
Backups           FAIL
Cost              PASS

Each item should explain why.

⸻

77. Endgame

The final learner should be able to receive a vague requirement:

Build a production system for a growing application.

Then independently:

1. Identify requirements.
2. Estimate traffic.
3. Choose architecture.
4. Select infrastructure.
5. Deploy.
6. Monitor.
7. Handle failures.
8. Scale.
9. Optimize.
10. Explain trade-offs.

The game should stop holding the learner’s hand.

⸻

78. Freeform Architecture Mode

Advanced mode provides:

Unlimited components
Budget
Traffic generator
Failure generator
Metrics
Logs
Architecture review

The learner creates arbitrary architectures.

⸻

79. Evaluation

Do not evaluate solely on whether the system works.

Evaluate:

Correctness
Performance
Reliability
Security
Cost
Complexity
Maintainability
Observability
Scalability

Example:

Architecture A
Cost:        95
Performance: 70
Reliability: 50
Complexity:  95
Architecture B
Cost:        70
Performance: 90
Reliability: 90
Complexity:  65

There should not always be a single “correct” architecture.

⸻

80. Engineering Principles

The implementation must follow:

Separation of concerns

Simulation, UI, scenarios, learning, and recommendations must be independent.

Data-driven design

Scenarios should be configuration-driven.

Determinism

Simulation should be reproducible.

Extensibility

Adding a new infrastructure component should not require rewriting the engine.

Testability

Simulation rules must be unit-testable without rendering the UI.

Accessibility

Important information cannot rely solely on color or animation.

Performance

The visualization must remain responsive with hundreds/thousands of simulated entities where practical.

⸻

81. Testing Strategy

Unit tests:

resource calculations
traffic routing
latency
failures
costs
health
scenarios
recommendations

Integration tests:

User → LB → App → DB

Scenario tests:

Given scenario X
When traffic reaches Y
Then application becomes degraded

Deterministic simulation tests are mandatory.

⸻

82. Performance Requirements

Initial target:

60 FPS visual interaction where practical

Simulation should be decoupled from rendering.

Do not update React state for every simulated packet.

Use:

simulation tick
→ aggregate state
→ render snapshot

Instead of:

packet
→ React state update
→ packet
→ React state update

⸻

83. Visual Performance

For large traffic volumes:

Do not render one object per real request.

If simulation says:

10,000 requests/sec

represent them visually as aggregated traffic.

Example:

Traffic flow:
████████████████████████

while allowing individual request inspection when needed.

⸻

84. Responsive Design

Desktop is the primary target.

Minimum:

1280×720

The simulation should remain usable at:

1440×900
1920×1080

Mobile support can come later.

⸻

85. Accessibility

Provide:

* keyboard navigation
* readable text
* non-color indicators
* textual event logs
* pause controls
* reduced-motion option
* clear status labels

⸻

86. Visual Language

Infrastructure types should have consistent visual identities.

Example:

🖥 Compute
🗄 Database
⚡ Cache
🌐 Network
📦 Container
💾 Storage
🔀 Load Balancer
📊 Monitoring

These are conceptual placeholders.

Final visual assets should be custom-designed.

Avoid relying entirely on emoji in the final product.

⸻

87. World Design

The simulation world should feel alive.

Use:

animated traffic
resource activity
health indicators
status changes
notifications
small environmental effects

But never let decoration obscure the architecture.

Visuals are secondary to comprehension.

⸻

88. Information Density

Avoid showing everything at once.

Default view:

Architecture
Health
Traffic
Major metrics

Clicking a component reveals:

Detailed metrics
Configuration
Logs
Dependencies
Cost
Recommendations

Advanced learners can enable additional overlays.

⸻

89. Beginner Mode

Beginner mode hides unnecessary details.

Example:

Instead of:

TCP connections
ephemeral ports
connection pools

show:

Your server cannot accept more requests.

Advanced mode reveals the underlying mechanics.

⸻

90. Advanced Mode

Expose:

connections
ports
latency
queues
replication lag
CPU allocation
memory pressure
disk I/O
network throughput

The same simulation powers both modes.

⸻

91. Scenario Authoring

Create an internal authoring format so new scenarios can be added without modifying core code.

Scenario author should define:

starting architecture
available components
requirements
events
failures
solutions
learning objectives
evaluation criteria

Eventually build a Scenario Editor.

⸻

92. Scenario Editor — Future

Internal tool:

Canvas
+
Component palette
+
Event timeline
+
Failure editor
+
Objectives
+
Hints
+
Solutions
+
Evaluation

This turns the platform into a curriculum engine.

⸻

93. Recommended Initial Stack

Use:
* TypeScript
* React (v19)
* Vite
* Zustand (for UI selection, camera, and inspector state)
* HTML5 Canvas 2D (Retina/DPI-aware rendering for simulation world)
* Vanilla CSS / Tailwind CSS (Dark theme game HUD)
* Vitest (Headless unit tests for deterministic engine)
* Playwright (E2E browser tests)
* IndexedDB (Local project saves)

Avoid unnecessary heavy runtime dependencies (no Next.js, no GSAP, no 3D engines).

⸻

94. Repository Structure

Phases 0–3 Strategy:
To prevent tooling overhead and premature abstraction, start as a **modular single-workspace project** with strict architectural boundaries. The simulation engine MUST have zero imports from React or UI layers.

Directory Layout:
stackworld/
├── src/
│   ├── engine/          # Pure TypeScript: Clock (20Hz), EventQueue, Traffic, Resources, Cost
│   │                    # STRICT RULE: Zero UI/React imports. Fully unit-testable via Vitest.
│   ├── entities/        # Entity definitions, interfaces, resource profiles
│   ├── world/           # Canvas 2D renderer: Camera, Viewport, Node drawing, Particle pipeline
│   ├── scenarios/       # Declarative scenario definitions, win/fail conditions
│   ├── ui/              # React UI: TopBar, Inspector, ControlBar, EventLog, Modal
│   ├── state/           # Zustand store for UI camera/selection state
│   ├── shared/          # Math, vector utils, types, color palette tokens
│   ├── App.tsx          # Main assembly combining Canvas World + UI HUD
│   └── main.tsx
├── scenarios/           # JSON/YAML scenario definitions
├── docs/                # Architecture and phase specifications
├── tests/               # Vitest engine tests & scenario tests
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts

Future Evolution:
Once core boundaries mature (Phase 4+), this structure cleanly extracts into a pnpm/turborepo monorepo without rewriting any engine logic.

⸻

95. Development Phases

Phase 0 — Project Foundation

Deliver:

* repository
* TypeScript
* React
* test setup
* architecture
* linting
* formatting
* CI
* basic documentation

Acceptance:

npm install
npm run dev
npm test
npm run build

all work.

⸻

Phase 1 — Visual World

Deliver:
* High-DPI HTML5 Canvas renderer with 60 FPS requestAnimationFrame loop
* Camera system: Smooth pan (drag canvas) and zoom (mouse wheel / pinch, 0.25× to 3.0×)
* Interactive entities:
  * Click to select
  * Drag to reposition nodes (with live wire re-routing)
  * Hover highlights and bounding box hit-testing
* Visual connections: Smooth cubic bezier curves with dynamic bandwidth indicators
* Animated packets: Visual request particles traveling along connection curves
* Inspector panel: Shows selected entity metrics (CPU, RAM, latency, status badge)
* Top Bar HUD: Active scenario title, budget, system health, and request counter
* Simulation Controls: Play, pause, step tick, and speed toggles (0.5×, 1×, 2×, 5×)

Entities:
* User
* Internet / Network
* Server (Static host)

Acceptance:
User → Server connection is visually rendered, animated packets flow between them, nodes can be moved and inspected, and simulation can be paused and stepped.

⸻

Phase 2 — Simulation Engine

Deliver:

* simulation clock
* event queue
* request lifecycle
* resources
* health
* deterministic seed

Acceptance:

100 requests can be simulated without manually manipulating UI state.

⸻

Phase 3 — Static Website Scenario

Deliver:

* DNS
* static host
* traffic
* cost
* failure
* guided learning

Acceptance:

A beginner can complete the scenario without external documentation.

⸻

Phase 4 — Diagnosis System

Deliver:

* alerts
* logs
* metrics
* hints
* failure investigation
* multiple solutions

Acceptance:

The learner can diagnose an overloaded server.

⸻

Phase 5 — Backend

Deliver:

* API server
* endpoint model
* backend resource consumption
* frontend/backend architecture

⸻

Phase 6 — Database

Deliver:

* database
* queries
* connections
* storage
* failures
* optimization choices

⸻

Phase 7 — Cache

Deliver:

* cache
* TTL
* hit/miss
* database reduction
* cache failures

⸻

Phase 8 — Containers

Deliver:

* images
* containers
* ports
* resources
* volumes
* container networks

⸻

Phase 9 — VPS

Deliver:

* server configuration
* SSH concept
* processes
* reverse proxy
* Docker deployment
* firewall

⸻

Phase 10 — Load Balancing

Deliver:

* multiple application servers
* health checks
* routing
* failover
* horizontal scaling

⸻

Phase 11 — Storage & Replication

Deliver:

* persistent volumes
* object storage
* database replicas
* replication lag
* backups

⸻

Phase 12 — Queues

Deliver:

* queue
* workers
* retries
* dead-letter queue
* asynchronous processing

⸻

Phase 13 — CI/CD

Deliver:

* Git
* build
* test
* deployment
* rollback

⸻

Phase 14 — Observability

Deliver:

* logs
* metrics
* traces
* dashboards
* alerts
* incident timeline

⸻

Phase 15 — Networking

Deliver:

* networks
* subnets
* firewall
* routing
* gateways
* private services

⸻

Phase 16 — Cloud

Deliver:

* Vercel-like hosting
* Netlify-like hosting
* VPS
* AWS-like services
* architecture comparison
* simulated billing

⸻

Phase 17 — Kubernetes

Deliver:

* cluster
* nodes
* pods
* deployments
* services
* ingress
* volumes
* autoscaling

Only implement after the earlier architecture layers are stable.

⸻

Phase 18 — Advanced Systems

Deliver:

* distributed systems
* multi-region
* consistency
* availability
* disaster recovery
* advanced networking
* advanced failure injection

⸻

Phase 19 — Sandbox

Deliver:

* free architecture builder
* custom traffic
* custom failures
* budget constraints
* architecture scoring

⸻

Phase 20 — Curriculum Completion

Deliver:

* beginner → senior learning path
* progress tracking
* assessments
* final architecture challenges
* production readiness review

⸻

96. Agent Development Rules

Any coding agent working on this repository MUST:

1. Read this spec.md before making changes.
2. Determine the current development phase.
3. Never implement future-phase features unless explicitly requested.
4. Preserve existing architecture.
5. Prefer extending existing abstractions over creating parallel systems.
6. Write tests for simulation behavior.
7. Keep simulation independent from UI.
8. Keep scenarios data-driven.
9. Avoid hardcoded scenario logic inside React components.
10. Keep the product understandable to beginners.
11. Do not introduce infrastructure terminology without explaining it.
12. Do not add dependencies without justification.
13. Do not build real offensive security functionality.
14. Do not claim simulation behavior is production-accurate.
15. Run tests after meaningful changes.
16. Run a production build before completing a phase.
17. Update documentation when architecture changes.
18. Keep visual complexity secondary to comprehension.
19. Never replace a working simple implementation with a complex implementation without a clear reason.
20. Preserve deterministic simulation behavior.

⸻

97. Definition of Done

A phase is complete only when:

Feature implemented
      ↓
Visualized
      ↓
Interactive
      ↓
Scenario exists
      ↓
Learning explanation exists
      ↓
Failure exists
      ↓
At least one solution exists
      ↓
Tests pass
      ↓
Build passes
      ↓
Beginner can understand it

⸻

98. Agent Workflow

For every phase:

Step 1

Read the relevant sections of this specification.

Step 2

Inspect the existing repository.

Step 3

Identify existing abstractions.

Step 4

Write an implementation plan.

Step 5

Implement the smallest complete vertical slice.

Step 6

Add tests.

Step 7

Run the application.

Step 8

Verify the visual experience.

Step 9

Fix regressions.

Step 10

Document what was implemented.

Do not build large amounts of infrastructure before verifying the core interaction.

⸻

99. Vertical Slice Principle

Every new concept should ideally be implemented as:

ENGINE
  +
ENTITY
  +
VISUAL
  +
SCENARIO
  +
FAILURE
  +
SOLUTION
  +
LEARNING
  +
TEST

Example: Database

Database entity
+
database simulation
+
database visual
+
database scenario
+
database failure
+
database fixes
+
database explanation
+
database tests

Do not create an empty database abstraction months before it is actually usable.

⸻

100. First MVP

The first public-quality milestone is intentionally tiny.

It must contain:

ONE WORLD
User
 ↓
DNS
 ↓
Static Website

Then:

Traffic increases
 ↓
Server overloads
 ↓
Metrics show degradation
 ↓
Learner investigates
 ↓
Game presents 3 possible fixes
 ↓
Learner selects one
 ↓
System changes
 ↓
Traffic increases again

The learner should understand:

Hosting
DNS
HTTP
Traffic
CPU
RAM
Latency
Availability
Scaling
Trade-offs

without reading a traditional tutorial.

If this loop is not fun and understandable, stop expanding the project and improve the loop.

⸻

101. Core Design Test

At every stage ask:

Can I understand what is happening by looking at the world?

If the answer is no:

* improve visualization
* simplify terminology
* improve animation
* improve explanations
* reduce information density

Do not solve comprehension problems by adding more documentation.

⸻

102. Ultimate Product Vision

StackWorld eventually becomes a complete interactive engineering journey:

                  STACKWORLD
                     BEGIN
                       │
                       ▼
                 HELLO WORLD
                       │
                       ▼
                STATIC WEBSITE
                       │
                       ▼
                 DEPLOY ONLINE
                       │
                       ▼
                TRAFFIC ARRIVES
                       │
                       ▼
                  SYSTEM BREAKS
                       │
                       ▼
                  FIX IT
                       │
                       ▼
                 ADD BACKEND
                       │
                       ▼
                  ADD DATABASE
                       │
                       ▼
                   ADD CACHE
                       │
                       ▼
                  ADD DOCKER
                       │
                       ▼
                    VPS
                       │
                       ▼
                LOAD BALANCING
                       │
                       ▼
                   REPLICAS
                       │
                       ▼
                  QUEUES
                       │
                       ▼
                   CI/CD
                       │
                       ▼
                OBSERVABILITY
                       │
                       ▼
                  NETWORKING
                       │
                       ▼
                    CLOUD
                       │
                       ▼
                 KUBERNETES
                       │
                       ▼
             DISTRIBUTED SYSTEMS
                       │
                       ▼
              DISASTER RECOVERY
                       │
                       ▼
               COST OPTIMIZATION
                       │
                       ▼
              PRODUCTION SYSTEM
                       │
                       ▼
                 FREE SANDBOX

The learner should finish with the ability to look at an architecture and reason about:

How does it work?
Why was it designed this way?
What happens under load?
What happens when something fails?
How do I detect the failure?
How do I fix it?
What are the alternatives?
What does each option cost?
What complexity does each option introduce?
When should I scale?
When should I NOT scale?
What happens at 10× traffic?
What happens when a machine dies?
What happens when the database dies?
How do I recover?
How do I improve the architecture?

That is the actual goal of StackWorld.

⸻

103. Guiding Principle

Don’t teach the learner what to type. Teach them how to think about the system.

The game should gradually move from:

"Click here to deploy."

to:

"Your system is failing.
Figure out why."

and eventually:

"Here are the requirements.
Design the system."

That progression is the heart of the product.

⸻

104. Immediate Agent Instruction

When starting implementation from an empty repository:

Implement Phase 0 and Phase 1 only.

Do not implement:

* databases
* Docker
* AWS
* Kubernetes
* authentication
* AI
* billing
* advanced networking

until the Phase 1 visual world and Phase 2 simulation foundation are stable.

The first milestone should produce a beautiful, responsive, interactive miniature world containing:

USER
  │
  │ request
  ▼
SERVER
  │
  │ response
  ▼
USER

with:

* animated requests
* server resource usage
* health state
* selectable server
* inspector panel
* simulation clock
* pause/play
* deterministic simulation
* basic metrics
* event log

Everything else builds on this foundation.