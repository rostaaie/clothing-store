import client from './client';

export const walletApi = {
  myWallet: () => client.get('/wallet/me').then((r) => r.data),
  deposit: (amount) => client.post('/wallet/deposit', { amount }).then((r) => r.data),
  withdraw: (amount) => client.post('/wallet/withdraw', { amount }).then((r) => r.data),
  myTransactions: () => client.get('/wallet/transactions/me').then((r) => r.data),
  transactionDetail: (txId) => client.get(`/wallet/transaction/${txId}`).then((r) => r.data),
  // ادمین
  userWallet: (userId) => client.get(`/wallet/${userId}`).then((r) => r.data),
  userTransactions: (userId) => client.get(`/wallet/transactions/user/${userId}`).then((r) => r.data),
  walletTransactions: (walletId) => client.get(`/wallet/transactions/wallet/${walletId}`).then((r) => r.data),
};
