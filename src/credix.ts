export type Credix = {
  "version": "0.1.0",
  "name": "credix",
  "instructions": [
    {
      "name": "initializeMarket",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatekeeperNetwork",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "treasuryPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lpTokenMintAccount",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "signingAuthorityBump",
          "type": "u8"
        },
        {
          "name": "globalMarketStateBump",
          "type": "u8"
        },
        {
          "name": "globalMarketSeed",
          "type": "string"
        },
        {
          "name": "interestFee",
          "type": {
            "defined": "Ratio"
          }
        },
        {
          "name": "withdrawalFee",
          "type": {
            "defined": "Ratio"
          }
        }
      ]
    },
    {
      "name": "depositFunds",
      "accounts": [
        {
          "name": "investor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "investorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lpTokenMintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "investorLpTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createDeal",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "borrower",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "borrowerInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dealBump",
          "type": "u8"
        },
        {
          "name": "borrowerInfoBump",
          "type": "u8"
        },
        {
          "name": "principal",
          "type": "u64"
        },
        {
          "name": "financingFeePercentage",
          "type": {
            "defined": "Ratio"
          }
        },
        {
          "name": "leverageRatio",
          "type": "u8"
        },
        {
          "name": "underwriterPerformanceFeePercentage",
          "type": {
            "defined": "Ratio"
          }
        },
        {
          "name": "timeToMaturityDays",
          "type": "u16"
        },
        {
          "name": "dealName",
          "type": "string"
        }
      ]
    },
    {
      "name": "activateDeal",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "borrower",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "borrowerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "makeDealRepayment",
      "accounts": [
        {
          "name": "borrower",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "borrowerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "deal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "repaymentType",
          "type": {
            "defined": "DealRepaymentType"
          }
        }
      ]
    },
    {
      "name": "withdrawFunds",
      "accounts": [
        {
          "name": "investor",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "investorLpTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "investorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lpTokenMintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "usdcWithdrawalAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createCredixPass",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "passHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "passBump",
          "type": "u8"
        },
        {
          "name": "isUnderwriter",
          "type": "bool"
        },
        {
          "name": "isBorrower",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateCredixPass",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "passHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "isActive",
          "type": "bool"
        },
        {
          "name": "isUnderwriter",
          "type": "bool"
        },
        {
          "name": "isBorrower",
          "type": "bool"
        }
      ]
    },
    {
      "name": "freezeGlobalMarketState",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "thawGlobalMarketState",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "BorrowerInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numOfDeals",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Deal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "borrower",
            "type": "publicKey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "financingFeePercentage",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "principalAmountRepaid",
            "type": "u64"
          },
          {
            "name": "interestAmountRepaid",
            "type": "u64"
          },
          {
            "name": "timeToMaturityDays",
            "type": "u16"
          },
          {
            "name": "goLiveAt",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "leverageRatio",
            "type": "u8"
          },
          {
            "name": "underwriterPerformanceFeePercentage",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "dealNumber",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lateFees",
            "type": "u64"
          },
          {
            "name": "lateFeesRepaid",
            "type": "u64"
          },
          {
            "name": "private",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "GlobalMarketState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gatekeeperNetwork",
            "type": "publicKey"
          },
          {
            "name": "liquidityPoolTokenMintAccount",
            "type": "publicKey"
          },
          {
            "name": "lpTokenMintAccount",
            "type": "publicKey"
          },
          {
            "name": "totalOutstandingCredit",
            "type": "u64"
          },
          {
            "name": "treasuryPoolTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "signingAuthorityBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "interestFee",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "withrawalFee",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "frozen",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "CredixPass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "isBorrower",
            "type": "bool"
          },
          {
            "name": "isUnderwriter",
            "type": "bool"
          },
          {
            "name": "active",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Ratio",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numerator",
            "type": "u32"
          },
          {
            "name": "denominator",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "DealRepaymentType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Interest"
          },
          {
            "name": "Principal"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidPrincipalAmount",
      "msg": "This amount is not sufficient as a principal amount."
    },
    {
      "code": 6001,
      "name": "InvalidInterestAmount",
      "msg": "This amount is not sufficient as an interest amount."
    },
    {
      "code": 6002,
      "name": "DealNotLive",
      "msg": "This deal is not live yet."
    },
    {
      "code": 6003,
      "name": "InvalidDealRepaymentType",
      "msg": "Invalid deal repayment type."
    },
    {
      "code": 6004,
      "name": "NotEnoughLiquidity",
      "msg": "Not enough liquidity."
    },
    {
      "code": 6005,
      "name": "PrincipalRepaid",
      "msg": "Principal is already repaid."
    },
    {
      "code": 6006,
      "name": "InterestRepaid",
      "msg": "Interest is already repaid."
    },
    {
      "code": 6007,
      "name": "UnauthorizedSigner",
      "msg": "The Signer is not authorized to use this instruction."
    },
    {
      "code": 6008,
      "name": "CredixPassInvalid",
      "msg": "Credix pass is invalid for this request."
    },
    {
      "code": 6009,
      "name": "CredixPassInactive",
      "msg": "Credix pass is inactive at the moment."
    },
    {
      "code": 6010,
      "name": "Overflow",
      "msg": "Overflow occured."
    },
    {
      "code": 6011,
      "name": "Underflow",
      "msg": "Underflow occured."
    },
    {
      "code": 6012,
      "name": "ZeroDivision",
      "msg": "Tried to divide by zero."
    },
    {
      "code": 6013,
      "name": "ZeroDenominator",
      "msg": "Invalid Ratio: denominator can't be zero."
    },
    {
      "code": 6014,
      "name": "InvalidPreciseNumber",
      "msg": "Invalid u64 used as value for PreciseNumber."
    },
    {
      "code": 6015,
      "name": "PreciseNumberCastFailed",
      "msg": "Unable to cast PreciseNumber to u64"
    }
  ]
};

