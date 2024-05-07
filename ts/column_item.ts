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
  @keyframes slideDown {
    from {
      grid-template-rows: 0fr;
    }

    to {
      grid-template-rows: 1fr;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  #root {
    display: grid;
    grid-template-rows: 0fr;
  }

  #root.expanded {
    grid-template-rows: 1fr;
  }

  #root.slide-in {
    animation: slideDown 1s forwards;
  }

  #root.fade-in {
    animation: fade-in 5s;
  }

  ::slotted(*) {
    overflow: hidden;
  }
</style>
<div id="root">
  <slot></slot>
</div>`;
  }
}
