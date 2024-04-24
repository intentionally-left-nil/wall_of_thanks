export default class CommentElement extends HTMLElement {
  static get observedAttributes() {
    return ['author', 'message', 'editable'];
  }

  constructor() {
    super();
    const node = document.getElementById('comment-template');
    if (node == null || !(node instanceof HTMLTemplateElement)) {
      throw new Error('comment-template not found');
    }
    const template: HTMLTemplateElement = node;
    this.attachShadow({ mode: 'open' }).appendChild(
      template.content.cloneNode(true)
    );

    const shadowRoot = this.shadowRoot!;

    const offset = shadowRoot.querySelector('#offset') as HTMLElement | null;
    if (offset) {
      offset.style.flexBasis = `${Math.random() * 100}%`;
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) {
      return;
    }

    switch (name) {
      case 'editable':
        const editable = newValue.toLowerCase() === 'true';
        const container = this.shadowRoot!.querySelector('#container');
        if (container) {
          editable
            ? container.classList.add('editable')
            : container.classList.remove('editable');
        }
        for (const selector of ['#message', '#author']) {
          const node = this.shadowRoot!.querySelector(selector);
          if (node) {
            editable
              ? node.setAttribute('contenteditable', 'true')
              : node.removeAttribute('contenteditable');
          }
        }
        break;
      case 'message':
      case 'author':
        const node = this.shadowRoot!.querySelector('#' + name);
        if (name === 'author') {
          newValue = newValue || 'Unknown';
        }
        if (node) {
          node.textContent = newValue;
        }
        break;
      default:
        throw new Error('Unknown attribute');
    }
  }
}
