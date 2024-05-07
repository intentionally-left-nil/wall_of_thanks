import { loadTemplate } from './utils.js';
export default class AddCommentElement extends HTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }
  constructor() {
    super();
    loadTemplate(this, this.template(), 'add-comment');
    const shadowRoot = this.shadowRoot!;
    const addComment = shadowRoot.querySelector('#add-comment');
    if (addComment) {
      addComment.addEventListener('click', this.onAddComment.bind(this));
    }
  }

  onAddComment(e: Event) {
    const event = new CustomEvent('new-comment', {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    const addComment = this.shadowRoot!.querySelector('#add-comment');
    if (addComment == null || name !== 'disabled' || oldValue == newValue) {
      return;
    }

    if (newValue == null) {
      addComment.removeAttribute('disabled');
    } else {
      addComment.setAttribute('disabled', '');
    }
  }

  template() {
    return `<style>
    #add-comment {
      display: block;
      margin: 10px;
      background-color: #4B2E83;
      border: 1px solid black;
      border-radius: 15px;
      color: white;
      padding: 10px 20px;
      text-align: center;
      text-decoration: none;
      font-size: 14px;
      transition-duration: 0.4s;
      cursor: pointer;
    }

    #add-comment:hover {
      background-color: #39256c;
    }

    #add-comment:disabled {
      background-color: #D8BFD8;
      color: white;
    }
</style>
<div>
  <button id="add-comment">+</button>
</div>`;
  }
}
