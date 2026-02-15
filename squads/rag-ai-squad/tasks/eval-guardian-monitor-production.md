---
task: Monitor Production RAG Pipeline
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - langsmith_project: LangSmith project name or ID for the production RAG pipeline
  - alert_thresholds: Threshold configuration for latency, error rate, quality, and cost alerts
  - monitoring_config: Monitoring configuration including dashboard layout, retention, and sampling
Saida: |
  - dashboard_config: LangSmith dashboard configuration with custom views and charts
  - alert_rules: Alert rule definitions for Slack, email, PagerDuty integration
  - anomaly_detection: Anomaly detection configuration for quality and latency drift
  - runbook: Operational runbook for common production issues and escalation paths
Checklist:
  - "[ ] Define monitoring metrics"
  - "[ ] Setup LangSmith dashboards"
  - "[ ] Configure alerts (latency, errors, quality)"
  - "[ ] Implement anomaly detection"
  - "[ ] Create runbooks"
  - "[ ] Test alert triggers"
  - "[ ] Setup escalation paths"
  - "[ ] Document monitoring setup"
---

# *monitor-production

Setup comprehensive production monitoring for a RAG pipeline using LangSmith. This task configures real-time dashboards for latency, throughput, error rates, cost tracking, and quality metrics. It establishes alert rules with escalation paths, anomaly detection for quality drift, and operational runbooks for incident response.

## Usage

```
*monitor-production                                          # Interactive (default)
*monitor-production langsmith_project="rag-prod"             # Specify project
*monitor-production alert_thresholds="strict"                # Use strict thresholds
*monitor-production langsmith_project="rag-prod" monitoring_config="24x7"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `langsmith_project` | string | yes | — | LangSmith project name for the production pipeline |
| `alert_thresholds` | string/object | no | `standard` | Alert preset: `relaxed`, `standard`, `strict`, or custom JSON |
| `monitoring_config` | string | no | `standard` | Monitoring profile: `basic`, `standard`, `24x7` |

## Monitoring Metrics Framework

### Core Metrics

| Category | Metric | Description | Default Threshold |
|----------|--------|-------------|-------------------|
| **Latency** | P50 latency | Median response time | < 2s |
| **Latency** | P95 latency | 95th percentile response time | < 5s |
| **Latency** | P99 latency | 99th percentile response time | < 10s |
| **Errors** | Error rate | Percentage of failed requests | < 1% |
| **Errors** | Timeout rate | Percentage of timed-out requests | < 0.5% |
| **Quality** | Faithfulness (sampled) | Average faithfulness on sampled traces | >= 0.85 |
| **Quality** | Relevancy (sampled) | Average answer relevancy on sampled traces | >= 0.80 |
| **Quality** | User feedback | Thumbs up/down ratio | >= 0.80 |
| **Cost** | Cost per query | Average LLM cost per request | < $0.05 |
| **Cost** | Daily spend | Total daily LLM spending | < budget |
| **Throughput** | Queries per minute | Request throughput | Baseline +/- 50% |
| **Throughput** | Token usage | Average tokens per request | < 4000 |

### Derived Metrics

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| Quality Score | (faithfulness + relevancy + user_feedback) / 3 | Overall quality indicator |
| Cost Efficiency | quality_score / cost_per_query | Quality per dollar spent |
| Availability | 1 - (error_rate + timeout_rate) | System availability |
| Drift Score | Current quality - baseline quality | Quality degradation detection |

## Interactive Flow

### Step 1: Project Selection

```
ELICIT: Production Project

1. Which LangSmith project are you monitoring?
   [1] Select from available projects
   [2] Enter project name manually

   Your choice? [1/2]:

→ If [1]: Available projects:
   {numbered list of projects}
   Select: _

→ If [2]: Project name: _

2. Current project status:
   Traces (24h):    {count}
   Error rate:      {rate}%
   Avg latency:     {latency}ms
   Last trace:      {timestamp}
```

### Step 2: Dashboard Configuration

```
ELICIT: Dashboard Setup

