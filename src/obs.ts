import OBSWebSocket, { EventSubscription } from 'obs-websocket-js'
import type { ObsStatus } from './types'

type StatusHandler = (patch: Partial<ObsStatus>) => void
type ScenesHandler = (scenes: string[]) => void

class ObsService {
  private client: OBSWebSocket | null = null
  private statusHandler: StatusHandler | null = null
  private scenesHandler: ScenesHandler | null = null
  private muted = new Set<string>()

  onStatus(cb: StatusHandler) {
    this.statusHandler = cb
  }
  onScenes(cb: ScenesHandler) {
    this.scenesHandler = cb
  }

  private emit(patch: Partial<ObsStatus>) {
    this.statusHandler?.(patch)
  }

  get isConnected() {
    return this.client !== null
  }

  async connect(url: string, password: string): Promise<void> {
    this.disconnect()
    const client = new OBSWebSocket()
    await client.connect(url, password, {
      rpcVersion: 1,
      eventSubscriptions: EventSubscription.All,
    })
    this.client = client
    this.muted.clear()

    client.on('CurrentProgramSceneChanged', ({ sceneName }) => {
      this.emit({ scene: sceneName })
    })
    client.on('StreamStateChanged', ({ outputActive }) => {
      this.emit({ streaming: outputActive })
    })
    client.on('RecordStateChanged', ({ outputActive }) => {
      this.emit({ recording: outputActive })
    })
    client.on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
      if (inputMuted) this.muted.add(inputName)
      else this.muted.delete(inputName)
      this.emit({ muted: [...this.muted] })
    })
    client.on('ConnectionClosed', () => {
      this.client = null
      this.emit({ connected: false })
    })

    const [sceneList, program, stream, record, inputs] = await Promise.all([
      client.call('GetSceneList'),
      client.call('GetCurrentProgramScene'),
      client.call('GetStreamStatus'),
      client.call('GetRecordStatus'),
      client.call('GetInputList'),
    ])

    const scenes = (sceneList.scenes as { sceneName: string }[]).map((s) => s.sceneName)
    this.scenesHandler?.(scenes)

    for (const input of inputs.inputs as { inputName: string; inputMuted: boolean }[]) {
      if (input.inputMuted) this.muted.add(input.inputName)
    }

    this.emit({
      connected: true,
      error: undefined,
      scene: (program as any).currentProgramSceneName,
      streaming: (stream as any).outputActive,
      recording: (record as any).outputActive,
      muted: [...this.muted],
    })
  }

  disconnect() {
    if (this.client) {
      const c = this.client
      this.client = null
      c.disconnect().catch(() => {})
      this.emit({ connected: false, scene: undefined, streaming: false, recording: false, muted: [] })
    }
  }

  async exec(action: { kind: string; scene?: string; source?: string }) {
    const c = this.client
    if (!c) throw new Error('OBS not connected')
    switch (action.kind) {
      case 'obs-scene':
        await c.call('SetCurrentProgramScene', { sceneName: action.scene })
        this.emit({ scene: action.scene })
        break
      case 'obs-mute': {
        const name = action.source || 'Mic/Aux'
        const cur = await c.call('GetInputMute', { inputName: name })
        await c.call('SetInputMute', { inputName: name, inputMuted: !(cur as any).inputMuted })
        const res = await c.call('GetInputMute', { inputName: name })
        if ((res as any).inputMuted) this.muted.add(name)
        else this.muted.delete(name)
        this.emit({ muted: [...this.muted] })
        break
      }
      case 'obs-stream': {
        await c.call('ToggleStream')
        const res = await c.call('GetStreamStatus')
        this.emit({ streaming: (res as any).outputActive })
        break
      }
      case 'obs-record': {
        await c.call('ToggleRecord')
        const res = await c.call('GetRecordStatus')
        this.emit({ recording: (res as any).outputActive })
        break
      }
      default:
        throw new Error('Not an OBS action')
    }
  }
}

export const obs = new ObsService()
