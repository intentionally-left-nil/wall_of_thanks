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
  comments.forEach((comment, index) => {
    const element = document.createElement('a-comment') as CommentElement;
    element.comment = comment;
    if (isAdmin) {
      element.setAttribute('editable', 'true');
    }
    if (index % 2 === 0) {
      leftColumn.appendChild(element);
    } else {
      rightColumn.appendChild(element);
    }
  });
});
