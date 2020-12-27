/*
A script that returns some filtered events from an Ethereum smart contract.
Your contract will require a solidity event and it will need to be triggered at least once before you run the script.
For an explanation of this code, navigate to the wiki https://github.com/ThatOtherZach/Web3-by-Example/wiki/Getting-Smart-Contract-Events
*/
// var Web3WsProvider = require('web3-providers-ws')
// const fetch = require('node-fetch')

const constants = require('./constants.js');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'client-pending',
  brokers: ['localhost:9092']
})
const producer = kafka.producer()


const InputDataDecoder = require('ethereum-input-data-decoder');
const uniswap_router_decoder = new InputDataDecoder("./abi/uniswap_router.json");
const uniswap_factory_decoder = new InputDataDecoder("./abi/uniswap_factory.json");
const unicrypt_decoder = new InputDataDecoder("./abi/unicrypt.json");

// var options = {
//   timeout: 30000, // ms

//   clientConfig: {
//     // Useful if requests are large
//     maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
//     maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

//     // Useful to keep a connection alive
//     keepalive: true,
//     keepaliveInterval: 60000 // ms
//   },

//   // Enable auto reconnection
//   reconnect: {
//     auto: true,
//     delay: 5000, // ms
//     maxAttempts: 5,
//     onTimeout: false
//   }
// }

// Add the web3 node module
const Web3 = require('web3')
// import { pkg1 } from 'web3';
// const { Web3 } = pkg1;
// Web3 = require('web3')
// const { Token } = require('@uniswap/sdk');
// import const { send } = require('./udp.js');

// Show web3 where it needs to look for the Ethereum node.
// var web3 = new Web3(
//   "wss://mainnet.infura.io/ws/v3/4bc4d92d09c644ffbd6b423df1f4e756"
// );
// var ws = new Web3WsProvider(
//   'wss://wispy-misty-moon.quiknode.pro/e464c6597f68433de53ed86b76672efcd03af428/',
//   options
// )
// var web3 = new Web3(ws)
var net = require('net');
// const { send } = require('process');
// import { pkg2 } from 'net';
// const { net } = pkg2;
var web3 = new Web3(new Web3.providers.IpcProvider("\\\\.\\pipe\\geth.ipc", net)); // mac os path
// on windows the path is: "\\\\.\\pipe\\geth.ipc"

// Fun console text, you can ignore this.
console.log('-----------------------------------')
console.log('Listening for pending tx')
console.log('-----------------------------------')

function listen () {
  web3.eth.subscribe('pendingTransactions', (error, result)=>{
    // console.log(result)
    web3.eth.getTransaction(result, (error2, result2)=>{
      if (result2){
        let r = {
          from: result2.from,
          to: result2.to,
          gas: result2.gas,
          gasPrice: result2.gasPrice,
          hash: result2.hash,
          value: result2.value,
          input: result2.input,
          timeStampDetected: Math.floor((new Date()).getTime() / 1000)
        }
        if (result2.to){
          if (result2.to.toLowerCase() == constants.uniswap.router.address.toLowerCase()){
            appendDecodedData(uniswap_router_decoder, result2.input, r)
            send('pending-uniswap-router',r.hash,r)
          } else if (result2.to.toLowerCase() == constants.uniswap.factory.address.toLowerCase()){
            appendDecodedData(uniswap_factory_decoder, result2.input, r)
            send('pending-uniswap-factory',r.hash,r)
          } else if (result2.to.toLowerCase() == constants.unicrypt.address.toLowerCase()){
            appendDecodedData(unicrypt_decoder, result2.input, r)
            send('pending-unicrypt',r.hash,r)
          } else {
            send('others',r.hash,r)
          }
        }
        sendString('gas',r.hash, r.gasPrice)

        
      }
    })
    
    
  });
}
function sendString(topic, key, r){
  // console.log("key: " , key, typeof key)
  producer.send({
    topic: topic,
    messages: [{key: key, value: r}]
  })
}
function send(topic, key, r){
  // console.log("key: " , key, typeof key)
  producer.send({
    topic: topic,
    messages: [{key: key, value: JSON.stringify(r)}]
  })
}
function appendDecodedData(decoder, data, r){
  try{

      let decoded = decoder.decodeData(data);
      if (decoded){
        r.method = decoded.method
        r.params = Object.assign({}, ...decoded.inputs.map((i, index) => ({
          [decoded.names[index]]: web3.utils.isBN(i) ? i.toString() : i
        })))
        delete r["input"]
    
      }
  } catch {
    pass
  }
}
  // contract.events
  //   .PairCreated({ fromBlock: fromBlock })
  //   .on('data', async log => {
  //     //   console.log(log);
  //     //   let blockNum = log.blockNumber;
  //     let { token0, token1, pair } = log.returnValues

  //     // var token0Info = await getTokenName(token0);
  //     // var token1Info = await getTokenName(token1);
  //     handleNewPair(token0, token1, pair)
  //     // console.log(`----BlockNumber (${blockNumber})----`);
  //     // console.log(`from = ${from}`);
  //     // console.log(`to = ${to}`);
  //     // console.log(`value = ${value}`);
  //     // console.log(`----BlockNumber (${blockNumber})----`);
  //   })
  //   .on('changed', log => {
  //     console.log(log)
  //   })
  //   .on('error', log => {
  //     console.error(log)
  //   })
