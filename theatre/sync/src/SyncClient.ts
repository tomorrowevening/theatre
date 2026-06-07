/* eslint-disable @typescript-eslint/no-floating-promises */
// Minimal structural interfaces — keeps sync Theatre-version-agnostic.
// Compatible with both @theatre/core and @tomorrowevening/theatre-core.
interface IProject {
  readonly ready: Promise<void>
  sheet(name: string, instanceId?: string): ISheet
}

interface ISheet {
  readonly sequence: {
    position: number
    play(params?: any): Promise<boolean>
    pause(): void
    __experimental_getKeyframes?: (prop: any) => any[]
  }
  object(key: string, props: any, options?: any): ISheetObject
  detachObject(key: string): void
  readonly address: {sheetId: string}
}

interface ISheetObject {
  readonly value: any
  readonly props: any
  readonly address: {sheetId: string; objectKey: string}
  onValuesChange(fn: (values: any) => void): () => void
}

import type {
  DataUpdateCallback,
  ITransport,
  SyncMessage,
  SyncRole,
  VoidCallback,
  SyncClientOptions,
} from './types'

// Minimal studio interface — avoids a hard dependency on theatre-studio for app-side usage.
interface StudioLike {
  onSelectionChange(fn: (s: any[]) => void): () => void
  setSelection(selection: any[]): void
}

type KeyframeData = {
  position: number
  value: number
  type: string
  handles: number[]
}

type KeyframeVector = {
  position: number
  x: number
  y: number
  z: number
}

function isColorLike(obj: any): boolean {
  return (
    obj !== null &&
    obj !== undefined &&
    obj.r !== undefined &&
    obj.g !== undefined &&
    obj.b !== undefined
  )
}

function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t
  return (
    u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  )
}

function interpolateBezierValue(
  prev: KeyframeData,
  next: KeyframeData,
  position: number,
): number {
  if (prev.type !== 'bezier' || prev.handles.length !== 4) {
    throw new Error('Invalid keyframe data for Bézier interpolation.')
  }
  const [h1Y, h2Y] = prev.handles
  const t = (position - prev.position) / (next.position - prev.position)
  return cubicBezier(
    t,
    prev.value,
    prev.value + h1Y,
    next.value + h2Y,
    next.value,
  )
}

function convertColor(obj: any, key: string, value: any): void {
  if (typeof value !== 'object') return
  if (isColorLike(value)) {
    obj[key] = {r: value.r, g: value.g, b: value.b, a: value.a}
  } else {
    for (const n in value) {
      if (typeof value[n] === 'object') convertColor(value, n, value[n])
    }
  }
}

const noop: VoidCallback = () => {}

export class SyncClient {
  readonly role: SyncRole
  private transport: ITransport
  private statusCbs: Array<(connected: boolean) => void> = []

  // Studio wiring (editor role only)
  private studio: StudioLike | undefined
  private rafId: number | undefined
  private unlistenSelection: VoidCallback | undefined

  // Theatre state
  project: IProject | undefined
  sheets: Map<string, ISheet> = new Map()
  sheetObjects: Map<string, ISheetObject> = new Map()
  sheetObjectCBs: Map<string, DataUpdateCallback> = new Map()
  sheetObjectUnsubscribe: Map<string, VoidCallback> = new Map()
  activeSheet: ISheet | undefined

