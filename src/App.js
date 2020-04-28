import React, { Component } from 'react';
import './App.css';
import Caver, { utils } from 'caver-js';
import rp from 'request-promise';

const caver = new Caver('https://api.baobab.klaytn.net:8651/');

export default class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            run: false,
            multiRun: false,
            working: '',
            toAddress: '',
            totalReceiveAmount: 0,
            toAddressBalance: 'load...',
        };
    }

    componentDidMount() {
        this.loadSuccessAddress();
        setInterval(this.setBalance, 3000);
    }

    loadSuccessAddress = () => {
        const toAddress = window.localStorage.getItem('successAddress');
        if (toAddress) this.setState({ toAddress });
    };

    setBalance = async () => {
        try {
            const { toAddress } = this.state;
            if (!caver.utils.isAddress(toAddress)) return;
            const result = await caver.klay.getBalance(toAddress);
            const toAddressBalance = caver.utils.fromPeb(result, 'KLAY');
            this.setState({ toAddressBalance });
        } catch (e) {}
    };

    createAndSend = async (toAddress) => {
        try {
            // wallet 생성
            const account = caver.klay.accounts.create();

            console.log('=====================================================');
            console.log(new Date());
            console.log('* address    : ' + account.address);
            console.log('* privateKey : ' + account.privateKey);
            console.log('=====================================================');

            // faucet 요청
            const faucet = await faucetKlay(account.address);
            console.log('');
            console.log('--- faucetKlay');
            console.log(faucet);

            if (JSON.parse(faucet).result == 'IP ERROR') throw '너무 많은 요청으로 IP 벤 당했습니다.';

            // faucet 요청 결과 klay balance 체크
            const maxCheckCount = 5;
            let checkCount = 0;
            let balance = 0;
            let beforeFaucet = true;
            while (beforeFaucet) {
                balance = caver.utils.fromPeb(await caver.klay.getBalance(account.address), 'KLAY');
                console.log('Klay balance: ' + balance + 'KLAY...');
                if (balance > 0) {
                    beforeFaucet = false;
                    console.log('get KLAY Success!');
                } else {
                    checkCount++;
                    if (checkCount > maxCheckCount) throw 'check klay balance: ' + checkCount;
                    await awaitTimeout(1000);
                }
            }

            // fee 여유있게 빼고
            balance = Number(balance) - 1;

            // klay 전송
            caver.klay.defaultAccount = caver.klay.accounts.wallet.add(account.privateKey).address;
            const sendResult = await sendKlay(account.address, toAddress, balance);
            console.log('');
            console.log('--- sendKlay');
            console.log(sendResult);

            console.log('Success Send!');
            console.log('=====================================================');
            await this.setState({
                totalReceiveAmount: this.state.totalReceiveAmount + balance,
            });
            window.localStorage.setItem('successAddress', toAddress);
        } catch (e) {
            console.log(e);
            if (e == '너무 많은 요청으로 IP 벤 당했습니다.') alert(e);
            throw e;
        }
    };

    run = async () => {
        try {
            const { run, toAddress } = this.state;

            if (!run) return;

            await this.createAndSend(toAddress);

            if (run) this.run();
        } catch (err) {
            console.log(err);
            throw err;
        }
    };

    // 테스트용
    multiRun = async (count) => {
        if (this.state.multiRun) {
            alert('한번에 한번만 시도하고 새로고침 후 시도하세요!\n(확인을 누르면 자동 새로고침 됩니다.)');
            return window.open('./', '_self');
        }
        if (!window.confirm('검증되지 않은 기능입니다.\n예기치 못한 오류를 발생시킬 수 있습니다.')) return;
        this.setState({ multiRun: true });
        for (let i = 0; i < count; i++) {
            await awaitTimeout(100);
            this.createAndSend(this.state.toAddress);
        }
    };

    render() {
        const { run, multiRun, toAddress, totalReceiveAmount, toAddressBalance } = this.state;
        const count = 500;

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifySelf: 'center',
                    textAlign: 'center',
                }}>
                <h2>Faucet Bot</h2>
                <p style={{ fontSize: 12, color: '#aaa' }}>1 Send == 4 KLAY</p>
                <div>
                    <p>Receive Address</p>
                    <input
                        value={toAddress}
                        disabled={run}
                        style={{
                            width: 350,
                            padding: '10px 10px',
                            fontSize: 14,
                            textAlign: 'center ',
                        }}
                        type="text"
                        onChange={(e) => this.setState({ toAddress: e.target.value })}></input>
                    <button
                        style={{ padding: '10px 20px', margin: '0 10px' }}
                        onClick={() => {
                            if (!caver.utils.isAddress(toAddress)) return alert('잘못된 Address 입니다.');
                            this.setState({ run: true }, this.run);
                        }}
                        disabled={run}>
                        Run
                    </button>
                    <button style={{ padding: '10px 20px' }} onClick={() => this.setState({ run: false })} disabled={!run}>
                        Stop
                    </button>
                    <button
                        style={{ padding: '10px 20px', margin: '0 10px' }}
                        onClick={() => {
                            if (!caver.utils.isAddress(toAddress)) return alert('잘못된 Address 입니다.');
                            this.multiRun(count);
                        }}
                        disabled={run || multiRun}>
                        Multi Run ({count} == {count * 4} KLAY)
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
                    }}>
                    <h4 style={{ textAlign: 'center' }}>- {toAddress} -</h4>
                    <p>Balance: {toAddressBalance} KLAY </p>
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
    return new Promise((resolve) => setTimeout(resolve, delay));
}
