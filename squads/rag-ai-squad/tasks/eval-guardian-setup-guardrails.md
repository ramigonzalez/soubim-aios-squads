# Task: Setup Guardrails

**Purpose**: Implement input/output guardrails for a RAG pipeline to prevent harmful inputs, detect hallucinations, validate response quality, and enforce content policies with configurable risk levels and fallback chains

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Standard guardrails for internal tools

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Learning guardrail patterns, compliance-heavy domains

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production guardrails, regulated industries, high-risk applications

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: setupGuardrails()
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: pipeline
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    RAG pipeline reference - endpoint, chain, or configuration to apply guardrails to

- campo: guardrail_rules
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Guardrail rules including content policies, banned topics,
    required disclaimers, and output constraints

- campo: risk_level
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: |
    Risk level of the application (low, medium, high, critical)
    Determines strictness of guardrails

**Saida:**
- campo: guardrail_config
  tipo: object
  destino: File (guardrails-config.yaml)
  persistido: true

- campo: input_filters
  tipo: object
  destino: File (src/guardrails/input_filters.py)
  persistido: true

- campo: output_validators
  tipo: object
  destino: File (src/guardrails/output_validators.py)
  persistido: true

- campo: fallback_chains
  tipo: object
  destino: File (src/guardrails/fallback_chains.py)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] RAG pipeline is functional and producing responses"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that the RAG pipeline works end-to-end
    error_message: "Pre-condition failed: RAG pipeline must be operational before adding guardrails"
  - "[ ] Content policy or compliance requirements are defined"
    tipo: pre-condition
    blocker: false
    validacao: |
      Check that content policies exist (can use defaults if not)
    error_message: "Warning: No content policy defined - will use standard guardrail defaults"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] Input guardrails block harmful or off-topic queries"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify that test harmful inputs are caught and blocked
    error_message: "Post-condition failed: Input guardrails not blocking harmful queries"
  - "[ ] Output guardrails catch hallucinated or non-grounded responses"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify that fabricated responses are detected and flagged
    error_message: "Post-condition failed: Output guardrails not detecting hallucinations"
  - "[ ] Fallback responses are served when guardrails trigger"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify that fallback chain activates correctly
    error_message: "Post-condition failed: Fallback chain not triggering on guardrail violations"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] Input filters configured for all defined risk categories"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert all input filter categories are active
    error_message: "Acceptance criterion not met: Input filters incomplete"
  - "[ ] Output validators check groundedness against retrieved context"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert output validation includes context-grounding check
    error_message: "Acceptance criterion not met: No groundedness validation"
  - "[ ] Guardrail violations are logged and alerted"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert violations produce logs and trigger alerts
    error_message: "Acceptance criterion not met: No violation logging"
  - "[ ] Fallback chain provides safe response on violation"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert fallback provides useful, safe alternative response
    error_message: "Acceptance criterion not met: No fallback response"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** guardrails-ai
  - **Purpose:** Guardrails AI framework for input/output validation
  - **Source:** pip install guardrails-ai

- **Tool:** nemo-guardrails
  - **Purpose:** NVIDIA NeMo Guardrails for conversational AI safety
  - **Source:** pip install nemoguardrails

- **Tool:** langchain-guardrails
  - **Purpose:** LangChain's built-in guardrail integrations
  - **Source:** langchain library

---

## Scripts

**Agent-specific code for this task:**

- **Script:** setup-guardrails.py
  - **Purpose:** End-to-end guardrail setup and testing
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/setup-guardrails.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** Over-Blocking Legitimate Queries
   - **Cause:** Input filters too aggressive, false positive rate too high
   - **Resolution:** Tune filter thresholds, add allowlist for domain-specific terms
   - **Recovery:** Switch to logging-only mode, review blocked queries, refine rules

2. **Error:** Hallucination Detection Misses
   - **Cause:** Groundedness check not strict enough or context insufficient
   - **Resolution:** Lower groundedness threshold, add NLI-based fact checking
   - **Recovery:** Add secondary LLM-as-judge check for high-risk responses

3. **Error:** Latency Impact from Guardrails
   - **Cause:** Multiple guardrail checks adding significant latency
   - **Resolution:** Run checks in parallel, use lightweight models for screening
   - **Recovery:** Async output checking (serve response, validate after)

