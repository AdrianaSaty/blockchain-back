const MINE_RATE = 1000; //its 1 second
const INICIAL_DIFFICULTY = 3;

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: '-----',
  hash: 'hash-one',
  difficulty: INICIAL_DIFFICULTY,
  nonce: 0,
  data: [],
};

module.exports = { GENESIS_DATA, MINE_RATE };
