const Transaction = require('../wallet/transaction');

class TransactionMiner {
    constructor({ blockchain, transactionPool, serverWallet, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = serverWallet;
        this.pubsub = pubsub;
    }
    
    mineTransactions() {
        //get the transaction pool`s valid transactions
        let validTransactions = JSON.parse(JSON.stringify(this.transactionPool.validTransactions()));

        //generate the miner`s reward
        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet: this.wallet })
        )

        //add a block consisting of these transactions to the blockchain
        this.blockchain.addBlock({ data: validTransactions });

        //broadcast the updated blockchain
        this.pubsub.broadcastChain();
        
        //clear the pool
        // this.transactionPool.clear({ transactions: validTransactions });
        const teste = this.transactionPool;
        setTimeout(function() {
            teste.clear({ transactions: validTransactions })
            console.log('legal')
        }, 15000)
        
    }
    
    clearPool() {
        
    }
}

module.exports = TransactionMiner;