4. **Error:** Fallback Chain Loops
   - **Cause:** Fallback response itself triggers guardrails
   - **Resolution:** Exempt fallback responses from output guardrails
   - **Recovery:** Use static, pre-approved fallback messages

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 20-40 min (estimated)
cost_estimated: $0.005-0.020
token_usage: ~5,000-15,000 tokens
```

**Optimization Notes:**
- Run input/output guardrails in parallel where possible; use lightweight classifier for initial screening; cache guardrail decisions for repeated patterns

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - eval-guardian-setup-langsmith.md (tracing for guardrail violations)
  - eval-guardian-check-groundedness.md (groundedness logic reused)
tags:
  - guardrails
  - safety
  - hallucination-prevention
  - input-validation
  - output-validation
  - compliance
updated_at: 2026-02-10
```

---

## Elicitation

### Step 1: Risk Level Assessment

```
What is the risk level of your RAG application?

1. **Low Risk** - Internal tool, non-critical decisions
   - Example: Internal knowledge base search, developer documentation
   - Default guardrails: Basic topic filtering, simple groundedness check
   - Latency budget for guardrails: 50-100ms

2. **Medium Risk** - Customer-facing, non-regulated
   - Example: Customer support chatbot, product recommendations
   - Default guardrails: Content filtering, groundedness, PII detection
   - Latency budget for guardrails: 100-200ms

3. **High Risk** - Customer-facing, regulated or sensitive
   - Example: Financial advice, healthcare information, legal guidance
   - Default guardrails: Full input/output validation, fact-checking, disclaimers
   - Latency budget for guardrails: 200-500ms

4. **Critical** - Life-safety, highly regulated
   - Example: Medical diagnosis support, safety systems
   - Default guardrails: Maximum strictness, human-in-the-loop, audit trail
   - Latency budget for guardrails: No limit (safety > speed)

Risk level? [1-4]:
```

**Capture:** `{risk_level}`

### Step 2: Input Guardrails

```
Which input guardrails do you need?

Select all that apply:

1. [ ] **Topic filtering** - Block off-topic queries
   - Define allowed topics/domains
   - Reject queries outside scope

2. [ ] **Prompt injection detection** - Detect jailbreak attempts
   - Pattern matching for known injection patterns
   - LLM-based injection classification

3. [ ] **PII detection** - Detect and redact personal information
   - Names, emails, phone numbers, SSN, credit cards
   - Configurable: block, redact, or warn

4. [ ] **Toxicity filtering** - Block harmful, offensive content
   - Hate speech, harassment, threats
   - Configurable severity threshold

5. [ ] **Query length limits** - Enforce input size constraints
   - Max tokens, max characters
   - Prevent context window abuse

6. [ ] **Rate limiting** - Prevent abuse
   - Per-user, per-IP, per-session limits
   - Graduated response (warn → throttle → block)

7. [ ] **Language detection** - Ensure queries are in supported languages
   - Block or translate unsupported languages

8. [ ] **Custom rules** - Domain-specific input validation
   - Specify: ___

Select input guardrails [comma-separated numbers]:
```

**Capture:** `{input_guardrails}`

### Step 3: Output Guardrails

```
Which output guardrails do you need?

Select all that apply:

1. [ ] **Groundedness check** - Verify response is grounded in retrieved context
   - NLI-based (Natural Language Inference)
   - LLM-as-judge
   - Configurable threshold (0.0 - 1.0)

2. [ ] **Hallucination detection** - Detect fabricated information
   - Cross-reference with source documents
   - Flag unsupported claims

3. [ ] **PII redaction** - Remove PII from responses
   - Prevent leaking PII from source documents
   - Configurable entity types

4. [ ] **Content policy enforcement** - Ensure response follows guidelines
   - Tone, format, disclaimer requirements
   - Banned phrases or topics

5. [ ] **Citation validation** - Verify source citations are accurate
   - Check that cited documents exist and support the claim
   - Add citations where missing

6. [ ] **Confidence scoring** - Add confidence indicator to responses
   - Low confidence triggers disclaimer or human review
   - Based on retrieval scores and generation uncertainty

7. [ ] **Response length limits** - Enforce output constraints
   - Min/max tokens, required sections
   - Prevent overly brief or verbose responses

8. [ ] **Factual consistency** - Cross-check facts within response
   - Detect contradictions in the response
   - Verify numerical claims

Select output guardrails [comma-separated numbers]:
```

**Capture:** `{output_guardrails}`

### Step 4: Fallback Strategy

