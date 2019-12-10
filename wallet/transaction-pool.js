const Transaction = require('./transaction');

class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }

    clear() {
        // console.log('CLEAR THESE TRANSACTIONS', transactions,'TRANSACTIONMAP', this.transactionMap)
        // for(let transaction of transactions) {
        //     console.log(transaction.id)
        //     if(this.transactionMap[transaction.id]) {
        //         console.log('entrei', transaction.id)
        //         delete this.transactionMap[transaction.id]
        //         console.log('result clear transaction', transaction.id, this.transactionMap)
        //     }
        // }
        this.transactionMap = {}
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