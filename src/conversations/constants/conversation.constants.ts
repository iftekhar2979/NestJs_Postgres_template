export const conversationCacheKey = (user_id: string, term: string, page: number, limit: number) => `conversations-${user_id}-${term}-${page}-${limit}`
export const CONVERSATION_CACHE_TTL = 60 * 60;  
export const CONVERSATION_CACHE_PREFIX = "conversation";
export const CONVERSATION_CACHE_KEY = (conversationId: number) => `conversation-${conversationId}`