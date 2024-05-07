import { loadTemplate } from './utils.js';
export default class ColumnItem extends HTMLElement {
  static get observedAttributes() {
    return ['expanded', 'slide-in', 'fade-in'];
  }

  constructor() {
    super();
    loadTemplate(this, this.template(), 'column-item');
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) {
      return;
    }
    const root = this.shadowRoot!.querySelector('#root');
    if (!root) {
      return;
    }
    if (newValue.toLowerCase() === 'true') {
      root.classList.add(name);
    } else {
      root.classList.remove(name);
    }
  }

  template() {
    return `<style>
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
</div>`;
  }
}
