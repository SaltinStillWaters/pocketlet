#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, token::TokenInterface,
    Address, Env, MuxedAddress, String,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
    Allowance(Address, Address),
    Name,
    Symbol,
    Decimals,
    Admin,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TokenError {
    InsufficientBalance = 1,
    InsufficientAllowance = 2,
    NegativeAmount = 3,
}

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn __constructor(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        Self::add_balance(&env, to, amount);
    }

    fn add_balance(env: &Env, addr: Address, amount: i128) {
        let key = DataKey::Balance(addr);
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(current + amount));
    }

    fn sub_balance(env: &Env, addr: Address, amount: i128) {
        let key = DataKey::Balance(addr);
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current < amount {
            panic_with_error!(env, TokenError::InsufficientBalance);
        }
        env.storage().persistent().set(&key, &(current - amount));
    }
}

#[contractimpl]
impl TokenInterface for MockToken {
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    fn approve(env: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        from.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Allowance(from, spender), &amount);
    }

    fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    fn transfer(env: Env, from: Address, to: MuxedAddress, amount: i128) {
        if amount < 0 {
            panic_with_error!(&env, TokenError::NegativeAmount);
        }
        from.require_auth();
        Self::sub_balance(&env, from, amount);
        Self::add_balance(&env, to.address(), amount);
    }

    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        if amount < 0 {
            panic_with_error!(&env, TokenError::NegativeAmount);
        }
        spender.require_auth();
        let key = DataKey::Allowance(from.clone(), spender.clone());
        let allowance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if allowance < amount {
            panic_with_error!(&env, TokenError::InsufficientAllowance);
        }
        env.storage().persistent().set(&key, &(allowance - amount));
        Self::sub_balance(&env, from, amount);
        Self::add_balance(&env, to, amount);
    }

    fn burn(env: Env, from: Address, amount: i128) {
        if amount < 0 {
            panic_with_error!(&env, TokenError::NegativeAmount);
        }
        from.require_auth();
        Self::sub_balance(&env, from, amount);
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        if amount < 0 {
            panic_with_error!(&env, TokenError::NegativeAmount);
        }
        spender.require_auth();
        let key = DataKey::Allowance(from.clone(), spender.clone());
        let allowance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if allowance < amount {
            panic_with_error!(&env, TokenError::InsufficientAllowance);
        }
        env.storage().persistent().set(&key, &(allowance - amount));
        Self::sub_balance(&env, from, amount);
    }

    fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap_or(7)
    }

    fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or(String::from_str(&env, "Mock"))
    }

    fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or(String::from_str(&env, "MOCK"))
    }
}