1. What dashboard views do you need?
   [ ] Overview (key metrics at a glance)
   [ ] Latency (P50/P95/P99 over time)
   [ ] Quality (faithfulness, relevancy trends)
   [ ] Errors (error types, rates, affected queries)
   [ ] Cost (spending, token usage, cost per query)
   [ ] Throughput (queries/min, peak times)
   [ ] User Feedback (ratings, sentiment trends)

   Select views (comma-separated): _

2. Time range for dashboards:
   [1] Last 1 hour
   [2] Last 24 hours (recommended)
   [3] Last 7 days
   [4] Last 30 days
   [5] Custom range

   Your choice? [1/2/3/4/5]:

3. Auto-refresh interval:
   [1] Real-time (every 30 seconds)
   [2] Every 5 minutes
   [3] Every 15 minutes
   [4] Manual refresh only

   Your choice? [1/2/3/4]:
```

### Step 3: Alert Configuration

```
ELICIT: Alert Rules

1. Alert severity levels:
   CRITICAL - Immediate action required (pages on-call)
   WARNING  - Attention needed within 1 hour
   INFO     - Informational, review in daily standup

2. Configure alert thresholds:

   Use preset? (relaxed/standard/strict/custom)

   → If "standard":
     CRITICAL alerts:
       - Error rate > 5%
       - P99 latency > 15s
       - Faithfulness < 0.70 (sampled)
       - Service down > 2 minutes

     WARNING alerts:
       - Error rate > 2%
       - P95 latency > 8s
       - Faithfulness < 0.80 (sampled)
       - Cost per query > $0.10
       - Daily spend > 80% of budget

     INFO alerts:
       - Quality drift > 5% from baseline
       - Throughput anomaly detected
       - New error type detected

   Accept these thresholds? (yes/no)

3. Alert channels:
   [ ] Slack (channel: _)
   [ ] Email (addresses: _)
   [ ] PagerDuty (service: _)
   [ ] Webhook (URL: _)
   [ ] LangSmith notifications

   Select channels (comma-separated): _
```

### Step 4: Anomaly Detection

```
ELICIT: Anomaly Detection

1. Enable anomaly detection? (yes/no)

→ If YES:
  Anomaly detection methods:
  [1] Statistical (standard deviation from baseline)
  [2] Moving average (trend-based detection)
  [3] ML-based (learned patterns)
  [4] Rule-based (manual thresholds only)

  Your choice? [1/2/3/4]:

2. Baseline establishment:
   [1] Use last 7 days as baseline
   [2] Use last 30 days as baseline
   [3] Use specific date range
   [4] Manual baseline values

   Your choice? [1/2/3/4]:

3. Anomaly sensitivity:
   [1] Low  (only flag extreme deviations, > 3 sigma)
   [2] Medium (flag significant deviations, > 2 sigma)
   [3] High (flag any notable deviation, > 1.5 sigma)

   Your choice? [1/2/3]:
```

### Step 5: Quality Sampling

```
ELICIT: Quality Sampling

Production quality evaluation requires sampling traces for evaluation:

1. Sampling rate for quality evaluation:
   [1] 1%  (low cost, less visibility)
   [2] 5%  (balanced, recommended)
   [3] 10% (thorough, higher cost)
   [4] Custom percentage: _%

   Your choice? [1/2/3/4]:

2. Quality evaluation metrics to sample:
   [ ] Faithfulness
   [ ] Answer Relevancy
   [ ] Groundedness
   [ ] User satisfaction correlation

   Select (comma-separated): _

3. Evaluation schedule:
   [1] Real-time (evaluate as traces arrive)
   [2] Batch (evaluate every hour)
   [3] Daily (aggregate daily evaluation)

   Your choice? [1/2/3]:
```

### Step 6: Runbook Creation

```
ELICIT: Operational Runbooks

Creating incident response runbooks...

1. Which scenarios need runbooks?
   [ ] High error rate (> 5%)
   [ ] High latency (P99 > 15s)
   [ ] Quality degradation (faithfulness drop)
   [ ] Cost spike (unexpected billing increase)
   [ ] Complete outage (service unreachable)
   [ ] Hallucination incident (user-reported fabrication)
   [ ] Data freshness issue (stale index)

   Select scenarios (comma-separated): _

