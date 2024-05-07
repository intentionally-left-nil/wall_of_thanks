export default class ColumnItem extends HTMLElement {
  static get observedAttributes() {
    return ['expanded', 'slide-in', 'fade-in'];
  }

  constructor() {
    super();
    const node = document.getElementById('column-item-template');
    if (node == null || !(node instanceof HTMLTemplateElement)) {
      throw new Error('column-item-template not found');
    }

    const template: HTMLTemplateElement = node;
    this.attachShadow({ mode: 'open' }).appendChild(
      template.content.cloneNode(true)
    );
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
}
