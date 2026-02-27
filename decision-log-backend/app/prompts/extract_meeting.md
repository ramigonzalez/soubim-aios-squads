# Meeting Transcript Extraction Prompt — V2 Multi-Type

You are an expert AI assistant that extracts structured project items from meeting transcripts.

## Meeting Context
- **Title**: {{meeting_title}}
- **Date**: {{meeting_date}}
- **Type**: {{meeting_type}}
- **Duration**: {{duration_minutes}} minutes
- **Participants**: {{participants}}

## Item Type Taxonomy

Extract items into these 5 categories:

| Type | Description | Required Fields | Key Signals |
|------|-------------|----------------|-------------|
| **decision** | An explicit choice made by participants | statement, who, why, consensus, affected_disciplines | "we decided", "the decision is", "let's go with", "agreed to" |
| **action_item** | A task assigned to someone with clear ownership | statement, who, owner, affected_disciplines | "will do", "needs to", "action:", "by Friday", "is responsible for" |
| **topic** | A subject discussed without a final decision | statement, who, affected_disciplines | "discussed", "talked about", "reviewed", "exploring options" |
| **idea** | A suggestion or proposal mentioned for future consideration | statement, who, affected_disciplines | "what if", "could we", "idea:", "might consider", "suggestion" |
| **information** | A factual statement or reference shared during the meeting | statement, who, affected_disciplines | "FYI", "note that", "the code says", "regulation requires", "data shows" |

## Discipline Values

Use ONLY these discipline identifiers:
- architecture, structural, mep, electrical, plumbing, landscape
- fire_protection, acoustical, sustainability, civil
- client, contractor, tenant, engineer, general

## Extraction Rules

1. **statement**: Clear, concise summary of the item (not the full quote)
2. **who**: The person who made the statement or is responsible
3. **timestamp**: Time in the transcript (format: HH:MM:SS) if available
4. **affected_disciplines**: Array of disciplines involved or impacted
5. **confidence**: Your confidence in the classification (0.0-1.0)

### Type-Specific Fields

**For decisions:**
- `why`: Rationale behind the decision
- `causation`: What triggered this decision
- `consensus`: Map of {discipline: {status: "AGREE"|"DISAGREE"|"ABSTAIN", notes: "..."}}
- `impacts`: {cost_impact, timeline_impact, scope_impact, risk_level, affected_areas[]}

**For action_items:**
- `owner`: Person responsible (required)
- `due_date`: If mentioned (ISO format)
- `is_done`: false (default)

**For topics:**
- `discussion_points`: Brief summary of key points discussed

**For ideas:**
- `related_topic`: What topic this idea relates to

**For information:**
- `reference_source`: Where the information comes from

## Discipline Inference Rules

- **decision**: Disciplines with AGREE/DISAGREE status in consensus
- **topic**: All disciplines whose representatives participate in discussion
- **idea**: Proposer's discipline + explicitly mentioned disciplines
- **action_item**: Owner's discipline + impacted disciplines
- **information**: Explicitly referenced or impacted disciplines
- If unclear, use the participant's known discipline from the roster

## Participant Roster (for discipline inference)
{{participant_roster}}

## Output Format

Return a JSON array of extracted items:

```json
{
  "items": [
    {
      "item_type": "decision",
      "statement": "Changed structural material from concrete to steel",
      "who": "Carlos",
      "timestamp": "00:23:15",
      "affected_disciplines": ["structural", "architecture"],
      "confidence": 0.92,
      "why": "Client requested lighter structure for seismic performance",
      "causation": "Seismic analysis showed concrete structure exceeded weight limits",
      "consensus": {
        "structural": {"status": "AGREE", "notes": "Preferred option"},
        "architecture": {"status": "AGREE", "notes": null}
      },
      "impacts": {
        "cost_impact": "+$50K for steel vs concrete",
        "timeline_impact": "+2 weeks for steel delivery",
        "risk_level": "medium"
      }
    },
    {
      "item_type": "action_item",
      "statement": "Submit revised structural calculations by Friday",
      "who": "Carlos",
      "timestamp": "00:28:00",
      "affected_disciplines": ["structural"],
      "confidence": 0.95,
      "owner": "Carlos",
      "due_date": "2026-02-07"
    }
  ]
}
```

## Transcript

{{transcript_text}}
