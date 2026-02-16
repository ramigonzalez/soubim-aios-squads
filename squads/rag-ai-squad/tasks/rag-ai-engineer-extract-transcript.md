---
task: Extract Information from Call Transcripts
responsavel: "@rag-ai-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - transcript_files: Path(s) to call transcript files or directory containing transcripts
  - extraction_schema: Schema defining what information to extract (entities, intents, action items, etc.)
  - output_format: Desired output format (JSON, CSV, markdown, database)
Saida: |
  - structured_data: Extracted information in structured format per the extraction schema
  - entities: Named entities extracted from transcripts (people, organizations, dates, products)
  - summaries: Concise summaries of each call with key discussion points
  - action_items: Identified action items with owners, deadlines, and status
  - sentiment_analysis: Sentiment scores and emotional tone analysis per speaker and overall
Checklist:
  - "[ ] Load and validate transcript files"
  - "[ ] Define extraction schema based on user requirements"
  - "[ ] Implement Named Entity Recognition (NER) for transcript domain"
  - "[ ] Extract intents and topics from conversation"
  - "[ ] Generate structured summaries per call"
  - "[ ] Identify and assign action items"
  - "[ ] Analyze sentiment per speaker and overall"
  - "[ ] Validate extractions against source transcripts"
  - "[ ] Export structured data in requested format"
---

# *extract-transcript

Extract structured information from call transcripts using LLM-powered analysis. Atlas processes raw transcripts to identify entities, intents, action items, sentiment, and key discussion points, producing structured data suitable for downstream analytics, CRM integration, or RAG indexing.

## Usage

```bash
# Interactive mode (recommended)
*extract-transcript

# Process a single transcript
*extract-transcript --file transcripts/call-2024-01-15.txt

# Process directory of transcripts
*extract-transcript --dir transcripts/ --output-format json

# With custom extraction schema
*extract-transcript --file call.txt --schema schemas/sales-call.yaml

# Batch processing with specific extractions
*extract-transcript --dir transcripts/ --extract "entities,action_items,sentiment" --output-format csv
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `transcript_files` | string/list | yes | - | File path(s) or directory of transcripts |
| `extraction_schema` | string/object | no | `default` | Custom extraction schema or preset name |
| `output_format` | enum | no | `json` | Output: `json`, `csv`, `markdown`, `database`, `yaml` |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `extract` | list | no | `all` | What to extract: `entities`, `intents`, `summaries`, `action_items`, `sentiment`, `topics`, `questions`, `decisions` |
| `language` | string | no | `auto` | Transcript language (auto-detected if not specified) |
| `speaker_diarization` | boolean | no | `true` | Whether to identify and label speakers |
| `chunk_long_transcripts` | boolean | no | `true` | Split long transcripts for processing |
| `max_transcript_length` | integer | no | `50000` | Max tokens per transcript before chunking |
| `llm_model` | string | no | `gpt-4o-mini` | LLM for extraction |

## Transcript Format Support

Atlas handles multiple transcript formats:

| Format | Example | Auto-Detected |
|--------|---------|---------------|
| Speaker-labeled | `Agent: Hello, how can I help?` | Yes |
| Timestamped | `[00:01:23] Agent: Hello...` | Yes |
| SRT/VTT subtitles | Standard subtitle format | Yes |
| Plain text | No speaker labels | Yes (limited) |
| JSON (structured) | `{"speaker": "Agent", "text": "..."}` | Yes |
| CSV (tabular) | `timestamp,speaker,text` | Yes |
| Whisper output | OpenAI Whisper JSON format | Yes |
| AWS Transcribe | Amazon Transcribe JSON output | Yes |
| Google STT | Google Speech-to-Text output | Yes |

## Interactive Flow

### Step 1: Transcript Input

```
Atlas: Let's extract insights from your call transcripts.

How would you like to provide transcripts?
  1. Single file (provide path)
  2. Directory of files (provide directory path)
  3. Paste transcript text directly
  4. API endpoint (streaming source)

> [user input]

Atlas: Analyzing transcript format...

Detected format: Speaker-labeled with timestamps
Speakers found: 2 (Agent, Customer)
Duration: ~15 minutes
Language: English
Word count: 3,847

