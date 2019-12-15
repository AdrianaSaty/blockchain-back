const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet');
const TransactionMiner = require('./app/transaction-miner');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const isDevelopment = process.env.ENV === 'development';

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = isDevelopment ?
`http://localhost:${DEFAULT_PORT}`:
'https://blotting.herokuapp.com';
const REDIS_URL = isDevelopment ?
    'redis://127.0.0.1:6379' :
    'redis://h:p8931111525e87bbc03f5e8d65a514116e29d9af4efd9b1a6fa65844244e78360@ec2-52-72-155-147.compute-1.amazonaws.com:23789'

const app = express();
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const pubsub = new PubSub({ blockchain, transactionPool, redisUrl: REDIS_URL });
let serverWallet = new Wallet();
const transactionMiner = new TransactionMiner({ blockchain, transactionPool, serverWallet, pubsub });

setInterval(() => {
    if(Object.values(transactionPool.transactionMap).length >= 1) {
        transactionMiner.mineTransactions();
    }
}, 5000);

app.use(bodyParser.json());

app.get('/api/blocks', (req, res) => {
    res.json(blockchain.chain);
});

app.get('/api/create-wallet', (req, res) => {
    const wallet = new Wallet()
    res.json({ 
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        balance: wallet.balance
    });
});

app.post('/api/rebuild-wallet', (req, res) => {
    const { privateKey } = req.body;
    const wallet = new Wallet(privateKey)
    wallet.rebuildBalance({
        chain: blockchain.chain,
    })
    const inTransaction = transactionPool.amountInTransaction({ address: wallet.publicKey })

    res.json({
        privatekey: wallet.privateKey,
        publicKey: wallet.publicKey,
        balance: wallet.balance,
        inTransaction
    })
});

app.post('/api/mine', (req, res) => {
    const { data } = req.body;

    blockchain.addBlock({ data });

    pubsub.broadcastChain();

    res.redirect('/api/blocks')
});

app.post('/api/transact', (req, res) => {
    const { amount, recipient, privateKey } = req.body;

    const wallet = new Wallet(privateKey)
    wallet.rebuildBalance({
        chain: blockchain.chain,
    })

    let transaction = transactionPool
        .existingTransaction({ inputAddress: wallet.publicKey });

    try {
        if(transaction) {
            transaction.update( { senderWallet: wallet, recipient, amount });
        } else {
            transaction = wallet.createTransaction({ 
                recipient,
                amount, 
                chain: blockchain.chain,
                transactionPool
            });
        }
    } catch(error) {
        return res.status(400).json({ type: 'error', message: error.message });
    }

    transactionPool.setTransaction(transaction);

    pubsub.broadcastTransaction(transaction);

    res.json({ type: 'success', transaction });
});

app.get('/api/transaction-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap)
});

app.get('/api/mine-transactions', async (req, res) => {

    transactionMiner.mineTransactions();

    res.redirect('/api/blocks');
});

app.post('/api/wallet-info', (req, res) => {
    const { publicKey } = req.body;
    const inTransaction = transactionPool.amountInTransaction({ address: publicKey })

    res.json({
        address: publicKey,
        balance: Wallet.calculateBalance({ 
            chain: blockchain.chain, address: publicKey,
        }),
        inTransaction
    })

})

const syncWithRootState = () => {
    request({ url: `${ROOT_NODE_ADDRESS}/api/blocks`}, (error, response, body) => {
        if(!error && response.statusCode === 200) {
            const rootChain = JSON.parse(body);
            

            console.log('replace chain on a sync with', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });

    request({ url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map` }, (error, response, body) => {
        if(!error && response.statusCode === 200) {
            const rootTransactionPoolMap = JSON.parse(body);

            console.log('replace transaction pool map on a sync with', rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
}

let PEER_PORT;

if (process.env.GENERATE_PEER_PORT === 'true') {
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random()*1000);
}

const PORT = process.env.PORT || PEER_PORT || DEFAULT_PORT;
app.listen(PORT, () => {
    console.log(`listening at localhost:${PORT}`)

    if(PORT !== DEFAULT_PORT) {
        syncWithRootState();
    }
})

