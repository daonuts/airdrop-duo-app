import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { AppBar, AppView, Button, Checkbox, Field, Info, Main, SidePanel, Text, TextInput, theme } from '@aragon/ui'
import { Grid, Card, Content, Label } from './components'
import csv from 'csvtojson'
import merklize from './merklize'
import ipfsClient from 'ipfs-http-client'
import { ethers } from 'ethers';

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"

function App() {
  const { api, network, appState, connectedAccount } = useAragonApi()
  const { count, airdrops = [], syncing } = appState

  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState({})

  return (
    <Main>
      <AppView appBar={<AppBar title="Airdrop" endContent={<Button mode="strong" onClick={()=>setPanelOpen(true)}>New airdrop</Button>} />} >
        <h1>{connectedAccount}</h1>
        <Text size="xlarge">Airdrops:</Text>
        <Field>
          <Button disabled={Object.values(selected).length == 0} mode="strong" emphasis="positive" onClick={()=>{let args=Object.values(selected); api.awardFromMany(args.map(a=>a.id), username, args.map(a=>a.amount0), args.map(a=>a.amount1), "0x"+args.map(a=>a.proof.map(p=>p.slice(2)).join("")).join(""), args.map(a=>a.proof.length))}}>Claim multiple</Button>
        </Field>
        <Grid>{airdrops.map((d, i)=><Airdrop {...d} key={d.id} selected={!!selected[d.id]} onSelect={(state, args)=>{if(state) selected[d.id]=args; else delete selected[d.id]; setSelected({...selected})}} />)}</Grid>
        <Merklize />
      </AppView>
      <SidePanel title={"New Airdrop"} opened={panelOpen} onClose={()=>setPanelOpen(false)}>
        <Merklize />
      </SidePanel>
    </Main>
  )
}

function Merklize() {
  const [file, setFile] = useState()
  const [data, setData] = useState()

  useEffect(()=>{
    console.log("file", file)
    if(file){
      let reader = new FileReader()
      reader.onload = async (e)=>{
        let recipients = await csv().fromString(e.target.result)
        let merklized = merklize(recipients, ["points", "points"])
        setData(merklized)
      }
      reader.readAsText(file)
    } else {
      console.log("no file")
      console.log("data", data)
      setData()
    }
  }, [file])

  return (
    <Field label="Load distribution csv:">
      <input type="file" onChange={(e)=>{e.target.files && e.target.files.length && setFile(e.target.files[0])}} />
      <ValidationData data={data} />
      <Button onClick={()=>setFile()}>Clear</Button>
    </Field>
  )
}

function ValidationData({data}){
  const { api } = useAragonApi()

  const [hash, setHash] = useState()
  useEffect(()=>{
    if(!data) {
      setHash()
      return
    }
    (async function(){
      console.log("YO")
      let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
      let res = await ipfs.add(Buffer.from(JSON.stringify(data), 'utf8'))
      if(!res) return
      let hash = res[0].hash
      setHash(hash)
      await api.start(data.root, `ipfs:${hash}`).toPromise()
    })()
  }, [data])

  return (
    <React.Fragment>
      {data &&
        (hash ?
          <p>You're data with merkle root ({data.root}) and ipfs hash ({hash}) has been added to ipfs but may need to propagate through the network if it doesn't already appear <a href={`https://ipfs.eth.aragon.network/ipfs/${hash}`} target="_blank">here</a>.</p> :
          <p>no ipfs hash generated. missing local ipfs node?</p>
        )
      }
    </React.Fragment>
  )
}

function Airdrop({id, dataURI, root, selected, onSelect}) {
  const { api, connectedAccount } = useAragonApi()

  const [data, setData] = useState()
  useEffect(()=>{
    let ipfsGateway = location.hostname === 'localhost' ? 'http://localhost:8080/ipfs' : 'https://ipfs.eth.aragon.network/ipfs'
    fetch(`${ipfsGateway}/${dataURI.split(':')[1]}`)
      .then(r=>r.json())
      .then(setData)
  }, [dataURI])

  const [awarded, setAwarded] = useState()
  const [userData, setUserData] = useState()
  useEffect(()=>{
    connectedAccount ? api.call('awarded', id, connectedAccount).toPromise().then(setAwarded) : setAwarded()

    data && Array.isArray(data.recipients) && setUserData(data.recipients.find(d=>d.address===connectedAccount))
  }, [data, connectedAccount])

  return (
    <Card>
      <Content>
        <Label>
          <Text color={theme.textTertiary}>#{id} </Text>
        </Label>
        {!data &&
          <Info.Alert style={{"margin-bottom": "10px"}}>Retrieving airdrop data...</Info.Alert>
        }
        {data && !userData &&
          <Info.Alert style={{"margin-bottom": "10px"}}>Nothing to claim</Info.Alert>
        }
        {awarded &&
          <Info style={{"margin-bottom": "10px"}}>You were awarded</Info>
        }
        {!awarded && userData &&
          <React.Fragment>
            <Info.Action style={{"margin-bottom": "10px"}}>You can claim <br/>{web3.toBigNumber(userData.amount0).div("1e+18").toFixed()} (token0) <br/>{web3.toBigNumber(userData.amount1).div("1e+18").toFixed()} (token1)</Info.Action>
            <Checkbox checked={selected} onChange={(state)=>onSelect(state, {id, amount0: web3.toBigNumber(userData.amount0).toFixed(), amount1: web3.toBigNumber(userData.amount1).toFixed(), proof: userData.proof})} />
            <Field>
              <Button mode="strong" emphasis="positive" onClick={()=>api.award(id, connectedAccount, web3.toBigNumber(userData.amount0).toFixed(), web3.toBigNumber(userData.amount1).toFixed(), userData.proof).toPromise()}>Claim</Button>
            </Field>
          </React.Fragment>
        }
        {data &&
          <Field>
            <Button mode="strong" emphasis="positive" onClick={()=>awardMany(api, id, data)}>Award Many</Button>
          </Field>
        }
        <Text>{dataURI}</Text>
      </Content>
    </Card>
  )
}

async function awardMany(api, id, data){
  // filter first 50 that
  // 1. is registered
  // 2. last claim is id-1
  // 3. above some value threshold?

  let idx = 0, recipients = [], token0Awards = [], token1Awards = [], proofLengths = [], proofs = "0x"
  while (recipients.length < 50 && idx < data.recipients.length){
    let claim = data.recipients[idx]
    let address = claim.address
    if(!address || address === NULL_ADDRESS)
      continue
    let awarded = await api.call('awarded', id, address).toPromise()
    if(awarded)
      continue

    recipients.push(claim.address)
    token0Awards.push(web3.toBigNumber(claim.amount0).toFixed())
    token1Awards.push(web3.toBigNumber(claim.amount1).toFixed())
    proofs += claim.proof.map(p=>p.slice(2)).join("")
    proofLengths.push(claim.proof.length)
    idx++
  }

  console.log(recipients.length)

  await api.awardToMany(id, recipients, token0Awards, token1Awards, proofs, proofLengths).toPromise()
}

export default App
