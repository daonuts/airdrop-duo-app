import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, BackButton, Bar, Button, Card, CardLayout, Checkbox, DropDown, Field, GU, Header, IconSettings,
  Info, Main, Modal, Radio, RadioGroup, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import AwardsView from './AwardsView'
import BigNumber from 'bignumber.js'
import merklize from './merklize'
import ipfsClient from 'ipfs-http-client'
// import IpfsHttpClient from 'ipfs-http-client'
// const ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
import csv from 'csvtojson'
import { isValidAddress } from 'ethereumjs-util'

function NewAirdrop({onBack}) {
  const { api } = useAragonApi()
  const [files, setFiles] = useState()
  const [raw, setRaw] = useState()
  const [data, setData] = useState()
  const [hash, setHash] = useState()
  // const [ipfs, setIpfs] = useState()
  const [addressField, setAddressField] = useState()
  const [amount0Field, setAmount0Field] = useState()
  const [amount1Field, setAmount1Field] = useState()
  const form = React.createRef();

  // useEffect(()=>{
  //   let _ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  //   _ipfs.id((err,id)=>!err && setIpfs(_ipfs))
  // },[])

  useEffect(()=>{
    if(!files || !files.length) {
      setRaw()
      setData()
      setHash()
      if(form.current) form.current.reset()
      return
    }
    let reader = new FileReader()
    reader.onload = async (e)=>{
      let awards = await csv().fromString(e.target.result)
      setRaw(awards)
      if(awards[0]){
        let fields = Object.keys(awards[0])
        let amountFields = fields.filter(f=>{
          try {
            const entry = awards[0][f]
            if(entry.substr(0,2)=="0x") return false
            const num = new BigNumber(awards[0][f])
            return !num.isNaN()
          } catch(e) { return false }
        })
        // let amountFields = fields.filter(f=>!(new BigNumber(awards[0][f]).isNaN()))
        if(amountFields.length > 0){
          setAmount0Field( amountFields[0] )
          if(amountFields.length > 1)
            setAmount1Field( amountFields[1] )
          else
            setAmount1Field( amountFields[0] )
        }
        let addressField = fields.find(f=>isValidAddress(awards[0][f]))
        if(addressField)
          setAddressField( addressField )
      }
    }
    reader.readAsText(files[0])
  }, [files])

  useEffect(()=>{
    if(!raw || !addressField || !amount0Field || !amount1Field) return
    setData( merklize(raw, addressField, amount0Field, amount1Field, ["username"]) )
  }, [raw, addressField, amount0Field, amount1Field])

  useEffect(()=>{
    if(!data) return setHash()
    addToIPFS(data).then(setHash).catch(console.log)
  }, [data])

  const [changeFields, setChangeFields] = useState(false)
  const [viewData, setViewData] = useState(false)

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Header>Create a new airdrop</Header>
      {/*ipfs
        ? <Info style={{"marginBottom": "10px"}}>ipfs node found</Info>
        : <Info.Alert style={{"marginBottom": "10px"}}>no local ipfs node found! please run a local ipfs node with api running on port 5001 so the airdrop data can be pinned.</Info.Alert>
      */}
      <form ref={form} onSubmit={null}>
        <Field label="Load from csv:">
          <input type="file" onChange={(e)=>setFiles(e.target.files)} />
          {!!files && <Button onClick={()=>setFiles()}>Clear</Button>}
        </Field>
        {raw && raw[0] &&
        <Info style={{marginBottom: "10px"}}>
          {addressField ? `Address column: '${addressField}'` : `!No address column!`} <br/>
          {amount0Field ? `First amount column: '${amount0Field}'` : `!No amount column!`} <br/>
          {amount1Field !== amount0Field ? `Second amount column: '${amount1Field}'` : `No (optional) second amount column has been set. Both tokens will mint using '${amount0Field}'.`} <br/>
          <Button size="mini" onClick={()=>setChangeFields(true)}>Change</Button>
        </Info>}
        {raw && raw[0] && !addressField &&
        <Info.Alert style={{marginBottom: "10px"}}>
          No address column found, please choose the column that contains recipient addresses.
          <RadioGroup onChange={(field)=>setAddressField(field)} selected={addressField}>
            {Object.keys(raw[0]).map((field, i) => <label key={i}><Radio id={field} /> {field}</label>)}
          </RadioGroup>
        </Info.Alert>}
        {raw && raw[0] && changeFields &&
        <React.Fragment>
          <Field label="Address column:">
            <RadioGroup onChange={(field)=>setAddressField(field)} selected={addressField}>
              {Object.keys(raw[0]).map((field, i) => <label key={i}><Radio id={field} /> {field}</label>)}
            </RadioGroup>
          </Field>
          <Field label="First amount column:">
            <RadioGroup onChange={(field)=>setAmount0Field(field)} selected={amount0Field}>
              {Object.keys(raw[0]).map((field, i) => <label key={i}><Radio id={field} /> {field}</label>)}
            </RadioGroup>
          </Field>
          <Field label="Second amount column:">
            <RadioGroup onChange={(field)=>setAmount1Field(field)} selected={amount1Field}>
              {Object.keys(raw[0]).map((field, i) => <label key={i}><Radio id={field} /> {field}</label>)}
            </RadioGroup>
          </Field>
        </React.Fragment>}
      </form>
      {data && data.root && hash &&
      <React.Fragment>
        <Info style={{"marginBottom": "10px"}}>
          <p>View merklized data on <a target="_blank" href={`http://localhost:8080/ipfs/${hash}`}>local ipfs</a> or view on the <a target="_blank" href={`https://ipfs.eth.aragon.network/ipfs/${hash}`}>aragon ipfs node</a> (may need to propagate first).</p>
        </Info>
        <Field label="Download a backup of the merklized airdrop data:">
          <Button onClick={()=>download(data)}>Download</Button>
        </Field>
        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
          <Field>
            <Button onClick={()=>setViewData(true)}>View data</Button>
          </Field>
          <Field>
            <Button mode="strong" onClick={()=>api.start(data.root, `ipfs:${hash}`).toPromise()}>Submit</Button>
          </Field>
        </div>
      </React.Fragment>}
      {viewData && data && <AwardsView root={data.root} ipfsHash={hash} awards={data.awards} />}
      {data && !hash &&
      <React.Fragment>
      <Info style={{"marginBottom": "10px"}}>could not pin to ipfs</Info>
      <Field label="Optionally manually set hash:">
        <input type="input" onChange={(e)=>setHash(e.target.value)} />
      </Field>
      </React.Fragment>
      }
    </React.Fragment>
  )
}

async function download(data){
  const fileData = new Blob([JSON.stringify(data)], {
      type: "text/plain;charset=utf-8;",
  })
  if(window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(fileData, `airdrop_${new Date().toISOString().slice(0,10)}.json`);
  } else {
    var elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(fileData);
    elem.download = `airdrop_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}

async function addToIPFS(data){
  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let added = await ipfs.add(JSON.stringify(data))
  for await (const item of added) {
    console.log(item)
    return item && item.path ? item.path : null
  }
}

export default NewAirdrop
