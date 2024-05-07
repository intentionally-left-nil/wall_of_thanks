import { createComment, editComment } from './backend.js';
import type { Comment } from './types.js';
export default class CommentElement extends HTMLElement {
  static get observedAttributes() {
    return ['editable'];
  }

  _comment: Comment | null;
  constructor() {
    super();
    this._comment = null;
    const node = document.getElementById('comment-template');
    if (node == null || !(node instanceof HTMLTemplateElement)) {
      throw new Error('comment-template not found');
    }
    const template: HTMLTemplateElement = node;
    this.attachShadow({ mode: 'open' }).appendChild(
      template.content.cloneNode(true)
    );

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

    if (localStorage.getItem('token')) {
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
}
