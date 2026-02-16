---
task: Design Prompt for RAG Chain
responsavel: "@prompt-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - use_case: Description of the task the prompt must accomplish (e.g., summarization, extraction, Q&A, classification)
  - context_type: Type of context the prompt will receive from the retriever (chunks, full docs, tables, multi-modal)
  - output_format: Expected output structure (free text, JSON, markdown, YAML, bullet list, table)
  - constraints: Guardrails, token limits, safety rules, domain restrictions, language requirements
Saida: |
  - prompt_template: Complete prompt template with variable placeholders and instructions
  - system_prompt: System-level prompt establishing model persona, guardrails, and output rules
  - examples: Curated few-shot examples demonstrating expected input-output pairs
  - usage_guide: Documentation on how to use the prompt, when to adjust, and versioning notes
Checklist:
  - "[ ] Understand use case and end-user goals"
  - "[ ] Analyze context type and retriever output format"
  - "[ ] Define output format and schema constraints"
  - "[ ] Craft system prompt with persona and guardrails"
  - "[ ] Add few-shot examples covering typical and edge cases"
  - "[ ] Implement chain-of-thought reasoning where applicable"
  - "[ ] Test with sample inputs and verify outputs"
  - "[ ] Iterate and refine based on test results"
  - "[ ] Document prompt design decisions and rationale"
---

# *design-prompt

Design a production-grade prompt for RAG chains, extraction tasks, agent instructions, or any LLM-powered workflow. Lyra analyzes the use case, context type, and output requirements, then crafts a layered prompt architecture using proven prompt engineering techniques including few-shot learning, chain-of-thought reasoning, self-consistency patterns, structured output formatting, and injection defense.

## Prompt Engineering Knowledge Base

Lyra applies the following techniques based on task analysis:

### Core Techniques

| Technique | When to Use | Key Benefit |
|-----------|------------|-------------|
| **Few-Shot Prompting** | Classification, extraction, formatting tasks | Teaches by example, reduces ambiguity |
| **Chain-of-Thought (CoT)** | Reasoning, multi-step logic, math, comparisons | Improves accuracy on complex tasks by 40-70% |
| **Self-Consistency** | Tasks where reasoning paths may diverge | Multiple CoT passes + majority vote for reliability |
| **Structured Output** | API responses, data extraction, pipelines | JSON mode / function calling for deterministic parsing |
| **ReAct (Reason + Act)** | Agentic tasks requiring tool use | Interleaves reasoning with action steps |
| **Tree-of-Thought** | Complex planning, creative generation | Explores multiple reasoning branches before selecting |
| **Retrieval-Augmented** | Knowledge-grounded generation | Grounds responses in retrieved context to reduce hallucination |
| **Role Prompting** | Domain-specific expertise needed | Assigns expert persona to improve domain accuracy |
| **Constrained Decoding** | Strict output schemas, enum values | Forces output compliance through explicit constraints |
| **Prompt Chaining** | Multi-stage pipelines, complex workflows | Breaks complex tasks into sequential focused prompts |

### RAG-Specific Prompt Patterns

| Pattern | Description | Use Case |
|---------|------------|----------|
| **Citation-Required** | Forces model to cite source chunks for every claim | Legal, medical, compliance Q&A |
| **Uncertainty-Flagging** | Model must flag low-confidence answers explicitly | Enterprise knowledge bases |
| **Multi-Chunk Synthesis** | Aggregates information across multiple retrieved chunks | Research, comprehensive answers |
| **Extractive-First** | Extract relevant quotes first, then synthesize | High-accuracy requirements |
| **Refusal-Aware** | Model refuses if context insufficient rather than hallucinating | Safety-critical applications |
| **Metadata-Enhanced** | Includes chunk metadata (source, date, author) in prompt | Audit trails, provenance tracking |

### Prompt Architecture Layers

```
Layer 1: System Prompt (Persona + Guardrails + Output Rules)
Layer 2: Context Injection (Retrieved chunks, metadata, conversation history)
Layer 3: Task Instruction (What to do with the context)
Layer 4: Few-Shot Examples (Input-output demonstration pairs)
Layer 5: Output Schema (Format, constraints, validation rules)
Layer 6: Safety Net (Fallback behavior, refusal conditions, injection defense)
```

## Usage

