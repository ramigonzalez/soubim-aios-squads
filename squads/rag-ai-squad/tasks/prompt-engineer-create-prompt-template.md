---
task: Create Reusable Prompt Template
responsavel: "@prompt-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - template_type: Category of template (rag-qa, extraction, summarization, classification, conversational, agent-instruction)
  - variables: List of dynamic variables with types, descriptions, and validation rules
  - output_schema: Expected output structure and format constraints
  - use_cases: List of concrete use cases this template should serve
Saida: |
  - prompt_template: Parameterized prompt template with variable placeholders and rendering logic
  - variable_docs: Complete variable documentation with types, defaults, validation, and examples
  - usage_examples: Concrete examples showing template instantiation for each use case
  - validation_rules: Input validation rules and output format verification checks
Checklist:
  - "[ ] Define template purpose and scope"
  - "[ ] Identify all dynamic variables with types and constraints"
  - "[ ] Create template structure with variable placeholders"
  - "[ ] Add variable validation rules and default values"
  - "[ ] Write usage examples for each declared use case"
  - "[ ] Test template with different variable combinations"
  - "[ ] Document template comprehensively"
  - "[ ] Add template to prompt registry"
---

# *create-prompt-template

Create a reusable, parameterized prompt template that can be instantiated across multiple use cases within a RAG pipeline or agent system. Lyra designs the template structure with typed variables, validation rules, rendering logic, and comprehensive documentation. Templates are versioned and registered in the prompt registry for team-wide reuse.

## Template Architecture

Lyra follows a structured template architecture for consistency and reusability:

### Template Categories

| Category | Description | Common Variables | Typical Output |
|----------|------------|-----------------|----------------|
| **rag-qa** | Question answering over retrieved context | `context`, `query`, `history`, `citations_required` | Answer with citations |
| **extraction** | Structured data extraction from text | `source_text`, `schema`, `fields`, `strict_mode` | JSON/YAML structured data |
| **summarization** | Document or multi-chunk summarization | `documents`, `max_length`, `focus_areas`, `style` | Summary text |
| **classification** | Text classification and routing | `text`, `categories`, `multi_label`, `confidence_threshold` | Category label(s) with score |
| **conversational** | Multi-turn dialogue with context | `context`, `history`, `persona`, `tone`, `guardrails` | Conversational response |
| **agent-instruction** | System prompts for AI agents | `role`, `tools`, `constraints`, `examples`, `escalation_rules` | Agent behavior definition |
| **evaluation** | Prompt for LLM-as-judge evaluation | `output_to_evaluate`, `criteria`, `rubric`, `reference` | Evaluation scores |
| **transformation** | Text-to-text transformation tasks | `input_text`, `transformation_type`, `target_format` | Transformed text |

### Variable Type System

| Type | Description | Validation | Example |
|------|------------|------------|---------|
| `string` | Free text input | Min/max length, regex pattern | `query: "What is RAG?"` |
| `text_block` | Multi-line text, typically context | Min/max tokens, encoding check | Retrieved chunks |
| `enum` | Fixed set of allowed values | Must match allowed list | `tone: "formal"` |
| `list[string]` | Array of strings | Min/max items, item validation | `categories: ["A", "B"]` |
| `boolean` | True/false flag | Must be boolean | `citations_required: true` |
| `integer` | Whole number | Min/max range | `max_tokens: 500` |
| `object` | Nested structure | JSON schema validation | `schema: { fields: [...] }` |
| `template_ref` | Reference to another template | Must exist in registry | `sub_prompt: "eval-v1"` |

### Template Rendering

```
Template File Structure:
  prompts/templates/{template_id}/
    v{version}/
      template.md          # Main template with {{variable}} placeholders
      variables.yaml        # Variable definitions, types, defaults, validation
      examples/             # Usage examples for each use case
        use-case-1.yaml
        use-case-2.yaml
      tests/                # Test cases for template validation
        test-cases.yaml
      README.md             # Template documentation
```

### Variable Placeholder Syntax

```
{{variable_name}}                    # Required variable, no default
{{variable_name | default: "value"}} # Variable with default value
{{variable_name | format: "json"}}   # Variable with format transformation
{{#if variable_name}}                # Conditional section
  Content when variable is present
{{/if}}
{{#each items}}                      # Loop over list variable
  Item: {{this}}
{{/each}}
```

## Usage

```bash
# Interactive template creation
*create-prompt-template

# Create specific template type
*create-prompt-template --type rag-qa --name "customer-support-qa"

# Create from existing prompt (extract template)
*create-prompt-template --from prompts/qa/v1.0.0/prompt.md

# Quick mode for experienced users
*create-prompt-template --mode yolo --type extraction --name "invoice-extractor"

# Pre-flight for complex templates
*create-prompt-template --mode preflight --type agent-instruction --name "research-agent"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `template_type` | enum | yes | - | Template category: `rag-qa`, `extraction`, `summarization`, `classification`, `conversational`, `agent-instruction`, `evaluation`, `transformation` |
| `variables` | list | no | auto-detected | Variable definitions with types and validation |
| `output_schema` | object | no | - | Expected output format and constraints |
| `use_cases` | list | no | - | Concrete use cases the template should serve |
| `name` | string | no | auto-generated | Template identifier (kebab-case) |
| `from` | string/path | no | - | Existing prompt to extract template from |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `version` | string | no | `1.0.0` | Initial version number |

## Interactive Flow

### Step 1: Template Purpose

```
Lyra: Let's create a reusable prompt template.

