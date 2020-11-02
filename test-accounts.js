const Web3 = require('web3')
const web3 = new Web3('ws://127.0.0.1:7545')

const mnemonic =
  'palace vendor pole coach world negativcable skirt chronic pilot engine invest'
const owners = [
  '0xF87224bFAbB3333e396C6cF22dC900BAEeB9c750',
  '0xA0Ad9eA76E594cFD902dE6D1EEcB1317aB294df5',
  '0xB95e948de90E861B2C3893acb08cE2Ae133449FF',
  '0x129632A26457186f0Ccc55c7735f7EC9A9E0f49a',
  '0x85b0311a28C2d43307b7E6a97B62a592EE81278f',
  '0x888008C079662Eefc9cBada0A2085a5Ccbe5B3fA',
  '0x57A388605497198d9B74ACF3C4dEE38Cdaf03644',
  '0xE1913002DdC709eD2Ff83605A03E352cD05b33C2',
  '0xd67fa539cD446cCAf54DF098CA6ea6A5462D3606',
  '0x8bcDEEb38d2B29C64f881C6143118Bad74207db3',
]
const keys = [
  '0x9b5b687ac19c3093cfbc0f654b663dd6f418198f9ad770b4372ca883199801c9',
  '0x9e5914b2b88748cfb7a0e0318a6b0ec9883a0d89cecb7632e7867298bcfa8eaa',
  '0x5e55360fce9272d5a4bc71b6cb068428441627eb0210efe32c2dee286e2ef74c',
  '0x890e2eadf869d19ec7c5f948702ff7c11adc6a1395537e996cf7754502aafd40',
  '0xec061a3070513ca4cb1094b96ca0ce34acb220919dfccc3f62bc7d1da949df9c',
  '0x2e52b1145ac94bba22215d3dc8110cdd6eeaa525714c9700cd0ce8912b88e888',
  '0xba766cca27e317bf5f56f2e4b35b818e47ccc0a330f766a517654993bd193414',
  '0x2afd39e334099561997394245e6b6c609eecafcd7fa32da598567f344b875bfa',
  '0x3eee86b30b0df707075c2dbda9ebc40dc2170410b81fdc890e0dd7594d4f2f4c',
  '0x2dc0c8872ac34e61e0abfb35f9711874c2919c12a4f0b4f3e1899a3615bd9521',
]

const generateSigs = async (nonce, _txIndex, count) => {
  const sigV = []
  const sigR = []
  const sigS = []

  // create three signatures
  // create a SHA3 hash of the message
  const messageHash = web3.utils.soliditySha3(nonce, _txIndex)
  // Signs the messageHash with a given account
  for (let index = 0; index < count; index++) {
    const sig = await web3.eth.accounts.sign(messageHash, keys[index])

    sigV.push(sig.v)
    sigR.push(sig.r)
    sigS.push(sig.s)
  }

  return {
    sigV,
    sigR,
    sigS
  }
}

module.exports = {
  owners,
  keys,
  generateSigs
}
