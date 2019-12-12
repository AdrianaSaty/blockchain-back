const uuid = require('uuid/v1');
const TransactionPool = require('./wallet/transaction-pool');
const Transaction = require('./wallet/transaction');
const TransactionMiner = require('./app/transaction-miner')
const Wallet = require('./wallet/index');
const Blockchain = require('./blockchain/index');

const blockchain = new Blockchain();
const transactionPool = new TransactionPool();


//creating wallet for players and bets. For API call https://blotting.herokuapp.com/api/create-wallet
//save privateKey and publicKey from user and bet wallets
//privateKey is used to recover wallet and make transactions (spend)
//publicKey is used to retrieve wallet balance and to specify receiver wallet in transactions
const playerWallet1 = new Wallet();
const playerWallet2 = new Wallet();
const playerWallet3 = new Wallet();

const poolWallet = new Wallet();

//mongoDB
let matchId = uuid();
let bettingPool = {
    matchId,
    homeTeam: 'team A',
    awayTeam: 'team B',
    //all other match info 
    wallet: {
        privateKey: poolWallet.privateKey, 
        publicKey: poolWallet.publicKey
    },
    bet: {}
    //bet is another object with the structure
    // bettingPool.bet[betId] = {
    //     player: publicKey,
    //     amount,
    //     team
    // }
}

//making bets
//To create transactions through API use https://blotting.herokuapp.com/api/transact, passing:
//API transaction method already replaces wallet.createTransaction and transactionPool.setTransaction(transaction)
// {
//     "recipient": "receiver publicKey",
//     "amount": 100,
//      "privateKey": "Sender privateKey"
// }


//bet function to simulate "MONGO", using publicKey as property and saving 
function makeBet({ publicKey, team, amount }){
    let betId = uuid(); //creates ID for bet
    bettingPool.bet[betId] = {
        player: publicKey,
        amount,
        team
    }
}

// Player A bet
let bettingTeam = 'A'
let betAmount = 100
let transaction = playerWallet1.createTransaction({ 
        recipient: poolWallet.publicKey,
        amount: betAmount, 
        chain: blockchain.chain,
        transactionPool
    });
transactionPool.setTransaction(transaction)

makeBet({
    publicKey: playerWallet1.publicKey,
    amount: betAmount,
    team: bettingTeam
})

//player2 bet
bettingTeam = 'B'
betAmount = 150
transaction = playerWallet2.createTransaction({ 
    recipient: poolWallet.publicKey,
    amount: betAmount, 
    chain: blockchain.chain,
    transactionPool
});
transactionPool.setTransaction(transaction)

makeBet({
    publicKey: playerWallet2.publicKey,
    amount: betAmount,
    team: bettingTeam
})

//player3 bet
bettingTeam = 'A'
betAmount = 200
transaction = playerWallet3.createTransaction({ 
    recipient: poolWallet.publicKey,
    amount: betAmount, 
    chain: blockchain.chain,
    transactionPool
});
transactionPool.setTransaction(transaction)
makeBet({
    publicKey: playerWallet3.publicKey,
    amount: betAmount,
    team: bettingTeam
})

//TO SEE RESULTS REMOVE COMMENT AND SEE CONSOLE.LOG BELOW
// console.log('bettingPool in Mongo', bettingPool)
// console.log('pool in blockchain, before mining', transactionPool.transactionMap)

//to mine use:
//https://blotting.herokuapp.com/api/mine-transactions (TO IMPLEMENT CONTINUOUS MINING, SHOULD NOT BE NECESSARY TO CALL)
let validTransactions = JSON.parse(JSON.stringify(transactionPool.validTransactions()));
blockchain.addBlock({ data: validTransactions })
// console.log('blockchain', blockchain.chain[1].data)

//every wallet is starting with 1000, to change to 0 we just need to change config.js, here I`m only subtracting 1000 instead
poolWalletBalance = Wallet.calculateBalance({ 
    chain: blockchain.chain, address: poolWallet.publicKey,
}) - 1000
console.log('betPool balance', poolWalletBalance )


//Suppose Team A wins
const winnerTeam = 'A'
console.log('Match', bettingPool)
const bettingPoolBets = Object.values(bettingPool.bet)
// console.log(bettingPoolBets)
//calculates the sum of all winning bets
let winnerPool = 0
bettingPoolBets.filter((bet) => bet.team === winnerTeam).forEach((bet) => {
    winnerPool += bet.amount
})

//calculate won amount based on how much player bets in relation to winners pool and distribute prize
bettingPoolBets.forEach((bet) => {
    // console.log('eachBet', bet)
    if(bet.team === winnerTeam){
        const amountWon = (bet.amount/winnerPool)*poolWalletBalance
        distributePrize({ publicKey: bet.player, amount: amountWon})
    }
})

function distributePrize({ publicKey, amount }){
    //call API transact instead of the codes here
    let transaction = poolWallet.createTransaction({ 
        recipient: publicKey,
        amount: amount, 
        chain: blockchain.chain,
        transactionPool
    });
    transactionPool.setTransaction(transaction)
}

//add to blockchain
validTransactions = JSON.parse(JSON.stringify(transactionPool.validTransactions()));
blockchain.addBlock({ data: validTransactions })

playerBalance1 = Wallet.calculateBalance({ 
    chain: blockchain.chain, address: playerWallet1.publicKey,
})

playerBalance2 = Wallet.calculateBalance({ 
    chain: blockchain.chain, address: playerWallet2.publicKey,
})

playerBalance3 = Wallet.calculateBalance({ 
    chain: blockchain.chain, address: playerWallet3.publicKey,
})

console.log('player1', playerBalance1, 'player2', playerBalance2, 'player3', playerBalance3 )