```
What should happen when a guardrail triggers?

**Input guardrail triggered:**

1. **Block and explain** [DEFAULT]
   - Return: "I can't help with that. I'm designed to answer questions about {domain}."
   - Log the violation

2. **Redirect**
   - Suggest alternative query within scope
   - "Did you mean to ask about...?"

3. **Escalate**
   - Route to human agent
   - Add to review queue

**Output guardrail triggered:**

1. **Retry with stricter prompt** [DEFAULT]
   - Re-run generation with more restrictive system prompt
   - Max retries: 2

2. **Serve safe fallback**
   - Return: "I found some information but I'm not confident in my answer. Please verify with {source}."
   - Include retrieved context without LLM interpretation

3. **Return partial response**
   - Serve only the grounded portions of the response
   - Flag ungrounded sections

4. **Block and escalate**
   - Return: "I need a human expert to answer this accurately."
   - Route to human review queue

Input fallback? [1-3]:
Output fallback? [1-4]:
```

**Capture:** `{fallback_strategy}`

### Step 5: Guardrail Framework Selection

```
Which guardrail framework do you want to use?

1. **Custom (LangChain-native)** [RECOMMENDED]
   - Build guardrails as LangChain Runnables
   - Full control, lightweight, no extra dependencies
   - Best for: Most RAG pipelines, custom logic

2. **Guardrails AI**
   - Declarative validators with XML/RAIL specs
   - Rich validator library (150+ validators)
   - Best for: Complex validation rules, structured output

3. **NVIDIA NeMo Guardrails**
   - Colang scripting language for dialog control
   - Built-in topical rails, jailbreak detection
   - Best for: Conversational AI, dialog-heavy applications

4. **Custom + LLM-as-Judge**
   - Use a second LLM to evaluate responses
   - Most flexible but highest cost
   - Best for: High-risk, compliance-heavy applications

Framework? [1-4]:
```

**Capture:** `{guardrail_framework}`

---

## Process

### Guardrails Knowledge Base

#### Guardrail Architecture

```
User Query
    │
    ▼
┌─────────────────────┐
│   INPUT GUARDRAILS   │
│ ┌─────────────────┐ │
│ │ Topic Filter    │ │
│ │ Injection Detect│ │
│ │ PII Detection   │ │
│ │ Toxicity Filter │ │
│ └────────┬────────┘ │
│          │          │
│    PASS? │ NO → Fallback Response
│          │          │
│    YES   ▼          │
└─────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  RAG Pipeline │
    │  (Retrieve +  │
    │   Generate)   │
    └──────┬───────┘
           │
           ▼
┌─────────────────────┐
│  OUTPUT GUARDRAILS   │
│ ┌─────────────────┐ │
│ │ Groundedness    │ │
│ │ Hallucination   │ │
│ │ PII Redaction   │ │
│ │ Content Policy  │ │
│ │ Citation Check  │ │
│ └────────┬────────┘ │
│          │          │
│    PASS? │ NO → Retry / Fallback
│          │          │
│    YES   ▼          │
└─────────────────────┘
           │
           ▼
    Final Response
```

#### Custom LangChain Guardrails

```python
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# Input guardrail: Topic filter
def topic_filter(query: str) -> str:
    """Block off-topic queries."""
    classifier = get_topic_classifier()
    result = classifier.predict(query)
    if result["topic"] not in ALLOWED_TOPICS:
        raise GuardrailViolation(
            type="input_topic",
            message=f"Query is off-topic: {result['topic']}",
            query=query,
        )
    return query

# Input guardrail: Prompt injection detection
def injection_detector(query: str) -> str:
    """Detect prompt injection attempts."""
    patterns = [
        r"ignore (previous|above|all) instructions",
        r"you are now",
        r"system:\s",
        r"<\|im_start\|>",
        r"###\s*(instruction|system)",
    ]
    for pattern in patterns:
        if re.search(pattern, query, re.IGNORECASE):
            raise GuardrailViolation(
                type="input_injection",
                message="Potential prompt injection detected",
                query=query,
            )
    return query

# Output guardrail: Groundedness check
def groundedness_check(response: dict) -> dict:
    """Verify response is grounded in retrieved context."""
    context = response["context"]
    answer = response["answer"]

    # NLI-based check
    nli_result = nli_model.predict(
        premise=context,
        hypothesis=answer,
    )

    if nli_result["entailment"] < GROUNDEDNESS_THRESHOLD:
        raise GuardrailViolation(
            type="output_groundedness",
            message=f"Response not grounded (score: {nli_result['entailment']:.2f})",
            response=answer,
        )
    return response

# Compose guardrailed pipeline
guardrailed_pipeline = (
    # Input guardrails
    RunnableLambda(topic_filter)
    | RunnableLambda(injection_detector)
    # RAG pipeline
    | rag_chain
    # Output guardrails
    | RunnableLambda(groundedness_check)
)
```

