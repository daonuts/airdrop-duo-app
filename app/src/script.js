import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'

const app = new Aragon()
let account

app.store(
  async (state, {returnValues, event}) => {
    switch (event) {
      case 'ACCOUNTS_TRIGGER':
        account = returnValues.account
        return { ...state }
      case events.SYNC_STATUS_SYNCING:
        return { ...state, isSyncing: true }
      case events.SYNC_STATUS_SYNCED:
        return { ...state, isSyncing: false }
      case 'Start':
        let airdrop = await marshalAirdrop(parseInt(returnValues.id))
        return { ...state, rawAirdrops: [airdrop].concat(state.rawAirdrops || []) }
      case 'Award':
        const {id, recipient} = returnValues
        return { ...state }
      default:
        return state
    }
  },
  {
    init: async function(cachedState){
      return {
        rawAirdrops: [],
      ...cachedState
      }
    }
  }
)

async function marshalAirdrop(id) {
  let {root, dataURI} = await app.call('airdrops', id).toPromise()
  return { id, root, dataURI }
}
