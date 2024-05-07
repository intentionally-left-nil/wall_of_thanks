import { getComments } from './backend.js';
import type { Comment } from './types.js';
import CommentElement from './comment.js';
import { isAdmin, loadTemplate } from './utils.js';
export default class App extends HTMLElement {
  comments: Comment[] = [];
  insertTimer: number | null = null;
  loadCommentsTimer: number | null = null;
  draftingNewComment = false;

  constructor() {
    super();
    loadTemplate(this, this.template(), 'app');
    this.loadComments();

    this.addEventListener('new-comment', this.onNewComment.bind(this));
    this.addEventListener('element-removed', this.onElementRemoved.bind(this));
    this.addEventListener(
      'comment-submitted',
      this.onContentSubmitted.bind(this)
    );

    window.addEventListener('resize', () => this.onResize.bind(this));
  }

  onNewComment(e: Event) {
    const addComment = this.shadowRoot!.querySelector(
      '#add-comment'
    ) as HTMLElement | null;
    if (addComment == null) {
      return;
    }
    const commentHTML = `
  <my-column-item slide-in="true">
    <my-comment editable="true"></my-comment>
  </my-column-item>`;
    addComment.insertAdjacentHTML('afterend', commentHTML);
    this.draftingNewComment = true;
    addComment.setAttribute('disabled', '');
  }

  onContentSubmitted(e: Event) {
    this.draftingNewComment = false;
    const addComment = this.shadowRoot!.querySelector('#add-comment');
    if (addComment) {
      addComment.removeAttribute('disabled');
    }
    this.insertTimer = window.setTimeout(this.insertComment.bind(this), 30000);
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

    if (this.draftingNewComment) {
      return;
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
      rightColumn.scrollHeight === 0 // The column is hidden
        ? [leftColumn]
        : Math.random() < 0.5
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
      if (column.scrollHeight <= column.offsetHeight + 11) {
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
      const index =
        1 + Math.floor(Math.random() * (column.children.length - 1)); // Don't insert before the (+) button and don't insert as the last element
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

  onResize() {
    if (!this.insertTimer) {
      this.insertTimer = window.setTimeout(this.insertComment.bind(this), 5000);
    }
  }

  template() {
    return `<style>
  #root {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background-color: black;
    flex-direction: row;
  }

  #hero {
    object-fit: contain;
    height: 100vh;
  }

  #right-letterbox {
    display: none;
  }

  @media (max-width: 800px) {
    #root {
      flex-direction: column;
    }

    #left-letterbox {
      order: 1;
    }

    #hero {
      width: 100%;
      max-width: 800px;
      max-height: 25%;
      object-fit: cover;
      object-position: center 33%;
      height: auto;
      order: 0
    }
  }

  @media (min-width: 801px) and (max-width: 1499px) {
    #hero {
      max-width: 40%;
      object-fit: cover;
      object-position: 20% center;
    }
  }

  @media(min-width: 1500px) {
    #right-letterbox {
      display: block;
    }
  }

  .letterbox {
    flex-basis: 0;
    flex-grow: 1;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
</style>
<div id="root">
  <my-letterbox id="left-letterbox" class="letterbox">
    <my-add-comment id="add-comment"></my-add-comment>
  </my-letterbox>
  <img id="hero" src="/images/hero_full.jpeg" />
  <my-letterbox id="right-letterbox" class="letterbox"></my-letterbox>
</div>`;
  }
}

function shuffleInPlace(arr: any[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