  constructor(opts: SyncClientOptions) {
    this.role = opts.role
    this.transport = opts.transport
    this.transport.onMessage(this.handleMessage.bind(this))
    this.transport.onStatus((connected) => {
      this.statusCbs.forEach((cb) => cb(connected))
    })
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  connect(): Promise<void> {
    return this.transport.connect()
  }

  disconnect(): void {
    this.transport.disconnect()
  }

  get connected(): boolean {
    return this.transport.connected
  }

  onStatusChange(cb: (connected: boolean) => void): void {
    this.statusCbs.push(cb)
  }

  dispose(): void {
    this.detachStudio()
    this.transport.disconnect()
    this.project = undefined
    this.sheets = new Map()
    this.sheetObjects = new Map()
    this.sheetObjectCBs = new Map()
    this.sheetObjectUnsubscribe = new Map()
  }

  // ─── Studio wiring (call from the Theatre extension) ─────────────────────

  attachStudio(studio: StudioLike): void {
    this.studio = studio
    if (this.role !== 'editor') return

    this.unlistenSelection = studio.onSelectionChange((selection: any[]) => {
      selection.forEach((item: any) => {
        switch (item.type) {
          case 'Theatre_Sheet_PublicAPI':
            this.activeSheet = this.sheets.get(item.address.sheetId)
            this.send({
              event: 'setSheet',
              target: 'app',
              data: {sheet: item.address.sheetId},
            })
            break
          case 'Theatre_SheetObject_PublicAPI':
            this.activeSheet = this.sheets.get(item.address.sheetId)
            this.send({
              event: 'setSheetObject',
              target: 'app',
              data: {
                id: `${item.address.sheetId}_${item.address.objectKey}`,
                sheet: item.address.sheetId,
                key: item.address.objectKey,
              },
            })
            break
        }
      })
    })

    let lastPosition = -1
    const tick = () => {
      if (this.activeSheet !== undefined) {
        const position = this.activeSheet.sequence.position
        if (position !== lastPosition) {
          lastPosition = position
          const sheet = this.activeSheet as ISheet
          this.send({
            event: 'updateTimeline',
            target: 'app',
            data: {position, sheet: sheet.address.sheetId},
          })
        }
      }
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  detachStudio(): void {
    this.unlistenSelection?.()
    this.unlistenSelection = undefined
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId)
      this.rafId = undefined
    }
    this.studio = undefined
  }

  // ─── Transport ────────────────────────────────────────────────────────────

  protected send(data: SyncMessage): void {
    const isEditor = this.role === 'editor'
    const shouldSend =
      (isEditor && data.target === 'app') ||
      (!isEditor && data.target === 'editor')
    if (shouldSend) this.transport.send(data)
  }

  private handleMessage(msg: SyncMessage): void {
    if (msg.target === 'app') {
      this.handleApp(msg)
    } else {
      this.handleEditor(msg)
    }
  }

  // ─── App-side message handlers ────────────────────────────────────────────

  protected handleApp(msg: SyncMessage): void {
    if (this.role !== 'app') return
    let value: any

    switch (msg.event) {
      case 'setSheet':
        value = this.sheets.get(msg.data.sheet)
        if (value !== undefined) {
          this.studio?.setSelection([value])
        }
        break

      case 'setSheetObject':
        value = this.sheetObjects.get(`${msg.data.sheet}_${msg.data.key}`)
        if (value !== undefined) {
          this.studio?.setSelection([value])
        }
        break

      case 'updateSheetObject':
        // Pause the active animation so the incoming values take effect cleanly.
        value = this.sheets.get(msg.data.sheet)
        if (value !== undefined) value.sequence.pause()
        value = this.sheetObjectCBs.get(msg.data.sheetObject)
        if (value !== undefined) {
          value(msg.data.values)
        }
        break

      case 'updateTimeline':
        value = this.sheets.get(msg.data.sheet)
        if (value !== undefined) {
          value.sequence.position = msg.data.position
        }
        break

      case 'createSheet':
      case 'createSheetObject':
      case 'pauseSheet':
      case 'playSheet':
      default:
        break
    }
  }

  // ─── Editor-side message handlers ─────────────────────────────────────────

  protected handleEditor(msg: SyncMessage): void {
    if (this.role !== 'editor') return

    switch (msg.event) {
      case 'createSheet':
        this.sheet(msg.data.sheet, msg.data.instance)
        break
      case 'playSheet':
        this.sheet(msg.data.sheet, msg.data.instance)?.sequence.play(
          msg.data.value,
        )
        break
      case 'pauseSheet':
        this.sheet(msg.data.sheet, msg.data.instance)?.sequence.pause()
        break
      case 'createSheetObject':
        this.sheetObject(
          msg.data.sheet,
          msg.data.key,
          JSON.parse(msg.data.props),
          undefined,
          msg.data.instanceId,
        )
        break

      case 'setSheet':
      case 'setSheetObject':
      case 'updateSheetObject':
      case 'updateTimeline':
      default:
        break
    }
  }

  // ─── Theatre API ──────────────────────────────────────────────────────────

  loadProject(project: IProject, json?: any): Promise<void> {
    this.project = project
    return new Promise((resolve, reject) => {
      this.project!.ready.then(() => {
        if (json) {
          const sheets = json.sheetsById
          for (const i in sheets) this.sheet(i)
        }
        resolve()
      }).catch(() => reject())
    })
  }

  getSheetInstance(name: string, instanceId?: string): string {
    return instanceId !== undefined ? `${name}-${instanceId}` : name
  }

  sheet(name: string, instanceId?: string): ISheet | undefined {
    if (this.project === undefined) {
      console.error('[sync] Project not created yet.')
      return undefined
    }

    const sheetID = this.getSheetInstance(name, instanceId)
    let s = this.sheets.get(sheetID)
    if (s !== undefined) return s

    s = this.project.sheet(name, instanceId)
    this.sheets.set(sheetID, s)

    this.send({
      event: 'createSheet',
      target: 'editor',
      data: {sheet: name, instance: instanceId},
    })

    return s
  }

  playSheet(name: string, params?: any, instanceId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.sheet(name, instanceId)
        ?.sequence.play(params)
        .then((complete: boolean) => resolve(complete))

      this.send({
        event: 'playSheet',
        target: 'editor',
        data: {sheet: name, instance: instanceId, value: params},
      })
    })
  }

  pauseSheet(name: string, instanceId?: string): void {
    this.sheet(name, instanceId)?.sequence.pause()

    this.send({
      event: 'pauseSheet',
      target: 'editor',
      data: {sheet: name, instance: instanceId},
    })
  }

  clearSheetObjects(sheetName: string): void {
    this.sheetObjects.forEach((value: ISheetObject, key: string) => {
      if (key.startsWith(`${sheetName}_`)) this.unsubscribe(value)
    })
  }

  sheetObject(
    sheetName: string,
    key: string,
    props: any,
    onUpdate?: DataUpdateCallback,
    instanceId?: string,
  ): ISheetObject | undefined {
    if (this.project === undefined) {
      console.error('[sync] Project not created yet.')
      return undefined
    }

    const s = this.sheet(sheetName, instanceId)
    if (s === undefined) return undefined

    const sheetID = this.getSheetInstance(sheetName, instanceId)
    const objName = `${sheetID}_${key}`
    let obj = this.sheetObjects.get(objName)

    const objProps = obj !== undefined ? {...props, ...obj.value} : props
    obj = s.object(key, objProps, {reconfigure: true})

    this.sheetObjects.set(objName, obj)
    this.sheetObjectCBs.set(objName, onUpdate ?? noop)

    const unsubscribe = obj.onValuesChange((values: any) => {
      const callback = this.sheetObjectCBs.get(objName)

      if (this.role === 'editor') {
        // Normalize Theatre color objects before sending over the wire.
        for (const i in values) {
          if (typeof values[i] === 'object') convertColor(values, i, values[i])
        }
        this.send({
          event: 'updateSheetObject',
          target: 'app',
          data: {sheet: sheetName, sheetObject: objName, values},
        })
      }

      callback?.(values)
    })

    this.sheetObjectUnsubscribe.set(objName, unsubscribe)

    this.send({
      event: 'createSheetObject',
      target: 'editor',
      data: {
        sheet: sheetName,
        instance: instanceId,
        key,
        props: JSON.stringify(props),
      },
    })

    return obj
  }

  unsubscribe(sheetObject: ISheetObject): void {
    if (this.project === undefined) return

    const sheetName = sheetObject.address.sheetId
    const objectKey = sheetObject.address.objectKey
    this.sheets.get(sheetName)?.detachObject(objectKey)

    const id = `${sheetName}_${objectKey}`
    const unsub = this.sheetObjectUnsubscribe.get(id)
    if (unsub !== undefined) {
      this.sheetObjects.delete(id)
      this.sheetObjectCBs.delete(id)
      this.sheetObjectUnsubscribe.delete(id)
      unsub()
    }
  }

  // ─── Keyframe helpers (adapted from Hermes) ───────────────────────────────

  getSheetObjectKeyframes(
    sheetName: string,
    sheetObject: string,
    prop: string,
  ): any[] {
    const s = this.sheet(sheetName)
    if (s === undefined) return []
    const obj = this.sheetObjects.get(`${sheetName}_${sheetObject}`)
    if (obj === undefined) return []
    return (s.sequence as any).__experimental_getKeyframes(obj.props[prop])
  }

  getSheetObjectVectors(
    sheetName: string,
    sheetObject: string,
  ): KeyframeVector[] {
    const s = this.sheet(sheetName)
    if (s === undefined) return []
    const obj = this.sheetObjects.get(`${sheetName}_${sheetObject}`)
    if (obj === undefined) return []

    const x = (s.sequence as any).__experimental_getKeyframes(obj.props.x)
    const y = (s.sequence as any).__experimental_getKeyframes(obj.props.y)
    const z = (s.sequence as any).__experimental_getKeyframes(obj.props.z)

    const positions = new Set<number>()
    ;[x, y, z].forEach((kfs) =>
      kfs.forEach((kf: any) => positions.add(kf.position)),
    )

    const interpolate = (kfs: any[], position: number): number => {
      const prev = kfs.find(
        (kf, i) =>
          kf.position <= position &&
          (kfs[i + 1]?.position ?? Infinity) > position,
      )
      const next = kfs.find((kf) => kf.position > position)
      if (!prev) return next?.value ?? 0
      if (!next || prev.position === position) return prev.value
      if (prev.type === 'bezier')
        return interpolateBezierValue(prev, next, position)
      const t = (position - prev.position) / (next.position - prev.position)
      return prev.value + t * (next.value - prev.value)
    }

    return Array.from(positions)
      .sort((a, b) => a - b)
      .map((position) => ({
        position,
        x: interpolate(x, position),
        y: interpolate(y, position),
        z: interpolate(z, position),
      }))
  }

  getSheetNames(): string[] {
    return Array.from(this.sheets.keys())
  }
}
