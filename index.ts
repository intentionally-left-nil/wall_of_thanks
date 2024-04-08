customElements.define(
  'a-comment',
  class Comment extends HTMLElement {
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
    }
  }
);
