import {prism, val} from '@tomorrowevening/theatre-dataverse'
import type {
  PaneInstanceId,
  UIPanelId,
} from '@tomorrowevening/theatre-shared/utils/ids'
import SimpleCache from '@tomorrowevening/theatre-shared/utils/SimpleCache'
import type {
  $IntentionalAny,
  StrictRecord,
} from '@tomorrowevening/theatre-shared/utils/types'
import type {Studio} from './Studio'
import type {CreatePaneOpts, PaneInstance} from './TheatreStudio'
import type {PanelPosition} from './store/types'

const PANE_HEADER_HEIGHT_PX = 18

function createPaneOptsToPanelPosition(opts: CreatePaneOpts): PanelPosition {
  const x = opts.x ?? {value: 0.3}
  const y = opts.y ?? {value: 0.3}
  const w = opts.width ?? {value: 0.4}
  const h = opts.height ?? {value: 0.4}
  // When height is in pixels, add the header height so the usable content area matches the requested size
  const hPx = h.unit === 'px' ? h.value + PANE_HEADER_HEIGHT_PX : h.value

  if (x.unit === 'px' || w.unit === 'px') {
    const xPx = x.unit === 'px' ? x.value : 0
    const wPx = w.unit === 'px' ? w.value : 0
    return {
      edges: {
        left: {from: 'screenLeft', distance: xPx, unit: 'px'},
        right: {from: 'screenLeft', distance: xPx + wPx, unit: 'px'},
        top:
          y.unit === 'px'
            ? {from: 'screenTop', distance: y.value, unit: 'px'}
            : {from: 'screenTop', distance: y.value},
        bottom:
          y.unit === 'px' || h.unit === 'px'
            ? {
                from: 'screenTop',
                distance:
                  (y.unit === 'px' ? y.value : 0) + (h.unit === 'px' ? hPx : 0),
                unit: 'px',
              }
            : {from: 'screenTop', distance: y.value + hPx},
      },
    }
  }

  // Percentage-based (default) — hPx equals h.value when unit is not 'px'
  return {
    edges: {
      left: {from: 'screenLeft', distance: x.value},
      right: {from: 'screenLeft', distance: x.value + w.value},
      top: {from: 'screenTop', distance: y.value},
      bottom: {from: 'screenTop', distance: y.value + hPx},
    },
  }
}

export default class PaneManager {
  private readonly _cache = new SimpleCache()

  constructor(private readonly _studio: Studio) {
    this._instantiatePanesAsTheyComeIn()
  }

  private _instantiatePanesAsTheyComeIn() {
    const allPanesD = this._getAllPanes()
    allPanesD.onStale(() => {
      allPanesD.getValue()
    })
  }

  private _getAllPanes() {
    return this._cache.get('_getAllPanels()', () =>
      prism((): StrictRecord<PaneInstanceId, PaneInstance<string>> => {
        const core = val(this._studio.coreP)
        if (!core) return {}
        const instanceDescriptors = val(
          this._studio.atomP.historic.panelInstanceDesceriptors,
        )
        const paneClasses = val(
          this._studio.atomP.ephemeral.extensions.paneClasses,
        )

        const instances: StrictRecord<PaneInstanceId, PaneInstance<string>> = {}
        for (const instanceDescriptor of Object.values(instanceDescriptors)) {
          if (!instanceDescriptor) continue
          const panelClass = paneClasses[instanceDescriptor.paneClass]
          if (!panelClass) continue
          const {instanceId} = instanceDescriptor
          const {extensionId, classDefinition: definition} = panelClass

          const instance = prism.memo(
            `instance-${instanceDescriptor.instanceId}`,
            () => {
              const inst: PaneInstance<$IntentionalAny> = {
                extensionId,
                instanceId,
                definition,
              }
              return inst
            },
            [definition],
          )

          instances[instanceId] = instance
        }
        return instances
      }),
    )
  }

  get allPanesD() {
    return this._getAllPanes()
  }