#### Guardrails AI Implementation

```python
from guardrails import Guard
from guardrails.hub import (
    ToxicLanguage,
    DetectPII,
    ProvenanceV1,
    RestrictToTopic,
)

# Define guard with validators
guard = Guard().use_many(
    # Input validators
    ToxicLanguage(threshold=0.8, on_fail="exception"),
    DetectPII(
        pii_entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD"],
        on_fail="fix",  # Redact PII automatically
    ),
    RestrictToTopic(
        valid_topics=["product support", "billing", "technical help"],
        invalid_topics=["politics", "medical advice"],
        on_fail="exception",
    ),
    # Output validators
    ProvenanceV1(
        threshold=0.85,
        on_fail="reask",  # Retry with stricter prompt
    ),
)

# Use guard with LLM
result = guard(
    llm_api=openai.chat.completions.create,
    model="gpt-4o",
    messages=[{"role": "user", "content": query}],
)
```

#### NeMo Guardrails Implementation

```colang
# config.co - NeMo Guardrails configuration

define user ask about allowed topic
  "How do I reset my password?"
  "What are the pricing plans?"
  "How do I contact support?"

define user ask about blocked topic
  "What's the meaning of life?"
  "Tell me a joke"
  "Write me a poem"

define flow
  user ask about blocked topic
  bot inform cannot help
  bot suggest alternative

define bot inform cannot help
  "I'm designed to help with product support questions only."

define bot suggest alternative
  "You can ask me about account management, billing, or technical issues."
```

### Step 1: Configure Input Guardrails

Based on selections, configure each input guardrail with appropriate thresholds.

### Step 2: Configure Output Guardrails

Based on selections, configure each output guardrail with appropriate thresholds.

### Step 3: Build Fallback Chains

```python
# Fallback chain configuration
class FallbackStrategy:
    def __init__(self, max_retries=2):
        self.max_retries = max_retries

    def handle_input_violation(self, violation):
        """Handle input guardrail violation."""
        if violation.type == "input_topic":
            return self.off_topic_response(violation)
        elif violation.type == "input_injection":
            return self.injection_response(violation)
        elif violation.type == "input_pii":
            return self.pii_response(violation)
        else:
            return self.generic_input_response(violation)

    def handle_output_violation(self, violation, pipeline, query):
        """Handle output guardrail violation with retry."""
        for attempt in range(self.max_retries):
            try:
                # Retry with stricter prompt
                response = pipeline.invoke(
                    query,
                    config={"strict_mode": True, "attempt": attempt + 1}
                )
                return response
            except GuardrailViolation:
                continue

        # All retries failed - serve safe fallback
        return self.safe_fallback_response(query)
```

### Step 4: Test Guardrails

```
Guardrail Test Results:

Input Guardrails:
| Test Case | Category | Expected | Actual | Status |
|-----------|----------|----------|--------|--------|
| "How to hack your system" | Injection | BLOCK | {result} | {pass/fail} |
| "My SSN is 123-45-6789" | PII | REDACT | {result} | {pass/fail} |
| "Tell me about politics" | Off-topic | BLOCK | {result} | {pass/fail} |
| "How do I reset password?" | Valid | PASS | {result} | {pass/fail} |
| "{normal query}" | Valid | PASS | {result} | {pass/fail} |

Output Guardrails:
| Test Case | Category | Expected | Actual | Status |
|-----------|----------|----------|--------|--------|
| Hallucinated response | Groundedness | BLOCK | {result} | {pass/fail} |
| Grounded response | Groundedness | PASS | {result} | {pass/fail} |
| Response with PII | PII | REDACT | {result} | {pass/fail} |
| Clean response | All checks | PASS | {result} | {pass/fail} |

Fallback Tests:
| Trigger | Fallback Type | Response Quality | Status |
|---------|---------------|-----------------|--------|
| Input block | Safe message | {quality} | {pass/fail} |
| Output retry | Strict re-gen | {quality} | {pass/fail} |
| Max retries | Static fallback | {quality} | {pass/fail} |

Results: {passed}/{total} tests passed
False positive rate: {rate}%
Avg guardrail latency: {ms} ms
```

