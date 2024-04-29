import type { Comment } from './types';
async function getComments(): Promise<Comment[]> {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  const adminToken = localStorage.getItem('token');
  if (adminToken) {
    headers.append('Authorization', `Bearer ${adminToken}`);
  }
  const result = await fetch('http://localhost:8001/', { headers });
  if (!result.ok) {
    return [];
  }
  const data: any[] = await result.json();
  return data.map((item) => ({
    ...item,
    created_at: new Date(item.created_at),
  }));
}

async function createComment(comment: {
  message: string;
  author: string;
}): Promise<Comment> {
  const response = await fetch('http://localhost:8001/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comment),
  });
  if (!response.ok) {
    throw new Error('Failed to create comment');
  }
  return await response.json();
}

async function editComment(comment: {
  id: number;
  secret: string | null;
  message?: string;
  author?: string;
}): Promise<Comment> {
  const token = localStorage.getItem('token') ?? comment.secret;
  if (!token) {
    throw new Error('Cannot edit a comment without a token');
  }

  const response = await fetch(`http://localhost:8001/${comment.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: comment.id,
      message: comment.message,
      author: comment.author,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to edit comment');
  }
  return await response.json();
}

export { getComments, createComment, editComment };
