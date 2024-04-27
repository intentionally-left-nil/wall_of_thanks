import CommentElement from './comment.js';
import { getComments } from './backend.js';
customElements.define('a-comment', CommentElement);

getComments().then((comments) => {
  const leftColumn = document.getElementById('left-letterbox');
  const rightColumn = document.getElementById('right-letterbox');
  if (leftColumn == null || rightColumn == null) {
    return;
  }
  comments.forEach((comment, index) => {
    const element = document.createElement('a-comment');
    element.setAttribute('id', `comment_${comment.id}`);
    element.setAttribute('author', comment.author);
    element.setAttribute('message', comment.message);
    element.setAttribute('editable', 'true');
    if (index % 2 === 0) {
      leftColumn.appendChild(element);
    } else {
      rightColumn.appendChild(element);
    }
  });
});
