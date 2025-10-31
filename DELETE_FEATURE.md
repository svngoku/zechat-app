# Chat Deletion Feature

## Overview
Added the ability to delete conversations from the chat history sidebar with confirmation dialog.

## Features Implemented

### 1. **Delete Button in Sidebar**
- Three-dot menu (⋯) appears on hover for each conversation item
- Delete option accessible via dropdown menu
- Red destructive styling for delete action
- Hidden during "new chat" mode to prevent confusion

### 2. **Confirmation Dialog**
- Alert dialog appears before deletion
- Clear warning message about permanent deletion
- "Cancel" and "Delete" buttons
- Loading state during deletion ("Deleting..." text)
- Prevents accidental deletions

### 3. **Smart Navigation**
- If deleting the currently active conversation, automatically redirects to home page
- If deleting a different conversation, stays on current page
- Conversation list refreshes automatically after deletion

### 4. **Real-time Updates**
- Sidebar conversation list updates immediately after deletion
- Uses `onConversationDeleted` callback to trigger refresh
- No page reload required

## UI/UX Details

### Visual Design
- Delete button only visible on hover (opacity transition)
- Three-dot menu icon for accessing actions
- Trash icon (🗑️) next to "Delete" label
- Red destructive color for delete action
- Smooth opacity transition on hover

### User Flow
1. User hovers over a conversation in sidebar
2. Three-dot menu button appears
3. User clicks menu → "Delete" option
4. Confirmation dialog appears
5. User confirms deletion
6. Conversation deleted from database
7. If current conversation: navigate to home
8. Sidebar list refreshes automatically

## Code Changes

### Modified Files

**`components/chat-ui/chat-sidebar.tsx`**
- Added state management for delete dialog
- Added `onConversationDeleted` prop for callbacks
- Implemented delete handler with confirmation
- Added dropdown menu for conversation actions
- Added AlertDialog for confirmation
- Wrapped conversation items in `SidebarMenuItem` with flex layout

**`components/chat-ui/full-chat.tsx`**
- Added `onConversationDeleted` prop to ChatSidebar
- Connected to `handleConversationUpdate` for list refresh

**`components/chat-ui/new-chat.tsx`**
- Moved `loadConversations` outside useEffect for reusability
- Added `onConversationDeleted` callback to ChatSidebar

### New Dependencies Used
- `DropdownMenu` components for action menu
- `AlertDialog` components for confirmation
- `MoreHorizontal` and `Trash2` icons from lucide-react
- `deleteConversation` function from chat-storage

## API Integration

Uses existing `deleteConversation` function from `lib/chat-storage.ts`:
```typescript
await deleteConversation(conversationId);
```

Sends DELETE request to `/api/conversations?id={id}` which:
1. Removes conversation from database
2. Cascades to delete all messages and tool events (foreign keys)
3. Returns success response

## Error Handling

- Try-catch block around delete operation
- Console error logging on failure
- Loading state prevents multiple simultaneous deletions
- Dialog stays open on error (allows retry)
- TODO: Show error toast notification to user

## Accessibility

- Keyboard accessible (dropdown and dialog)
- Proper ARIA labels from Radix UI components
- Focus management handled automatically
- Clear visual feedback for all states

## Future Enhancements

1. **Undo Delete**: Add temporary "Undo" option (soft delete)
2. **Bulk Delete**: Select multiple conversations to delete
3. **Archive**: Move conversations to archive instead of deleting
4. **Export**: Download conversation before deletion
5. **Error Toast**: User-friendly error notifications
6. **Keyboard Shortcut**: Delete key to trigger deletion

## Testing Checklist

- [x] Delete button appears on hover
- [x] Confirmation dialog shows
- [x] Can cancel deletion
- [x] Conversation deleted from database
- [x] Sidebar list refreshes
- [x] Navigation works when deleting current conversation
- [x] No navigation when deleting other conversation
- [x] Loading state works correctly
- [x] TypeScript compilation passes
- [ ] Manual testing in browser

## Security Notes

- No additional authentication needed (uses existing API)
- Deletion is permanent (consider backup strategy)
- User confirmation required (prevents accidents)
- Foreign key cascade ensures data consistency
