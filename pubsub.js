
// const PubNub = require('pubnub');

// const credentials = {
//     publishKey: 'pub-c-8ab494f9-6271-42a9-9ade-44941a964960',
//     subscribeKey: 'sub-c-ec5a04e2-117f-11ea-96f1-ea5a03b00545',
//     secretKey: 'sec-c-NzFkM2U1NTktN2M0NS00ZTUxLWE1MjktZDMwZGJlOTgzNTI1'
// };

// const CHANNELS = {
//     TEST: 'TEST',
// }

// class PubSub {
//     constructor() {
//         this.pubnub = new PubNub(credentials);
    
//         this.pubnub.subscribe({ channels: Object.values(CHANNELS) });
    
//         this.pubnub.addListener(this.listener());
//     }

//     listener() {
//         return {
//             message: messageObject => {
//                 const { channel, message } = messageObject;
        
//                 console.log(`Message received. Channel: ${channel}. Message: ${message}`);
//             }   
//         }
//     };


//     publish({ channel, message }) {
//         this.pubnub.publish({ channel, message });
//     }
// }

// module.exports = PubNub;



// ------------------ USING REDIS -----------------------------------
const redis = require('redis');

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
};

class PubSub {
    constructor({ blockchain, transactionPool, redisUrl }) {
        this.blockchain = blockchain;

        this.publisher = redis.createClient(redisUrl);
        this.subscriber = redis.createClient(redisUrl);

        this.subscriberToChannels()

        this.subscriber.on('message', 
            (channel, message) => this.handleMessage(channel, message)
        );
    }

    handleMessage(channel, message) {
        console.log(`Message received. Channel: ${channel}. Message ${message}`);

        const parsedMessage = JSON.parse(message);   
        
        if(channel = CHANNELS.BLOCKCHAIN) {
            this.blockchain.replaceChain(parsedMessage);
        }
    }

    subscriberToChannels() {
        Object.values(CHANNELS).forEach((channel) => {
            this.subscriber.subscribe(channel);
        });
    }

    publish({ channel, message }) {
        this.subscriber.unsubscribe(channel, () => {
            this.publisher.publish(channel, message, () => {
                this.subscriber.subscribe(channel);
            })
        });
        this.publisher.publish(channel, message);
    }

    broadcastChain() {
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }
}

module.exports = PubSub;