---
task: Track LLM Costs & Optimization
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - langsmith_project: LangSmith project name or ID for cost tracking
  - budget_limits: Budget limits per day, week, and month with alert thresholds
  - optimization_goals: Cost optimization targets (e.g., reduce cost by 30%, maintain quality)
Saida: |
  - cost_dashboard: Cost tracking dashboard with breakdowns by model, chain, and time period
  - token_usage_report: Detailed token usage analysis by operation type and model
  - optimization_tips: Prioritized cost optimization recommendations with impact estimates
  - forecast: Cost forecast for upcoming periods based on current usage trends
Checklist:
  - "[ ] Setup cost tracking"
  - "[ ] Analyze token usage"
  - "[ ] Identify expensive operations"
  - "[ ] Calculate cost per query"
  - "[ ] Compare model costs"
  - "[ ] Suggest optimizations"
  - "[ ] Create cost dashboard"
  - "[ ] Generate forecast"
---

# *track-costs

Track and analyze LLM costs for a RAG pipeline, including token usage breakdown, cost per query analysis, model cost comparison, and optimization recommendations. This task provides visibility into LLM spending, identifies cost reduction opportunities, and generates forecasts to support budget planning.

## Usage

```
*track-costs                                                # Interactive (default)
*track-costs langsmith_project="rag-prod"                   # Specify project
*track-costs budget_limits="daily:50,monthly:1000"          # Set budget limits
*track-costs optimization_goals="reduce-30%"                # Optimization target
*track-costs langsmith_project="rag-prod" budget_limits="strict"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `langsmith_project` | string | yes | — | LangSmith project name for cost data |
| `budget_limits` | string/object | no | — | Budget limits: `"daily:50,monthly:1000"` or preset (`conservative`, `standard`, `generous`) |
| `optimization_goals` | string | no | — | Optimization target: `"reduce-30%"`, `"maintain-quality"`, `"minimize-cost"` |

## Cost Tracking Framework

### LLM Cost Model

Cost is calculated based on token usage and model pricing:

```
Cost = (input_tokens * input_price_per_1k / 1000) + (output_tokens * output_price_per_1k / 1000)
```

### Common Model Pricing Reference (approximate)

| Model | Input (per 1K tokens) | Output (per 1K tokens) | Context Window |
|-------|----------------------|------------------------|----------------|
| GPT-4o | $0.0025 | $0.010 | 128K |
| GPT-4o-mini | $0.00015 | $0.0006 | 128K |
| Claude 3.5 Sonnet | $0.003 | $0.015 | 200K |
| Claude 3.5 Haiku | $0.0008 | $0.004 | 200K |
| Gemini 1.5 Pro | $0.00125 | $0.005 | 2M |
| Gemini 1.5 Flash | $0.000075 | $0.0003 | 1M |

### Cost Per Query Breakdown

A typical RAG query involves multiple LLM calls:

| Operation | Description | Typical Token Usage |
|-----------|-------------|-------------------|
| Query rewriting | Reformulate user query | 200-500 tokens |
| Embedding | Generate query embedding | 50-200 tokens |
| Re-ranking | Score retrieved passages | 500-2000 tokens |
| Generation | Generate final answer | 1000-4000 tokens |
| Groundedness check | Verify answer quality | 500-1500 tokens |
| **Total** | **Per query** | **2250-8200 tokens** |

## Interactive Flow

### Step 1: Project and Period Selection

```
ELICIT: Cost Tracking Setup

1. Which LangSmith project do you want to track costs for?
   [1] Select from available projects
   [2] Enter project name manually

   Your choice? [1/2]:

2. Analysis time period:
   [1] Last 24 hours
   [2] Last 7 days
   [3] Last 30 days
   [4] Custom date range

   Your choice? [1/2/3/4]:

3. Current usage summary (fetching from LangSmith...):
   Total traces:    {count}
   Total tokens:    {total_tokens}
   Estimated cost:  ${total_cost}
   Avg per query:   ${avg_cost}
```

### Step 2: Token Usage Analysis

```
ELICIT: Token Analysis

Analyzing token usage breakdown...

Token Usage by Operation:
┌────────────────────┬───────────┬───────────┬──────────┬──────────┐
│ Operation          │ Input Tok │ Output Tok│ Total    │ Cost     │
├────────────────────┼───────────┼───────────┼──────────┼──────────┤
│ Query Rewriting    │ 45,230    │ 12,500    │ 57,730   │ $0.82    │
│ Embedding          │ 23,100    │ 0         │ 23,100   │ $0.12    │
│ Re-ranking         │ 189,400   │ 45,200    │ 234,600  │ $3.42    │
│ Generation         │ 312,000   │ 156,800   │ 468,800  │ $7.85    │
│ Groundedness Check │ 89,500    │ 23,400    │ 112,900  │ $1.65    │
├────────────────────┼───────────┼───────────┼──────────┼──────────┤
│ TOTAL              │ 659,230   │ 237,900   │ 897,130  │ $13.86   │
└────────────────────┴───────────┴───────────┴──────────┴──────────┘

