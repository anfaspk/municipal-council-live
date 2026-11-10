import { Injectable } from '@angular/core';

const KEEP = 48;

@Injectable()
export class WinnerPhotos {
  private readonly done = new Set<string>();
  private readonly held = new Map<string, HTMLImageElement>();

  ready(url: string): boolean {
    return this.done.has(url);
  }

  warm(urls: readonly string[]): void {
    for (const url of urls) {
      if (this.held.has(url)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      this.held.set(url, img);
      img.decode().then(
        () => this.done.add(url),
        () => this.held.delete(url),
      );
      if (this.held.size > KEEP) this.drop();
    }
  }

  private drop(): void {
    const first = this.held.keys().next().value;
    if (first === undefined) return;
    this.held.delete(first);
    this.done.delete(first);
  }
}
