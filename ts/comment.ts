import { createComment, editComment } from './backend.js';
import type { Comment } from './types.js';
import { loadTemplate, isAdmin } from './utils.js';
export default class CommentElement extends HTMLElement {
  static get observedAttributes() {
    return ['editable'];
  }

  _comment: Comment | null;
  constructor() {
    super();
    loadTemplate(this, this.template(), 'comment');
    this._comment = null;
    const shadowRoot = this.shadowRoot!;

    const message = shadowRoot.querySelector('#message') as HTMLElement | null;
    if (message) {
      message.addEventListener('input', this.onTyping.bind(this));
    }

    const author = shadowRoot.querySelector('#author') as HTMLElement | null;
    if (author) {
      author.addEventListener('input', this.onTyping.bind(this));
    }

    const offset = shadowRoot.querySelector('#offset') as HTMLElement | null;
    if (offset) {
      offset.style.flexBasis = `${Math.random() * 100}%`;
    }

    const submit = shadowRoot.querySelector(
      '#submit'
    ) as HTMLButtonElement | null;
    if (submit) {
      submit.addEventListener('click', this.onSubmit.bind(this));
    }

    if (isAdmin()) {
      const approvedRow = shadowRoot.querySelector('#approved-row');
      if (approvedRow) {
        approvedRow.classList.remove('hidden');
      }
    }
  }

  set comment(value: Comment | null) {
    this._comment = value;
    const message = this.shadowRoot!.querySelector('#message');
    if (message) {
      message.textContent = value?.message || '';
    }
    const author = this.shadowRoot!.querySelector('#author');

    if (author) {
      author.textContent = value?.author || 'Unknown';
    }

    if (this._comment?.id) {
      this.shadowRoot!.querySelector('#submit')!.textContent = 'Update';
    }

    const approved: HTMLInputElement | null =
      this.shadowRoot!.querySelector('#approved');

    if (approved) {
      approved.checked = value?.approved ?? false;
    }
  }

  get comment(): Comment | null {
    return this._comment;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) {
      return;
    }

    switch (name) {
      case 'editable':
        const editable = newValue && newValue.toLowerCase() === 'true';
        for (const selector of ['#message', '#author']) {
          const node = this.shadowRoot!.querySelector(selector);
          if (node) {
            editable
              ? node.setAttribute('contenteditable', 'true')
              : node.removeAttribute('contenteditable');
          }
        }
        break;
      default:
        throw new Error('Unknown attribute');
    }
  }

  onTyping(e: Event) {
    const target = e.target as HTMLElement | null;
    if (target) {
      target.classList.remove('error');
    }
  }

  async onSubmit(e: Event) {
    const message = this.shadowRoot!.querySelector('#message');
    const author = this.shadowRoot!.querySelector('#author');
    const approved = this.shadowRoot!.querySelector(
      '#approved'
    ) as HTMLInputElement | null;
    if (!message || !author || !approved) {
      return;
    }

    if (!message.textContent) {
      message.classList.add('error');
    }

    if (!author.textContent) {
      author.classList.add('error');
    }

    if (!message.textContent || !author.textContent) {
      return;
    }

    const target = e.target as HTMLButtonElement | null;
    if (target) {
      target.disabled = true;
    }

    this.removeAttribute('editable');

    try {
      let comment: Comment;
      if (this._comment?.id) {
        comment = await editComment({
          id: this._comment.id,
          secret: this._comment.secret,
          message: message.textContent,
          author: author.textContent,
          approved: approved.checked,
        });
      } else {
        comment = await createComment({
          message: message.textContent,
          author: author.textContent,
        });
      }
      this.comment = comment;
      const event = new CustomEvent('comment-submitted', {
        detail: { comment },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    } finally {
      this.setAttribute('editable', 'true');
      if (target) {
        target.disabled = false;
      }
    }
  }

  template() {
    return `<style>
  .hidden {
    display: none !important;
  }

  #container {
    display: flex;
  }

  #offset {
    flex-grow: 0;
    flex-shrink: 1;
    flex-basis: 10%;
  }

  #comment-container {
    display: inline-block;
    /* flex-shrink: 0; */
    padding: 10px;
    padding: 10px;
    margin: 50px;
    min-width: 200px;
    max-width: 500px;
    width: 100%;
    border: 1px solid black;
    border-radius: 15px;
    background: white;
  }

  [contenteditable]:read-write {
    border-style: dashed;
    border-width: 1px;
    border-color: #ccc;
    border-radius: 5px;
    background-color: #f9f9f9;
  }

  [contenteditable]:read-write:hover {
    border-color: #888;
  }

  [contenteditable]:read-write:focus {
    outline: none;
    border-color: #007BFF;
    background-color: #e6f0ff;
  }

  #message {
    font-size: 1em;
    padding: 10px;
    max-height: 10em;
    overflow: auto;
  }

  #message:read-write {
    min-height: 3.6em;
  }

  #author {
    display: inline-block;
    font-size: 1em;
    padding-top: 10px;
    padding-bottom: 10px;
    text-align: left;
  }

  #author:read-write {
    min-width: 6em;
  }

  #author:read-write:empty::before {
    content: "Author";
    color: #ccc;
  }

  :dir(ltr) #author {
    padding-left: 6px;
    padding-right: 10px;
    margin-left: 4px;
  }

  :dir(rtl) #author {
    margin-right: 4px;
    padding-right: 6px;
    padding-left: 10px;
  }

  #author-container {
    text-align: right;
  }

  :host(:not([editable="true"])) #submit {
    display: none;
  }

  #approved-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  #approved-row label {
    font-size: 0.7em;
    color: #333;
  }

  #submit {
    display: block;
    margin-right: 0;
    margin-left: auto;
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

  #submit:hover {
    background-color: #39256c;
  }

  .error {
    border-color: red !important;
  }
</style>
<div id="container">
  <div id="offset"></div>
  <div id="comment-container">
    <p id="message"></p>
    <p id="author-container">&mdash;<span id="author"></span></p>
    <div id="approved-row" class="hidden">
      <label for="approved">Approved?</label>
      <input type="checkbox" id="approved" name="approved" />
    </div>
    <button id="submit">Submit</button>
  </div>
<div>`;
  }
}