// }

// const axios = require('axios')
// const cheerio = require('cheerio')
// const fetchData = async address => {
//   console.log('https://etherscan.io/token/' + address)
//   const result = await axios.get('https://etherscan.io/token/' + address)
//   let p = cheerio.load(result.data)
//   return p
// }

// async function getTokenName (address) {
//   if (memo[address]) {
//     return memo[address]
//   }

//   const $ = await fetchData(address)
//   const tokenDec = parseInt(
//     $('#ContentPlaceHolder1_trDecimals div.col-md-8')
//       .text()
//       .replace(/\s/g, '')
//   )
//   const tokenTicker0 = $('head title')
//     .text()
//     .replace(/\s/g, '')
//   const i = tokenTicker0.indexOf('(')
//   const j = tokenTicker0.indexOf(')')
//   const tokenName = tokenTicker0.substring(0, i)
//   const tokenTicker = tokenTicker0.substring(i + 1, j)

//   memo[address] = { address, tokenName, tokenDec, tokenTicker }
//   return memo[address]
// }

// async function handleNewPair (token0, token1, pair) {
//   // console.log(
//   //   `${token0.tokenTicker} -> ${token1.tokenTicker}, pair: ${pair}`
//   // );
//   // return;
//   //   console.log(token0);
//   //   console.log(token1);
//   let toBuy = null
//   if (
//     token0.toLowerCase() == basePair.toLowerCase() &&
//     token1.toLowerCase() != basePair.toLowerCase()
//   ) {
//     toBuy = token1
//   } else if (
//     token0.toLowerCase() != basePair.toLowerCase() &&
//     token1.toLowerCase() == basePair.toLowerCase()
//   ) {
//     toBuy = token0
//   } else {
//     // console.log("Only pairs with eth are considered.");
//     return
//   }

  // check on liquidity
  // var lp_contract = new web3.eth.Contract(constants.uniswap.lp.abi, pair);
  // lp_contract.functions.reserves = lp_contract.methods.getReserves().call()
  // reserves_in_eth = reserves[1-targetIndex]/10**18
  // reserves_in_target = reserves[targetIndex]/10**toBuy["tokenDec"]
  // console.log(`ETH: ${reserves_in_eth} : ${toBuy.symbol}: ${reserves_in_target}`)

  // let t = await fetch('http://localhost:5000/snipeRaw', {
  //   method: 'POST',
  //   body: JSON.stringify({ address: toBuy }),
  //   headers: { 'Content-Type': 'application/json' }
  // })
  // const text = await t.text()
  // console.log(
  //   `${token0.tokenTicker} -> ${token1.tokenTicker}, pair: ${pair}: ${text}`
  // )
// }
producer.connect().then((r) => {
  console.log("Producer connected.")
  listen()
})
