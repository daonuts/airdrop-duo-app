package main

import (
    "fmt"
    "log"
    "context"
    "math/big"

    "github.com/ethereum/go-ethereum"
    "github.com/ethereum/go-ethereum/common"
    "github.com/ethereum/go-ethereum/ethclient"
    "github.com/ethereum/go-ethereum/core/types"
)

func main() {
    client, err := ethclient.Dial("wss://rinkeby.infura.io/ws")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("we have a connection")

    contractAddress := common.HexToAddress("0xaeD9331Ac137932548BBc1B7Eae49340eB7d096C")
    query := ethereum.FilterQuery{
        FromBlock: big.NewInt(0),
        Addresses: []common.Address{contractAddress},
    }

    logs := make(chan types.Log)
    sub, err := client.SubscribeFilterLogs(context.Background(), query, logs)
    if err != nil {
        log.Fatal(err)
    }

    for {
        select {
        case err := <-sub.Err():
            log.Fatal(err)
        case vLog := <-logs:
            fmt.Println(vLog) // pointer to event log
        }
    }
}
