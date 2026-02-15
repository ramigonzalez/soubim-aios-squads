---
task: Build Production Agent
responsavel: "@rag-ai-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - agent_spec: Agent specification including purpose, persona, and capabilities
  - tools: List of tools the agent can use (RAG retrieval, APIs, databases, calculators, etc.)
  - state_schema: State schema definition for the agent's working memory and context
  - memory_config: Memory and persistence configuration (checkpointing, long-term memory, conversation history)
Saida: |
  - langgraph_agent: Complete LangGraph agent implementation with nodes, edges, and state management
  - tool_definitions: Tool definitions with input/output schemas and error handling
  - state_machine: State machine definition with all nodes, edges, and conditions
  - tests: Unit and integration tests covering agent behavior and edge cases
Checklist:
  - "[ ] Define agent state schema with TypedDict"
  - "[ ] Implement tool definitions with Pydantic schemas"
  - "[ ] Build graph nodes (agent reasoning, tool execution, routing)"
  - "[ ] Configure edges and conditional routing"
  - "[ ] Add memory and persistence (checkpointing)"
  - "[ ] Implement error handling and recovery"
  - "[ ] Write unit tests for individual nodes"
  - "[ ] Test end-to-end agent behavior"
  - "[ ] Document agent behavior and decision logic"
---

# *build-agent

Build a production-ready AI agent using LangGraph with tool use, state management, memory persistence, and comprehensive error handling. Atlas scaffolds the complete agent architecture, implements the state machine, wires tools, and produces tested, deployable agent code.

## Usage

```bash
# Interactive mode (recommended)
*build-agent

# With agent specification
*build-agent --spec agents/customer-support-agent.yaml

# Quick agent with RAG tools
*build-agent --mode yolo --purpose "RAG Q&A agent" --tools "retriever,calculator"

# Full specification
*build-agent --spec agent.yaml --memory postgres --checkpoint-interval 5
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agent_spec` | string/object | no | - | Agent specification path or inline config |
| `tools` | list | yes | - | Tools the agent can use |
| `state_schema` | object | no | `default` | Custom state schema definition |
| `memory_config` | object | no | `in_memory` | Memory: `in_memory`, `sqlite`, `postgres` |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `checkpoint_backend` | enum | no | `memory` | Backend: `memory`, `sqlite`, `postgres` |
| `max_iterations` | integer | no | `10` | Maximum reasoning iterations before stopping |
| `streaming` | boolean | no | `true` | Enable streaming responses |
| `human_in_the_loop` | boolean | no | `false` | Enable human approval for certain actions |
| `tracing` | boolean | no | `true` | Enable LangSmith tracing |

## Agent Architecture Reference

### LangGraph Agent Patterns

#### ReAct Agent (Reasoning + Acting)
The standard pattern: LLM reasons about what tool to use, executes it, observes results, and repeats until it has enough information to respond.

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=llm,
    tools=tools,
    state_modifier="You are a helpful assistant..."
)
```

#### Custom State Machine Agent
Full control over the agent's decision flow with custom nodes and edges.

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    context: str
    tool_results: list
    iteration_count: int
    should_continue: bool

graph = StateGraph(AgentState)
graph.add_node("reason", reason_node)
graph.add_node("act", tool_node)
graph.add_node("reflect", reflection_node)

graph.add_edge(START, "reason")
graph.add_conditional_edges("reason", route_after_reasoning)
graph.add_edge("act", "reflect")
graph.add_conditional_edges("reflect", should_continue)
```

#### Multi-Agent Supervisor
Orchestrates multiple specialized agents, routing tasks to the right expert.

```python
from langgraph.graph import StateGraph

class SupervisorState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str
    task_complete: bool

graph = StateGraph(SupervisorState)
graph.add_node("supervisor", supervisor_node)
graph.add_node("researcher", researcher_agent)
graph.add_node("writer", writer_agent)
graph.add_node("reviewer", reviewer_agent)
graph.add_conditional_edges("supervisor", route_to_agent)
```

### Tool Definition Patterns

```python
from langchain_core.tools import tool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="Search query string")
    top_k: int = Field(default=5, description="Number of results")

@tool(args_schema=SearchInput)
def search_knowledge_base(query: str, top_k: int = 5) -> str:
    """Search the knowledge base for relevant information.

    Use this tool when the user asks a question that requires
    looking up information from the documentation.
    """
    results = retriever.invoke(query, k=top_k)
    return format_results(results)
```

### Memory and Persistence Patterns

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.postgres import PostgresSaver

# In-memory (development)
checkpointer = MemorySaver()

# SQLite (local persistence)
checkpointer = SqliteSaver.from_conn_string("agent_state.db")

