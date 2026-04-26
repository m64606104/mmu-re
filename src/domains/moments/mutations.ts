import { getMomentsData, saveMomentsData } from '../../utils/aiMomentsGenerator';

export async function appendMomentImages(
  contactId: string,
  momentId: string,
  imageUrls: string[]
): Promise<boolean> {
  if (!contactId || !momentId || imageUrls.length === 0) return false;

  const data = await getMomentsData(contactId);
  const post = data.posts.find((p: any) => p.id === momentId);
  if (!post) return false;

  post.images = Array.isArray(post.images) ? post.images : [];
  for (const url of imageUrls) {
    if (url && !post.images.includes(url)) post.images.push(url);
  }

  await saveMomentsData(data);
  return true;
}

export async function removeMomentComment(
  contactId: string,
  momentId: string,
  commentId: string
): Promise<{ success: boolean; before: number; after: number }> {
  if (!contactId || !momentId || !commentId) {
    return { success: false, before: 0, after: 0 };
  }

  const data = await getMomentsData(contactId);
  const post = data.posts.find((p: any) => p.id === momentId);
  if (!post) return { success: false, before: 0, after: 0 };

  post.comments = Array.isArray(post.comments) ? post.comments : [];
  const before = post.comments.length;
  post.comments = post.comments.filter((c: any) => c?.id !== commentId);
  const after = post.comments.length;

  await saveMomentsData(data);
  return { success: true, before, after };
}

