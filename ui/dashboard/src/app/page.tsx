'use client';

import { useState } from 'react';
import { EventLogViewer } from '../components/EventLogViewer';
import {
  Plus,
  Search,
  ArrowRightLeft,
  LayoutDashboard,
  History,
  Settings,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  ChevronRight,
  User
} from 'lucide-react';

export default function Dashboard() {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [accountId, setAccountId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchId, setSearchId] = useState('');
  const [accountData, setAccountData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [balanceKey, setBalanceKey] = useState(0); // For forcing re-render of balance
  // Effect-like tab switcher
  // Events are now handled by EventLogViewer component
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:4002/commands/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          owner_name: ownerName,
          initial_balance: parseFloat(initialBalance),
          currency,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Account created successfully: ${data.event_id}`);
        setAccountId('');
        setOwnerName('');
        setInitialBalance('');
      } else {
        setMessage(`Error: ${data.error || 'Failed'}`);
      }
    } catch (err) {
      setMessage(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const searchAccount = async () => {
    if (!searchId) return;
    setLoading(true);
    setAccountData(null);
    setTransactions([]);

    try {
      const response = await fetch(`http://localhost:4001/accounts/${searchId}?t=${Date.now()}`);
      const data = await response.json();

      if (response.ok) {
        setAccountData(data);
        loadTransactions(searchId);
      } else {
        setMessage(`Account not found`);
      }
    } catch (err) {
      setMessage(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4001/accounts/${id}/transactions`);
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:4002/commands/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account_id: fromAccount,
          to_account_id: toAccount,
          amount: parseFloat(transferAmount),
          description: transferDesc,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Transfer completed successfully!`);
        setTransferAmount('');
        setTransferDesc('');
        // Refresh if showing one of these accounts
        if (searchId === fromAccount || searchId === toAccount) {
          setTimeout(searchAccount, 500);
        }
      } else {
        setMessage(`Error: ${data.error || 'Failed'}`);
      }
    } catch (err) {
      setMessage(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 dark:bg-slate-950 dark:text-slate-100">

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
            <Activity className="h-6 w-6" />
            <span>Chronicle</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
          <SidebarItem icon={Wallet} label="Accounts" active={activeTab === 'accounts'} onClick={() => handleTabChange('accounts')} />
          <SidebarItem icon={ArrowRightLeft} label="Transfers" active={activeTab === 'transfers'} onClick={() => handleTabChange('transfers')} />
          <SidebarItem icon={History} label="Audit Log" active={activeTab === 'audit'} onClick={() => handleTabChange('audit')} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <SidebarItem icon={Settings} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm z-10 px-6 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 dark:text-slate-100 capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <Search className="h-5 w-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs ring-2 ring-white dark:ring-slate-900">
              HA
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Audit Log View */}
            {activeTab === 'audit' ? (
              <EventLogViewer />
            ) : (
              // Overview View (Default)
              <>
                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard title="Total Volume" value="$24,500.00" change="+12.5%" trend="up" />
                  <StatCard title="Active Accounts" value="1,240" change="+3.2%" trend="up" />
                  <StatCard title="Failed Events" value="2" change="-0.5%" trend="down" />
                </div>

                {/* Main Action Modules */}
                <div className="grid lg:grid-cols-2 gap-8">

                  {/* Module: Account Manager */}
                  <Card title="Account Manager" icon={CreditCard}>
                    <div className="space-y-6">
                      {/* Create Section */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/50">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Create New Account</h4>
                        <form onSubmit={createAccount} className="grid grid-cols-2 gap-3">
                          <Input placeholder="ID (e.g. ACC-001)" value={accountId} onChange={e => setAccountId(e.target.value)} />
                          <Input placeholder="Owner Name" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                          <Input type="number" placeholder="Initial Balance" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
                          <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                          <button disabled={loading} className="col-span-2 mt-1 w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                            {loading ? 'Processing...' : 'Create Account'}
                          </button>
                        </form>
                      </div>

                      {/* Search Section */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lookup Account</h4>
                        <div className="flex gap-2">
                          <Input placeholder="Search Account ID..." value={searchId} onChange={e => setSearchId(e.target.value)} />
                          <button onClick={searchAccount} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300">
                            Search
                          </button>
                        </div>
                      </div>

                      {/* Account Details Result */}
                      {accountData && (
                        <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                          <div className="relative z-10 flex justify-between items-start">
                            <div>
                              <p className="text-indigo-100 text-sm font-medium">Current Balance</p>
                              <h3 className="text-3xl font-bold mt-1">{accountData.currency} {parseFloat(accountData.balance).toFixed(2)}</h3>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                              <Activity className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="relative z-10 mt-6 flex justify-between items-end">
                            <div className="space-y-1">
                              <p className="text-xs text-indigo-100 uppercase tracking-wider">Account Holder</p>
                              <p className="font-medium">{accountData.owner_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-indigo-100">{accountData.account_id}</p>
                              <p className="text-xs text-green-300 font-medium bg-green-900/30 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
                                {accountData.status}
                              </p>
                            </div>
                          </div>

                          {/* Decorative Circles */}
                          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                          <div className="absolute top-12 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Module: Transfers */}
                  <div className="space-y-6">
                    <Card title="Quick Transfer" icon={ArrowRightLeft}>
                      <form onSubmit={handleTransfer} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>From</Label>
                            <Input placeholder="Account ID" value={fromAccount} onChange={e => setFromAccount(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>To</Label>
                            <Input placeholder="Account ID" value={toAccount} onChange={e => setToAccount(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-sans">$</span>
                            <Input className="pl-6" type="number" placeholder="0.00" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Note</Label>
                          <Input placeholder="What's this for?" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} />
                        </div>
                        <button disabled={loading} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg disabled:opacity-50">
                          Send Funds
                        </button>

                        {message && (
                          <div className="p-3 bg-slate-100 text-slate-600 text-sm rounded-lg text-center border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                            {message}
                          </div>
                        )}
                      </form>
                    </Card>

                    {/* Recent Transactions List */}
                    <Card title="Recent Activity" icon={History} noPadding>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-auto">
                        {transactions.length > 0 ? (
                          transactions.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {tx.type === 'deposit' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tx.description || 'Transaction'}</p>
                                  <p className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-400">Bal: {parseFloat(tx.balance_after).toFixed(2)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-sm">
                            No transactions found for this account.
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Components ---

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {label}
    </button>
  );
}

function Card({ title, icon: Icon, children, noPadding }: { title: string, icon: any, children: React.ReactNode, noPadding?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          {title}
        </h3>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend }: { title: string, value: string, change: string, trend: 'up' | 'down' }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2 dark:text-slate-100">{value}</h3>
        </div>
        <div className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'} px-2 py-1 rounded-full`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {change}
        </div>
      </div>
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-600 ${className}`}
      {...props}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 dark:text-slate-400">{children}</label>;
}
