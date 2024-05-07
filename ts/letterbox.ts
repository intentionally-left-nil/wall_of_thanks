import { loadTemplate } from './utils.js';
export default class LetterboxElement extends HTMLElement {
  removeTimer: number | null;
  constructor() {
    super();
    this.removeTimer = null;
    loadTemplate(this, this.template(), 'letterbox');
  }

  connectedCallback() {
    this.shadowRoot!.querySelector('slot')?.addEventListener(
      'slotchange',
      this.onSlotChange.bind(this)
    );
  }

  onSlotChange(e: Event) {
    if (!this.removeTimer) {
      this.removeTimer = window.setTimeout(
        this.removeExcessChildren.bind(this),
        3000
      );
    }
  }

  removeExcessChildren() {
    this.removeTimer = null;
    const root = this.shadowRoot!.querySelector('#root') as HTMLElement | null;
    const slot = this.shadowRoot!.querySelector(
      'slot'
    ) as HTMLSlotElement | null;
    if (!root || !slot) {
      return;
    }

    const children = slot.assignedElements();

    while (children.length > 1 && root.scrollHeight > root.offsetHeight) {
      const lastChild: HTMLElement = children.pop() as HTMLElement;
      const removeEvent = new CustomEvent('element-removed', {
        detail: { target: lastChild },
        bubbles: true,
        composed: true,
      });
      if (lastChild.offsetTop > root.offsetHeight) {
        lastChild.remove();
        this.dispatchEvent(removeEvent);
      } else {
        lastChild.classList.add('fade-out');
        lastChild.addEventListener('animationend', () => {
          lastChild.remove();
          this.dispatchEvent(removeEvent);
        });
        break;
      }
    }
  }
  template() {
    return `
<style>
  #root {
    height: 100%;
  }

  @keyframes fade-out {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  ::slotted(.fade-out) {
    animation: fade-out 1s !important;
  }
</style>
<div id="root">
  <slot>
  </slot>
</div>
`;
  }
}
