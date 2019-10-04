const MerkleTree = require("merkle-tree-solidity").default
const utils = require("ethereumjs-util")
const setLengthLeft = utils.setLengthLeft
const setLengthRight = utils.setLengthRight
const csv = require('csvtojson')
const BigNumber = require('bignumber.js')

const decimals = BigNumber(10).pow(18)

module.exports = function(data, amountFields) {
  if(amountFields.length !== 2) throw new Error("missing 2 field names in amountFields")
  const recipients = data.filter(r=>!!r.address).reduce((prev, curr)=>{
    let address = curr.address
    let existing = prev.find(u=>u.address===address)
    let amount0 = BigNumber(curr[amountFields[0]])
    let amount1 = BigNumber(curr[amountFields[1]])
    if(existing) {
      existing.amount0 = existing.amount0 ? existing.amount0.plus(amount0) : amount0
      existing.amount1 = existing.amount1 ? existing.amount1.plus(amount1) : amount1
    } else prev.push({address, amount0, amount1})
    return prev
  }, [])

  const recipientHashBuffers = recipients.map(r=>{
    r.amount0 = r.amount0.times(decimals)
    r.amount1 = r.amount1.times(decimals)
    let addressBuffer = utils.toBuffer(r.address)
    let amount0Buffer = setLengthLeft(utils.toBuffer("0x"+r.amount0.toString(16)), 32)
    let amount1Buffer = setLengthLeft(utils.toBuffer("0x"+r.amount1.toString(16)), 32)
    let hashBuffer = utils.keccak256(Buffer.concat([addressBuffer, amount0Buffer, amount1Buffer]))
    let hash = utils.bufferToHex(hashBuffer)
    r.amount0 = r.amount0.toFixed()
    r.amount1 = r.amount1.toFixed()

    return hashBuffer
  })

  const merkleTree = new MerkleTree(recipientHashBuffers)

  const root = utils.bufferToHex(merkleTree.getRoot())

  recipients.forEach((recipient,idx)=>{
    recipient.proof = merkleTree.getProof(recipientHashBuffers[idx]).map(p=>utils.bufferToHex(p))
    return recipient
  })

  console.log(`root:`, root)

  return {root, recipients}
}
