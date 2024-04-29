import CommentElement from './comment.js';
import { getComments } from './backend.js';
customElements.define('a-comment', CommentElement);

getComments().then((comments) => {
  const leftColumn = document.getElementById('left-letterbox');
  const rightColumn = document.getElementById('right-letterbox');
  if (leftColumn == null || rightColumn == null) {
    return;
  }

  const isAdmin = localStorage.getItem('token') != null;
  const newComment = document.createElement('a-comment') as CommentElement;
  newComment.setAttribute('editable', 'true');
  leftColumn.appendChild(newComment);

  comments.sort((a, b) =>
    a.approved === b.approved ? 0 : a.approved ? 1 : -1
  );

  comments.forEach((comment, index) => {
    const element = document.createElement('a-comment') as CommentElement;
    element.style.visibility = 'hidden';
    element.comment = comment;
    if (isAdmin) {
      element.setAttribute('editable', 'true');
    }
    const column = index % 2 === 0 ? leftColumn : rightColumn;
    column.appendChild(element);
    if (column.scrollHeight <= column.offsetHeight) {
      element.style.removeProperty('visibility');
    } else {
      column.removeChild(element);
    }
  });
});
