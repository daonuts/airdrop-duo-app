import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconArrowRight,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'

function ClaimAll({airdrops, style}){
  const { api, connectedAccount } = useAragonApi()

  return (
    <Button style={style} onClick={()=>{claim(api, connectedAccount, airdrops)}}>Claim All</Button>
  )
}

async function claim(api, account, airdrops){
  console.log(await api.currentApp().toPromise())
  const maxBatchSize = 50
  let idx = 0, ids = [], amount0s = [], amount1s = [], proofLengths = [], proofs = "0x"
  while (ids.length < maxBatchSize && idx < airdrops.length){
    let airdrop = airdrops[idx++]
    let award = airdrop.userData
    ids.push(airdrop.id)
    amount0s.push(award.amount0)
    amount1s.push(award.amount1)
    proofs += award.proof.map(p=>p.slice(2)).join("")
    proofLengths.push(award.proof.length)
  }
  await api.awardFromMany(ids, account, amount0s, amount1s, proofs, proofLengths).toPromise()
}

export default ClaimAll