```bash
# Interactive mode (recommended)
*design-prompt

# With initial parameters
*design-prompt --use-case "customer support Q&A" --context-type "knowledge base chunks" --output-format "json"

# Quick mode for experienced users
*design-prompt --mode yolo --use-case "document summarization"

# Pre-flight for critical production prompts
*design-prompt --mode preflight --use-case "medical Q&A with citations"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `use_case` | string | yes | - | Description of what the prompt must accomplish |
| `context_type` | string | yes | - | Type of context from retriever (chunks, full docs, tables, multi-modal) |
| `output_format` | enum | no | `free_text` | Output structure: `free_text`, `json`, `markdown`, `yaml`, `bullets`, `table` |
| `constraints` | object | no | `{}` | Guardrails: token limits, safety rules, domain restrictions |
| `target_model` | string | no | `gpt-4o` | Target LLM model for the prompt |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `technique` | enum | no | `auto` | Force specific technique: `few-shot`, `cot`, `react`, `auto` |
| `safety_level` | enum | no | `standard` | Safety posture: `minimal`, `standard`, `strict`, `zero-tolerance` |

## Interactive Flow

### Step 1: Use Case Discovery

```
Lyra: What task should this prompt accomplish?

Please describe your use case:
  1. RAG Q&A - Answer questions from retrieved context
  2. Document Summarization - Condense retrieved documents
  3. Information Extraction - Extract structured data from text
  4. Classification / Routing - Categorize queries or documents
  5. Conversational Agent - Multi-turn dialogue with context
  6. Content Generation - Generate content grounded in sources
  7. Comparison / Analysis - Compare information across sources
  8. Custom task (describe below)

> [user input]

Follow-up: What is the end goal for the user consuming this output?
  - Quick answer to a specific question
  - Comprehensive analysis or report
  - Structured data for downstream processing
  - Human-readable summary
  - Decision support with evidence

> [user input]
```

### Step 2: Context Analysis

```
Lyra: Let's understand the context your prompt will receive.

What type of context comes from the retriever?
  1. Text chunks (typical RAG - 200-500 token passages)
  2. Full documents (long-context retrieval)
  3. Structured data (tables, JSON, key-value pairs)
  4. Multi-modal (text + images + tables mixed)
  5. Conversation history + retrieved chunks
  6. Pre-processed summaries from previous chain stage

> [user input]

Context characteristics:
  - Average number of chunks per query: ___
  - Average chunk length (tokens): ___
  - Do chunks include metadata (source, date, page)? [Y/n]
  - Are chunks pre-ranked by relevance? [Y/n]
  - Language(s) of the context: ___

> [user input]
```

### Step 3: Output Design

```
Lyra: Let's define the expected output precisely.

Output format:
  1. Free text (natural language response)
  2. JSON (structured, schema-compliant)
  3. Markdown (formatted with headers, lists, tables)
  4. YAML (configuration-style output)
  5. Bullet points (concise key points)
  6. Table (comparative or structured data)

> [user input]

Output requirements:
  [ ] Must cite sources for every claim
  [ ] Must include confidence score
  [ ] Must flag uncertain answers
  [ ] Must refuse when context is insufficient
  [ ] Must stay within token limit: ___
  [ ] Must follow specific schema (provide below)
  [ ] Must support multi-language output

> [user selection]
```

### Step 4: Technique Selection

```
Lyra: Based on your use case, here is my recommended prompt architecture:

=== Prompt Design Plan ===

Task Type: {analyzed_type}
Primary Technique: {recommended_technique}
Rationale: {why_this_technique}

Prompt Architecture:
  - System Prompt: {persona} with {guardrails}
  - Context Format: {context_template}
  - Instruction: {technique_pattern}
  - Examples: {num_examples} few-shot examples
  - Output: {output_schema}
  - Safety: {safety_pattern}

Estimated Token Budget:
  - System prompt: ~{n} tokens
  - Few-shot examples: ~{n} tokens
  - Context window: ~{n} tokens reserved
  - Output budget: ~{n} tokens
  - Total overhead: ~{n} tokens per request

Shall I proceed with this design? [Y/n]
Or adjust technique? (cot/few-shot/react/extractive-first/custom)

> [user input]
```

### Step 5: Prompt Crafting

```
Lyra: Here is the crafted prompt.

=== SYSTEM PROMPT ===
{complete_system_prompt}

=== PROMPT TEMPLATE ===
{complete_prompt_template_with_variables}

=== FEW-SHOT EXAMPLES ===
Example 1:
  Input: {sample_context_and_query}
  Output: {expected_output}

Example 2:
  Input: {edge_case_context_and_query}
  Output: {expected_output_for_edge_case}

=== USAGE GUIDE ===
Variables: {variable_list_and_descriptions}
When to adjust: {guidance_on_modifications}
Version: 1.0.0

Review the prompt. Would you like to:
  1. Accept as-is
  2. Modify system prompt
  3. Add/change few-shot examples
  4. Adjust output format
  5. Tighten safety constraints
  6. Test with a sample input now

