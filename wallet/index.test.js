const Wallet = require('./index');
const Transaction = require('./transaction');
const { verifySignature } = require('../util');
const Blockchain = require('../blockchain');
const TransactionPool = require('./transaction-pool')
const { STARTING_BALANCE } = require('../config');
const cryptoHash = require('../util/crypto-hash')
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');


describe('Wallet', () => {
    let wallet, privateKey;

    beforeEach(() => {
        wallet = new Wallet();
        transactionPool = new TransactionPool();
        privateKey = wallet.keyPair.getPrivate('hex');
    });

    it('has a `balance`', () => {
        expect(wallet).toHaveProperty('balance');
    });

    it('has a `publicKey`', () => {
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('signing data', () => {
        const data = 'foobar';

        it('verifies a signature', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: wallet.sign(data)
                })
            ).toBe(true);
        });

        it('does not verify an invalid signature', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: new Wallet().sign(data)
                })
            ).toBe(false);
        });

    });

    describe('createTransaction()', () => {
        describe('and the amount exceeds the balance', () => {
            it('throws an error', () => {
                expect(() => wallet.createTransaction({ amount: 999999, recipient: 'foo-recipient', transactionPool}))
                    .toThrow('Amount exceeds balance')
            })
        });

        describe('and the amount exceeds the balance adding `transactionPool`', () => {
            it('throws an error', () => {
                const transaction = wallet.createTransaction({amount: 910, recipient: 'foo-recipient', transactionPool})
                transactionPool.setTransaction(transaction)
                expect(() => wallet.createTransaction({amount: 100, recipient: 'other-recipient', transactionPool}))
                    .toThrow('Amount exceeds balance')
            })
        });

        describe('and the amount is valid', () => {
            let transaction, amount, recipient;
    
            beforeEach(() => {
                amount = 50;
                recipient = 'foo-recipient';
                transaction = wallet.createTransaction({ amount, recipient, transactionPool });
            })
    
            it('creates an instance of `Transaction`', () => {
                expect(transaction instanceof Transaction).toBe(true);
            });
    
            it('matches the transaction input with the wallet', () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });
    
            it('outputs the amount the recipient', () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            })
        });

        describe('and a chain is passed', () => {
            it('calls `Wallet.calculateBalance`', () => {
                // const calculateBalanceMock = jest.fn();

                // const originalCalculateBalance = Wallet.calculateBalance;

                // Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    recipient: 'foo', 
                    amount: 10,
                    chain: new Blockchain().chain
                });

                // expect(calculateBalanceMock).toHaveBeenCalled();

                // Wallet.calculateBalance = originalCalculateBalance;
            })
        })
    });

    describe('calculateBalance()', () => {
        let blockchain, otherBlockchain;

        beforeEach(() => {
            blockchain = new Blockchain();
            otherBlockchain = new Blockchain();
        });

        describe('and there are no outputs for the wallet', () => {
            it('returns the `STARTING_BALANCE`', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(STARTING_BALANCE);
            });
        });

        describe('and there are outputs for the wallet', () => {
            let transactionOne, transactionTwo, transactionThree, transactionFour;

            beforeEach(() => {
                transactionOne = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 50
                });
                transactionTwo = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 60
                });

                blockchain.addBlock({ data: [transactionOne, transactionTwo] });
            });

            it('adds the sum of all outputs to the wallet balance', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(
                    STARTING_BALANCE +
                    transactionOne.outputMap[wallet.publicKey] +
                    transactionTwo.outputMap[wallet.publicKey]
                );
            });

            it('calculates final balance from the sending wallet', () => {
                const otherWallet = new Wallet();
                const senderWallet = new Wallet();

                transactionThree = senderWallet.createTransaction({
                    recipient: otherWallet.publicKey,
                    amount: 10,
                    transactionPool
                });

                transactionFour = senderWallet.createTransaction({
                    recipient: otherWallet.publicKey,
                    amount: 15,
                    transactionPool
                });

                otherBlockchain.addBlock({ data: [transactionThree, transactionFour] });
                
                expect(
                    Wallet.calculateBalance({
                        chain: otherBlockchain.chain,
                        address: senderWallet.publicKey
                    })
                ).toEqual(
                    STARTING_BALANCE -
                    10 - 15 
                )
            })

            describe('and the wallet has made a transaction', () => {
                let recentTransaction;

                beforeEach(() => {
                    recentTransaction = wallet.createTransaction({
                        recipient: 'foo-address',
                        amount: 30
                    });

                    blockchain.addBlock({ data: [recentTransaction] });
                });

                it('returns the output amount of the recent transction', () => {
                    expect(
                        Wallet.calculateBalance({
                            chain: blockchain.chain,
                            address: wallet.publicKey
                        })
                    ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
                });

                describe('and there are outputs next to and after the recent transaction', () => {
                    let sameBlockTransaction, nextBlockTransaction;

                    beforeEach(() => {
                        recentTransaction = wallet.createTransaction({
                            recipient: 'later-foo-address',
                            amount: 60
                        });

                        sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });

                        blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });

                        nextBlockTransaction = new Wallet().createTransaction({
                            recipient: wallet.publicKey, amount: 75
                        })

                        blockchain.addBlock({ data: [nextBlockTransaction] })
                    });

                    it('includes the output amounts in the returned balance', () => {
                        expect(
                            Wallet.calculateBalance({
                                chain: blockchain.chain,
                                address: wallet.publicKey
                            })
                        ).toEqual(
                            recentTransaction.outputMap[wallet.publicKey] +
                            sameBlockTransaction.outputMap[wallet.publicKey] +
                            nextBlockTransaction.outputMap[wallet.publicKey]
                        );
                    })
                })
            })


        });

        describe('recover wallet from private key', () => {
            
            it('can correctly sign', () => {
                const recoverWallet = new Wallet(privateKey)
                const data = 'data';
                expect(
                    verifySignature({
                        publicKey: wallet.publicKey,
                        data,
                        signature: recoverWallet.sign(data)
                    })
                ).toBe(true);

            })

            it('generates same publickey', () => {
                let wallet = new Wallet()
                let recoveredWallet = new Wallet(wallet.privateKey)
                expect(
                    wallet.publicKey
                ).toBe(recoveredWallet.publicKey);

            })

            it('build with correct balance', () => {
                let blockchain = new Blockchain();
                let wallet = new Wallet();

                let newTransaction = wallet.createTransaction({
                    recipient: 'later-foo-address',
                    amount: 60
                });

                blockchain.addBlock({ data: [newTransaction] });

                let recoverWallet = new Wallet(wallet.privateKey)
                let recoverWalletBalance = Wallet.calculateBalance({
                    chain: blockchain.chain,
                    address: recoverWallet.publicKey
                })
                recoverWallet.balance = recoverWalletBalance

                expect(
                    recoverWallet.balance
                ).toBe(940);

            })
        })
    });
});