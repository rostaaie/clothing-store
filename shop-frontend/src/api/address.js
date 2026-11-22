import client, { unwrap } from './client';

export const addressApi = {
  list: () => client.get('/address').then(unwrap),
  get: (id) => client.get(`/address/${id}`).then(unwrap),
  create: (payload) => client.post('/address', payload).then(unwrap),
  update: (id, payload) => client.patch(`/address/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/address/${id}`).then(unwrap),
};
