import client, { unwrap } from './client';

export const bookmarksApi = {
  list: () => client.get('/bookmark-products/my-bookmarks').then(unwrap),
  add: (productId) => client.post('/bookmark-products', { productId }).then(unwrap),
  remove: (productId) => client.delete(`/bookmark-products/${productId}`).then(unwrap),
};
