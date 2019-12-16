const Transaction = require('./transaction');

class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }

    clear({ transactions }) {
        for(let transaction of transactions) {
            if(this.transactionMap[transaction.id]) {
                delete this.transactionMap[transaction.id]
            }
        }
    }

    setTransaction(transaction) {
        this.transactionMap[transaction.id] = transaction;
    }

    setMap(transactionMap) {
        this.transactionMap = transactionMap;
    }

    existingTransaction({ inputAddress }) {
        const transactions = Object.values(this.transactionMap);

        return transactions.find(transaction => transaction.input.address === inputAddress)
    }

    amountInTransaction({ address }) {
        let transactionInPool = {};
        let totalInTransaction = 0;
        if(this.existingTransaction({ inputAddress:address })) {
            Object.values(this.transactionMap).forEach((transaction) => {
                if(transaction.input.address === address) {
                    totalInTransaction += Transaction.totalSpent(transaction).total
                    transactionInPool[transaction.id] = Transaction.totalSpent(transaction)
                }
            })
            transactionInPool.total = totalInTransaction
            return transactionInPool
        }
        transactionInPool.total = 0
        return transactionInPool
    }

    findTransaction({ transactionId }) {
        console.log(transactionId)
        if(this.transactionMap[transactionId]) {
            return true
        }
        return false
    }

    validTransactions() {
        return Object.values(this.transactionMap).filter(
            transaction => Transaction.validTransaction(transaction)
        );
    }

    clearBlockchainTransactions({ chain }) {
        for(let i=1; i<chain.length; i++) {
            const block = chain[i];

            for(let transaction of block.data) {
                if(this.transactionMap[transaction.id]) {
                    delete this.transactionMap[transaction.id]
                }
            }
        }
    }



}

module.exports = TransactionPool;