What type of template do you need?
  1. RAG Q&A - Question answering over retrieved context
  2. Extraction - Structured data extraction from text
  3. Summarization - Document or chunk summarization
  4. Classification - Text categorization and routing
  5. Conversational - Multi-turn dialogue with context
  6. Agent Instruction - System prompt for AI agents
  7. Evaluation - LLM-as-judge scoring prompts
  8. Transformation - Text-to-text conversion
  9. Custom type (describe below)

> [user input]

Template name (kebab-case): ___
Description (one sentence): ___

> [user input]

What use cases should this template serve?
  (list concrete scenarios, press enter twice when done)
  1. ___
  2. ___
  3. ___

> [user input]
```

### Step 2: Variable Definition

```
Lyra: Let's define the template variables.

Based on your template type ({type}) and use cases, I recommend these variables:

Recommended Variables:
  1. {{context}}
     Type: text_block
     Required: yes
     Description: Retrieved context chunks from the RAG pipeline
     Validation: min_tokens=50, max_tokens=4000

  2. {{query}}
     Type: string
     Required: yes
     Description: User's question or request
     Validation: min_length=3, max_length=500

  3. {{output_format}}
     Type: enum
     Required: no
     Default: "text"
     Allowed: ["text", "json", "markdown", "bullets"]
     Description: Desired output format

  [... additional recommended variables ...]

Would you like to:
  1. Accept recommended variables
  2. Add more variables
  3. Remove some variables
  4. Modify variable definitions
  5. Start from scratch

> [user input]

[If adding custom variable:]
Variable name: ___
Type (string/text_block/enum/list/boolean/integer/object): ___
Required? [Y/n]: ___
Default value (if optional): ___
Description: ___
Validation rules: ___

> [user input]
```

### Step 3: Template Structure

```
Lyra: Here is the template structure.

=== TEMPLATE PREVIEW ===