> [user input]
```

### Step 6: Testing and Refinement

```
Lyra: Let's test the prompt with a sample input.

Provide a sample query and context, or I can generate one:
  1. Use a representative sample from your data
  2. Let me generate a typical test case
  3. Let me generate an edge case test

> [user input]

=== TEST RESULT ===
Input: {test_query_and_context}
Output: {model_output}

Quality Assessment:
  - Relevance: {score}/10
  - Faithfulness: {score}/10
  - Completeness: {score}/10
  - Format compliance: {pass/fail}
  - Citation accuracy: {pass/fail}
  - Safety compliance: {pass/fail}

Refinement suggestions:
  {list_of_improvements_if_any}

Iterate? [Y/n]
```

## Output

The task produces the following artifacts:

### 1. Prompt Template (`prompts/{use_case_slug}/v1.0.0/prompt.md`)
- Complete system prompt
- User prompt template with variable placeholders
- Few-shot examples section
- Output schema definition
- Safety constraints and refusal conditions

### 2. Usage Guide (`prompts/{use_case_slug}/v1.0.0/guide.md`)
- Variable documentation with types and validation rules
- When to use this prompt vs alternatives
- Known limitations and edge cases
- Modification guidance for common adjustments
- Version history and changelog

### 3. Test Cases (`prompts/{use_case_slug}/v1.0.0/tests.yaml`)
- Representative test inputs and expected outputs
- Edge case test scenarios
- Failure mode tests (insufficient context, adversarial input)

### 4. Design Decision Record
- Technique selection rationale
- Token budget analysis
- Safety posture decisions
- Trade-offs documented (accuracy vs cost vs latency)

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Vague Use Case | User provides insufficient task description | Re-prompt with specific questions about end goal, users, and context | Show example use case descriptions for reference |
| Context Type Mismatch | Prompt designed for chunks but receives full docs | Detect context format and adapt template dynamically | Provide variant prompt templates for different context types |
| Output Schema Violation | Generated output does not match requested format | Add stricter format instructions and validation examples | Include negative examples showing what NOT to output |
| Token Budget Exceeded | Prompt + context + output exceeds model limit | Compress prompt, reduce examples, or split into chain | Show token breakdown and recommend compression targets |
| Injection Vulnerability | Prompt susceptible to adversarial input manipulation | Add input sanitization layer and defense instructions | Apply sandwich defense pattern and test with attack vectors |
| Few-Shot Mismatch | Examples do not represent actual data distribution | Request representative samples from user's actual data | Generate synthetic examples matching user's domain |
| Hallucination in Output | Model generates claims not grounded in context | Add extractive-first pattern and citation requirements | Test with groundedness checker and tighten constraints |
| Multi-Language Confusion | Prompt mixes languages or outputs wrong language | Add explicit language instruction in system prompt | Test with multi-language inputs and verify output language |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Use case description provided or elicited"
  - "[ ] Context type identified (how retriever outputs will be formatted)"
  - "[ ] Target model identified for prompt compatibility"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Prompt template generated with all layers"
  - "[ ] At least 2 few-shot examples included"
  - "[ ] Prompt tested with at least 1 sample input"
  - "[ ] Usage guide documented with variable descriptions"
  - "[ ] Design decisions recorded with rationale"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Prompt produces correct output format for representative inputs"
  - "[ ] Few-shot examples cover both typical and edge cases"
  - "[ ] System prompt includes appropriate guardrails for the safety level"
  - "[ ] Token budget is within target model's context window"
  - "[ ] Prompt is injection-resistant at the specified safety level"
  - "[ ] All design decisions are documented with rationale"
```

## Performance

```yaml
duration_expected: 10-25 min (interactive), 3-8 min (yolo)
cost_estimated: $0.005-0.03
token_usage: ~3,000-12,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - prompt-engineer-test-prompt.md
  - prompt-engineer-optimize-prompt.md
tags:
  - prompt-engineering
  - rag
  - design
  - few-shot
  - chain-of-thought
updated_at: 2026-02-09
```

## Related

- **Agent:** @prompt-engineer (Lyra)
- **Downstream Tasks:** `*test-prompt`, `*optimize-prompt`, `*create-prompt-template`
- **Collaborators:** @rag-ai-engineer (Atlas) for RAG pipeline context, @eval-guardian (Sage) for quality metrics, @vectordb-advisor (Vex) for retrieval query design
- **Templates:** `prompt-template.md`, `prompt-design-record.md`
- **Checklists:** `prompt-quality-checklist.md`, `injection-defense-checklist.md`
