interface LoadProgress {
  total: number
  completed: number
  percent: number
}

interface PreloadOptions {
  onProgress?: (progress: LoadProgress) => void
  onComplete?: () => void
}

interface LoadItem {
  url: string
  type: 'image' | 'audio' | 'video' | 'json' | 'binary'
}

export default class Preloader {
  private resources: {[key: string]: any} = {}
  private loadedCount: number = 0
  private totalCount: number = 0
  onProgress?: (progress: LoadProgress) => void
  onComplete?: () => void

  loadItems(items: LoadItem[]) {
    items.forEach((item: LoadItem) => {
      this.load(item.url, item.type)
    })
  }

  load(
    url: string,
    type: 'image' | 'audio' | 'video' | 'json' | 'binary',
  ): void {
    this.totalCount++

    switch (type) {
      case 'image':
        this.loadImage(url)
        break
      case 'audio':
        this.loadAudio(url)
        break
      case 'video':
        this.loadVideo(url)
        break
      case 'json':
        this.loadJSON(url)
        break
      case 'binary':
        this.loadBinary(url)
        break
    }
  }

  private loadImage(url: string): void {
    const img = new Image()
    img.onload = () => this.resourceLoaded(url, img)
    img.onerror = () => this.resourceError(url)
    img.src = url
  }

  private loadAudio(url: string): void {
    const audio = new Audio()
    audio.addEventListener('loadeddata', () => this.resourceLoaded(url, audio))
    audio.addEventListener('error', () => this.resourceError(url))
    audio.src = url
  }

  private loadVideo(url: string): void {
    const video = document.createElement('video')
    video.addEventListener('loadeddata', () => this.resourceLoaded(url, video))
    video.addEventListener('error', () => this.resourceError(url))
    video.preload = 'auto'
    video.src = url
  }

  private loadJSON(url: string): void {
    fetch(url)
      .then((response) => response.json())
      .then((data) => this.resourceLoaded(url, data))
      .catch(() => this.resourceError(url))
  }

  private loadBinary(url: string): void {
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => this.resourceLoaded(url, new Uint8Array(data)))
      .catch(() => this.resourceError(url))
  }

  private resourceLoaded(url: string, data: any): void {
    this.resources[url] = data
    this.loadedCount++
    this.updateProgress()
  }

  private resourceError(url: string): void {
    console.error(`Failed to load resource: ${url}`)
    this.loadedCount++
    this.updateProgress()
  }

  private updateProgress(): void {
    const progress: LoadProgress = {
      total: this.totalCount,
      completed: this.loadedCount,
      percent: (this.loadedCount / this.totalCount) * 100,
    }

    if (this.onProgress) this.onProgress(progress)
    if (progress.completed === progress.total && this.onComplete)
      this.onComplete()
  }

  getResources(): {[key: string]: any} {
    return this.resources
  }
}
