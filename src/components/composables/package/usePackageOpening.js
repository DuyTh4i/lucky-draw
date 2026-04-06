import { usePackageAnimation } from './usePackageAnimation'
import { usePrizeLogic } from './usePrizeLogic'
import { useTearHint } from './useTearHint'
import { useTearInteraction } from './useTearInteraction'

/**
 * usePackageOpening
 *
 * Hiệu ứng "Vuốt để xé nắp" (Swipe to Tear):
 * Được refactor chia nhỏ thành các module để dễ maintain.
 */
export function usePackageOpening (ctx) {
  const TEAR_RATIO = 0.4
  const prizeLogic = usePrizeLogic()

  const tearHint = useTearHint({
    ctx,
    TEAR_RATIO,
  })

  const packageAnimation = usePackageAnimation({
    ctx,
    TEAR_RATIO,
    getTierForPack: prizeLogic.getTierForPack,
    getPrizeAssignments: prizeLogic.getPrizeAssignments,
    assignPrizes: prizeLogic.assignPrizes,
    hideTearHint: tearHint.hideTearHint,
  })

  const tearInteraction = useTearInteraction({
    ctx,
    updateFillVisual: tearHint.updateFillVisual,
    openPackage: packageAnimation.openPackage,
  })

  // ==================== EXPOSE ====================
  const api = {
    openPackage: packageAnimation.openPackage,
    resetPackageOpening: packageAnimation.resetPackageOpening,
    assignPrizes: prizeLogic.assignPrizes,
    startTearing: tearInteraction.startTearing,
    updateTearing: tearInteraction.updateTearing,
    cancelTearing: tearInteraction.cancelTearing,
    showTearHint: tearHint.showTearHint,
    hideTearHint: tearHint.hideTearHint,
  }

  Object.assign(ctx, api)

  return api
}
