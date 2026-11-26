import { Component, ElementRef, signal, viewChild } from '@angular/core';

/**
 * Shows one picture as large as the screen allows. Click anywhere or press Esc to close.
 * Given a sharper copy (`hd`), it shows the picture at once and swaps in the sharper one when it has loaded;
 * if that copy is missing, the picture stays as it is.
 */
@Component({
  selector: 'app-lightbox',
  template: `
    <dialog #dlg (click)="close()" (close)="src.set(null)" aria-label="Picture at full size">
      @if (src(); as s) { <img [src]="s" [alt]="alt()" /> }
      <button class="x" type="button" aria-label="Close">×</button>
    </dialog>
  `,
  styles: `
    dialog { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: transparent; cursor: zoom-out; }
    dialog::backdrop { background: rgba(20,20,18,.86); }
    dialog[open] { display: flex; align-items: center; justify-content: center; animation: fade .15s ease-out; }
    @keyframes fade { from { opacity: 0; } }
    img { width: 94vw; height: 88vh; object-fit: contain; filter: drop-shadow(0 8px 30px rgba(0,0,0,.5)); }
    .x { position: fixed; top: 12px; right: 16px; width: 40px; height: 40px; border: 0; border-radius: 99px; background: rgba(255,247,214,.15); color: #fff7d6; font-size: 1.6rem; line-height: 1; cursor: pointer; }
    .x:hover { background: rgba(255,247,214,.3); }
  `,
})
export class Lightbox {
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  src = signal<string | null>(null);
  alt = signal('');

  open(src: string, alt = '', hd?: string) {
    this.src.set(src);
    this.alt.set(alt);
    this.dlg().nativeElement.showModal();
    if (hd && hd !== src) {
      const big = new Image();
      big.onload = () => { if (this.src() === src) this.src.set(hd); };
      big.src = hd;
    }
  }

  close() {
    this.dlg().nativeElement.close();
  }
}
