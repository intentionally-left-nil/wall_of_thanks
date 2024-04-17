export default class Comment extends HTMLElement {
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
    if (offset == null) {
      throw new Error('offset not found');
    }
    offset.style.flexBasis = `${Math.random() * 100}%`;
  }
}
