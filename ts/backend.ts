import type { Comment } from './types';
async function getComments(): Promise<Comment[]> {
  const result = await fetch('http://localhost:8001/');
  if (!result.ok) {
    return [];
  }
  const data: any[] = await result.json();
  return data.map(({ id, message, author, approved, created_at }) => ({
    id,
    message,
    author,
    approved,
    created_at: new Date(created_at),
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
  message?: string;
  author?: string;
}): Promise<Comment> {
  const response = await fetch(`http://localhost:8001/${comment.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer test`,
    },
    body: JSON.stringify(comment),
  });
  if (!response.ok) {
    throw new Error('Failed to create comment');
  }
  return await response.json();
}

export { getComments, createComment, editComment };
