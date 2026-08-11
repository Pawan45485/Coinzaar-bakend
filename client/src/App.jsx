import { useState, useEffect } from 'react';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [cryptos, setCryptos] = useState([]);
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    if (user) {
      const fetchCryptos = async () => {
        try {
          const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=5&page=1&sparkline=false');
          const data = await res.json();
          setCryptos(data);
        } catch (err) {
          console.error("Fetch error:", err);
        }
      };
      fetchCryptos();
      const interval = setInterval(fetchCryptos, 60000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.msg || "Success!");
        if (isLogin) {
          localStorage.setItem('token', data.token);
          fetchUserProfile(data.token);
        }
      } else {
        setMessage(data.msg || "Something went wrong");
      }
    } catch (err) {
      setMessage("Server error");
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/user', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) setUser(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFunds = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/auth/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token }
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser); 
        alert("₹50,000 added! 🎉");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuy = async (coin) => {
    const investAmount = 1000; 
    if (investAmount > user.fiatBalance) {
      return alert("Aapke wallet mein itne paise nahi hain!");
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/auth/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          coinName: coin.name,
          symbol: coin.symbol.toUpperCase(),
          price: coin.current_price,
          investAmount: investAmount
        })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
        alert(`Success! 🎉 Aapne ₹${investAmount} ka ${coin.name} khareed liya hai!`);
      } else {
        alert("Error: " + updatedUser.msg);
      }
    } catch (err) {
      console.error(err);
      alert("Server error aaya hai.");
    }
  };

  const handleSell = async (coinSymbol, currentPrice) => {
    const qtyStr = window.prompt(`Aap kitna ${coinSymbol} bechna chahte hain? (Quantity daalein)`);
    if (!qtyStr) return;

    const sellAmount = Number(qtyStr);
    if (isNaN(sellAmount) || sellAmount <= 0) {
      return alert("Kripya sahi quantity daalein!");
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/auth/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          symbol: coinSymbol,
          price: currentPrice,
          sellAmount: sellAmount
        })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
        alert(`Success! 🎉 Aapne ${sellAmount} ${coinSymbol} bech diya hai!`);
      } else {
        alert("Error: " + updatedUser.msg);
      }
    } catch (err) {
      console.error(err);
      alert("Server error aaya hai.");
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        alert("MetaMask Connected! 🎉");
      } catch (err) {
        console.error(err);
        alert("Connection failed!");
      }
    } else {
      alert("Kripya pehle Chrome mein MetaMask extension install karein!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <nav className="p-4 border-b border-slate-800 flex justify-between items-center px-8">
        <h1 className="text-2xl font-bold text-yellow-400">🪙 Coinzaar Exchange</h1>
        <div className="flex gap-4 items-center">
          {walletAddress ? (
            <span className="text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
              🔗 {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
            </span>
          ) : (
            <button onClick={connectWallet} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-sm font-bold transition">
              Connect MetaMask
            </button>
          )}

          {user && (
            <>
              <span className="text-sm bg-slate-800 px-3 py-1 rounded-full">👤 {user.name}</span>
              <span className="text-sm bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/20">💰 Balance: ₹{user.fiatBalance?.toFixed(2)}</span>
              <button onClick={() => { setUser(null); localStorage.removeItem('token'); }} className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700 font-semibold transition">Logout</button>
            </>
          )}
        </div>
      </nav>

      <div className="flex flex-1 items-start justify-center p-4">
        {!user ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl w-full max-w-md shadow-2xl mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400">{isLogin ? 'Login' : 'Register'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded text-white" required />}
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded text-white" required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded text-white" required />
              <button type="submit" className="bg-yellow-500 text-slate-950 font-bold p-3 rounded">{isLogin ? 'Login' : 'Register'}</button>
            </form>
            {message && <p className="mt-4 text-center text-yellow-400">{message}</p>}
            <p className="mt-6 text-center text-sm text-slate-400">
              <button onClick={() => setIsLogin(!isLogin)} className="text-yellow-400 underline">{isLogin ? 'Create an account' : 'Already have an account? Login'}</button>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-6xl flex gap-6 py-8">
            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400 mb-1">Exchange 🚀</h2>
                  <p className="text-slate-400 text-sm">Live market se khareedari karein.</p>
                </div>
                <div className="text-right bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-slate-400 text-sm mb-2">Wallet Balance</p>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl font-bold text-white">₹{user.fiatBalance?.toFixed(2)}</p>
                    <button onClick={handleAddFunds} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold shadow-lg shadow-green-600/30">+ Add Funds</button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><span className="text-green-500 animate-pulse">●</span> Live Market</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800"><th className="pb-3 pl-2">Coin</th><th className="pb-3">Price</th><th className="pb-3 text-right pr-2">Action</th></tr>
                    </thead>
                    <tbody>
                      {cryptos.map((coin) => (
                        <tr key={coin.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition">
                          <td className="py-4 pl-2 flex items-center gap-3">
                            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                            <div><p className="font-bold text-white">{coin.name}</p><p className="text-xs text-slate-500">{coin.symbol.toUpperCase()}</p></div>
                          </td>
                          <td className="py-4 font-semibold text-white">₹{coin.current_price.toLocaleString('en-IN')}</td>
                          <td className="py-4 text-right pr-2">
                            <button onClick={() => handleBuy(coin)} className="bg-yellow-500 text-slate-950 px-4 py-1.5 rounded font-bold text-sm hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20">Buy</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="w-80 bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">💼 My Portfolio</h3>
              {user.portfolio && Object.keys(user.portfolio).length > 0 ? (
                <div className="flex flex-col gap-4">
                  {Object.entries(user.portfolio).map(([coinSymbol, amount]) => {
                    const matchedCoin = cryptos.find(c => c.symbol.toUpperCase() === coinSymbol);
                    const currentPrice = matchedCoin ? matchedCoin.current_price : 0;

                    return (
                      <div key={coinSymbol} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center shadow-inner">
                        <div>
                          <span className="font-bold text-yellow-400 text-lg">{coinSymbol}</span>
                          <p className="text-white font-mono text-sm">{amount.toFixed(6)}</p>
                        </div>
                        <button 
                          onClick={() => handleSell(coinSymbol, currentPrice)}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold transition shadow-md"
                        >
                          Sell
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">Aapka portfolio abhi khali hai. Kuch khareedein!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;