--- SYSTEM PROMPT ---
{{#system}}
You are {role_description_for_template_type}.

{guardrails_based_on_use_cases}

{{#if output_format == "json"}}
You MUST respond with valid JSON matching the provided schema.
{{/if}}

{{#if citations_required}}
Every factual claim MUST include a citation in [Source N] format.
{{/if}}
{{/system}}

--- USER PROMPT ---
{{#user}}
Context:
"""
{{context}}
"""

{{#if history}}
Conversation History:
{{history}}
{{/if}}

{{query}}

{{#if output_format != "text"}}
Respond in {{output_format}} format.
{{/if}}
{{/user}}

--- FEW-SHOT EXAMPLES ---
{{#if examples}}
{{#each examples}}
Example {{@index}}:
  Input: {{this.input}}
  Output: {{this.output}}
{{/each}}
{{/if}}

Token Estimate:
  System prompt: ~{n} tokens (fixed)
  Variable sections: ~{n} tokens (depends on input)
  Examples: ~{n} tokens (fixed if included)

Review template structure? Modify? [accept/modify/rebuild]
```

### Step 4: Validation Rules

```
Lyra: Let's define validation rules for inputs and outputs.

=== INPUT VALIDATION ===

Variable: {{context}}
  - Must not be empty
  - Token count between 50 and 4000
  - Must be UTF-8 encoded text
  - Warning if token count < 100 (may indicate retrieval failure)

Variable: {{query}}
  - Must not be empty
  - Length between 3 and 500 characters
  - Must not contain prompt injection patterns: {list}
  - Warning if query is a single word (may be too vague)

[... for each variable ...]

=== OUTPUT VALIDATION ===

  - Must match output_format specification
  - If JSON: must parse without errors and match schema
  - If citations required: must contain [Source N] references
  - Must not exceed max_output_tokens if specified
  - Must not contain PII if pii_filter is enabled

Accept validation rules? [Y/n/customize]
```

### Step 5: Usage Examples

```
Lyra: Let me generate usage examples for each of your use cases.

=== USAGE EXAMPLE 1: {use_case_1} ===

Variables:
  context: "{sample_context_for_use_case_1}"
  query: "{sample_query}"
  output_format: "text"
  citations_required: true

Rendered Prompt:
  [... shows the fully rendered prompt ...]

Expected Output:
  [... shows what the model should produce ...]

=== USAGE EXAMPLE 2: {use_case_2} ===
  [... similar structure ...]

=== USAGE EXAMPLE 3: {use_case_3} ===
  [... similar structure ...]

All examples look correct? [Y/n/adjust]
```

### Step 6: Registration and Documentation

```
Lyra: Template is ready. Let me register it.

=== TEMPLATE REGISTRATION ===

Template ID: {template_id}
Version: 1.0.0
Type: {template_type}
Location: prompts/templates/{template_id}/v1.0.0/

Files Created:
  template.md       - Main prompt template
  variables.yaml    - Variable definitions and validation
  examples/         - {N} usage examples
  tests/            - {N} test cases
  README.md         - Template documentation

Registry Entry:
  Name: {template_name}
  Description: {one_sentence_description}
  Variables: {count} ({required_count} required, {optional_count} optional)
  Use Cases: {list_of_use_cases}
  Author: @prompt-engineer (Lyra)
  Created: {timestamp}

Template registered successfully.

Next steps:
  1. Run *test-prompt to validate with real data
  2. Share template ID with team for reuse
  3. Use *optimize-prompt when ready for production

> [done]
```

## Output

The task produces the following artifacts:

### 1. Prompt Template (`prompts/templates/{template_id}/v{version}/template.md`)
- System prompt with conditional sections
- User prompt with variable placeholders
- Optional few-shot examples section
- Output schema enforcement
- Safety and guardrail sections

### 2. Variable Documentation (`prompts/templates/{template_id}/v{version}/variables.yaml`)
- Complete variable definitions with types
- Validation rules and constraints
- Default values and allowed ranges
- Dependencies between variables
- Rendering transformation rules

### 3. Usage Examples (`prompts/templates/{template_id}/v{version}/examples/`)
- One YAML file per use case
- Complete variable bindings for each example
- Rendered prompt preview
- Expected output sample

### 4. Validation Rules (`prompts/templates/{template_id}/v{version}/validation.yaml`)
- Input validation per variable
- Output validation rules
- Cross-variable consistency checks
- Injection detection patterns

### 5. Registry Entry
- Template metadata added to prompt registry
- Searchable by type, use case, variables
- Version tracking enabled

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Duplicate Template ID | Template with same ID already exists in registry | Suggest alternative name or version bump | Show existing template, offer to extend or fork |
| Invalid Variable Type | Variable type not in supported type system | Show supported types with examples | Map user's type to closest supported type |
| Circular Variable Dependency | Variables reference each other in validation rules | Detect cycle and show dependency graph | Suggest breaking the cycle with intermediate variable |
| Template Rendering Error | Variable placeholder syntax error in template | Validate template syntax before registration | Show line number and suggest fix |
| Schema Conflict | Output schema incompatible with template type | Alert user to incompatibility and suggest adjustments | Show which schema fields conflict and recommend alternatives |
| Example Generation Failure | Cannot generate realistic examples for use case | Ask user for a representative sample | Provide example template for user to fill in |
| Variable Collision | Variable name conflicts with reserved template keywords | Show reserved words list, suggest rename | Auto-suggest alternative names |
| Registry Write Failure | Cannot write to prompt registry directory | Check permissions and directory structure | Save to temporary location, provide manual registration instructions |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Template type selected from supported categories"
  - "[ ] At least one use case defined"
  - "[ ] Target model or model family identified for compatibility"
  - "[ ] Output format requirements specified"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Template file created with valid placeholder syntax"
  - "[ ] All variables documented with types, defaults, and validation"
  - "[ ] At least one usage example per declared use case"
  - "[ ] Validation rules defined for all required variables"
  - "[ ] Template registered in prompt registry"
  - "[ ] Template renders successfully with example variable bindings"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Template renders valid prompts for all declared use cases"
  - "[ ] Variable validation catches invalid inputs with clear error messages"
  - "[ ] Output validation rules can verify format compliance"
  - "[ ] Template is reusable across at least 2 distinct use case scenarios"
  - "[ ] Documentation is sufficient for another engineer to use the template without help"
  - "[ ] Template is versioned and registered for team discoverability"
```

## Performance

```yaml
duration_expected: 10-20 min (interactive), 3-8 min (yolo)
cost_estimated: $0.005-0.02
token_usage: ~3,000-10,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - prompt-engineer-design-prompt.md
  - prompt-engineer-test-prompt.md
tags:
  - prompt-engineering
  - templates
  - reusability
  - versioning
  - rag
updated_at: 2026-02-09
```

## Related

- **Agent:** @prompt-engineer (Lyra)
- **Upstream Tasks:** `*design-prompt` (templates often extracted from designed prompts)
- **Downstream Tasks:** `*test-prompt` (validate template), `*optimize-prompt` (optimize instantiated prompts)
- **Collaborators:** @rag-ai-engineer (Atlas) for pipeline integration requirements, @eval-guardian (Sage) for evaluation template patterns
- **Templates:** `template-scaffold.md`, `variable-docs.yaml`
- **Checklists:** `template-quality-checklist.md`, `variable-validation-checklist.md`
