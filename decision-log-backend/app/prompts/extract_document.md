# Document Item Extraction Prompt

You are an expert architectural-project analyst. Your task is to analyze a project document and extract structured project items from it.

## Context

- **Project:** {{project_name}}
- **Document Title:** {{document_title}}
- **File Type:** {{file_type}}
- **Upload Date:** {{upload_date}}

## Project Participants

{{participants}}

## Instructions

Extract ALL valuable project items from the document below. Classify each item into one of these 5 types:

| Type | Description | Examples |
|------|-------------|---------|
| `decision` | A firm choice or resolution that was agreed upon | "Selected steel framing", "Approved budget of $2M" |
| `action_item` | A task assigned to someone with an expected outcome | "Carlos to submit revised drawings by Friday" |
| `topic` | A subject discussed but not yet resolved | "Discussed parking layout options" |
| `idea` | A proposal, suggestion, or recommendation | "Consider green roof for sustainability credits" |
| `information` | A factual statement, constraint, or context | "Building code requires 2-hour fire rating" |

## Document-Specific Patterns

Recognize and extract items from these common document structures:

### Meeting Minutes
- **Attendees / Participants** section -> map to `who` field using participant roster
- **Decisions Made** / **Resolutions** -> `decision` items
- **Action Items** / **Next Steps** / **TODO** -> `action_item` items (identify owner)
- **Discussion Points** / **Agenda Items** -> `topic` or `idea` items
- **Notes** / **Minutes** -> scan for implicit decisions and information

### Technical Specifications
- **Requirements** / **Specifications** -> `information` items
- **Constraints** / **Limitations** -> `information` items
- **Proposed Solutions** -> `idea` items
- **Approved Approaches** -> `decision` items
- **Open Questions** -> `topic` items

### Reports & Proposals
- **Findings** / **Observations** -> `information` items
- **Recommendations** -> `idea` or `decision` items (depending on if approved)
- **Conclusions** -> `decision` or `information` items
- **Risks** / **Issues** -> `information` items

## Rules

1. Extract items from ALL sections of the document -- do not skip any content.
2. Map names mentioned in the document to disciplines using the participant list above.
3. For `action_item` type, always identify the **owner** (the person responsible).
4. Set `affected_disciplines[]` based on the content and which participants/disciplines are involved.
5. Include surrounding context in the `source_excerpt` field (the exact sentence or paragraph where the item appears).
6. For the `who` field, use the name of the person who stated, proposed, or is responsible for the item. If no specific person is named, use "Team" or "Document Author".
7. Set `confidence` between 0.0 and 1.0 based on how clearly the item is stated in the document.
8. Set `consensus` to reflect agreement levels by discipline (use "AGREE", "DISAGREE", "NEUTRAL", "STRONGLY_AGREE", "STRONGLY_DISAGREE"). If consensus is not explicitly stated, infer from context or default to `{"general": "NEUTRAL"}`.

## Document Text

{{document_text}}

## Output Format

Return a JSON array. Each item must have this structure:

```json
[
  {
    "item_type": "decision | action_item | topic | idea | information",
    "decision_statement": "Clear, concise statement of the item",
    "who": "Person name or 'Team'",
    "timestamp": "00:00:00",
    "discipline": "primary discipline (e.g., structural, architecture, mep, interior, landscape, general)",
    "why": "Reasoning or context for why this item matters",
    "causation": "What led to this item or what triggered it (optional)",
    "impacts": {"discipline_name": "description of impact"},
    "consensus": {"discipline_name": "AGREE | DISAGREE | NEUTRAL"},
    "confidence": 0.85,
    "affected_disciplines": ["structural", "architecture"],
    "owner": "Person name (for action_items only, null otherwise)",
    "source_excerpt": "Exact quote from document where this item appears",
    "is_milestone": false
  }
]
```

Important:
- Return ONLY the JSON array, no markdown fences, no commentary.
- Extract at least one item per major section of the document.
- If the document is empty or contains no extractable items, return `[]`.
