import client, { unwrap } from './client';

export const productsApi = {
  list: () => client.get('/products').then(unwrap),
  get: (id) => client.get(`/products/${id}`).then(unwrap),
  create: (payload) => client.post('/products', payload).then(unwrap),
  update: (id, payload) => client.patch(`/products/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/products/${id}`).then(unwrap),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return client.post(`/products/${id}/image`, formData).then(unwrap);
  },
};
