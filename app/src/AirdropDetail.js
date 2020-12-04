import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AddressField, AppBar, AppView, BackButton, Bar, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, SidePanel, Table, TableCell, TableHeader, TableRow, Text, TextInput, theme
} from '@aragon/ui'
import AwardsView from './AwardsView'
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"

function Airdrop({id, root, dataURI, data, awarded, userData, onBack}){
  const { api, connectedAccount } = useAragonApi()
  // const { id, root, dataURI, data, awarded, userData } = airdrop
  console.log(id, root, dataURI, data, awarded, userData)

  const [batchSize, setBatchSize] = useState(25)

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      {data &&
        <React.Fragment>
          <Field label="Batch size:">
            <TextInput.Number value={batchSize} onChange={(e)=>setBatchSize(e.target.value)} />
          </Field>
          <Field>
            <Button mode="strong" emphasis="positive" onClick={()=>awardToMany(api, id, data.awards, batchSize)}>Award Many</Button>
          </Field>
        </React.Fragment>}
      <section>
        {data && <AwardsView awards={data.awards} root={root} ipfsHash={dataURI.replace("ipfs:","")} />}
      </section>
    </React.Fragment>
  )
}

async function awardToMany(api, id, awards, batchSize){
  // filter first 50 that
  // 1. is registered
  // 2. last award is id-1
  // 3. above some value threshold?

  let idx = 0, recipients = [], amount0s = [], amount1s = [], proofLengths = [], proofs = "0x"
  while (recipients.length < batchSize && idx < awards.length){
    let award = awards[idx++]
    let awarded = await api.call('awarded', id, award.address).toPromise()
    console.log("here", awarded)
    if(awarded)
      continue

    recipients.push(award.address)
    amount0s.push(award.amount0)
    amount1s.push(award.amount1)
    proofs += award.proof.map(p=>p.slice(2)).join("")
    proofLengths.push(award.proof.length)
  }

  console.log(recipients.length)
  if(recipients.length)
    await api.awardToMany(id, recipients, amount0s, amount1s, proofs, proofLengths).toPromise()
}

export default Airdrop
