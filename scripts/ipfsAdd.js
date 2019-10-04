const argv = require('yargs').argv
var ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient()

let path = `${__dirname}/../distributions/post/${argv.date}.json`
ipfs.addFromFs(path, (err,res)=>{
  if (err) { throw err }
  console.log(res)
  console.log(`Please propagate this hash on ipfs: ${res[0].hash}`)
})