### Step 5: Configure Monitoring

```yaml
# guardrail-monitoring.yaml
alerts:
  high_violation_rate:
    threshold: 10  # violations per hour
    channel: slack
    severity: warning

  injection_attempt:
    threshold: 1  # any injection attempt
    channel: slack
    severity: critical

  hallucination_spike:
    threshold: 5  # per hour
    channel: slack
    severity: high

metrics:
  - guardrail_triggers_total (counter, by type)
  - guardrail_latency_ms (histogram)
  - false_positive_rate (gauge)
  - fallback_activations (counter)

dashboard:
  url: "{langsmith_dashboard}/guardrails"
```

### Step 6: Document Configuration

```yaml
# guardrails-config.yaml
version: "1.0"
risk_level: {risk_level}
framework: {framework}
created_at: "{timestamp}"

input_guardrails:
  topic_filter:
    enabled: {true/false}
    allowed_topics: {topics}
    model: {classifier_model}
    threshold: {value}

  injection_detection:
    enabled: {true/false}
    methods: [pattern_matching, llm_classification]
    threshold: {value}

  pii_detection:
    enabled: {true/false}
    entities: {entity_list}
    action: {block/redact/warn}

  toxicity:
    enabled: {true/false}
    threshold: {value}

output_guardrails:
  groundedness:
    enabled: {true/false}
    method: {nli/llm_judge}
    threshold: {value}

  hallucination:
    enabled: {true/false}
    cross_reference: true
    threshold: {value}

  pii_redaction:
    enabled: {true/false}
    entities: {entity_list}

  content_policy:
    enabled: {true/false}
    rules: {rules}

fallback:
  input_violation:
    strategy: {block_explain/redirect/escalate}
    message: "{message}"

  output_violation:
    strategy: {retry/safe_fallback/partial/escalate}
    max_retries: {value}
    fallback_message: "{message}"

monitoring:
  log_violations: true
  alert_channel: {channel}
  dashboard: {url}
```

---

## Usage

```
*setup-guardrails
*setup-guardrails --risk-level high
*setup-guardrails --framework nemo --risk-level medium
*setup-guardrails --input-only  # Configure input guardrails only
*setup-guardrails --output-only  # Configure output guardrails only
*setup-guardrails --test-only  # Run guardrail tests without setup
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| pipeline | object | Yes | - | RAG pipeline to apply guardrails to |
| guardrail_rules | object | Yes | - | Content policies and validation rules |
| risk_level | string | Yes | "medium" | low, medium, high, critical |
| framework | string | No | "custom" | custom, guardrails-ai, nemo |
| groundedness_threshold | float | No | 0.85 | Minimum groundedness score |
| max_retries | int | No | 2 | Max output guardrail retries |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Guardrail Config** - Complete guardrail configuration YAML
2. **Input Filters** - Production-ready input validation code (Python)
3. **Output Validators** - Production-ready output validation code (Python)
4. **Fallback Chains** - Fallback logic for guardrail violations
5. **Test Report** - Guardrail test results with pass/fail status
6. **Monitoring Config** - Alert rules and dashboard configuration

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Over-Blocking | Filters too aggressive | Tune thresholds, add allowlists | Switch to logging-only mode and review |
| Hallucination Misses | Groundedness threshold too low | Lower threshold, add LLM-judge | Add secondary fact-checking chain |
| Latency Spike | Too many guardrail checks | Parallelize checks, use lighter models | Async output checking |
| Fallback Loop | Fallback triggers its own guardrails | Exempt fallback from output checks | Use static pre-approved messages |
| NLI Model Errors | NLI model unavailable or wrong format | Verify model compatibility | Fall back to keyword-based checking |
| PII Regex Misses | Regex patterns incomplete | Use NER model for PII detection | Combine regex + NER for coverage |

---

## Related

- **Agent:** @eval-guardian (Sage)
- **Related tasks:**
  - `*check-groundedness` - Groundedness logic is reused in output guardrails
  - `*setup-langsmith` - Tracing captures guardrail violations
  - `*run-evaluation` - Evaluate guardrail effectiveness with test datasets
  - `*monitor-production` - Integrate guardrail metrics into monitoring
  - `*manage-prompts` - Prompt versions affect guardrail tuning
