import CommentElement from './comment.js';
import { getComments } from './backend.js';
customElements.define('a-comment', CommentElement);

getComments().then((comments) => {
  console.log(comments);
});