Is this correct? [Y/n]
```

### Step 2: Extraction Configuration

```
Atlas: What information do you need to extract?

Select extraction targets:
  (select all that apply)

  [x] Named Entities (people, companies, products, dates, amounts)
  [x] Call Summary (key discussion points, outcome)
  [x] Action Items (tasks, owners, deadlines)
  [x] Sentiment Analysis (per speaker, overall tone)
  [ ] Intent Classification (reason for call, desired outcome)
  [ ] Topic Segmentation (break call into topic segments)
  [ ] Questions Asked (by each speaker)
  [ ] Decisions Made (agreements, commitments)
  [ ] Compliance Flags (regulatory language, disclosures)
  [ ] Customer Satisfaction Signals (positive/negative indicators)
  [ ] Competitive Mentions (competitor names, comparisons)
  [ ] Follow-up Requirements (next steps, callbacks)

> [user selection]

Do you have a custom extraction schema?
  1. Use default schema for selected extractions
  2. Provide custom schema (YAML/JSON)
  3. Use a preset: sales-call, support-call, meeting, interview

> [user input]
```

### Step 3: Entity Configuration

```
Atlas: Let's configure entity extraction.

Which entity types matter for your use case?
  [x] Person names (speakers + mentioned)
  [x] Organization names
  [x] Product / service names
  [x] Dates and times
  [x] Monetary amounts
  [x] Phone numbers / emails
  [ ] Locations / addresses
  [ ] Account numbers / IDs
  [ ] Technical terms
  [ ] Custom entities: ___________

> [user selection]

Should entities be:
  1. Extracted as-is (raw mentions)
  2. Normalized (resolve aliases, standardize formats)
  3. Linked to a knowledge base (if available)

> [user input]
```

### Step 4: Output Configuration

```
Atlas: How should I format the output?

Output format:
  1. JSON (structured, machine-readable)
  2. CSV (tabular, spreadsheet-friendly)
  3. Markdown (human-readable report)
  4. YAML (configuration-friendly)
  5. Database (insert into SQL/NoSQL)

> [user input]

Output granularity:
  1. One output file per transcript
  2. Consolidated output for all transcripts
  3. Both individual and consolidated

> [user input]

Output location:
  Default: ./output/extractions/
  Custom path: [user input]
```

### Step 5: Processing and Review

```
Atlas: Processing transcripts...

  [1/4] Loading transcripts...                    3 files loaded
  [2/4] Extracting entities...                    done (47 entities found)
  [3/4] Analyzing sentiment and intents...        done
  [4/4] Generating summaries and action items...  done

=== Extraction Results Preview ===

Call: sales-call-2024-01-15.txt
  Summary: Customer inquired about enterprise pricing for 50 seats.
           Discussed feature comparison with Competitor X. Agent
           offered 15% discount for annual commitment.

  Entities:
    - Person: John Smith (Customer), Sarah Chen (Agent)
    - Organization: Acme Corp (customer company), Competitor X
    - Product: Enterprise Plan, Pro Plan
    - Amount: $15,000/year, 15% discount
    - Date: January 30 (follow-up deadline)

  Action Items:
    1. [Sarah Chen] Send enterprise pricing proposal by Jan 20
    2. [Sarah Chen] Schedule follow-up call for Jan 30
    3. [John Smith] Review proposal with internal team

  Sentiment:
    - Overall: Positive (0.72)
    - Customer: Interested but cautious (0.65)
    - Agent: Professional, accommodating (0.81)

Results look correct? [Y/n]

