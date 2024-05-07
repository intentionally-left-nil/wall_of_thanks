import type { Comment } from './types';
import { getAdminToken } from './utils.js';
async function getComments(): Promise<Comment[]> {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  const adminToken = getAdminToken();
  if (adminToken) {
    headers.append('Authorization', `Bearer ${adminToken}`);
  }
  const result = await fetch(getBackendDomain(), { headers });
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
  const response = await fetch(getBackendDomain(), {
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
  message: string;
  author: string;
  approved: boolean;
}): Promise<Comment> {
  const adminToken = getAdminToken();
  const payload: {
    id: number;
    message: string;
    author: string;
    approved?: boolean;
  } = {
    id: comment.id,
    message: comment.message,
    author: comment.author,
  };
  if (adminToken) {
    payload.approved = comment.approved;
  }
  const token = adminToken ?? comment.secret;
  if (!token) {
    throw new Error('Cannot edit a comment without a token');
  }

  const response = await fetch(`${getBackendDomain()}/${comment.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to edit comment');
  }
  return await response.json();
}

function getBackendDomain() {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  return `https://api.${window.location.hostname}`;
}

export { getComments, createComment, editComment };