Token Usage by Model:
┌─────────────────┬───────────┬──────────┬──────────┐
│ Model           │ Tokens    │ Cost     │ % Total  │
├─────────────────┼───────────┼──────────┼──────────┤
│ gpt-4o          │ 581,700   │ $10.50   │ 75.8%    │
│ gpt-4o-mini     │ 280,430   │ $2.54    │ 18.3%    │
│ text-embedding  │ 35,000    │ $0.82    │ 5.9%     │
└─────────────────┴───────────┴──────────┴──────────┘

View detailed breakdown by hour/day? (yes/no):
```

### Step 3: Expensive Operations

```
ELICIT: Cost Hotspots

Identifying most expensive operations...

Top 5 Most Expensive Queries:
┌────┬─────────────────────────────────────────┬────────┬──────────┐
│ #  │ Query (truncated)                       │ Tokens │ Cost     │
├────┼─────────────────────────────────────────┼────────┼──────────┤
│ 1  │ "Compare all pricing plans in detail..."│ 12,450 │ $0.18    │
│ 2  │ "Summarize the entire user manual..."   │ 11,200 │ $0.16    │
│ 3  │ "What are all the differences between..."│ 9,800  │ $0.14    │
│ 4  │ "Explain every configuration option..."  │ 9,300  │ $0.13    │
│ 5  │ "List all API endpoints and their..."    │ 8,900  │ $0.12    │
└────┴─────────────────────────────────────────┴────────┴──────────┘

Cost Hotspot Patterns:
  - "Summarize" queries average 3.2x more tokens than factual queries
  - Re-ranking uses 26% of total cost but could use a cheaper model
  - Groundedness checks run on every query (consider sampling)

Investigate specific hotspots? (yes/no):
```

### Step 4: Budget Configuration

```
ELICIT: Budget Limits

1. Set budget limits?
   [1] Conservative ($10/day, $50/week, $150/month)
   [2] Standard ($50/day, $250/week, $750/month)
   [3] Generous ($200/day, $1000/week, $3000/month)
   [4] Custom limits

   Your choice? [1/2/3/4]:

→ If [4]:
  Daily limit:   $__
  Weekly limit:  $__
  Monthly limit: $__

2. Alert thresholds:
   [1] Alert at 50%, 80%, 100% of budget
   [2] Alert at 80%, 100% of budget
   [3] Alert only at 100% (when exceeded)
   [4] Custom thresholds

   Your choice? [1/2/3/4]:

3. What happens when budget is exceeded?
   [1] Alert only (continue serving)
   [2] Switch to cheaper model
   [3] Reduce sampling rate
   [4] Rate limit queries
   [5] Block non-essential operations

   Your choice? [1/2/3/4/5]:
```

### Step 5: Model Cost Comparison

```
ELICIT: Model Comparison

Running cost comparison across available models...

For your typical query workload ({avg_tokens} tokens/query):

┌─────────────────┬──────────┬──────────┬──────────────┬──────────────┐
│ Model           │ Cost/qry │ Quality  │ Monthly est. │ Savings vs.  │
│                 │          │ (avg)    │ ({queries}/mo)│ current      │
├─────────────────┼──────────┼──────────┼──────────────┼──────────────┤
│ gpt-4o (current)│ $0.045   │ 0.87     │ $1,350       │ —            │
│ gpt-4o-mini     │ $0.008   │ 0.82     │ $240         │ -82%         │
│ claude-3.5-son. │ $0.052   │ 0.89     │ $1,560       │ +16%         │
│ claude-3.5-haiku│ $0.012   │ 0.83     │ $360         │ -73%         │
│ gemini-1.5-pro  │ $0.022   │ 0.85     │ $660         │ -51%         │
│ gemini-1.5-flash│ $0.003   │ 0.78     │ $90          │ -93%         │
└─────────────────┴──────────┴──────────┴──────────────┴──────────────┘

Note: Quality scores are estimates based on your evaluation dataset.
Run *run-evaluation with each model for precise quality comparisons.

Explore model switching options? (yes/no):
```

### Step 6: Optimization Recommendations

```
ELICIT: Optimization Analysis

Generating optimization recommendations...

