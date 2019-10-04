const merklize = require("../app/src/merklize")
const csv = require('csvtojson')

async function main(){
  let data = await csv().fromFile(`${__dirname}/test_data.csv`)
  console.log(merklize(data, ["points", "points"]))
}

main()
