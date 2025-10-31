/**
 * Migration utility to move data from localStorage to SQLite
 * This can be run client-side to migrate existing chat history
 */

import { StoredConversation } from "./chat-storage";

export async function migrateFromLocalStorage(): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  try {
    if (typeof window === "undefined") {
      return { success: false, migratedCount: 0, error: "Not in browser environment" };
    }

    const STORAGE_KEY = "zechat_conversations";
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return { success: true, migratedCount: 0 };
    }

    const conversations = JSON.parse(stored) as StoredConversation[];

    if (!conversations || conversations.length === 0) {
      return { success: true, migratedCount: 0 };
    }

    // Save each conversation to the database via API
    const results = await Promise.allSettled(
      conversations.map((conv) =>
        fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(conv),
        })
      )
    );

    const successfulMigrations = results.filter(
      (r) => r.status === "fulfilled"
    ).length;

    // Backup localStorage data before clearing
    window.localStorage.setItem(
      `${STORAGE_KEY}_backup_${Date.now()}`,
      stored
    );

    // Clear original localStorage
    window.localStorage.removeItem(STORAGE_KEY);

    return {
      success: true,
      migratedCount: successfulMigrations,
    };
  } catch (error) {
    console.error("Migration error:", error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
