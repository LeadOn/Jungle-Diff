import type { LoLQueue } from '~/lib/types/lol'

export const formatQueue = (queueId: number, queues: LoLQueue[]): string => {
  const queue = queues.find((q) => q.queueId === queueId)
  if (!queue) return 'Custom'
  
  // Format based on description (e.g. "5v5 Ranked Solo games" -> "Ranked Solo")
  const desc = queue.description || 'Unknown Queue'
  if (desc.includes('Ranked Solo')) return 'Ranked Solo'
  if (desc.includes('Ranked Flex')) return 'Ranked Flex'
  if (desc.includes('ARAM')) return 'ARAM'
  if (desc.includes('Normal')) return 'Normal'
  
  return desc.replace(' games', '')
}
