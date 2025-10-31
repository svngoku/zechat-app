# SQLite Storage Migration

## Overview
Successfully migrated chat storage from browser localStorage to server-side SQLite database.

## What Changed

### 1. **Storage Backend**
- **Before**: Client-side localStorage (limited to ~5-10MB)
- **After**: Server-side SQLite database (unlimited storage)

### 2. **Database Schema**
Created three tables:
- `conversations` - Stores conversation metadata (id, title, timestamps)
- `messages` - Stores individual chat messages
- `tool_events` - Stores tool calls and results

### 3. **API Layer**
New API endpoints at `/api/conversations`:
- `GET` - Fetch all conversations or a specific one by ID
- `POST` - Save/update a conversation
- `DELETE` - Remove a conversation
- `PATCH` - Update conversation title

### 4. **Code Changes**
- **`lib/db.ts`**: Database initialization and schema
- **`lib/chat-storage.ts`**: Updated all functions to be async and use API calls
- **`app/api/conversations/route.ts`**: REST API for CRUD operations
- **Components**: Updated to handle async storage operations
  - `app/chat/[id]/page.tsx`
  - `components/chat-ui/new-chat.tsx`
  - `components/chat-ui/full-chat.tsx`

## Benefits

✅ **No Storage Limits** - SQLite can handle unlimited conversations
✅ **Better Performance** - Database queries are optimized with indexes
✅ **Server-Side Persistence** - Data survives browser clearing
✅ **Future-Ready** - Easy to add search, analytics, and sync features
✅ **Relational Data** - Proper foreign keys and data integrity

## Database Location

```
/data/chat.db        # Main database file
/data/chat.db-shm    # Shared memory file (WAL mode)
/data/chat.db-wal    # Write-ahead log
```

All database files are automatically gitignored.

## Migration from localStorage

If you had existing chat history in localStorage, you can migrate it:

```typescript
import { migrateFromLocalStorage } from "@/lib/migrate-storage";

// Run this once in your app
const result = await migrateFromLocalStorage();
console.log(`Migrated ${result.migratedCount} conversations`);
```

This will:
1. Read all conversations from localStorage
2. Save them to SQLite via API
3. Create a backup in localStorage with timestamp
4. Clear the original localStorage data

## Technical Details

### WAL Mode
The database uses Write-Ahead Logging (WAL) for:
- Better concurrent read/write performance
- Atomic commits
- Crash recovery

### Indexes
Created indexes for optimal query performance:
- `idx_messages_conversation` - Fast message retrieval by conversation
- `idx_tool_events_conversation` - Fast tool event retrieval
- `idx_conversations_updated` - Fast sorting by last updated

### Transaction Safety
All write operations use transactions to ensure data consistency:
```typescript
db.prepare("BEGIN").run();
try {
  // Multiple operations
  db.prepare("COMMIT").run();
} catch (error) {
  db.prepare("ROLLBACK").run();
  throw error;
}
```

## API Usage Examples

### Fetch All Conversations
```typescript
const conversations = await getAllConversations();
```

### Get Specific Conversation
```typescript
const conversation = await getConversation(conversationId);
```

### Save Conversation
```typescript
await saveConversation(id, messages, toolEvents, title);
```

### Delete Conversation
```typescript
await deleteConversation(id);
```

### Update Title
```typescript
await updateConversationTitle(id, "New Title");
```

## Backward Compatibility

The public API remains the same - only changed from synchronous to asynchronous:

```typescript
// Before
const convs = getConversationsForSidebar();

// After
const convs = await getConversationsForSidebar();
```

All consuming components have been updated to handle the async nature.

## Testing

Run TypeScript check:
```bash
pnpm tsc --noEmit
```

All type checks pass successfully.

## Future Enhancements

Potential improvements now possible with SQLite:

1. **Full-Text Search** - Add FTS5 virtual table for message search
2. **Analytics** - Query conversation statistics
3. **Export/Import** - Easy backup and restore
4. **Multi-User Support** - Add user_id column for authentication
5. **Conversation Tags** - Organize with tags/categories
6. **Archive Feature** - Soft delete conversations
7. **Sync Across Devices** - Backend can sync to cloud storage

## Notes

- Database is created automatically on first access
- No manual schema updates needed
- Safe to delete `/data` folder to start fresh (loses all history)
- All database operations are logged for debugging
