import { getComments } from './backend.js';
import type { Comment } from './types.js';
import CommentElement from './comment.js';
export default class App extends HTMLElement {
  constructor() {
    super();

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
}

// getComments().then((comments) => {
//   const leftColumn = document.getElementById('left-letterbox');
//   const rightColumn = document.getElementById('right-letterbox');
//   if (leftColumn == null || rightColumn == null) {
//     return;
//   }

//   const isAdmin = localStorage.getItem('token') != null;
//   const newComment = document.createElement('my-comment') as CommentElement;
//   newComment.setAttribute('editable', 'true');
//   leftColumn.appendChild(newComment);

//   comments.sort((a, b) =>
//     a.approved === b.approved ? 0 : a.approved ? 1 : -1
//   );

//   comments.forEach((comment, index) => {
//     const element = document.createElement('my-comment') as CommentElement;
//     element.style.visibility = 'hidden';
//     element.comment = comment;
//     if (isAdmin) {
//       element.setAttribute('editable', 'true');
//     }
//     const column = index % 2 === 0 ? leftColumn : rightColumn;
//     column.appendChild(element);
//     if (column.scrollHeight <= column.offsetHeight) {
//       element.style.removeProperty('visibility');
//     } else {
//       column.removeChild(element);
//     }
//   });
// });
