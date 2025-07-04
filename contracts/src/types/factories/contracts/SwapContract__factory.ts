/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  SwapContract,
  SwapContractInterface,
} from "../../contracts/SwapContract";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "neededRole",
        type: "bytes32",
      },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "EnforcedPause",
    type: "error",
  },
  {
    inputs: [],
    name: "ExpectedPause",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientDeposit",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientOutput",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSlippage",
    type: "error",
  },
  {
    inputs: [],
    name: "OracleCallFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    inputs: [],
    name: "SwapExecutionFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "TokenContractNotSet",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAmount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "fromToken",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "targetToken",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "inputAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "outputAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "executionPrice",
        type: "uint256",
      },
    ],
    name: "SwapExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "fromToken",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "targetToken",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "inputAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "SwapFailed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "EXECUTOR_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_SLIPPAGE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "rawPrice",
        type: "uint64",
      },
      {
        internalType: "uint8",
        name: "assetDecimals",
        type: "uint8",
      },
    ],
    name: "convertOraclePrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "fromToken",
        type: "uint64",
      },
      {
        internalType: "uint64",
        name: "targetToken",
        type: "uint64",
      },
      {
        internalType: "uint256",
        name: "inputAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "minOutputAmount",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "fromOracleIndex",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "targetOracleIndex",
        type: "uint32",
      },
    ],
    name: "executeSwap",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "tokenId",
        type: "uint64",
      },
    ],
    name: "getContractSpotBalance",
    outputs: [
      {
        internalType: "uint64",
        name: "total",
        type: "uint64",
      },
      {
        internalType: "uint64",
        name: "hold",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "oracleIndex",
        type: "uint32",
      },
    ],
    name: "getOraclePrice",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "tokenId",
        type: "uint64",
      },
    ],
    name: "getSystemAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasRole",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "callerConfirmation",
        type: "address",
      },
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "setSwapFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "tokenId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "setTokenContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "swapFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    name: "tokenContracts",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60806040523461003b576001805566038d7ea4c6800060035561002133610040565b5061002b336100be565b50604051611046908161015f8239f35b600080fd5b6001600160a01b031660008181527fad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5602052604081205490919060ff166100ba57818052816020526040822081835260205260408220600160ff1982541617905533916000805160206111a58339815191528180a4600190565b5090565b6001600160a01b031660008181527fdae2aa361dfd1ca020a396615627d436107c35eff9fe7738a3512819782d706960205260408120549091907fd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e639060ff1661015957808352826020526040832082845260205260408320600160ff198254161790556000805160206111a5833981519152339380a4600190565b50509056fe608060408181526004918236101561001657600080fd5b600092833560e01c91826301ffc9a714610ad45750816307bd026514610a99578163248a9ca314610a6f5781632af78bd114610a305781632f2ff15d14610a0657816334e19907146109e457816336568abe1461099e5781633f4ba83a14610934578163476343ee146108ee57816354cf2aeb146108cf5781635c975abb146108ab578163721883fe1461086a5781638456cb591461080f57816391d14854146107c9578163a217fddf146107ae578163a2f8296014610314578163a7ba07c9146102b7578163cd516076146101ec578163d547741f146101a957508063eae5cc9b1461016b578063ecf7ab06146101355763f97595181461011757600080fd5b346101315781600319360112610131576020905160328152f35b5080fd5b50346101315760203660031901126101315760209061015a610155610b42565b610ea5565b90516001600160a01b039091168152f35b5034610131578060031936011261013157610184610b42565b6024359260ff841684036101a6575060209261019f91610e4a565b9051908152f35b80fd5b919050346101e857806003193601126101e8576101e491356101df60016101ce610b27565b938387528660205286200154610bb0565b610c54565b5080f35b8280fd5b905082346101a65760203660031901126101a657610208610b42565b835130602082019081526001600160401b03928316828701528582529192919060608101848111828210176102a45786525182918291906108015afa9261024d610d02565b931561029657506060838051810103126101a6575061026e60208301610d41565b91610286606061027f868401610d41565b9201610d41565b5081845193168352166020820152f35b8451638390524960e01b8152fd5b634e487b7160e01b845260418652602484fd5b919050346101e857806003193601126101e8576102d2610b42565b916102db610b27565b926102e4610b58565b6001600160401b03168452602052822080546001600160a01b0319166001600160a01b0390921691909117905580f35b905060c03660031901126101e85761032a610b42565b6001600160401b0392909160243584811692908381036107aa57604435926084359163ffffffff9687841684036107a65760a43597881688036107a65760019860028a54146107965760028a5561037f610eee565b86156107865780821698888a1461077657896106b65760035488018089116106a357340361069357918997969593918c95935b6103bb86610d55565b95856103d86103d26103cc85610d55565b99610e26565b98610e26565b988b6103ed8b6103e88c84610df3565b610e06565b9d8c6103f889610ea5565b91806105ff5750929350839250829182916001600160a01b031682f1156105f35761042c6104268492610d55565b92610d55565b911690606e820291808304606e14901517156105e0578216906064820291808304606414901517156105e057829161046391610e06565b16908751918d60208401528b898401528d6060840152608083015280891660a08301528d60c08301528d60e0830152610100814216818401528252610120820190828210908211176105cd578d918183928a526104eb6101408301926317938e1360e01b84526104d7816101448101610f0c565b0361013f198101835261011f190182610cc9565b5190827333333333333333333333333333333333333333335af161050d610d02565b50156105bd5760643588106105a35750866105289133610f55565b670de0b6b3a76400009182810292818404149015171561059057509061054d91610e06565b9381519586526020860152840152606083015260808201527f02cd1bc2f5c6b6878d5e9654a56f4ca5755e4a910437dc5a733fba8109b1a7da60a03392a2805580f35b634e487b7160e01b8a5260119052602489fd5b856105b088859333610f55565b5163bb2875c360e01b8152fd5b855163382a82a760e11b81528390fd5b634e487b7160e01b8e526041855260248efd5b634e487b7160e01b8f526011865260248ffd5b8e8951903d90823e3d90fd5b8452602085815281852054915163a9059cbb60e01b81526001600160a01b0393841696810196909652602486019390935291928492604492849291165af1801561068657849261042c9261042692610658575b50610d55565b6106789060203d811161067f575b6106708183610cc9565b810190610ed6565b5038610652565b503d610666565b508f8a51903d90823e3d90fd5b865163070f6eed60e11b81528590fd5b634e487b7160e01b8d526011865260248dfd5b99989796959493929190600354341061076657888c526020849052858c20546001600160a01b03169a8b1561075657908c9594939291868851809e6323b872dd60e01b825233888301523060248301528b6044830152815a93606492602095f19c8d1561074c578b9c9d9b9a9b61072e575b506103b2565b6107459060203d811161067f576106708183610cc9565b5038610728565b88513d89823e3d90fd5b8651634c32eccd60e11b81528590fd5b855163070f6eed60e11b81528490fd5b865163334ee9a160e01b81528590fd5b8551631f2a200560e01b81528490fd5b8551633ee5aeb560e01b81528490fd5b8980fd5b8680fd5b50503461013157816003193601126101315751908152602090f35b9050346101e857816003193601126101e8578160209360ff926107ea610b27565b903582528186528282206001600160a01b039091168252855220549151911615158152f35b50503461013157816003193601126101315760207f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2589161084d610b58565b610855610eee565b600160ff19600254161760025551338152a180f35b9050346101e85760203660031901126101e857602092906001600160401b03610891610b42565b16825283528190205490516001600160a01b039091168152f35b50503461013157816003193601126101315760209060ff6002541690519015158152f35b5050346101315781600319360112610131576020906003549051908152f35b505034610131578160031936011261013157610908610b58565b818080804781811561092b575b3390f115610921575080f35b51903d90823e3d90fd5b506108fc610915565b9050346101e857826003193601126101e85761094e610b58565b6002549060ff821615610990575060ff1916600255513381527f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa90602090a180f35b8251638dfc202b60e01b8152fd5b8383346101315780600319360112610131576109b8610b27565b90336001600160a01b038316036109d557506101e4919235610c54565b5163334bd91960e11b81528390fd5b839034610131576020366003190112610131576109ff610b58565b3560035580f35b919050346101e857806003193601126101e8576101e49135610a2b60016101ce610b27565b610bd6565b9050346101e85760203660031901126101e857359163ffffffff831683036101a65750610a5e602092610d55565b90516001600160401b039091168152f35b9050346101e85760203660031901126101e857816020936001923581528085522001549051908152f35b505034610131578160031936011261013157602090517fd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e638152f35b8491346101e85760203660031901126101e8573563ffffffff60e01b81168091036101e85760209250637965db0b60e01b8114908115610b16575b5015158152f35b6301ffc9a760e01b14905083610b0f565b602435906001600160a01b0382168203610b3d57565b600080fd5b600435906001600160401b0382168203610b3d57565b3360009081527fad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5602052604081205460ff1615610b925750565b6044906040519063e2517d3f60e01b82523360048301526024820152fd5b80600052600060205260406000203360005260205260ff6040600020541615610b925750565b9060009180835282602052604083209160018060a01b03169182845260205260ff60408420541615600014610c4f57808352826020526040832082845260205260408320600160ff198254161790557f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d339380a4600190565b505090565b9060009180835282602052604083209160018060a01b03169182845260205260ff604084205416600014610c4f5780835282602052604083208284526020526040832060ff1981541690557ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b339380a4600190565b601f909101601f19168101906001600160401b03821190821017610cec57604052565b634e487b7160e01b600052604160045260246000fd5b3d15610d3c573d906001600160401b038211610cec5760405191610d30601f8201601f191660200184610cc9565b82523d6000602084013e565b606090565b51906001600160401b0382168203610b3d57565b6040805163ffffffff90921660208084019182528352908201906001600160401b03821183831017610cec57600092839260405251906108075afa610d98610d02565b9015610dba57602081805181010312610b3d576020610db79101610d41565b90565b604051638390524960e01b8152600490fd5b60ff16604d8111610ddd57600a0a90565b634e487b7160e01b600052601160045260246000fd5b81810292918115918404141715610ddd57565b8115610e10570490565b634e487b7160e01b600052601260045260246000fd5b6001600160401b031664e8d4a510008181029180830490911490151715610ddd5790565b9060ff1660128110610e7e57601119019060ff8211610ddd57610e6f610db792610dcc565b906001600160401b0316610e06565b6012039060ff8211610ddd57610e96610db792610dcc565b906001600160401b0316610df3565b6001600160401b03168015610ebd576001609d1b1790565b5073222222222222222222222222222222222222222290565b90816020910312610b3d57518015158103610b3d5790565b60ff60025416610efa57565b60405163d93c066560e01b8152600490fd5b6020808252825181830181905290939260005b828110610f4157505060409293506000838284010152601f8019910116010190565b818101860151848201604001528501610f1f565b60408051600660208201526001600160a01b03909216908201526001600160401b03918216606082015260808082019390935291825260a0820190811182821017610cec57600091818392604052610fd460c08301926317938e1360e01b8452610fc28160c48101610f0c565b0360bf1981018352609f190182610cc9565b5190827333333333333333333333333333333333333333335af1610ff6610d02565b5015610ffe57565b60405163382a82a760e11b8152600490fdfea2646970667358221220e933096f3c1c881383677b10c8f8203e9ec3e5ee2266f0f0d2148aaca2ae19e464736f6c634300081400332f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d";

type SwapContractConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SwapContractConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SwapContract__factory extends ContractFactory {
  constructor(...args: SwapContractConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      SwapContract & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): SwapContract__factory {
    return super.connect(runner) as SwapContract__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SwapContractInterface {
    return new Interface(_abi) as SwapContractInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): SwapContract {
    return new Contract(address, _abi, runner) as unknown as SwapContract;
  }
}
