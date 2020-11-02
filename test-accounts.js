const Web3 = require('web3')
const web3 = new Web3('ws://127.0.0.1:7545')

const mnemonic =
  'palace vendor pole coach world negativcable skirt chronic pilot engine invest'
const owners = [
  "0x7c525D67BaF23D51727D4db3f470a37D29166D3D",
  "0xDB687Db3073C7302D0D4E2F2A77e868d6751C986",
  "0xeE0D20e4Aec7078ee79A3D11a4cC1d3c436943D7",
  "0xf0eBc3A8779FB5a39fBf5F7cC28533cc1F35Ba47",
  "0x853eBb70D633a5583242A78ec0cE59186537Bc75",
  "0x7d77d4475AB7915E5d2933E7d84bD39E69112cf4",
  "0x04c6CCD4537eE52d06e49b01B8D0374654c54931",
  "0x9224D81c3583C12b3f0bAaA3EEC60737477C3fD4",
  "0x09deE5e65E1dA950d8177C05034B7ef0035E9f13",
  "0x65aDc38eD73c89522c97ec058bbbA49090e9Ac97"
]
const keys = [
  '0xfa6969a5b375a47949be76d47cc29b6c384df5ace3ea48e1462eb6997d511169',
  '0x06c90fcbde7de68a02e0c63751cdc318587781f8da3aaf6cdacdfcd4820eb1dd',
  '0x23dc60d91e78820bac2661520f06807bf76a31e89c5f679146adf5c5ca1d6c80',
  '0xe317a291d2d4e4e9daa6b2436a1dc84ea6ddc22b9396c2d1034e4458ab4d9602',
  '0xc24c7c0d2923ffb47bdcc3a14d60f79f3950369bb6b1b3320fdd976889fa613a',
  '0x58c518bebebe4e1c3f0628df2b87343ce09c9027dc7e9c13aa1d64f586320f36',
  '0x7c91d0f2328c9dc238d74c45a17b1575e1267e51aacef9c1b93f7322976d8ebe',
  '0xc4f40115269fa57113e9574189deb7736e72eca4f6168569703f4923deec13f8',
  '0xfc22106c42775f441d7014756666345e537293ba599589ff5707ccac2bca282a',
  '0x69bb6e7ad1ea8a6ecc389887c7ede88a0be72e7c27abef5c343e0b12285c09d8'
]

const generateSigs = async (data = [], count = 2) => {
  const sigV = []
  const sigR = []
  const sigS = []

  // create three signatures
  // create a SHA3 hash of the message
  const messageHash = web3.utils.soliditySha3(...data)
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
