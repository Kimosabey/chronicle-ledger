'use client';

import { useState, useEffect, Fragment } from 'react';
import {
    Search,
    RefreshCw,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Terminal,
    Filter,
    Clock,
    Database,
    Hash
} from 'lucide-react';

interface Event {
    event_id: string;
    event_type: string;
    aggregate_id: string;
    event_data: any;
    created_at: string;
    aggregate_version: number;
}

export function EventLogViewer() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:4001/events?limit=100');
            const data = await response.json();
            if (response.ok) {
                setEvents(data.events);
            }
        } catch (err) {
            console.error('Failed to fetch events', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchEvents, 2000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const filteredEvents = events.filter(evt =>
        evt.event_type.toLowerCase().includes(filter.toLowerCase()) ||
        evt.aggregate_id.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(evt.event_data).toLowerCase().includes(filter.toLowerCase())
    );

    const getEventTypeColor = (type: string) => {
        if (type.includes('Created')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
        if (type.includes('Deposited')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        if (type.includes('Withdrawn')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <Terminal className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        Event Stream
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        CockroachDB
                    </span>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by type, ID, or data..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        />
                    </div>

                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`p-2 rounded-lg border transition-all ${autoRefresh
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'}`}
                        title="Auto-refresh (2s)"
                    >
                        <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                    >
                        <Database className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Event List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-900/50 dark:border-slate-800">
                                <th className="px-6 py-3 w-10"></th>
                                <th className="px-6 py-3">Event Type</th>
                                <th className="px-6 py-3">Aggregate ID</th>
                                <th className="px-6 py-3">Version</th>
                                <th className="px-6 py-3 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredEvents.length > 0 ? (
                                filteredEvents.map((evt) => (
                                    <Fragment key={evt.event_id}>
                                        <tr
                                            onClick={() => toggleExpand(evt.event_id)}
                                            className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${expandedId === evt.event_id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-slate-400">
                                                {expandedId === evt.event_id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getEventTypeColor(evt.event_type)}`}>
                                                    {evt.event_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <Hash className="h-3 w-3 text-slate-400" />
                                                    {evt.aggregate_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                v{evt.aggregate_version}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 text-right dark:text-slate-400 font-mono">
                                                {new Date(evt.created_at).toLocaleTimeString()} <span className="text-xs text-slate-400 opacity-75">{new Date(evt.created_at).toLocaleDateString()}</span>
                                            </td>
                                        </tr>

                                        {/* Expanded Detail View */}
                                        {expandedId === evt.event_id && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-50 overflow-hidden dark:border-slate-700">
                                                        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
                                                            <div className="text-xs font-mono text-slate-400">payload.json</div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(JSON.stringify(evt.event_data, null, 2), evt.event_id);
                                                                }}
                                                                className="text-slate-400 hover:text-white transition-colors"
                                                            >
                                                                {copiedId === evt.event_id ? (
                                                                    <div className="flex items-center gap-1 text-green-400">
                                                                        <Check className="h-3 w-3" />
                                                                        <span className="text-xs">Copied</span>
                                                                    </div>
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
                                                            <span className="text-purple-400">{"{"}</span>
                                                            {Object.entries(evt.event_data).map(([key, value], idx, arr) => (
                                                                <div key={key} className="pl-4">
                                                                    <span className="text-blue-400">"{key}"</span>
                                                                    <span className="text-slate-400">: </span>
                                                                    <span className="text-orange-300">
                                                                        {typeof value === 'string' ? `"${value}"` : String(value)}
                                                                    </span>
                                                                    {idx < arr.length - 1 && <span className="text-slate-500">,</span>}
                                                                </div>
                                                            ))}
                                                            <span className="text-purple-400">{"}"}</span>
                                                        </pre>
                                                    </div>
                                                    <div className="mt-2 flex gap-4 text-xs text-slate-400 font-mono pl-1">
                                                        <div>Event ID: {evt.event_id}</div>
                                                        <div>Processed at: {new Date().toISOString()}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Database className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                            <p>No events found matching your filter.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer info */}
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span>Showing {filteredEvents.length} events</span>
                    <span>Total Events: {events.length}</span>
                </div>
            </div>
        </div>
    );
}
