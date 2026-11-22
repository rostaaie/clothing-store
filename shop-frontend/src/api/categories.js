import client, { unwrap } from './client';

export const categoriesApi = {
  list: () => client.get('/categories').then(unwrap),
  get: (id) => client.get(`/categories/${id}`).then(unwrap),
  create: (payload) => client.post('/categories', payload).then(unwrap),
  update: (id, payload) => client.patch(`/categories/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/categories/${id}`).then(unwrap),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return client.post(`/categories/${id}/image`, formData).then(unwrap);
  },
};
