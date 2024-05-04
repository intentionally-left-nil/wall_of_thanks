export default class AddCommentElement extends HTMLElement {
  constructor() {
    super();
    const node = document.getElementById('add-comment-template');
    if (node == null || !(node instanceof HTMLTemplateElement)) {
      throw new Error('add-comment-template not found');
    }
    const template: HTMLTemplateElement = node;
    this.attachShadow({ mode: 'open' }).appendChild(
      template.content.cloneNode(true)
    );
    const shadowRoot = this.shadowRoot!;
    const addComment = shadowRoot.querySelector('#add-comment');
    if (addComment) {
      addComment.addEventListener('click', this.onAddComment.bind(this));
    }
  }

  onAddComment(e: Event) {
    const event = new CustomEvent('create-comment', {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}
