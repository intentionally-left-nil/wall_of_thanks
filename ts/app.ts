import { getComments } from './backend.js';
import type { Comment } from './types.js';
import CommentElement from './comment.js';
export default class App extends HTMLElement {
  comments: Comment[] = [];
  constructor() {
    super();
    this.loadComments();

    const node = document.getElementById('app-template');
    if (node == null || !(node instanceof HTMLTemplateElement)) {
      throw new Error('app-template not found');
    }
    const template: HTMLTemplateElement = node;
    this.attachShadow({ mode: 'open' }).appendChild(
      template.content.cloneNode(true)
    );
    this.addEventListener('new-comment', this.onNewComment.bind(this));
  }

  onNewComment(e: Event) {
    const addComment = this.shadowRoot!.querySelector('#add-comment');
    if (addComment == null) {
      return;
    }
    const commentHTML = `
  <div class="slide-down">
    <my-comment editable="true"></my-comment>
  </div>`;
    addComment.insertAdjacentHTML('afterend', commentHTML);
  }

  async loadComments() {
    this.comments = await getComments();

    if (isAdmin()) {
      this.comments.sort((a, b) =>
        a.approved === b.approved ? 0 : a.approved ? 1 : -1
      );
    } else {
      shuffleInPlace(this.comments);
    }
    this.showComment();
  }

  showComment() {
    const leftColumn = this.shadowRoot!.querySelector(
      '#left-letterbox'
    ) as HTMLElement | null;
    const rightColumn = this.shadowRoot!.querySelector(
      '#right-letterbox'
    ) as HTMLElement | null;

    if (!leftColumn || !rightColumn) {
      return;
    }
    const columns =
      Math.random() < 0.5
        ? [leftColumn, rightColumn]
        : [rightColumn, leftColumn];

    const comment = this.comments.pop();
    if (!comment) {
      return;
    }

    const newComment = document.createElement('my-comment') as CommentElement;
    newComment.classList.add('fade-in');
    newComment.comment = comment;
    if (isAdmin()) {
      newComment.setAttribute('editable', 'true');
    }

    for (const column of columns) {
      newComment.style.visibility = 'hidden';
      column.appendChild(newComment);
      if (column.scrollHeight <= column.offsetHeight) {
        newComment.style.removeProperty('visibility');
        break;
      } else {
        column.removeChild(newComment);
      }
    }
  }
}

function shuffleInPlace(arr: any[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function isAdmin(): boolean {
  return localStorage.getItem('token') != null;
}
