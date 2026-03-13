
export const participantsCacheKey = (conversationId: number, userId: string) => `participants-${conversationId}-${userId}`;
export const PARTICIPANTS_CACHE_TTL = 60 * 60;
export const PARTICIPANTS_CACHE_PREFIX = "participants";