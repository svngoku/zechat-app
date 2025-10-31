# Chat History Implementation Guide

## Overview
This document describes the chat history management system with localStorage persistence and dynamic routing implemented for ZeChat.

## Architecture

### 1. **Storage Layer** (`lib/chat-storage.ts`)
Handles all localStorage operations for conversation persistence.

#### Key Functions:
- `getAllConversations()`: Retrieves all stored conversations, sorted by most recent
- `getConversation(id)`: Gets a specific conversation by ID
- `saveConversation(id, messages, toolEvents, existingTitle?)`: Saves/updates a conversation
- `deleteConversation(id)`: Removes a conversation from storage
- `updateConversationTitle(id, title)`: Updates conversation title
- `getConversationsForSidebar()`: Returns conversations formatted for sidebar display
- `createConversationId()`: Generates unique conversation IDs
- `clearAllConversations()`: Clears all stored conversations

#### Features:
- **Auto-title generation**: Creates titles from first user message (50 char max)
- **Quota management**: Limits to 100 conversations, auto-trims on overflow
- **Safe storage**: Handles QuotaExceededError gracefully
- **SSR compatible**: Checks for localStorage availability before use

### 2. **Routing Structure**

```
/                          → New chat page (app/page.tsx)
/chat/[id]                 → Existing conversation (app/chat/[id]/page.tsx)
```

#### Homepage (`app/page.tsx`)
- Simplified to just render `NewChatApp`
- No state management needed here anymore

#### Dynamic Chat Route (`app/chat/[id]/page.tsx`)
- Loads conversation from localStorage by ID
- Shows loading state while fetching
- Shows 404-style error if conversation not found
- Renders `FullChatApp` with conversation data

### 3. **Component Updates**

#### **Shared Sidebar** (`components/chat-ui/chat-sidebar.tsx`)
New props:
- `currentConversationId?: string` - Highlights active conversation
- Navigation handlers for conversation clicks

Features:
- Click conversation → navigate to `/chat/[id]`
- Click "New Chat" → navigate to `/`
- Active state highlighting
- Loads real history from localStorage

#### **Full Chat** (`components/chat-ui/full-chat.tsx`)
New features:
- Accepts `conversationId` prop
- Auto-saves conversation after each message
- Updates sidebar in real-time via `onConversationUpdate` callback
- Loads conversation history from localStorage on mount

#### **New Chat** (`components/chat-ui/new-chat.tsx`)
New behavior:
- Shows real conversation history in sidebar (not placeholders)
- On message submit:
  1. Creates new conversation ID
  2. Saves conversation to localStorage
  3. Redirects to `/chat/[id]`
- Sidebar conversations are clickable

## User Flow

### Starting a New Chat
1. User visits `/` (homepage)
2. Types message and submits
3. System:
   - Calls chat API
   - Creates conversation ID: `chat-{timestamp}-{random}`
   - Saves conversation to localStorage
   - Redirects to `/chat/{id}`
4. User sees full chat interface with message history

### Continuing an Existing Chat
1. User clicks conversation in sidebar
2. Navigates to `/chat/{id}`
3. System:
   - Loads conversation from localStorage
   - Renders `FullChatApp` with history
   - Shows loading state during load
4. User can continue chatting
5. Each new message auto-saves to localStorage

### Switching Between Chats
1. User clicks different conversation in sidebar
2. Next.js navigation to new `/chat/{id}`
3. Page loads with new conversation context
4. Sidebar highlights active conversation

## Data Structure

### StoredConversation
```typescript
{
  id: string;              // Unique conversation ID
  title: string;           // Auto-generated or custom title
  messages: ChatMessage[]; // All messages in conversation
  toolEvents: ToolEvent[]; // All tool executions
  createdAt: number;       // Creation timestamp
  updatedAt: number;       // Last update timestamp
}
```

### ConversationItem (Sidebar)
```typescript
{
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: number;
}
```

## Technical Details

### localStorage Key
- Key: `zechat_conversations`
- Value: JSON array of `StoredConversation[]`

### Conversation Grouping
Conversations are grouped by time periods:
- **Today**: < 24 hours ago
- **Yesterday**: 24-48 hours ago
- **Last 7 days**: 2-7 days ago
- **Last month**: 7-30 days ago

### Title Generation
- Takes first user message
- Truncates to 50 characters
- Adds "..." if truncated
- Falls back to "New conversation" if no user message

### ID Generation
Format: `chat-{timestamp}-{random}`
- Timestamp ensures uniqueness
- Random suffix adds extra collision protection

## Best Practices

### Adding New Features
1. Update `StoredConversation` type if adding fields
2. Update `saveConversation()` to handle new fields
3. Consider migration for existing localStorage data

### Performance Considerations
- localStorage is synchronous - keep operations minimal
- Large conversations may slow down saves
- Consider implementing conversation pagination for 100+ messages

### Error Handling
- Always wrap localStorage operations in try-catch
- Handle QuotaExceededError by trimming old conversations
- Show user-friendly errors when localStorage unavailable

## Future Enhancements

### Potential Features
1. **Search**: Add search functionality across all conversations
2. **Export**: Export conversations as JSON/Markdown
3. **Sync**: Cloud sync for cross-device access
4. **Tags**: Add tags/categories to conversations
5. **Pin**: Pin important conversations to top
6. **Archive**: Archive old conversations
7. **Delete**: Add delete button with confirmation
8. **Edit Title**: Allow manual title editing
9. **Share**: Share conversation via link
10. **Analytics**: Track conversation metrics

### Migration Path
If moving to server-side storage:
1. Keep localStorage as fallback
2. Sync to server on each save
3. Load from server on mount, fallback to localStorage
4. Implement conflict resolution strategy

## Testing Checklist

- [x] Type checking passes
- [ ] Create new conversation from homepage
- [ ] Conversation saves to localStorage
- [ ] Redirect to /chat/[id] works
- [ ] Messages persist on page refresh
- [ ] Sidebar shows conversation history
- [ ] Click sidebar conversation navigates correctly
- [ ] Active conversation highlighted in sidebar
- [ ] New messages update conversation
- [ ] Multiple conversations work independently
- [ ] localStorage quota handling works
- [ ] 404 handling for missing conversations
- [ ] Loading states display correctly

## Files Modified

### New Files
- `lib/chat-storage.ts` - Storage utility
- `app/chat/[id]/page.tsx` - Dynamic chat route
- `components/chat-ui/chat-sidebar.tsx` - Shared sidebar component
- `CHAT_HISTORY_IMPLEMENTATION.md` - This documentation

### Modified Files
- `app/page.tsx` - Simplified homepage
- `components/chat-ui/full-chat.tsx` - Added persistence
- `components/chat-ui/new-chat.tsx` - Added redirect and history
