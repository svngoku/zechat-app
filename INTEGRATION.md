# ZeroEntropy AI Chat Integration

This document explains the integration of Vercel AI SDK with ZeroEntropy hybrid search capabilities.

## Architecture Overview

The chat application uses:
- **Vercel AI SDK v5.0.76** for LLM orchestration and streaming
- **OpenAI GPT-4o-mini** as the language model
- **ZeroEntropy v0.1.0-alpha.6** for hybrid search (semantic + keyword)
- **Next.js 16** App Router for API routes
- **React 19** for the UI with streaming support

## Key Components

### 1. Environment Configuration (`lib/env.ts`)
- Validates required environment variables using Zod
- Required: `ZEROENTROPY_API_KEY`, `OPENAI_API_KEY`
- Optional: `ZEROENTROPY_COLLECTION_NAME` (defaults to "animal-facts")
- Fails fast in development, logs warnings in production

### 2. ZeroEntropy Client (`lib/zeroentropy.ts`)
- Singleton client pattern for connection pooling
- Two main search functions:
  - `searchTopDocuments()` - Broader context, complete documents
  - `searchTopSnippets()` - Fine-grained, specific facts
- Normalizes all results to consistent `SearchResult` interface
- Custom `ZeroEntropyError` for structured error handling

### 3. AI SDK Tools (`lib/zeroentropy-tools.ts`)
- Two tool definitions for the AI model:
  - `searchDocuments` - Search complete documents
  - `searchSnippets` - Search text snippets with fine/coarse granularity
- Zod schemas for input validation
- Tools are invoked automatically by the LLM when needed

### 4. Chat API Route (`app/api/chat/route.ts`)
- POST endpoint accepting `{ messages }` array
- Uses `streamText()` from Vercel AI SDK
- Registers ZeroEntropy tools for hybrid search
- Returns streaming text response via `toTextStreamResponse()`
- System prompt instructs model when to use search tools

### 5. Search API Route (`app/api/search/route.ts`)
- Direct ZeroEntropy search endpoint for testing
- POST with `{ query, useReranker }` body
- Returns top 5 snippets with scores

### 6. Chat UI (`components/chat-ui/full-chat.tsx`)
- Custom streaming implementation (manual fetch + ReadableStream)
- Renders tool invocations inline with search results
- Shows loading states while tools execute
- Displays results with scores, paths, and content
- Preserves existing UI design and components

## Tool Invocation Flow

1. User sends a message
2. Message is sent to `/api/chat`
3. GPT-4o-mini processes the message
4. If external knowledge needed, model calls ZeroEntropy tools
5. Tools execute hybrid search and return results
6. Model synthesizes answer using search results
7. Response streams back to UI with tool invocation metadata
8. UI renders search results inline with the answer

## Environment Setup

Create a `.env.local` file:

```bash
# ZeroEntropy API Configuration
# Get your API key from: https://dashboard.zeroentropy.dev/
ZEROENTROPY_API_KEY=your_zeroentropy_api_key_here

# OpenAI API Configuration  
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Default collection name for searches
ZEROENTROPY_COLLECTION_NAME=animal-facts

# Node Environment
NODE_ENV=development
```

## Running Locally

```bash
# Install dependencies
pnpm install

# Run type check
pnpm exec tsc --noEmit

# Run linter  
pnpm lint

# Start development server
pnpm dev
```

## Customization

### Using a Different Collection

Pass the `collection` parameter in tool calls:

```typescript
// The AI will automatically use this when calling tools
// Or you can specify it in the searchParams:
const results = await searchTopSnippets({
  query: "your query",
  collection: "my-custom-collection",
  limit: 10,
  useReranker: true
});
```

### Adjusting Search Parameters

Edit `lib/zeroentropy-tools.ts` to modify:
- Default limits (currently 5)
- Granularity options
- Reranker usage
- Tool descriptions (affects when LLM chooses to use them)

### Changing the LLM

Edit `app/api/chat/route.ts`:

```typescript
// Switch to a different OpenAI model
model: openai("gpt-4-turbo")

// Or use a different provider
import { anthropic } from '@ai-sdk/anthropic'
model: anthropic("claude-3-sonnet")
```

## Design Decisions

### Why Manual Streaming Instead of useChat?

The AI SDK v5.0.76 has breaking changes in the React hooks API. We implemented custom streaming to:
- Maintain full control over the stream parsing
- Ensure compatibility with Next.js 16
- Preserve the existing UI design
- Handle tool invocations explicitly

### Why Two Search Tools?

Different use cases benefit from different search granularities:
- **Documents** - When you need context, multiple related facts
- **Snippets** - When you need a specific answer or precise information

The LLM chooses which tool based on the query and its instructions.

### Error Handling Strategy

- **Development**: Fail fast with descriptive errors
- **Production**: Log errors but allow graceful degradation
- **API errors**: Return structured JSON with status codes
- **Client errors**: Display user-friendly messages

## Testing

To test the integration:

1. Ensure API keys are set in `.env.local`
2. Start the dev server: `pnpm dev`
3. Open http://localhost:3000
4. Ask questions that require external knowledge
5. Observe tool invocations in the UI and network tab

Example queries:
- "What are some facts about dolphins?"
- "Tell me about elephant behavior"
- "Search for information about animal communication"

## Troubleshooting

### "Environment validation failed"
- Check that `.env.local` exists and contains required keys
- Verify API keys are valid

### "Failed to search collection"
- Verify ZEROENTROPY_API_KEY is correct
- Check that the collection exists in your ZeroEntropy dashboard
- Review server logs for detailed error messages

### Streaming not working
- Check browser console for fetch errors
- Verify `/api/chat` route is accessible
- Check OPENAI_API_KEY is valid

## Future Improvements

- [ ] Add support for multiple collections
- [ ] Implement caching for frequent queries
- [ ] Add retry logic with exponential backoff
- [ ] Support for document upload and indexing
- [ ] Real-time search result relevance feedback
- [ ] Conversation history persistence
