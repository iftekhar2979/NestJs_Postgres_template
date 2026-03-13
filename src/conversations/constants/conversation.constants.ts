export const conversationCacheKey = (user_id: string, term: string, page: number, limit: number) => `conversations-${user_id}:${term}:${page}:${limit}`
export const CONVERSATION_CACHE_TTL = 60 * 60;  
export const CONVERSATION_CACHE_PREFIX = "conversation";
export const CONVERSATION_CACHE_KEY = (conversationId: number) => `conversation-${conversationId}`
export const MESSAGES_CACHE_KEY = (conversationId: number, page: number, limit: number) => `messages-${conversationId}:${page}:${limit}`
export const MESSAGES_CACHE_TTL = 60 * 60;  
export const MESSAGES_CACHE_PREFIX = "messages";
export const MESSAGES_CACHE_PATTERN = (conversationId: number) => `messages-${conversationId}:*`