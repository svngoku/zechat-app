import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ChatMessage, ToolEvent } from "@/lib/chat-types";

export interface StoredConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  toolEvents: ToolEvent[];
  createdAt: number;
  updatedAt: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (id) {
      const conversation = db
        .prepare("SELECT * FROM conversations WHERE id = ?")
        .get(id) as { id: string; title: string; created_at: number; updated_at: number } | undefined;

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      const messages = db
        .prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY position")
        .all(id) as ChatMessage[];

      interface ToolEventRow {
        tool_name: string;
        tool_call_id: string;
        args: string;
        result: string | null;
      }

      const toolEvents = db
        .prepare("SELECT tool_name, tool_call_id, args, result FROM tool_events WHERE conversation_id = ? ORDER BY position")
        .all(id)
        .map((row) => {
          const typedRow = row as ToolEventRow;
          const baseEvent = {
            toolName: typedRow.tool_name,
            toolCallId: typedRow.tool_call_id,
            args: JSON.parse(typedRow.args) as Record<string, unknown>,
          };
          if (typedRow.result) {
            return {
              ...baseEvent,
              result: JSON.parse(typedRow.result),
              type: "tool-result" as const,
            };
          }
          return {
            ...baseEvent,
            type: "tool-call" as const,
          };
        }) as ToolEvent[];

      const result: StoredConversation = {
        id: conversation.id,
        title: conversation.title,
        messages,
        toolEvents,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      };

      return NextResponse.json(result);
    }

    interface ConversationRow {
      id: string;
      title: string;
      created_at: number;
      updated_at: number;
    }

    interface ToolEventRow {
      tool_name: string;
      tool_call_id: string;
      args: string;
      result: string | null;
    }

    const conversations = db
      .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all() as ConversationRow[];

    const results: StoredConversation[] = conversations.map((conv) => {
      const messages = db
        .prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY position")
        .all(conv.id) as ChatMessage[];

      const toolEvents = db
        .prepare("SELECT tool_name, tool_call_id, args, result FROM tool_events WHERE conversation_id = ? ORDER BY position")
        .all(conv.id)
        .map((row) => {
          const typedRow = row as ToolEventRow;
          const baseEvent = {
            toolName: typedRow.tool_name,
            toolCallId: typedRow.tool_call_id,
            args: JSON.parse(typedRow.args) as Record<string, unknown>,
          };
          if (typedRow.result) {
            return {
              ...baseEvent,
              result: JSON.parse(typedRow.result),
              type: "tool-result" as const,
            };
          }
          return {
            ...baseEvent,
            type: "tool-call" as const,
          };
        }) as ToolEvent[];

      return {
        id: conv.id,
        title: conv.title,
        messages,
        toolEvents,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, messages, toolEvents, createdAt, updatedAt } = body as StoredConversation;

    db.prepare("BEGIN").run();

    try {
      const existing = db.prepare("SELECT id FROM conversations WHERE id = ?").get(id);

      if (existing) {
        db.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?").run(
          title,
          updatedAt,
          id
        );
        db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
        db.prepare("DELETE FROM tool_events WHERE conversation_id = ?").run(id);
      } else {
        db.prepare("INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
          id,
          title,
          createdAt,
          updatedAt
        );
      }

      const insertMessage = db.prepare(
        "INSERT INTO messages (conversation_id, role, content, position) VALUES (?, ?, ?, ?)"
      );
      messages.forEach((msg, idx) => {
        insertMessage.run(id, msg.role, msg.content, idx);
      });

      const insertToolEvent = db.prepare(
        "INSERT INTO tool_events (conversation_id, tool_name, tool_call_id, args, result, position) VALUES (?, ?, ?, ?, ?, ?)"
      );
      toolEvents.forEach((event, idx) => {
        const result = event.type === "tool-result" ? event.result : null;
        insertToolEvent.run(
          id,
          event.toolName,
          event.toolCallId,
          JSON.stringify(event.args),
          result ? JSON.stringify(result) : null,
          idx
        );
      });

      db.prepare("COMMIT").run();

      return NextResponse.json({ success: true, id });
    } catch (error) {
      db.prepare("ROLLBACK").run();
      throw error;
    }
  } catch (error) {
    console.error("Error saving conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title } = body;

    if (!id || !title) {
      return NextResponse.json({ error: "Missing id or title" }, { status: 400 });
    }

    db.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?").run(
      title,
      Date.now(),
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
