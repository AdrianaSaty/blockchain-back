const axios = require('axios')
const uuid = require('uuid/v1');
const url = 'http://localhost:3000/api'

let userDB = {}
let matchDB = {}
let betDB = {}

mainFunction();

async function mainFunction() {
    //create player 1, 2 and 3
    let name = 'Fer'
    let wallet = await createWallet();
    simulateUserMongo(name, wallet)

    name = 'Dri'
    wallet = await createWallet();
    simulateUserMongo(name, wallet)

    name = 'Dan'
    wallet = await createWallet();
    simulateUserMongo(name, wallet)
    
    matchName = 'AxB'
    wallet = await createWallet();
    simulateMatchMongo(matchName, wallet)
    //adding another match just to test functions
    wallet = await createWallet();
    simulateMatchMongo('CxD', wallet)

    //MAKING BETS
    //I`m identifying players ID by name instead of ID to simplify, but should be replaced by Id
    //FER
    // let bet = await makeBet({
    //     match: 'AxB', 
    //     playerBetting:'Fer', 
    //     team: 'A', 
    //     amount: 100
    // })

    let bet = await makeBet({
        match: 'AxB', 
        playerBetting:'Fer', 
        team: 'A', 
        amount: 200
    })

    //Dri
    bet = await makeBet({
        match: 'AxB', 
        playerBetting:'Dri', 
        team: 'B', 
        amount: 200
    })

    //Dan
    bet = await makeBet({
        match: 'AxB', 
        playerBetting:'Dan', 
        team: 'A', 
        amount: 300
    })

    bet = await makeBet({
        match: 'AxB', 
        playerBetting:'Dan', 
        team: 'B', 
        amount: 200
    })
    
    //this function will not be necessary to be called in actual program
    let blockMined = await mineBlock();

    //FER
    bet = await makeBet({
        match: 'AxB', 
        playerBetting:'Fer', 
        team: 'B', 
        amount: 100
    })

    blockMined = await mineBlock();

    //checking wallet balances
    let totalBalance = await checkingAllBalances();
    console.log('BEFORE match and distribuction', totalBalance)

    //SUPPOSE TEAM B WON
    const match = 'AxB'
    const winner = 'B'
    const result = await distributePrize({ match, winner })

}

//these are the functions to be called when using blockchain-back API
async function createWallet() {
    const wallet = await axios({
        method: 'get',
        url: `${url}/create-wallet`
    })
    return {
        publicKey: wallet.data.publicKey,
        privateKey: wallet.data.privateKey
    }
}

async function createTransaction({ recipient, amount, privateKey }) {
    const transaction = await axios({
        method: 'post',
        url: `${url}/transact`,
        data: {
            recipient,
            amount,
            privateKey 
        }
    })
    return transaction.data
}

async function walletBalance({ publicKey }) {
    const walletBalance = await axios({
        method: 'post',
        url: `${url}/wallet-info`,
        data: {
            publicKey 
        }
    })
    return walletBalance.data
}

//mineBlock will not be necessary as the blockchain app will continuously mine, without necessity of calling 
async function mineBlock() {
    const mining = await axios({
        method: 'get',
        url: `${url}/mine-transactions`
    })
    return mining.data
}

//END of functions to be called when using blockchain-back API


// auxiliary functions

function simulateUserMongo(name, wallet) {
    //use route to save on mongoDB instead of this. Will use NAME as main property to simplify search in this example
    userDB[name] = {
        name,
        wallet
    }
}

function simulateMatchMongo(name, wallet) {
    //use route to save on mongoDB instead of this
    matchDB[name] = {
        name,
        wallet
        //home-team, away-team, etc...
    }
}

async function makeBet({ match, playerBetting, team, amount }){
    let betId = uuid(); //creates ID for bet
    betDB[betId] = {
        match,
        player: userDB[playerBetting].wallet.publicKey,
        amount,
        team
    }

    const transaction = await createTransaction({
        recipient: matchDB[match].wallet.publicKey,
        amount,
        privateKey: userDB[playerBetting].wallet.privateKey
    })

    return transaction
}

async function checkingAllBalances() {
    let ferWalletBalance = await walletBalance({ publicKey: userDB['Fer'].wallet.publicKey })
    ferWalletBalance = ferWalletBalance.balance;
    let driWalletBalance = await walletBalance({ publicKey: userDB['Dri'].wallet.publicKey })
    driWalletBalance = driWalletBalance.balance;
    let danWalletBalance = await walletBalance({ publicKey: userDB['Dan'].wallet.publicKey })
    danWalletBalance = danWalletBalance.balance;
    let matchWalletBalance = await walletBalance({ publicKey: matchDB['AxB'].wallet.publicKey })
    matchWalletBalance = matchWalletBalance.balance - 1000
    // console.log('fer', ferWalletBalance, 'dri', driWalletBalance, 'dan', danWalletBalance, 'match', matchWalletBalance)
    return {
        ferWalletBalance, driWalletBalance, danWalletBalance, matchWalletBalance
    }
    //subtracting 1000 from match wallet because all wallets are starting with 1000, to change, just need to change config file to 0 in STARTING_BALANCE
}

async function distributePrize({ match, winner }) {
    let totalPoolPrize = await walletBalance({ publicKey: matchDB[match].wallet.publicKey })
    totalPoolPrize = totalPoolPrize.balance - 1000
    const filteredBets = Object.values(betDB).filter((bet) => bet.match === match)
    //sum of winning bets to calculate % of pool prize for every bet
    let sumOfWinningBets = 0
    filteredBets.filter((bet) => bet.team === winner).forEach((bet) => {
        sumOfWinningBets += bet.amount
    })
    console.log('totalpoolprize', totalPoolPrize, 'sumofwinnings', sumOfWinningBets)
    
    const distribuctionResult = filteredBets.forEach(async (bet) => {
        let distribuction
        if(bet.team === winner) {
            distribuction = await createTransaction({ 
                recipient: bet.player, 
                amount: Math.round((bet.amount/sumOfWinningBets)*totalPoolPrize), 
                privateKey: matchDB[match].wallet.privateKey
            })
            // console.log(userDB, bet.team, bet.player,(bet.amount/sumOfWinningBets)*totalPoolPrize )
        }
        return distribuction
    })
    //this function will not be necessary to be called in actual program
    let blockMined = await mineBlock();
    let finalBalance = await checkingAllBalances();
    console.log('final', finalBalance)
    

    return
}