  createPane<PaneClass extends string>(
    paneClass: PaneClass,
    opts?: CreatePaneOpts,
  ): PaneInstance<PaneClass> {
    const core = this._studio.core
    if (!core) {
      throw new Error(
        `Can't create a pane because @tomorrowevening/theatre-core is not yet loaded`,
      )
    }

    const paneClassInfo = val(
      this._studio.atomP.ephemeral.extensions.paneClasses[paneClass],
    )

    if (!paneClassInfo) {
      throw new Error(`Pane class "${paneClass}" is not registered.`)
    }

    const {classDefinition} = paneClassInfo

    const allPaneInstances = val(
      this._studio.atomP.historic.panelInstanceDesceriptors,
    )

    // Check instance limit
    if (classDefinition.maxInstances != null) {
      const existingInstances = Object.values(allPaneInstances).filter(
        (desc) => desc?.paneClass === paneClass,
      )
      if (existingInstances.length >= classDefinition.maxInstances) {
        // Return the most recently focused existing instance
        const focusOrder = val(this._studio.atomP.historic.paneFocusOrder) ?? []
        const classInstanceIds = new Set(
          existingInstances.map((desc) => desc!.instanceId),
        )
        // Walk focusOrder backwards to find the most recently focused instance of this class
        for (let i = focusOrder.length - 1; i >= 0; i--) {
          if (classInstanceIds.has(focusOrder[i])) {
            this.bringPaneToFront(focusOrder[i])
            return this._getAllPanes().getValue()[focusOrder[i]]!
          }
        }
        // Fallback: return the first existing instance
        const firstInstance = existingInstances[0]!
        this.bringPaneToFront(firstInstance.instanceId)
        return this._getAllPanes().getValue()[firstInstance.instanceId]!
      }
    }

    let instanceId!: PaneInstanceId
    for (let i = 1; i < 1000; i++) {
      instanceId = `${paneClass} #${i}` as PaneInstanceId
      if (!allPaneInstances[instanceId]) break
    }

    this._studio.transaction(({drafts}) => {
      drafts.historic.panelInstanceDesceriptors[instanceId] = {
        instanceId,
        paneClass,
      }

      // Set initial position if provided
      if (opts) {
        drafts.historic.panelPositions ??= {}
        drafts.historic.panelPositions[`pane-${instanceId}` as UIPanelId] =
          createPaneOptsToPanelPosition(opts)
      }

      // Add to focus order (bring new pane to front)
      if (!drafts.historic.paneFocusOrder) {
        drafts.historic.paneFocusOrder = []
      }
      const focusOrder = drafts.historic.paneFocusOrder
      const existingIndex = focusOrder.indexOf(instanceId)
      if (existingIndex !== -1) {
        focusOrder.splice(existingIndex, 1)
      }
      focusOrder.push(instanceId)
    })

    return this._getAllPanes().getValue()[instanceId]!
  }

  /**
   * Destroys the most recently focused pane of the given class.
   */
  destroyPane(paneClass: string): void {
    const core = this._studio.core
    if (!core) {
      throw new Error(
        `Can't do this yet because @tomorrowevening/theatre-core is not yet loaded`,
      )
    }

    const allPaneInstances = val(
      this._studio.atomP.historic.panelInstanceDesceriptors,
    )
    const focusOrder = val(this._studio.atomP.historic.paneFocusOrder) ?? []

    // Find the most recently focused instance of this class
    const classInstanceIds = new Set(
      Object.values(allPaneInstances)
        .filter((desc) => desc?.paneClass === paneClass)
        .map((desc) => desc!.instanceId),
    )

    let instanceId: PaneInstanceId | undefined
    for (let i = focusOrder.length - 1; i >= 0; i--) {
      if (classInstanceIds.has(focusOrder[i])) {
        instanceId = focusOrder[i]
        break
      }
    }

    // Fallback to first instance if not found in focus order
    if (!instanceId) {
      instanceId = classInstanceIds.values().next().value
    }

    if (!instanceId) return

    this.destroyPaneById(instanceId)
  }

  /**
   * Destroys a specific pane instance by its ID. Used internally (e.g. close button).
   */
  destroyPaneById(instanceId: PaneInstanceId): void {
    const core = this._studio.core
    if (!core) {
      throw new Error(
        `Can't do this yet because @tomorrowevening/theatre-core is not yet loaded`,
      )
    }

    this._studio.transaction(({drafts}) => {
      delete drafts.historic.panelInstanceDesceriptors[instanceId]

      // Remove from focus order
      if (drafts.historic.paneFocusOrder) {
        const index = drafts.historic.paneFocusOrder.indexOf(instanceId)
        if (index !== -1) {
          drafts.historic.paneFocusOrder.splice(index, 1)
        }
      }
    })
  }

  bringPaneToFront(instanceId: PaneInstanceId): void {
    this._studio.transaction(({drafts}) => {
      if (!drafts.historic.paneFocusOrder) {
        drafts.historic.paneFocusOrder = []
      }
      const focusOrder = drafts.historic.paneFocusOrder
      const existingIndex = focusOrder.indexOf(instanceId)
      if (existingIndex !== -1) {
        focusOrder.splice(existingIndex, 1)
      }
      focusOrder.push(instanceId)
    })
  }
}
