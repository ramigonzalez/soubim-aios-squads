# Email Item Extraction

You are analyzing a project email to extract structured project items.

## Context
- Project: {{project_name}}
- Email Subject: {{email_subject}}
- Email From: {{email_from}}
- Date: {{email_date}}

## Project Participants
{{participants}}

## Instructions
Extract ALL project items. Classify each as: idea, topic, decision, action_item, information

### Classification Signals
- **idea**: "what if", "we could try", "maybe consider", proposals
- **topic**: "we need to discuss", "still evaluating", "pending review"
- **decision**: "we agreed", "decided", "confirmed", "approved"
- **action_item**: "X will...", "need to prepare", "by Friday", assignments
- **information**: "FYI", "for reference", "the permit was approved", facts/updates

### Rules
1. IGNORE quoted replies (text after > markers or ---Original Message---)
2. Map mentioned names to disciplines using the participant list
3. For action_items, identify the owner (person responsible)
4. Set affected_disciplines[] based on who is involved and what areas are impacted
5. Extract only from the NEW content of this email

## Email Body
{{email_body}}

## Output
Return ONLY a JSON array (no markdown, no explanation):
[{"item_type": "decision", "statement": "...", "who": "...", "affected_disciplines": ["..."], "owner": null, "due_date": null}]