# PostgreSQL (production)
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/agents"
)

agent = graph.compile(checkpointer=checkpointer)
```

## Interactive Flow

### Step 1: Agent Purpose and Persona

```
Atlas: Let's build your production agent.

What is the agent's primary purpose?
  1. RAG-powered Q&A (answer questions from documents)
  2. Customer support (handle inquiries, route issues)
  3. Data extraction and processing
  4. Research assistant (search, synthesize, report)
  5. Workflow automation (multi-step task execution)
  6. Multi-agent orchestrator (coordinate other agents)
  7. Custom purpose: ___________

> [user input]

Agent persona (optional):
  Name: [user input or auto-generated]
  Tone: [professional / friendly / technical / concise]
  Behavior: [proactive / reactive / balanced]

> [user input]
```

### Step 2: Tool Configuration

```
Atlas: What tools should the agent have access to?

Available tool categories:
  [ ] RAG Retrieval (search knowledge base)
  [ ] Web Search (search the internet)
  [ ] Database Query (SQL/NoSQL queries)
  [ ] API Calls (external service integrations)
  [ ] Calculator (math operations)
  [ ] Code Execution (run Python code)
  [ ] File Operations (read/write files)
  [ ] Email/Notifications (send alerts)
  [ ] CRM Integration (Salesforce, HubSpot)
  [ ] Calendar (scheduling, availability)
  [ ] Custom tool: ___________

> [user selection]

For each selected tool:
  Tool: RAG Retrieval
    - Data source: [vectordb collection name]
    - Top-k results: [default: 5]
    - Include sources: [yes/no]

  Tool: Database Query
    - Connection: [connection string]
    - Allowed operations: [read-only / read-write]
    - Tables accessible: [list or all]

Configure more tools? [y/N]
```

### Step 3: State Schema Design

```
Atlas: Let's design the agent's state schema.

The state schema defines what the agent tracks during execution.

Default state includes:
  - messages: Conversation history
  - tool_results: Results from tool executions

Additional state fields?
  [ ] context: Retrieved RAG context
  [ ] user_profile: User information
  [ ] task_status: Current task tracking
  [ ] error_count: Error tracking for recovery
  [ ] metadata: Request metadata
  [ ] custom_fields: ___________

> [user selection]

State persistence:
  1. In-memory only (no persistence between sessions)
  2. SQLite (local persistence, development)
  3. PostgreSQL (production, distributed)
  4. Redis (fast, ephemeral sessions)

> [user input]
```

### Step 4: Graph Architecture

```
Atlas: Designing the agent graph.

Based on your configuration, I recommend:

  Agent Type: {type}

  Graph Structure:

    [START]
       |
    [reason] <---+
       |         |
    [route]      |
     / | \       |
    /  |  \      |
  [tool] [respond] [escalate]
    |              |
    +----[reflect]-+
              |
           [END]

  Nodes:
    - reason: LLM analyzes query and decides action
    - route: Conditional routing based on LLM decision
    - tool: Execute selected tool
    - reflect: Evaluate tool result, decide if more info needed
    - respond: Generate final response
    - escalate: Hand off to human (if HITL enabled)

  Conditions:
    - route: tool_call -> tool, has_answer -> respond, needs_human -> escalate
    - reflect: needs_more -> reason, sufficient -> respond

  Max iterations: {max_iterations}
  Checkpoint: Every {n} steps

Accept this architecture? [Y/n]
```

### Step 5: Error Handling and Safety

```
Atlas: Configuring safety and error handling.

Error recovery strategy:
  1. Retry with backoff (tool failures)
  2. Fallback to alternative tool
  3. Graceful degradation (partial response)
  4. Escalate to human
  5. All of the above

> [user input]

Safety guardrails:
  [ ] Max iteration limit (prevent infinite loops)
  [ ] Token budget per request
  [ ] Tool call rate limiting
  [ ] Input validation on all tools
  [ ] Output content filtering
  [ ] PII detection and masking
  [ ] Audit logging for all actions

> [user selection]

Human-in-the-loop:
  Enable HITL? [y/N]
  If yes, which actions require approval?
    [ ] Database writes
    [ ] External API calls
    [ ] Email/notification sending
    [ ] High-value decisions
    [ ] Custom: ___________
```

### Step 6: Build and Test

```
Atlas: Building the agent...

  [1/9] Generating state schema...               done
  [2/9] Implementing tool definitions...          done (4 tools)
  [3/9] Building graph nodes...                   done (5 nodes)
  [4/9] Configuring edges and conditions...       done (7 edges)
  [5/9] Adding memory/persistence...              done (SQLite)
  [6/9] Implementing error handling...            done
  [7/9] Writing unit tests...                     done (12 tests)
  [8/9] Running end-to-end tests...               done
  [9/9] Generating documentation...               done

