const Transaction = require('./transaction');

class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }

    clear({ transactions }) {
        console.log('CLEAR THESE TRANSACTIONS', transactions,'TRANSACTIONMAP', this.transactionMap)
        for(let transaction of transactions) {
            console.log(transaction.id)
            if(this.transactionMap[transaction.id]) {
                console.log('entrei', transaction.id)
                delete this.transactionMap[transaction.id]
                console.log('result clear transaction', transaction.id, this.transactionMap)
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
        const amountInTransaction = this.existingTransaction({ inputAddress:address })
        if(amountInTransaction) {
            const outputAddresses = Object.keys(amountInTransaction.outputMap)
            const sumOutputValues = Object.values(amountInTransaction.outputMap)
                .filter((value, index) => outputAddresses[index] !== address)
                .reduce((total, value) => total + value)
            amountInTransaction.outputMap['totalOutput'] = sumOutputValues;
            return amountInTransaction.outputMap
        }
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