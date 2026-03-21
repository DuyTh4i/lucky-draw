/* eslint-disable curly */
import GUI from 'lil-gui'

export function useDebugGUI (ctx) {
  function setupGUI () {
    ctx.gui = new GUI({ closeFolders: true })

    const carousel = ctx.gui.addFolder('Carousel')
    carousel.add(ctx.config, 'packCount', 2, 20, 1).name('Pack Count').onChange(ctx.autoFit)
    carousel.add(ctx.config, 'radius', 2, 16, 0.1).name('Radius').onChange(ctx.rebuildCarousel)
    carousel.add(ctx.config, 'dragSensitivity', 0.001, 0.02, 0.001).name('Drag Speed')

    const pack = ctx.gui.addFolder('Pack Size')
    pack.add(ctx.config, 'packW', 0.5, 3, 0.1).name('Width').onChange(ctx.rebuildCarousel)
    pack.add(ctx.config, 'packH', 1, 4, 0.1).name('Height').onChange(ctx.rebuildCarousel)
    pack.add(ctx.config, 'packD', 0.01, 0.3, 0.001).name('Depth').onChange(ctx.rebuildCarousel)
    pack.add(ctx.config, 'packY', -3, 3, 0.1).name('Elevation')
    pack.add(ctx.config, 'selectedLift', 0, 2, 0.05).name('Selected Lift')

    const cam = ctx.gui.addFolder('Camera')
    cam.add(ctx.config, 'camX', -10, 10, 0.05).name('X').onChange(ctx.updateCamera)
    cam.add(ctx.config, 'camY', -10, 10, 0.05).name('Y').onChange(ctx.updateCamera)
    cam.add(ctx.config, 'camZ', -10, 20, 0.05).name('Z').onChange(ctx.updateCamera)
    cam.add(ctx.config, 'lookY', -5, 5, 0.1).name('Look Y').onChange(ctx.updateCamera)
  }

  function disposeGUI () {
    if (ctx.gui) ctx.gui.destroy()
  }

  return { setupGUI, disposeGUI }
}