Files generated:
  src/agents/
  ├── customer_support/
  │   ├── __init__.py
  │   ├── agent.py          # Main agent graph
  │   ├── state.py          # State schema
  │   ├── nodes.py          # Graph nodes
  │   ├── tools.py          # Tool definitions
  │   ├── prompts.py        # System prompts
  │   └── config.py         # Agent configuration
  ├── tests/
  │   ├── test_nodes.py     # Unit tests
  │   ├── test_tools.py     # Tool tests
  │   └── test_agent_e2e.py # Integration tests

Test results:
  test_reason_node ................... PASSED
  test_tool_execution ................ PASSED
  test_routing_logic ................. PASSED
  test_error_recovery ................ PASSED
  test_max_iterations ................ PASSED
  test_checkpoint_persistence ........ PASSED
  test_e2e_simple_query .............. PASSED
  test_e2e_tool_use .................. PASSED
  test_e2e_multi_step ................ PASSED
  test_e2e_error_handling ............ PASSED
  test_e2e_streaming ................ PASSED
  test_e2e_conversation_memory ....... PASSED

  12 passed, 0 failed

Agent ready for deployment!
```

## Output

### 1. LangGraph Agent
- Complete graph definition with all nodes and edges
- State schema with type annotations
- Compiled graph with checkpointing
- Streaming support
- LangSmith tracing integration

### 2. Tool Definitions
- Pydantic input/output schemas for each tool
- Tool implementations with error handling
- Tool documentation (for LLM tool selection)
- Mock tools for testing

### 3. State Machine
- Visual graph representation (Mermaid diagram)
- Node implementations
- Conditional edge logic
- State transition documentation

### 4. Tests
- Unit tests for each node
- Tool execution tests
- End-to-end conversation tests
- Error recovery tests
- Checkpoint/persistence tests
- Streaming tests

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Tool Execution Failed | External service error or invalid input | Retry with backoff, try alternative tool | Return partial results, explain what failed |
| Max Iterations Reached | Agent in reasoning loop | Stop and return best available answer | Explain what was attempted, suggest simplifying query |
| State Schema Violation | Invalid state transition or type error | Validate state at each node boundary | Reset to last valid checkpoint |
| Checkpoint Save Failed | Database connection lost | Retry save, buffer state in memory | Continue execution, warn about potential state loss |
| LLM API Error | Rate limit, timeout, or service outage | Exponential backoff with jitter | Queue request, return cached response if available |
| Invalid Tool Input | LLM generated malformed tool arguments | Re-prompt LLM with error context | Sanitize input, use default values where safe |
| Memory Overflow | Conversation history too large | Summarize old messages, trim context | Keep last N messages plus summary |
| Circular Routing | Agent loops between same nodes | Detect repeated state, force progression | Break loop, proceed to response with available info |
| Human Approval Timeout | HITL wait exceeds timeout | Auto-decline or auto-approve based on risk | Notify user, queue action for later review |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] LLM API key configured"
  - "[ ] Tool dependencies available (VectorDB, APIs, databases)"
  - "[ ] Checkpoint backend accessible"
  - "[ ] Agent specification defined or elicited"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Agent graph compiles and runs without errors"
  - "[ ] All tools execute correctly with valid inputs"
  - "[ ] Checkpointing saves and restores state"
  - "[ ] All tests pass"
  - "[ ] Agent handles edge cases gracefully"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Agent responds correctly to test queries"
  - "[ ] Tool selection is appropriate for query type"
  - "[ ] Max iteration limit is enforced"
  - "[ ] Error recovery works for all failure scenarios"
  - "[ ] Conversation memory persists across sessions"
  - "[ ] Streaming responses work end-to-end"
  - "[ ] LangSmith traces are captured for debugging"
```

## Performance

```yaml
duration_expected: 20-40 min (interactive), 10-20 min (yolo)
cost_estimated: $0.02-0.10
token_usage: ~10,000-30,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - implement-retrieval
  - design-graph
tags:
  - agent
  - langgraph
  - tools
  - state-machine
  - production
updated_at: 2026-02-09
```

## Related

- **Agent:** @rag-ai-engineer (Atlas)
- **Upstream Tasks:** `*design-graph` (graph architecture), `*implement-retrieval` (RAG tools), `*build-pipeline` (pipeline infrastructure)
- **Downstream Tasks:** None (final deliverable) or `*design-graph` (if iterating)
- **Collaborators:** @prompt-engineer (Lyra) for agent prompts, @eval-guardian (Sage) for agent evaluation, @vectordb-advisor (Vex) for retrieval tool optimization
- **Checklists:** `production-readiness.md`
