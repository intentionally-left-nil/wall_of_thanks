import { createComment, editComment } from './backend.js';
import type { Comment } from './types.js';
export default class CommentElement extends HTMLElement {
  static get observedAttributes() {
    return ['author', 'message', 'editable', 'id'];
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
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) {
      return;
    }

    switch (name) {
      case 'editable':
        const editable = newValue.toLowerCase() === 'true';
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

  onTyping(e: Event) {
    const target = e.target as HTMLElement | null;
    if (target) {
      target.classList.remove('error');
    }
  }

  async onSubmit(e: Event) {
    const message = this.shadowRoot!.querySelector('#message');
    const author = this.shadowRoot!.querySelector('#author');
    if (!message || !author) {
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
      if (this.hasAttribute('id')) {
        const parts = this.getAttribute('id')!.split('comment_');
        if (parts.length !== 2 || parts[0] != '' || !parts[1]) {
          throw new Error('Invalid id');
        }
        const id = parseInt(parts[1], 10);
        if (isNaN(id)) {
          throw new Error('Invalid id');
        }
        comment = await editComment({
          id,
          message: message.textContent,
          author: author.textContent,
        });
      } else {
        comment = await createComment({
          message: message.textContent,
          author: author.textContent,
        });
      }
      this.setAttribute('message', comment.message);
      this.setAttribute('author', comment.author);
      this.setAttribute('id', `comment_${comment.id.toString()}`);
    } catch (error) {
      this.setAttribute('editable', 'true');
      throw error;
    } finally {
      if (target) {
        target.disabled = false;
      }
    }
  }
}
