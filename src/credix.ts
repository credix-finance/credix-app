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
          "type": "u32"
        },
        {
          "name": "withdrawalFee",
          "type": "u32"
        }
      ]
    },
    {
      "name": "depositFunds",
      "accounts": [
        {
          "name": "depositor",
          "isMut": true,
          "isSigner": true
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
          "name": "depositorTokenAccount",
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
          "name": "depositorLpTokenAccount",
          "isMut": true,
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
          "type": "u16"
        },
        {
          "name": "leverageRatio",
          "type": "u8"
        },
        {
          "name": "underwriterPerformanceFeePercentage",
          "type": "u16"
        },
        {
          "name": "timeToMaturityDays",
          "type": "u16"
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
          "name": "withdrawer",
          "isMut": false,
          "isSigner": true
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
          "name": "withdrawerLpTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "withdrawerTokenAccount",
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
          "name": "itWithdrawalAmount",
          "type": "u64"
        }
      ]
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
            "name": "borrower",
            "type": "publicKey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "financingFeePercentage",
            "type": "u16"
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
            "type": "u16"
          },
          {
            "name": "dealNumber",
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
      "name": "GlobalMarketState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidityPoolTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "liquidityPoolUsdcAmount",
            "type": "u64"
          },
          {
            "name": "liquidityPoolDecimals",
            "type": "u8"
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
            "name": "globalMarketStateBump",
            "type": "u8"
          },
          {
            "name": "interestFee",
            "type": "u32"
          },
          {
            "name": "withrawalFee",
            "type": "u32"
          }
        ]
      }
    }
  ],
  "types": [
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
      "name": "MathOverflow",
      "msg": "Math overflow."
    },
    {
      "code": 6005,
      "name": "NotEnoughLiquidity",
      "msg": "Not enough liquidity."
    },
    {
      "code": 6006,
      "name": "PrincipalRepaid",
      "msg": "Principal is already repaid."
    },
    {
      "code": 6007,
      "name": "InterestRepaid",
      "msg": "Interest is already repaid."
    },
    {
      "code": 6008,
      "name": "UnauthorizedSigner",
      "msg": "The Signer is not authorized to use this instruction."
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
          "type": "u32"
        },
        {
          "name": "withdrawalFee",
          "type": "u32"
        }
      ]
    },
    {
      "name": "depositFunds",
      "accounts": [
        {
          "name": "depositor",
          "isMut": true,
          "isSigner": true
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
          "name": "depositorTokenAccount",
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
          "name": "depositorLpTokenAccount",
          "isMut": true,
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
          "type": "u16"
        },
        {
          "name": "leverageRatio",
          "type": "u8"
        },
        {
          "name": "underwriterPerformanceFeePercentage",
          "type": "u16"
        },
        {
          "name": "timeToMaturityDays",
          "type": "u16"
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
          "name": "withdrawer",
          "isMut": false,
          "isSigner": true
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
          "name": "withdrawerLpTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "withdrawerTokenAccount",
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
          "name": "itWithdrawalAmount",
          "type": "u64"
        }
      ]
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
            "name": "borrower",
            "type": "publicKey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "financingFeePercentage",
            "type": "u16"
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
            "type": "u16"
          },
          {
            "name": "dealNumber",
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
      "name": "GlobalMarketState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidityPoolTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "liquidityPoolUsdcAmount",
            "type": "u64"
          },
          {
            "name": "liquidityPoolDecimals",
            "type": "u8"
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
            "name": "globalMarketStateBump",
            "type": "u8"
          },
          {
            "name": "interestFee",
            "type": "u32"
          },
          {
            "name": "withrawalFee",
            "type": "u32"
          }
        ]
      }
    }
  ],
  "types": [
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
      "name": "MathOverflow",
      "msg": "Math overflow."
    },
    {
      "code": 6005,
      "name": "NotEnoughLiquidity",
      "msg": "Not enough liquidity."
    },
    {
      "code": 6006,
      "name": "PrincipalRepaid",
      "msg": "Principal is already repaid."
    },
    {
      "code": 6007,
      "name": "InterestRepaid",
      "msg": "Interest is already repaid."
    },
    {
      "code": 6008,
      "name": "UnauthorizedSigner",
      "msg": "The Signer is not authorized to use this instruction."
    }
  ]
};