const uuid = require('uuid/v1');
const { verifySignature } = require('../util');
const { REWARD_INPUT, MINING_REWARD, LOAD_BALANCE } = require('../config');

class Transaction {
    constructor({ senderWallet, recipient, amount, outputMap, input}) {
        this.id = uuid();
        this.outputMap = outputMap || this.createOutputMap({ senderWallet, recipient, amount });
        this.input = input || this.createInput({ senderWallet, outputMap: this.outputMap });
    }

    createOutputMap({ senderWallet, recipient, amount }) {
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

        return outputMap;
    }

    createInput({ senderWallet, outputMap }) {
        return {
            timestamp: Date.now(),
            amount: senderWallet.balance,
            address: senderWallet.publicKey,
            signature: senderWallet.sign(outputMap)
        }
    }

    update({ senderWallet, recipient, amount }) {
        if(amount > this.outputMap[senderWallet.publicKey]) {
            throw new Error('Amount exceeds balance');
        }

        if(!this.outputMap[recipient]) {
            this.outputMap[recipient] = amount;
        } else {
            this.outputMap[recipient] = this.outputMap[recipient] + amount;
        }

        this.outputMap[senderWallet.publicKey] =
            this.outputMap[senderWallet.publicKey] - amount;

        this.input = this.createInput({ senderWallet, outputMap: this.outputMap })
    }

    static totalSpent(transaction) {
        let totalSpent = 0;
        const spentTransactionKeys = Object.keys(transaction.outputMap)
        const spentTransactionMap = {}
        Object.values(transaction.outputMap).forEach((value, index) => {
            if(spentTransactionKeys[index] !== transaction.input.address){
                totalSpent+=value;
                spentTransactionMap[spentTransactionKeys[index]] = value
            }
        })
        spentTransactionMap.total = totalSpent
        return spentTransactionMap
    }

    static validTransaction(transaction) {
        const { input: {address, amount, signature}, outputMap } = transaction;

        if(address === LOAD_BALANCE.address) {
            return true
        }

        const outputTotal = Object.values(outputMap)
            .reduce((total, outputAmount) => total + outputAmount);


        if (amount !== outputTotal) {
            console.error(`Invalid transaction from ${address} amount different than output`, outputMap, amount);
            return false;
        }

        if(!verifySignature({ publicKey: address, data: outputMap, signature })) {
            console.error(`Invalid signature ${address} signature not verified`);
            return false;
        }

        return true;
    }

    static rewardTransaction({ minerWallet }) {
        return new this({
            input: REWARD_INPUT,
            outputMap: { [minerWallet.publicKey]: MINING_REWARD }
        })
    }

    static loadBalance({ publicKey, amount }) {
        return new this({
            input: LOAD_BALANCE,
            outputMap: { [publicKey]: amount }
        })
    }
}

module.exports = Transaction;