Export to {format}? [Y/n]
```

## Output

### 1. Structured Data
```json
{
  "transcript_id": "sales-call-2024-01-15",
  "metadata": {
    "date": "2024-01-15",
    "duration_minutes": 15,
    "speakers": ["Sarah Chen (Agent)", "John Smith (Customer)"],
    "language": "en"
  },
  "summary": {
    "brief": "Enterprise pricing inquiry with discount negotiation",
    "detailed": "Customer John Smith from Acme Corp inquired about...",
    "outcome": "Positive - proposal to be sent, follow-up scheduled",
    "topics": ["pricing", "feature_comparison", "discount_negotiation"]
  },
  "entities": [
    {"text": "John Smith", "type": "PERSON", "role": "customer", "mentions": 3},
    {"text": "Acme Corp", "type": "ORG", "role": "customer_company", "mentions": 2}
  ],
  "action_items": [
    {
      "description": "Send enterprise pricing proposal",
      "owner": "Sarah Chen",
      "deadline": "2024-01-20",
      "status": "pending",
      "priority": "high"
    }
  ],
  "sentiment": {
    "overall": {"score": 0.72, "label": "positive"},
    "by_speaker": {
      "Sarah Chen": {"score": 0.81, "label": "positive"},
      "John Smith": {"score": 0.65, "label": "slightly_positive"}
    },
    "trajectory": "improving"
  }
}
```

### 2. Entities
- Deduplicated entity list with mention counts
- Entity relationships (who mentioned what)
- Entity timeline (when entities appear in conversation)

### 3. Summaries
- Brief summary (1-2 sentences)
- Detailed summary (paragraph)
- Call outcome classification
- Topic segmentation with timestamps

### 4. Action Items
- Task description
- Assigned owner
- Deadline (if mentioned)
- Priority level
- Dependencies between action items

### 5. Sentiment Analysis
- Overall call sentiment score (-1.0 to 1.0)
- Per-speaker sentiment
- Sentiment trajectory (improving, declining, stable)
- Key emotional moments with timestamps

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| File Not Found | Invalid transcript path | Prompt for correct path, list available files | Search for similar filenames in directory |
| Unsupported Format | Transcript format not recognized | Show supported formats, suggest conversion | Attempt plain text parsing as fallback |
| Encoding Error | File encoding not UTF-8 | Auto-detect encoding, convert to UTF-8 | Try common encodings (latin-1, cp1252) |
| Transcript Too Long | Exceeds max token limit | Chunk transcript and process in segments | Process segments independently, merge results |
| Speaker Detection Failed | Cannot identify speakers | Ask user for speaker labels or count | Process without speaker attribution |
| LLM Rate Limit | Too many extraction requests | Implement batching with rate limiting | Queue remaining transcripts, process on cooldown |
| Low Confidence Extraction | Entity or sentiment extraction uncertain | Flag low-confidence results for review | Include confidence scores, highlight uncertain items |
| Language Not Supported | Transcript in unsupported language | List supported languages, suggest translation | Process with English model, warn about quality |
| Empty Transcript | File exists but has no content | Skip file, warn user | Continue processing remaining files |
| Contradictory Information | Conflicting statements in transcript | Flag contradictions in output | Present both versions with timestamps |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Transcript files accessible and in a supported format"
  - "[ ] LLM API key configured for extraction"
  - "[ ] Output directory writable"
  - "[ ] Extraction schema defined or defaults accepted"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] All transcripts processed without unrecoverable errors"
  - "[ ] Structured data exported in requested format"
  - "[ ] Entity extraction validated against source text"
  - "[ ] Action items include owners and deadlines where available"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] All selected extraction types produced for each transcript"
  - "[ ] Entities are accurate and deduplicated"
  - "[ ] Summaries capture key discussion points"
  - "[ ] Action items are actionable with clear ownership"
  - "[ ] Sentiment scores are consistent with transcript tone"
  - "[ ] Output format matches requested specification"
```

## Performance

```yaml
duration_expected: 2-5 min per transcript (interactive), 1-2 min (yolo)
cost_estimated: $0.01-0.05 per transcript (depends on length and LLM)
token_usage: ~3,000-10,000 tokens per transcript
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies: []
tags:
  - transcripts
  - extraction
  - ner
  - sentiment
  - action-items
  - summarization
updated_at: 2026-02-09
```

## Related

- **Agent:** @rag-ai-engineer (Atlas)
- **Upstream Tasks:** None (standalone extraction), or `*build-pipeline` (if indexing transcripts for RAG)
- **Downstream Tasks:** `*build-pipeline` (index extracted data), `*implement-retrieval` (query extracted information)
- **Collaborators:** @prompt-engineer (Lyra) for extraction prompt optimization, @eval-guardian (Sage) for extraction accuracy evaluation
- **Checklists:** `rag-pipeline-review.md`
