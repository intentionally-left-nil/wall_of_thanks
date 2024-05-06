import CommentElement from './comment.js';
import AddCommentElement from './add_comment.js';
import LetterboxElement from './letterbox.js';
import App from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  customElements.define('my-comment', CommentElement);
  customElements.define('my-add-comment', AddCommentElement);
  customElements.define('my-letterbox', LetterboxElement);
  customElements.define('my-app', App);
});
