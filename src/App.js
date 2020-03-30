import React, { Component } from 'react';
import './App.css';
import Caver from 'caver-js';
import rp from 'request-promise';

const caver = new Caver('https://api.baobab.klaytn.net:8651/');

export default class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            run: false,
            working: '',
            fromAddress: '',
            totalReceiveAmount: 0,
            fromAddressBalance: 'load...',
        };
    }

    componentDidMount() {
        this.loadSuccessAddress();
        setInterval(this.setBalance, 3000);
    }

    loadSuccessAddress = () => {
        const fromAddress = window.localStorage.getItem('successAddress');
        if (fromAddress) this.setState({ fromAddress });
    };

    setBalance = async () => {
        try {
            const { fromAddress } = this.state;
            if (!caver.utils.isAddress(fromAddress)) return;
            const result = await caver.klay.getBalance(fromAddress);
            const fromAddressBalance = caver.utils.fromPeb(result, 'KLAY');
            this.setState({ fromAddressBalance });
        } catch (e) {}
    };

    run = async () => {
        try {
            const { run, fromAddress } = this.state;

            if (!run) return;

            // wallet 생성
            const account = caver.klay.accounts.create();

            console.log(
                '====================================================='
            );
            console.log(new Date());
            console.log('* address    : ' + account.address);
            console.log('* privateKey : ' + account.privateKey);
            console.log(
                '====================================================='
            );

            // faucet 요청
            const faucet = await faucetKlay(account.address);
            console.log('');
            console.log('--- faucetKlay');
            console.log(faucet);

            // faucet 요청 결과 klay balance 체크
            const maxCheckCount = 100;
            let checkCount = 0;
            let balance = 0;
            let beforeFaucet = true;
            while (beforeFaucet) {
                balance = caver.utils.fromPeb(
                    await caver.klay.getBalance(account.address),
                    'KLAY'
                );
                console.log('Klay balance: ' + balance + 'KLAY...');
                if (balance > 0) {
                    beforeFaucet = false;
                    console.log('get KLAY Success!');
                } else {
                    checkCount++;
                    if (checkCount > maxCheckCount)
                        throw 'check klay balance: ' + checkCount;
                    await awaitTimeout(1000);
                }
            }

            // fee 여유있게 빼고
            balance = Number(balance) - 1;

            // klay 전송
            caver.klay.defaultAccount = caver.klay.accounts.wallet.add(
                account.privateKey
            ).address;
            const sendResult = await sendKlay(
                account.address,
                fromAddress,
                balance
            );
            console.log('');
            console.log('--- sendKlay');
            console.log(sendResult);

            console.log('Success Send!');
            console.log(
                '====================================================='
            );
            this.setState({
                totalReceiveAmount: this.state.totalReceiveAmount + balance,
            });
            window.localStorage.setItem('successAddress', fromAddress);
            if (run) this.run();
        } catch (err) {
            console.log(err);
            throw err;
        }
    };

    render() {
        const {
            run,
            fromAddress,
            totalReceiveAmount,
            fromAddressBalance,
        } = this.state;
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifySelf: 'center',
                    textAlign: 'center',
                }}
            >
                <h2>Faucet Bot</h2>
                <p style={{ fontSize: 12, color: '#aaa' }}>1 Send == 4 KLAY</p>
                <div>
                    <p>Receive Address</p>
                    <input
                        value={fromAddress}
                        disabled={run}
                        style={{
                            width: 350,
                            padding: '10px 10px',
                            fontSize: 14,
                            textAlign: 'center ',
                        }}
                        type="text"
                        onChange={e =>
                            this.setState({ fromAddress: e.target.value })
                        }
                    ></input>
                    <button
                        style={{ padding: '10px 20px', margin: '0 10px' }}
                        onClick={() => {
                            if (!caver.utils.isAddress(fromAddress))
                                return alert('잘못된 Address 입니다.');
                            this.setState({ run: true }, this.run);
                        }}
                        disabled={run}
                    >
                        Run
                    </button>
                    <button
                        style={{ padding: '10px 20px' }}
                        onClick={() => this.setState({ run: false })}
                        disabled={!run}
                    >
                        Stop
                    </button>
                </div>
                <h4>Total Receive Klay: {totalReceiveAmount}</h4>

                {/* Receive Address Info */}
                <div
                    style={{
                        marginTop: 100,
                        border: '1px solid #ddd',
                        borderRadius: 20,
                        padding: '20px 50px',
                        textAlign: 'left',
                    }}
                >
                    <h4 style={{ textAlign: 'center' }}>- {fromAddress} -</h4>
                    <p>Balance: {fromAddressBalance} KLAY </p>
                </div>
            </div>
        );
    }
}

async function faucetKlay(to) {
    return await rp({
        uri: 'https://api-baobab.wallet.klaytn.com/faucet/run?address=' + to,
        method: 'POST',
    });
}

async function sendKlay(from, to, amount) {
    return await caver.klay.sendTransaction({
        type: 'VALUE_TRANSFER',
        from: from,
        to: to,
        gas: '300000',
        value: caver.utils.toPeb(amount, 'KLAY'),
    });
}

async function awaitTimeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
