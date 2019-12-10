const uuid = require('uuid/v1');
const TransactionPool = require('./wallet/transaction-pool');
const Transaction = require('./wallet/transaction');
const Wallet = require('./wallet/index');
const Blockchain = require('./blockchain/index');

const blockchain = new Blockchain();
let senderWallet = new Wallet();
const transactionPool = new TransactionPool();
let transaction = senderWallet.createTransaction({
    recipient: 'fake-recipient',
    amount: 50
})

// transaction = JSON.parse(JSON.stringify(transaction));

// transactionPool.setTransaction(transaction)

// transaction = new Transaction({
//     senderWallet,
//     recipient: 'fake-recipient',
//     amount: 200
// });

// transactionPool.setTransaction(transaction)

// let validTransactions = transactionPool.validTransactions()
// // console.log(validTransactions, typeof validTransactions)

// blockchain.addBlock({ data: validTransactions })
// // console.log(blockchain.chain)

// let senderBalance = Wallet.calculateBalance({ chain: blockchain.chain, address: senderWallet.publicKey })
// let receiverBalance = Wallet.calculateBalance({ chain: blockchain.chain, address: 'fake-recipient' })

// // console.log('transactionpool', validTransactions)
// // console.log('sender', senderBalance, 'receiver', receiverBalance)

// transaction = new Transaction({
//     senderWallet,
//     recipient: 'fake-recipient',
//     amount: 150
// });

// transactionPool.setTransaction(transaction)

// let otherWallet = new Wallet()
// transaction = new Transaction({
//     senderWallet: otherWallet,
//     recipient: senderWallet.publicKey,
//     amount: 20
// });

// transactionPool.setTransaction(transaction)

// transaction = new Transaction({
//     senderWallet,
//     recipient: 'fake-recipient',
//     amount: 200
// });


// console.log(transaction)

// console.log('transactionvalid', Transaction.validTransaction(transaction))

// transactionPool.setTransaction(transaction)

// validTransactions = transactionPool.validTransactions()

// blockchain.addBlock({ data: validTransactions })

// senderBalance = Wallet.calculateBalance({ chain: blockchain.chain, address: senderWallet.publicKey })

// console.log(senderBalance)

transaction = senderWallet.createTransaction({
    recipient: 'other-recipient',
    amount: 10
})

transactionPool.setTransaction(transaction)

transaction = senderWallet.createTransaction({
        recipient: 'fake-recipient',
        amount: 20
    })

transactionPool.setTransaction(transaction)

// Transaction.totalSpent(transaction)

// console.log('transactionpool', Object.values(transactionPool.transactionMap))

console.log('amount in transaction', transactionPool.amountInTransaction({ address: senderWallet.publicKey }))

// console.log(transactionPool.amountInTransaction(senderWallet.publicKey))