const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet');
const TransactionMiner = require('./app/transaction-miner');
const cors = require('cors');

const isDevelopment = process.env.ENV === 'development';

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = isDevelopment ?
`http://localhost:${DEFAULT_PORT}`:
'https://powerful-basin-43291.herokuapp.com/';
const REDIS_URL = isDevelopment ?
    'redis://127.0.0.1:6379' :
    'redis://h:p8931111525e87bbc03f5e8d65a514116e29d9af4efd9b1a6fa65844244e78360@ec2-52-72-155-147.compute-1.amazonaws.com:23789'

const app = express();
const blockchain = new Blockchain();
const wallet = new Wallet();
const transactionPool = new TransactionPool();
const pubsub = new PubSub({ blockchain, transactionPool, redisUrl: REDIS_URL });
const transactionMiner = new TransactionMiner({ blockchain, transactionPool, wallet, pubsub });



app.use(bodyParser.json());

app.use(cors({
    // origin: process.env.ENV === "DSV" ? 'http://localhost:3000' : "https://blockchain-back-login.herokuapp.com/",
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }));


app.get('/api/blocks', (req, res) => {
    res.json(blockchain.chain);
});

app.post('/api/mine', (req, res) => {
    const { data } = req.body;

    blockchain.addBlock({ data });

    pubsub.broadcastChain();

    res.redirect('/api/blocks')
});

app.post('/api/transact', (req, res) => {
    const { amount, recipient } = req.body;

    let transaction = transactionPool
        .existingTransaction({ inputAddress: wallet.publicKey });

    try {
        if(transaction) {
            transaction.update( { senderWallet: wallet, recipient, amount });
        } else {
            transaction = wallet.createTransaction({ 
                recipient,
                amount, 
                chain: blockchain.chain
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

app.get('/api/mine-transactions', (req, res) => {
    transactionMiner.mineTransactions();

    res.redirect('/api/blocks');
});

app.get('/api/wallet-info', (req, res) => {
    const address = wallet.publicKey;
    res.json({
        address,
        balance: Wallet.calculateBalance({ 
            chain: blockchain.chain, address
        })
    })
});

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

