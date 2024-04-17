export default class CommentElement extends HTMLElement {
  static get observedAttributes() {
    return ['author', 'message'];
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
    if (!['message', 'author'].includes(name)) {
      return;
    }
    const node = this.shadowRoot!.querySelector('#' + name);
    if (node) {
      node.textContent = newValue;
    }
  }
}
