const Transaction = require('./transaction');
const { STARTING_BALANCE } = require('../config');
const { ec, cryptoHash } = require('../util');
const TransactionPool = require('./transaction-pool')

class Wallet {
    constructor(privateKey) {
        if(privateKey) {
            this.privateKey = privateKey
        } else {
            this.privateKey = ec.genKeyPair().getPrivate('hex') 
        }
        this.keyPair = ec.keyFromPrivate(this.privateKey, 'hex');
        this.publicKey = this.keyPair.getPublic('hex');
        this.balance = STARTING_BALANCE;
        // this.publicKey = this.keyPair.getPublic().encode('hex');
    }

    sign(data) {
        return this.keyPair.sign(cryptoHash(data))
    }

    createTransaction( { recipient, amount, chain, transactionPool }) {
        let amountInPool = 0;
        if(chain) {
            this.rebuildBalance({ chain })
        };

        if(transactionPool) {
            amountInPool = transactionPool.amountInTransaction({ address: this.publicKey }).total
        }


        if(amount > this.balance - amountInPool) {
            throw new Error('Amount exceeds balance');
        }

        return new Transaction({ senderWallet: this, recipient, amount });
    }

    rebuildBalance({ chain }) {
        this.balance = Wallet.calculateBalance({ 
            chain, 
            address: this.publicKey
         })
    }

    static calculateBalance({ chain, address }) {
        let hasConductedTransaction = false;
        let outputsTotal = 0;
        
        for( let i=chain.length-1; i>0; i--) {
            const block = chain[i];

            for(let transaction of block.data) {

                const addressOutput = transaction.outputMap[address];

                // if(addressOutput) {
                //     outputsTotal = outputsTotal + addressOutput;
                // }

                if(addressOutput && transaction.input.address !== address) {
                    // console.log('1o caso', transaction.input.address, address, addressOutput)
                    outputsTotal = outputsTotal + addressOutput;
                } else if(addressOutput && transaction.input.address === address && !hasConductedTransaction) {
                    outputsTotal = outputsTotal + addressOutput;
                    // console.log('2o caso', outputsTotal, addressOutput)
                } else if(addressOutput && transaction.input.address === address && hasConductedTransaction){
                    outputsTotal = outputsTotal - Transaction.totalSpent(transaction).total
                    // console.log('3o caso', Transaction.spentTotal(transaction))
                }

                if(transaction.input.address === address) {
                    hasConductedTransaction = true
                }
            }

            if(hasConductedTransaction) {
                break;
            }
        }

        return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal;
    }

}

module.exports = Wallet;