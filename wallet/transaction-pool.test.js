const TransactionPool = require('./transaction-pool');
const Transaction = require('./transaction');
const Wallet = require('./index');
const Blockchain = require('../blockchain');

describe('TransactionPool', () => {
    let transactionPool, transaction, senderWallet;

    beforeEach(() => {
        transactionPool = new TransactionPool();
        senderWallet = new Wallet();
        transaction = new Transaction({
            senderWallet,
            recipient: 'fake-recipient',
            amount: 50
        });
    });

    describe('setTransaction()', () => {
        it('adds a transaction', () => {
            transactionPool.setTransaction(transaction);

            expect(transactionPool.transactionMap[transaction.id])
                .toBe(transaction);
        });
    });

    describe('existingTransaction()', () => {
        it('returns an existing transaction given an input address', () => {
            transactionPool.setTransaction(transaction);

            expect(
                transactionPool.existingTransaction({ inputAddress: senderWallet.publicKey})
            ).toBe(transaction)
        });
    });

    describe('amountInTransaction()', () => {
        it('returns correct amount in transaction', () => {
            transactionPool.setTransaction(transaction)
            const newTransaction = new Transaction({
                senderWallet,
                recipient: 'foo-recipient',
                amount: 250 
            });
            transactionPool.setTransaction(newTransaction)
            const amountInTransaction = transactionPool.amountInTransaction({ address: senderWallet.publicKey })
            expect(amountInTransaction.total).toEqual(300)
        })
    })

    describe('validTransactions()', () => {
       let validTransactions, errorMock;
       
       beforeEach(() => {
           validTransactions = [];
           errorMock = jest.fn();
           global.console.error = errorMock;

           for(let i = 0; i < 10; i++) {
               transaction = new Transaction({
                   senderWallet,
                   recipient: 'any-recipient',
                   amount: 30
               });

               if(i%3===0) {
                   transaction.input.amount = 999999;
               } else if (i%3===1) {
                   transaction.input.signature = new Wallet().sign('foo');
               } else {
                   validTransactions.push(transaction);
               }
               transactionPool.setTransaction(transaction);
           }
       });

       it('returns valid transaction', () => {
           expect(transactionPool.validTransactions()).toEqual(validTransactions);
       });

       it('logs errors for the invalid transactions', () => {
           transactionPool.validTransactions();
           expect(errorMock).toHaveBeenCalled();
       })
    });

    describe('clear()', () => {
        // it('clears the transactions', () => {
        //     transactionPool.clear();

        //     expect(transactionPool.transactionMap).toEqual({});
        // });

        it('clears only transactions sent to blockchain', () => {
            const blockchain = new Blockchain();
            transactionPool.setTransaction(transaction)
            
            let newTransaction = senderWallet.createTransaction({
                recipient: 'foo-address',
                amount: 100
            })
            
            let transactionTwo = senderWallet.createTransaction({
                recipient: 'other-address',
                amount: 90
            })
            
            transactionPool.setTransaction(newTransaction)
            let validTransactions = JSON.parse(JSON.stringify(transactionPool.validTransactions()));
            transactionPool.setTransaction(transactionTwo)
    
            blockchain.addBlock({ data: validTransactions });
            transactionPool.clear({ transactions: validTransactions });
            expect(transactionPool.findTransaction({ transactionId: newTransaction.id })).toEqual(false);
            expect(transactionPool.findTransaction({ transactionId: transactionTwo.id })).toEqual(true);
        });
    });

    describe('clearBlockchainTransactions()', () => {
        it('clears the pool of any existing blockchain transactions', () => {
            const blockchain = new Blockchain();
            const expectedTransactionMap = {};
    
            for(let i = 0; i < 6; i++) {
                const transaction = new Wallet().createTransaction({
                    recipient: 'foo', amount: 20
                });
    
                transactionPool.setTransaction(transaction);
    
                if(i%2===0) {
                    blockchain.addBlock({ data: [transaction] })
                } else {
                    expectedTransactionMap[transaction.id] = transaction;
                }
            }
    
            transactionPool.clearBlockchainTransactions({ chain: blockchain.chain });
    
            expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
        })
    })
});