2. On-call contacts:
   Primary:   Name: _ , Contact: _
   Secondary: Name: _ , Contact: _
   Escalation: Name: _ , Contact: _

3. Escalation timeline:
   [1] 5 min → primary, 15 min → secondary, 30 min → escalation
   [2] 15 min → primary, 30 min → secondary, 1h → escalation
   [3] Custom timeline

   Your choice? [1/2/3]:
```

### Step 7: Test & Verify

```
ELICIT: Verification

Testing monitoring setup...

1. Dashboard verification:
   - Overview dashboard... [OK/FAIL]
   - Latency dashboard... [OK/FAIL]
   - Quality dashboard... [OK/FAIL]
   - Cost dashboard... [OK/FAIL]

2. Alert testing:
   - Sending test CRITICAL alert... [OK/FAIL]
   - Sending test WARNING alert... [OK/FAIL]
   - Sending test INFO alert... [OK/FAIL]

3. Anomaly detection:
   - Baseline established... [OK/FAIL]
   - Detection model loaded... [OK/FAIL]

All checks passed? Finalize monitoring setup? (yes/no):
```

## Output

On successful completion:

```
Production Monitoring Setup Complete

Project:          {langsmith_project}
Dashboards:       {count} views configured
Alert Rules:      {count} rules active
Anomaly Detection: {enabled/disabled}
Quality Sampling:  {rate}% of traces

Dashboards:
  Overview:   https://smith.langchain.com/o/{org}/projects/p/{id}/dashboard
  Latency:    https://smith.langchain.com/o/{org}/projects/p/{id}/latency
  Quality:    https://smith.langchain.com/o/{org}/projects/p/{id}/quality
  Cost:       https://smith.langchain.com/o/{org}/projects/p/{id}/cost

Alert Channels:
  Slack:      #{channel_name}
  Email:      {email_list}
  PagerDuty:  {service_name}

Files Created:
  config/monitoring/dashboard-config.yaml    - Dashboard configuration
  config/monitoring/alert-rules.yaml         - Alert rule definitions
  config/monitoring/anomaly-config.yaml      - Anomaly detection config
  config/monitoring/quality-sampling.yaml    - Quality sampling config
  docs/runbooks/rag-production-runbook.md    - Operational runbook
  docs/runbooks/escalation-matrix.md         - Escalation contacts and timeline
  src/monitoring/quality_sampler.ts          - Quality sampling module
  src/monitoring/anomaly_detector.ts         - Anomaly detection module

Next Steps:
  1. Share runbook with on-call team
  2. Run *track-costs to setup detailed cost tracking
  3. Schedule weekly quality review meetings
  4. Run *regression-test to establish quality baseline
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `LANGSMITH_PROJECT_NOT_FOUND` | Project name does not exist in LangSmith | Verify project name or create with *setup-langsmith |
| `NO_PRODUCTION_TRACES` | No traces found in the project | Verify pipeline is sending traces, check API key |
| `ALERT_CHANNEL_UNREACHABLE` | Cannot connect to Slack/Email/PagerDuty | Verify webhook URL, API tokens, and network access |
| `BASELINE_INSUFFICIENT_DATA` | Not enough historical data for baseline | Wait for more traces or use manual baseline values |
| `ANOMALY_MODEL_ERROR` | Anomaly detection model failed to initialize | Check model dependencies, reduce detection complexity |
| `DASHBOARD_CREATION_FAILED` | LangSmith API rejected dashboard config | Check API permissions and configuration format |
| `QUALITY_SAMPLING_TOO_EXPENSIVE` | Sampling rate results in excessive evaluation cost | Reduce sampling rate or use cheaper evaluation model |
| `RUNBOOK_TEMPLATE_ERROR` | Runbook template rendering failed | Verify template variables and contact information |

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *setup-langsmith (project must exist), *run-evaluation (quality baseline)
- **Complements:** *track-costs (detailed cost monitoring), *regression-test (quality regression detection)
- **Used By:** Production operations team, on-call engineers
- **Collaborates With:** @rag-architect (architecture health), @retrieval-engineer (retrieval performance), @llm-orchestrator (LLM performance)