Prioritized Optimizations:
┌────┬─────────────────────────────────────────┬──────────┬─────────┬────────────┐
│ #  │ Optimization                            │ Savings  │ Quality │ Effort     │
│    │                                         │ Estimate │ Impact  │            │
├────┼─────────────────────────────────────────┼──────────┼─────────┼────────────┤
│ 1  │ Use gpt-4o-mini for re-ranking          │ -$2.80/d │ -1%     │ Low        │
│ 2  │ Sample groundedness checks (25%)        │ -$1.24/d │ None    │ Low        │
│ 3  │ Cache frequent query embeddings         │ -$0.50/d │ None    │ Medium     │
│ 4  │ Reduce context window (top-3 vs top-5)  │ -$0.90/d │ -2%     │ Low        │
│ 5  │ Implement response caching (TTL: 1h)    │ -$1.50/d │ None    │ Medium     │
│ 6  │ Switch generation to claude-3.5-haiku   │ -$4.20/d │ -4%     │ High       │
└────┴─────────────────────────────────────────┴──────────┴─────────┴────────────┘

Total potential savings: $11.14/day ($334/month)

Implement optimizations? Select by number (comma-separated): _
```

### Step 7: Cost Forecast

```
ELICIT: Cost Forecast

Generating cost forecast...

Based on current usage trends:

┌───────────┬──────────────┬──────────────┬──────────────┐
│ Period    │ Current Rate │ With Optim.  │ Budget       │
├───────────┼──────────────┼──────────────┼──────────────┤
│ Daily     │ $13.86       │ $7.42        │ $50.00       │
│ Weekly    │ $97.02       │ $51.94       │ $250.00      │
│ Monthly   │ $415.80      │ $222.60      │ $750.00      │
│ Quarterly │ $1,247.40    │ $667.80      │ $2,250.00    │
└───────────┴──────────────┴──────────────┴──────────────┘

Growth projection (based on traffic trends):
  Next month:    +15% queries → ${projected_cost}
  In 3 months:   +45% queries → ${projected_cost}
  In 6 months:   +120% queries → ${projected_cost}

Include forecast in dashboard? (yes/no):
```

## Output

On successful completion:

```
LLM Cost Tracking & Optimization Complete

Project:           {langsmith_project}
Analysis Period:   {period}
Total Cost:        ${total_cost}
Cost per Query:    ${avg_cost}
Budget Status:     {within_budget/over_budget}

Cost Breakdown:
  By Operation:    Generation (57%), Re-ranking (25%), Groundedness (12%), Other (6%)
  By Model:        gpt-4o (76%), gpt-4o-mini (18%), embedding (6%)

Optimization Potential:
  Recommended savings: ${daily_savings}/day (${monthly_savings}/month)
  Quality impact:      -{quality_drop}% (estimated)

Forecast:
  Current trend:   ${monthly_forecast}/month
  With optimizations: ${optimized_forecast}/month

Files Created:
  reports/costs/{timestamp}-cost-report.md          - Full cost analysis report
  reports/costs/{timestamp}-token-usage.csv          - Detailed token usage data
  reports/costs/{timestamp}-optimization-plan.md     - Optimization recommendations
  reports/costs/{timestamp}-forecast.json            - Cost forecast data
  config/cost-tracking/budget-limits.yaml            - Budget configuration
  config/cost-tracking/alert-rules.yaml              - Cost alert rules
  src/monitoring/cost_tracker.ts                     - Cost tracking module

Dashboard:
  https://smith.langchain.com/o/{org}/projects/p/{id}/cost

Next Steps:
  1. Implement top optimization recommendations
  2. Run *run-evaluation after model changes to verify quality
  3. Schedule weekly cost review
  4. Run *monitor-production to integrate cost alerts
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `LANGSMITH_PROJECT_NOT_FOUND` | Project name does not exist | Verify project name or create with *setup-langsmith |
| `NO_COST_DATA` | No traces with token usage metadata in project | Ensure tracing captures token counts (check callbacks) |
| `PRICING_DATA_OUTDATED` | Model pricing may have changed | Update pricing table in cost configuration |
| `BUDGET_CONFIG_INVALID` | Budget limits format is incorrect | Use format: `"daily:50,monthly:1000"` or preset name |
| `FORECAST_INSUFFICIENT_DATA` | Less than 7 days of data for forecasting | Wait for more data or use manual baseline |
| `OPTIMIZATION_CONFLICT` | Suggested optimization conflicts with quality constraints | Prioritize quality, adjust optimization aggressiveness |
| `ALERT_CHANNEL_ERROR` | Cannot send cost alerts to configured channel | Verify Slack/email/webhook configuration |
| `TOKEN_COUNT_MISSING` | Some traces missing token usage metadata | Update tracing callbacks to include token counts |

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *setup-langsmith (project and tracing must exist)
- **Complements:** *monitor-production (integrated monitoring), *run-evaluation (quality vs. cost tradeoffs)
- **Used By:** Budget planning, model selection decisions
- **Collaborates With:** @rag-architect (architecture cost impact), @llm-orchestrator (model selection)