export const IDL: Credix = {
  "version": "0.1.0",
  "name": "credix",
  "instructions": [
    {
      "name": "initializeMarket",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatekeeperNetwork",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "treasuryPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lpTokenMintAccount",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "signingAuthorityBump",
          "type": "u8"
        },
        {
          "name": "globalMarketStateBump",
          "type": "u8"
        },
        {
          "name": "globalMarketSeed",
          "type": "string"
        },
        {
          "name": "interestFee",
          "type": {
            "defined": "Ratio"
          }
        },
        {
          "name": "withdrawalFee",
          "type": {
            "defined": "Ratio"
          }
        }
      ]
    },
    {
      "name": "depositFunds",
      "accounts": [
        {
          "name": "investor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "investorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lpTokenMintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "investorLpTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createDeal",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "borrower",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "borrowerInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dealBump",
          "type": "u8"
        },
        {
          "name": "borrowerInfoBump",
          "type": "u8"
        },
        {
          "name": "principal",
          "type": "u64"
        },
        {
          "name": "financingFeePercentage",
          "type": {
            "defined": "Ratio"
          }
        },
        {
          "name": "leverageRatio",
          "type": "u8"
        },
        {
          "name": "underwriterPerformanceFeePercentage",
          "type": {
            "defined": "Ratio"
          }
        },
        {
          "name": "timeToMaturityDays",
          "type": "u16"
        },
        {
          "name": "dealName",
          "type": "string"
        }
      ]
    },
    {
      "name": "activateDeal",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "borrower",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "borrowerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "makeDealRepayment",
      "accounts": [
        {
          "name": "borrower",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "borrowerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "deal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "repaymentType",
          "type": {
            "defined": "DealRepaymentType"
          }
        }
      ]
    },
    {
      "name": "withdrawFunds",
      "accounts": [
        {
          "name": "investor",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gatewayToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signingAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "investorLpTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "investorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "liquidityPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasuryPoolTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lpTokenMintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMintAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "usdcWithdrawalAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createCredixPass",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "passHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "passBump",
          "type": "u8"
        },
        {
          "name": "isUnderwriter",
          "type": "bool"
        },
        {
          "name": "isBorrower",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateCredixPass",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "passHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "credixPass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalMarketState",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "isActive",
          "type": "bool"
        },
        {
          "name": "isUnderwriter",
          "type": "bool"
        },
        {
          "name": "isBorrower",
          "type": "bool"
        }
      ]
    },
    {
      "name": "freezeGlobalMarketState",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "thawGlobalMarketState",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "globalMarketState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "BorrowerInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numOfDeals",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Deal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "borrower",
            "type": "publicKey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "financingFeePercentage",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "principalAmountRepaid",
            "type": "u64"
          },
          {
            "name": "interestAmountRepaid",
            "type": "u64"
          },
          {
            "name": "timeToMaturityDays",
            "type": "u16"
          },
          {
            "name": "goLiveAt",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "leverageRatio",
            "type": "u8"
          },
          {
            "name": "underwriterPerformanceFeePercentage",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "dealNumber",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lateFees",
            "type": "u64"
          },
          {
            "name": "lateFeesRepaid",
            "type": "u64"
          },
          {
            "name": "private",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "GlobalMarketState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gatekeeperNetwork",
            "type": "publicKey"
          },
          {
            "name": "liquidityPoolTokenMintAccount",
            "type": "publicKey"
          },
          {
            "name": "lpTokenMintAccount",
            "type": "publicKey"
          },
          {
            "name": "totalOutstandingCredit",
            "type": "u64"
          },
          {
            "name": "treasuryPoolTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "signingAuthorityBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "interestFee",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "withrawalFee",
            "type": {
              "defined": "Ratio"
            }
          },
          {
            "name": "frozen",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "CredixPass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "isBorrower",
            "type": "bool"
          },
          {
            "name": "isUnderwriter",
            "type": "bool"
          },
          {
            "name": "active",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Ratio",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numerator",
            "type": "u32"
          },
          {
            "name": "denominator",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "DealRepaymentType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Interest"
          },
          {
            "name": "Principal"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidPrincipalAmount",
      "msg": "This amount is not sufficient as a principal amount."
    },
    {
      "code": 6001,
      "name": "InvalidInterestAmount",
      "msg": "This amount is not sufficient as an interest amount."
    },
    {
      "code": 6002,
      "name": "DealNotLive",
      "msg": "This deal is not live yet."
    },
    {
      "code": 6003,
      "name": "InvalidDealRepaymentType",
      "msg": "Invalid deal repayment type."
    },
    {
      "code": 6004,
      "name": "NotEnoughLiquidity",
      "msg": "Not enough liquidity."
    },
    {
      "code": 6005,
      "name": "PrincipalRepaid",
      "msg": "Principal is already repaid."
    },
    {
      "code": 6006,
      "name": "InterestRepaid",
      "msg": "Interest is already repaid."
    },
    {
      "code": 6007,
      "name": "UnauthorizedSigner",
      "msg": "The Signer is not authorized to use this instruction."
    },
    {
      "code": 6008,
      "name": "CredixPassInvalid",
      "msg": "Credix pass is invalid for this request."
    },
    {
      "code": 6009,
      "name": "CredixPassInactive",
      "msg": "Credix pass is inactive at the moment."
    },
    {
      "code": 6010,
      "name": "Overflow",
      "msg": "Overflow occured."
    },
    {
      "code": 6011,
      "name": "Underflow",
      "msg": "Underflow occured."
    },
    {
      "code": 6012,
      "name": "ZeroDivision",
      "msg": "Tried to divide by zero."
    },
    {
      "code": 6013,
      "name": "ZeroDenominator",
      "msg": "Invalid Ratio: denominator can't be zero."
    },
    {
      "code": 6014,
      "name": "InvalidPreciseNumber",
      "msg": "Invalid u64 used as value for PreciseNumber."
    },
    {
      "code": 6015,
      "name": "PreciseNumberCastFailed",
      "msg": "Unable to cast PreciseNumber to u64"
    }
  ]
};
