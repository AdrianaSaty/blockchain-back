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
        transactionInPool.spent = {};
        transactionInPool.receive = {};
        let totalToSpend = 0;
        let totalToReceive = 0;
  
        // if(this.existingTransaction({ inputAddress:address })) {
        //     Object.values(this.transactionMap).forEach((transaction) => {
        //         if(transaction.input.address === address) {
        //             totalInTransaction += Transaction.totalSpent(transaction).total
        //             transactionInPool[transaction.id] = Transaction.totalSpent(transaction)
        //         }
        //     })
        //     transactionInPool.total = totalInTransaction
        //     return transactionInPool
        // }
        // transactionInPool.total = 0

        Object.values(this.transactionMap).forEach((transaction) => {
            if(transaction.input.address === address) {
                totalToSpend += Transaction.totalSpent(transaction).total
                transactionInPool.spent[transaction.id] = Transaction.totalSpent(transaction)
            } else {
                let transactionOutputKeys = Object.keys(transaction.outputMap)
                Object.values(transaction.outputMap).forEach((amount, index) => {
                    if(transactionOutputKeys[index] === address) {
                        totalToReceive += amount
                    }
                })
            }
        })
        transactionInPool.receive.total = totalToReceive;
        transactionInPool.spent.total = totalToSpend;
        return transactionInPool
    }

    findTransaction({ transactionId }) {
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