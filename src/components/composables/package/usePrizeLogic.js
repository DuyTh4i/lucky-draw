import { usePrizeStore } from '@/stores/prizeStore'

export function usePrizeLogic () {
  let prizeAssignments = []

  function assignPrizes () {
    const prizeStore = usePrizeStore()
    const pool = []
    for (const tier of prizeStore.tiers) {
      for (let i = 0; i < tier.quantity; i++) {
        pool.push(tier.id)
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    prizeAssignments = pool
  }

  function getTierForPack (packIndex) {
    const prizeStore = usePrizeStore()
    const tierId = prizeAssignments[packIndex] || 'normal'
    return prizeStore.tiers.find(t => t.id === tierId) || prizeStore.tiers[0]
  }

  function getPrizeAssignments () {
    return prizeAssignments
  }

  return {
    assignPrizes,
    getTierForPack,
    getPrizeAssignments,
  }
}
