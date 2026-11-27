import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';

export type Paper = 'A4' | 'A3';

/** What to print: the page itself on a paper size, or the booklet PDF for it. */
export interface PrintChoice {
  paper: Paper;
  /** set when the booklet PDF should be opened instead of printing the page */
  bookletFile: string | null;
}

function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: not remembered */ }
}

/** The rulebook's print options: paper size and booklet, remembered in this browser. */
@Component({
  selector: 'app-print-dialog',
  template: `
    <dialog #dlg (click)="backdrop($event)" aria-labelledby="pdlg-title">
      <form method="dialog">
        <h2 id="pdlg-title">Print the rulebook</h2>
        <fieldset>
          <legend>Paper</legend>
          <div class="seg">
            @for (p of papers; track p) {
              <label [class.on]="paper() === p"><input type="radio" name="paper" [value]="p" [checked]="paper() === p" (change)="setPaper(p)" />{{ p }}</label>
            }
          </div>
        </fieldset>
        <label class="sw" [class.off]="!file()">
          <input type="checkbox" [checked]="booklet() && !!file()" (change)="setBooklet($any($event.target).checked)" [disabled]="!file()" />
          <span><b>Booklet</b><small>Sheets folded in half into a book, printed double-sided.</small></span>
        </label>
        <p class="what">
          @if (booklet() && file(); as f) {
            Opens the <b>{{ f.label }}</b> PDF. Print it double-sided, flipping on the short edge, then fold the stack in half and staple it.
          } @else {
            Prints this page on <b>{{ paper() }}</b>, one page after another, with a cover page@if (version()) { (version {{ version() }})}.
            @if (paper() === 'A3') { Everything is scaled up to fill the larger sheet. }
          }
        </p>
        <div class="acts">
          <button class="btn ghost" value="cancel">Cancel</button>
          <button class="btn primary" type="button" (click)="go()">{{ booklet() && file() ? 'Open the booklet' : 'Print' }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog { width: min(440px, calc(100vw - 2rem)); padding: 1.3rem 1.4rem 1.1rem; border: 0; border-radius: 14px; background: var(--paper); color: var(--ink); box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    dialog[open] { animation: pop .18s ease-out; }
    dialog::backdrop { background: rgba(30,31,29,.55); }
    @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }
    h2 { margin: 0 0 .8rem; font-size: 1.6rem; }
    fieldset { border: 0; margin: 0 0 .9rem; padding: 0; }
    legend { padding: 0; margin-bottom: .35rem; font-size: .78rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
    .seg { display: inline-flex; padding: 3px; gap: 3px; background: #ece6d3; border-radius: 9px; }
    .seg label { padding: .4rem 1.2rem; border-radius: 7px; font-weight: 600; cursor: pointer; }
    .seg label.on { background: var(--dark); color: var(--cream); }
    .seg input { position: absolute; opacity: 0; pointer-events: none; }
    .seg label:has(input:focus-visible) { outline: 2px solid var(--orange); }
    .sw { display: flex; gap: .65rem; align-items: flex-start; cursor: pointer; }
    .sw.off { opacity: .5; cursor: default; }
    .sw input { margin-top: .3rem; width: 18px; height: 18px; accent-color: var(--orange); }
    .sw span { display: flex; flex-direction: column; } .sw small { color: var(--muted); }
    .what { margin: 1rem 0; padding: .7rem .9rem; background: #fff; border-radius: 10px; font-size: .92rem; }
    .acts { display: flex; justify-content: flex-end; gap: .5rem; }
  `,
})
export class PrintDialog {
  /** booklet PDF for each paper size, from data/rulebook/index.json */
  booklets = input<Partial<Record<Paper, { label: string; file: string }>>>({});
  version = input('');
  print = output<PrintChoice>();

  readonly papers: Paper[] = ['A4', 'A3'];
  paper = signal<Paper>(load('rules.print.paper') === 'A3' ? 'A3' : 'A4');
  booklet = signal(load('rules.print.booklet') === '1');
  file = computed(() => this.booklets()[this.paper()] ?? null);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  open() {
    this.dlg().nativeElement.showModal();
  }

  setPaper(p: Paper) {
    this.paper.set(p);
    save('rules.print.paper', p);
  }

  setBooklet(on: boolean) {
    this.booklet.set(on);
    save('rules.print.booklet', on ? '1' : '0');
  }

  /** A click on the backdrop lands on the dialog itself: close. (A handler must not return false, or Angular cancels the click.) */
  backdrop(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.dlg().nativeElement.close();
  }

  go() {
    this.dlg().nativeElement.close();
    const f = this.file();
    this.print.emit({ paper: this.paper(), bookletFile: this.booklet() && f ? f.file : null });
  }
}
