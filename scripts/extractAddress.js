const {ethers} = require("ethers")
const {Wallet} = ethers
const DEFAULT_MNEMONIC ='explain tackle mirror kit van hammer degree position ginger unfair soup bonus'

let wallet
for(let i=0;i<51;i++){
  wallet = Wallet.fromMnemonic(DEFAULT_MNEMONIC, `m/44'/60'/0'/0/${i}`)
  console.log(wallet.address)
}
