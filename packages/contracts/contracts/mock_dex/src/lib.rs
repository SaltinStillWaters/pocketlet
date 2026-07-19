#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, token::TokenClient, Address, Env,
    MuxedAddress,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DexError {
    NegativeAmount = 1,
    SlippageExceeded = 2,
}

#[contract]
pub struct MockDex;

#[contractimpl]
impl MockDex {
    /// A trivial mock swap: transfer `sell_amount` of `sell_token` from the
    /// seller into this DEX and transfer `buy_amount = sell_amount` of
    /// `buy_token` back. Real DEX integration would calculate an actual quote.
    pub fn swap(
        env: Env,
        sell_token: Address,
        buy_token: Address,
        seller: Address,
        sell_amount: i128,
        min_buy_amount: i128,
    ) -> i128 {
        if sell_amount <= 0 {
            panic_with_error!(&env, DexError::NegativeAmount);
        }

        let buy_amount = sell_amount;
        if buy_amount < min_buy_amount {
            panic_with_error!(&env, DexError::SlippageExceeded);
        }

        let sell = TokenClient::new(&env, &sell_token);
        sell.transfer(
            &seller,
            &MuxedAddress::from(env.current_contract_address()),
            &sell_amount,
        );

        let buy = TokenClient::new(&env, &buy_token);
        buy.transfer(
            &env.current_contract_address(),
            &MuxedAddress::from(seller.clone()),
            &buy_amount,
        );

        buy_amount
    }
}
