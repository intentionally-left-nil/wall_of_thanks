import { getComments } from './backend.js';
import type { Comment } from './types.js';
import CommentElement from './comment.js';
export default class App extends HTMLElement {
  comments: Comment[] = [];
  insertTimer: number | null = null;
  loadCommentsTimer: number | null = null;
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
    this.addEventListener('element-removed', this.onElementRemoved.bind(this));
  }

  onNewComment(e: Event) {
    const addComment = this.shadowRoot!.querySelector('#add-comment');
    if (addComment == null) {
      return;
    }
    const commentHTML = `
  <my-column-item slide-in="true">
    <my-comment editable="true"></my-comment>
  </my-column-item>`;
    addComment.insertAdjacentHTML('afterend', commentHTML);
  }

  async loadComments() {
    if (this.loadCommentsTimer) {
      window.clearTimeout(this.loadCommentsTimer);
      this.loadCommentsTimer = null;
    }

    this.comments = await getComments();

    if (isAdmin()) {
      this.comments.sort((a, b) =>
        a.approved === b.approved ? 0 : a.approved ? 1 : -1
      );
    } else {
      shuffleInPlace(this.comments);
    }
    this.insertComment();
  }

  insertComment() {
    if (this.insertTimer) {
      window.clearTimeout(this.insertTimer);
      this.insertTimer = null;
    }

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
      if (!this.loadCommentsTimer) {
        this.loadCommentsTimer = window.setTimeout(
          this.loadComments.bind(this),
          30000
        );
      }
      return;
    }

    const columnItem = document.createElement('my-column-item');
    columnItem.setAttribute('expanded', 'true');
    const newComment = document.createElement('my-comment') as CommentElement;
    newComment.comment = comment;
    if (isAdmin()) {
      newComment.setAttribute('editable', 'true');
    }
    columnItem.appendChild(newComment);

    let inserted = false;
    for (const column of columns) {
      columnItem.style.visibility = 'hidden';
      column.appendChild(columnItem);
      // TODO: For some reason, at least on FF the scrollheight is 10 greater than the offsetHeight but only for the left column. idkbbqsauce
      if (column.scrollHeight <= column.offsetHeight + 50) {
        columnItem.style.removeProperty('visibility');
        this.insertTimer = window.setTimeout(
          this.insertComment.bind(this),
          5000
        );
        columnItem.setAttribute('fade-in', 'true');
        inserted = true;
        break;
      } else {
        column.removeChild(columnItem);
      }
    }

    if (!inserted) {
      // We couldn't insert to the end without scrolling. So, just pick a random place in the first column and insert it anyways
      // The letterbox will then drop off the last item with a fade out. This is how we cycle the items.
      const column = columns[0];
      const index = 1 + Math.floor(Math.random() * column.children.length);
      columnItem.style.removeProperty('visibility');
      columnItem.setAttribute('slide-in', 'true');
      column.insertBefore(columnItem, column.children[index]);
      this.insertTimer = window.setTimeout(
        this.insertComment.bind(this),
        30000
      );
    }
  }

  onElementRemoved(e: Event) {
    if (!(e instanceof CustomEvent)) {
      return;
    }
    const { target }: { target: HTMLElement } = e.detail;
    const comment = target.querySelector('my-comment') as CommentElement | null;
    const id = comment?.comment?.id;
    if (id) {
      this.comments = this.comments.filter((c) => c.id !== id);
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
