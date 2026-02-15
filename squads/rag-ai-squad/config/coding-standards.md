# Coding Standards — RAG AI Squad

## Language: Python 3.10+

## Style Guide
- Follow PEP 8
- Use type hints everywhere
- Use Pydantic models for data validation
- Use async/await for I/O-bound operations

## Naming Conventions
- Functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_prefixed`
- Type aliases: `PascalCase`

## Project Structure
```
src/
├── agents/          # LangGraph agent definitions
├── chains/          # LangChain chains and retrievers
├── chunking/        # Chunking strategies
├── embeddings/      # Embedding model wrappers
├── evaluation/      # RAGAS/DeepEval evaluation
├── guardrails/      # Input/output guardrails
├── ingestion/       # Document ingestion pipelines
├── prompts/         # Prompt templates
├── vectordb/        # VectorDB client wrappers
├── observability/   # LangSmith integration
├── models/          # Pydantic models
├── config/          # Configuration management
└── utils/           # Shared utilities
tests/
├── unit/
├── integration/
└── evaluation/
```

## Dependencies
- LangChain for chains and retrievers
- LangGraph for agent state machines
- LangSmith for observability
- Pydantic for validation
- FastAPI for serving

## Error Handling
- Use custom exception classes
- Always log errors with context
- Implement fallback chains for LLM failures
- Never expose internal errors to users

## Testing
- Unit tests for all business logic
- Integration tests for chains and retrievers
- Evaluation tests with golden datasets
- Minimum 80% code coverage

## Security
- Never hardcode API keys
- Use environment variables or secret managers
- Sanitize user inputs before LLM calls
- Implement PII detection in guardrails
