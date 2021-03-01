import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { AddressField, Button, Table, TableCell, TableHeader, TableRow, Text, theme } from '@aragon/ui'

function AwardsView({id, root, ipfsHash, awards}){
  const { api, connectedAccount } = useAragonApi()

  const [hasNameField, setHasNameField] = useState()
  useEffect(()=>{
    setHasNameField(!!awards[0] && !!awards[0].name)
  }, [awards])

  return (
    <React.Fragment>
      <Table>
        <TableRow>
          <TableCell>
            <Text><strong>id</strong></Text>
          </TableCell>
          <TableCell>
            <Text>{id}</Text>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Text><strong>merkle root</strong></Text>
          </TableCell>
          <TableCell>
            <Text>{root}</Text>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Text><strong>ipfs hash</strong></Text>
          </TableCell>
          <TableCell>
            <Text>{ipfsHash}</Text>
          </TableCell>
        </TableRow>
      </Table>
      <Table header={<TableRow><TableHeader title="Awards" /></TableRow>}>
        <TableRow>
          {hasNameField && <TableCell>
            <Text>Name</Text>
          </TableCell>}
          <TableCell>
            <Text>Address</Text>
          </TableCell>
          <TableCell>
            <Text>Amount</Text>
          </TableCell>
          <TableCell>
            <Text>Amount</Text>
          </TableCell>
          <TableCell>
          </TableCell>
        </TableRow>
        {awards.map((award,idx)=>(
          <TableRow key={idx}>
            {hasNameField && <TableCell><Text>{award.name}</Text></TableCell>}
            <TableCell><AddressField address={award.address} /></TableCell>
            <TableCell><Text>{award.amount0}</Text></TableCell>
            <TableCell><Text>{award.amount1}</Text></TableCell>
            <TableCell><Button size="mini" onClick={(e)=>{e.stopPropagation();api.award(id, award.address, award.amount0, award.amount1, award.proof).toPromise();}}>Award</Button></TableCell>
          </TableRow>
        ))}
      </Table>
    </React.Fragment>
  )
}

export default AwardsView
