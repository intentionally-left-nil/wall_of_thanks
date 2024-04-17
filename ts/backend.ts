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

export { getComments };
