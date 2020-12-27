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

// Add the web3 node module
const Web3 = require('web3')
var net = require('net');

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
producer.connect().then((r) => {
  console.log("Producer connected.")
  listen()
})
