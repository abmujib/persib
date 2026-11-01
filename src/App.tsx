import React, { useState, useEffect } from 'react';
import { 
  Calendar, Trophy, Shield, Activity, Code, Terminal, Copy, Check, ExternalLink, 
  Search, RefreshCw, Zap, Server, Database, Globe, Play, ChevronRight, Info, Award,
  Clock, Tv, MapPin, BarChart3, AlertCircle, FileText
} from 'lucide-react';
import { MatchDataService, FormattedMatch } from './services/matchData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'matches' | 'api' | 'stats' | 'guide'>('matches');
  const [matchFilter, setMatchFilter] = useState<'all' | 'upcoming' | 'results'>('all');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [matches, setMatches] = useState<FormattedMatch[]>([]);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // API Tester State
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/v1/schedule');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [testingApi, setTestingApi] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<'js' | 'curl' | 'python' | 'php' | 'dart'>('js');

  // Load Initial Match Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allM = await MatchDataService.getAllMatches();
      const nxt = await MatchDataService.getNextMatch();
      const st = await MatchDataService.getStatistics();
      setMatches(allM);
      setNextMatch(nxt);
      setStats(st);
    } catch (err) {
      console.error("Failed to load match data", err);
    } finally {
      setLoading(false);
    }
  };

  // Run live API test
  const handleTestApi = async (endpoint: string = selectedEndpoint) => {
    setTestingApi(true);
    setSelectedEndpoint(endpoint);
    const start = performance.now();
    try {
      const origin = window.location.origin;
      const targetUrl = `${origin}${endpoint}`;
      const res = await fetch(targetUrl);
      const end = performance.now();
      setApiResponseTime(Math.round(end - start));
      setApiStatus(res.status);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      const end = performance.now();
      setApiResponseTime(Math.round(end - start));
      setApiStatus(500);
      setApiResponse(JSON.stringify({ error: "Gagal memanggil endpoint API", details: err?.message || String(err) }, null, 2));
    } finally {
      setTestingApi(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filter matches based on user selection
  const filteredMatches = matches.filter(m => {
    if (matchFilter === 'upcoming' && (m.status !== 'SCHEDULED' && m.status !== 'TIMED')) return false;
    if (matchFilter === 'results' && m.status !== 'FINISHED') return false;
    if (competitionFilter !== 'all' && m.competition.id !== competitionFilter && m.competition.code !== competitionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const opp = m.opponent.name.toLowerCase();
      const std = m.stadium.name.toLowerCase();
      const comp = m.competition.name.toLowerCase();
      return opp.includes(q) || std.includes(q) || comp.includes(q);
    }
    return true;
  });

  const getFullApiUrl = (endpoint: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://domain.com';
    return `${origin}${endpoint}`;
  };

  const getCodeSnippet = (lang: string, endpoint: string) => {
    const url = getFullApiUrl(endpoint);
    switch (lang) {
      case 'js':
        return `// JavaScript / Fetch API
fetch('${url}')
  .then(response => response.json())
  .then(data => console.log('PERSIB Data:', data))
  .catch(error => console.error('Error:', error));`;
      case 'curl':
        return `# cURL Terminal Command
curl -X GET "${url}" \\
  -H "Accept: application/json"`;
      case 'python':
        return `# Python requests library
import requests

url = "${url}"
response = requests.get(url)
data = response.json()
print("Total Pertandingan:", len(data.get('data', [])))`;
      case 'php':
        return `<?php
// PHP cURL Example
$url = "${url}";
$json = file_get_contents($url);
$data = json_decode($json, true);
print_r($data['data']);
?>`;
      case 'dart':
        return `// Flutter / Dart (http package)
import 'package:http/http.dart' as http;
import 'dart:convert';

void fetchPersibData() async {
  final response = await http.get(Uri.parse('${url}'));
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print(data);
  }
}`;
      default:
        return `fetch('${url}')`;
    }
  };

  const endpointsList = [
    { path: '/api/v1/schedule', name: 'Jadwal Pertandingan', desc: 'Daftar pertandingan PERSIB mendatang + countdown kick-off.', tag: 'JADWAL' },
    { path: '/api/v1/scores', name: 'Hasil Skor Akhir', desc: 'Hasil pertandingan selesai (Finished) + detail poin & gol.', tag: 'SKOR' },
    { path: '/api/v1/next-match', name: 'Pertandingan Terdekat', desc: 'Single match terdekat yang akan dihadapi PERSIB Bandung.', tag: 'NEXT' },
    { path: '/api/v1/matches', name: 'Semua Pertandingan', desc: 'Seluruh arsip jadwal & hasil pertandingan PERSIB lengkap.', tag: 'ALL' },
    { path: '/api/v1/stats', name: 'Statistik Klub', desc: 'Ringkasan statistik (Win rate, Gol, Tren Performa, Poin).', tag: 'STATS' },
    { path: '/api/v1/teams', name: 'Daftar Tim', desc: 'Daftar tim lawan & PERSIB beserta logo klub.', tag: 'TEAMS' },
    { path: '/api/v1/competitions', name: 'Daftar Kompetisi', desc: 'Kompetisi resmi (BRI Liga 1, AFC Champions League Two).', tag: 'COMPETITION' },
    { path: '/api/v1/stadiums', name: 'Daftar Stadion', desc: 'Master lokasi stadion kandang & tandang.', tag: 'STADIUMS' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header & Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-blue-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src="https://assets.ileague.id/uploads/images/club/lineup_PERSIB_BANDUNG_1786248601.png" 
                  alt="PERSIB Logo" 
                  className="w-10 h-10 object-contain drop-shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-white tracking-wide">PERSIB BANDUNG</span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    API v1.0
                  </span>
                </div>
                <div className="text-xs text-slate-400">Match Schedule & Open Public REST API</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('matches')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'matches' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Jadwal & Skor
              </button>

              <button 
                onClick={() => setActiveTab('api')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'api' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                Developer API Portal
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  JSON
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'stats' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Statistik Season
              </button>

              <button 
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'guide' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4 text-amber-400" />
                Panduan Integration
              </button>
            </nav>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('api'); handleTestApi('/api/v1/schedule'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 border border-blue-700/50 rounded-lg text-xs font-semibold transition"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Test API</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex border-t border-slate-800 bg-slate-900 px-2 py-1.5 overflow-x-auto gap-1">
          <button 
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'matches' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Jadwal & Skor
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'api' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Developer API
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Statistik
          </button>
          <button 
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'guide' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Panduan
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ========================================================================= */}
        {/* TAB 1: MATCHES & SCHEDULE */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            
            {/* Hero Banner with Next Match Highlight */}
            {nextMatch && nextMatch.has_match && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 border border-blue-800/50 p-6 shadow-2xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
                  {/* Left info */}
                  <div className="space-y-3 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Pertandingan Terdekat (Next Match)
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {nextMatch.match.home_team.name} <span className="text-amber-400">vs</span> {nextMatch.match.away_team.name}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        {nextMatch.match.competition.name}
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {nextMatch.match.formatted_date} ({nextMatch.match.match_time} WIB)
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {nextMatch.match.stadium.name}
                      </span>
                    </div>
                  </div>

                  {/* Right Match vs Display */}
                  <div className="flex items-center gap-6 bg-slate-900/80 border border-slate-800 px-6 py-4 rounded-xl shadow-inner">
                    <div className="text-center space-y-1">
                      <img src={nextMatch.match.home_team.logo} alt={nextMatch.match.home_team.name} className="w-14 h-14 object-contain mx-auto" />
                      <div className="text-xs font-bold text-white max-w-[100px] truncate">{nextMatch.match.home_team.name}</div>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-xs font-bold px-2 py-1 bg-amber-500 text-slate-950 rounded uppercase">VS</span>
                      <div className="text-[10px] text-slate-400 mt-2 font-mono">{nextMatch.match.match_time} WIB</div>
                    </div>

                    <div className="text-center space-y-1">
                      <img src={nextMatch.match.away_team.logo} alt={nextMatch.match.away_team.name} className="w-14 h-14 object-contain mx-auto" />
                      <div className="text-xs font-bold text-white max-w-[100px] truncate">{nextMatch.match.away_team.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats Ribbon */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400">Total Main</div>
                  <div className="text-xl font-extrabold text-white">{stats.summary.played}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-emerald-400 font-semibold">Menang</div>
                  <div className="text-xl font-extrabold text-emerald-400">{stats.summary.won}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-amber-400 font-semibold">Seri</div>
                  <div className="text-xl font-extrabold text-amber-400">{stats.summary.drawn}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-rose-400 font-semibold">Kalah</div>
                  <div className="text-xl font-extrabold text-rose-400">{stats.summary.lost}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400">Total Poin</div>
                  <div className="text-xl font-extrabold text-blue-400">{stats.summary.points}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400">Gol (GF:GA)</div>
                  <div className="text-xl font-extrabold text-white">{stats.summary.goals_for}:{stats.summary.goals_against}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400">Win Rate</div>
                  <div className="text-xl font-extrabold text-emerald-300">{stats.summary.win_rate_percent}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400">Form Terakhir</div>
                  <div className="flex justify-center gap-1 mt-1">
                    {stats.recent_form.map((f: string, i: number) => (
                      <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                        f === 'W' ? 'bg-emerald-500 text-slate-950' : f === 'D' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              {/* Filter Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setMatchFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    matchFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Pertandingan ({matches.length})
                </button>
                <button 
                  onClick={() => setMatchFilter('upcoming')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    matchFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Jadwal Mendatang
                </button>
                <button 
                  onClick={() => setMatchFilter('results')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    matchFilter === 'results' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hasil Selesai
                </button>
              </div>

              {/* Search & Competition Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={competitionFilter}
                  onChange={(e) => setCompetitionFilter(e.target.value)}
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Kompetisi</option>
                  <option value="COMP-01">BRI Liga 1 Indonesia</option>
                  <option value="COMP-02">AFC Champions League Two</option>
                </select>

                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari lawan, stadion..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 pl-9 pr-3 py-2 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Matches List Grid */}
            {loading ? (
              <div className="text-center py-12 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-slate-400">Memuat data pertandingan PERSIB...</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <h3 className="font-bold text-white">Tidak Ada Pertandingan Ditemukan</h3>
                <p className="text-xs text-slate-400">Coba ubah kata kunci atau filter pencarian Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map(m => (
                  <div key={m.id} className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-blue-800/80 rounded-xl p-5 transition-all shadow-md group">
                    {/* Top Row: Competition & Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <img src={m.competition.logo} alt={m.competition.name} className="w-5 h-5 object-contain" />
                        <span className="text-xs font-bold text-slate-300">{m.competition.name}</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        m.status === 'FINISHED' 
                          ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {m.status_label}
                      </span>
                    </div>

                    {/* Middle Row: Teams & Score */}
                    <div className="grid grid-cols-3 items-center py-2">
                      {/* Home Team */}
                      <div className="text-center space-y-2">
                        <img src={m.home_team.logo} alt={m.home_team.name} className="w-12 h-12 object-contain mx-auto group-hover:scale-105 transition" />
                        <div className={`text-xs font-bold ${m.home_team.is_persib ? 'text-blue-400' : 'text-white'}`}>
                          {m.home_team.name}
                        </div>
                      </div>

                      {/* Score / Time Box */}
                      <div className="text-center px-2">
                        {m.score ? (
                          <div className="space-y-1">
                            <div className="text-2xl font-black text-white font-mono tracking-tight bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800 inline-block">
                              {m.score.scoreline}
                            </div>
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.score.result === 'WIN' ? 'bg-emerald-500 text-slate-950' : m.score.result === 'DRAW' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
                              }`}>
                                PERSIB {m.score.result_badge} (+{m.score.points} Poin)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-base font-bold text-amber-400 font-mono bg-slate-950 py-1 px-3 rounded-md border border-slate-800 inline-block">
                              {m.match_time} WIB
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">{m.formatted_date}</div>
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="text-center space-y-2">
                        <img src={m.away_team.logo} alt={m.away_team.name} className="w-12 h-12 object-contain mx-auto group-hover:scale-105 transition" />
                        <div className={`text-xs font-bold ${m.away_team.is_persib ? 'text-blue-400' : 'text-white'}`}>
                          {m.away_team.name}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {m.stadium.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tv className="w-3 h-3 text-slate-500" />
                        {m.broadcast}
                      </span>
                    </div>

                    {m.notes && (
                      <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/60 flex items-start gap-1">
                        <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                        <span>{m.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DEVELOPER API PORTAL & LIVE TESTER */}
        {/* ========================================================================= */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-800/40 p-6 rounded-2xl shadow-xl space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-2xl font-extrabold text-white">Public REST API Hub (/api/v1/)</h2>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl">
                    API publik gratis format JSON untuk mengakses jadwal pertandingan, hasil skor akhir, dan statistik klub PERSIB Bandung. Mendukung CORS dan kompatibel dengan static GitHub Pages maupun Server Localhost Node.js.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    CORS Enabled (*)
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                    JSON Format
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Layout: Endpoint Tester + Live Response */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Endpoints List */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  Daftar Endpoint API
                </h3>

                <div className="space-y-2">
                  {endpointsList.map((ep) => (
                    <div
                      key={ep.path}
                      onClick={() => handleTestApi(ep.path)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        selectedEndpoint === ep.path
                          ? 'bg-blue-950/80 border-blue-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white">
                            GET
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-300">
                            {ep.path}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium">{ep.name}</div>
                        <div className="text-[10px] text-slate-400">{ep.desc}</div>
                      </div>

                      <button className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-white rounded text-[11px] font-semibold transition shrink-0">
                        Test
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live Tester & Response Console */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Endpoint Command Bar */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Live API Request Tester
                    </span>
                    {apiResponseTime !== null && (
                      <span className="text-[11px] font-mono text-emerald-400">
                        Status: <strong className="text-white">{apiStatus} OK</strong> · {apiResponseTime} ms
                      </span>
                    )}
                  </div>

                  {/* Address input */}
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono">
                      <span className="text-emerald-400 font-bold mr-2">GET</span>
                      <span className="text-slate-400 select-none mr-1">{window.location.origin}</span>
                      <span className="text-amber-300 font-bold">{selectedEndpoint}</span>
                    </div>

                    <button
                      onClick={() => handleTestApi(selectedEndpoint)}
                      disabled={testingApi}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0"
                    >
                      {testingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Send Fetch
                    </button>

                    <button
                      onClick={() => copyToClipboard(getFullApiUrl(selectedEndpoint), 'url')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1 shrink-0"
                    >
                      {copiedText === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* JSON Response Console */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      JSON Response Preview
                    </span>
                    {apiResponse && (
                      <button
                        onClick={() => copyToClipboard(apiResponse, 'json')}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-medium"
                      >
                        {copiedText === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedText === 'json' ? 'Copied!' : 'Copy JSON'}
                      </button>
                    )}
                  </div>

                  <div className="p-4 max-h-[380px] overflow-auto font-mono text-xs leading-relaxed text-emerald-300">
                    {testingApi ? (
                      <div className="py-12 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                        <div className="text-slate-400">Mengambil data dari endpoint...</div>
                      </div>
                    ) : apiResponse ? (
                      <pre className="whitespace-pre-wrap font-mono">{apiResponse}</pre>
                    ) : (
                      <div className="py-12 text-center text-slate-500">
                        Klik tombol <strong className="text-emerald-400 font-bold">"Test"</strong> di sebelah kiri untuk menampilkan respons live JSON.
                      </div>
                    )}
                  </div>
                </div>

                {/* Code Generator Snippets */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-blue-400" />
                      Code Snippet untuk Developer
                    </span>

                    {/* Language selector tabs */}
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] gap-1">
                      <button 
                        onClick={() => setCodeLang('js')} 
                        className={`px-2 py-0.5 rounded font-semibold ${codeLang === 'js' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                      >
                        JavaScript
                      </button>
                      <button 
                        onClick={() => setCodeLang('curl')} 
                        className={`px-2 py-0.5 rounded font-semibold ${codeLang === 'curl' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                      >
                        cURL
                      </button>
                      <button 
                        onClick={() => setCodeLang('python')} 
                        className={`px-2 py-0.5 rounded font-semibold ${codeLang === 'python' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                      >
                        Python
                      </button>
                      <button 
                        onClick={() => setCodeLang('php')} 
                        className={`px-2 py-0.5 rounded font-semibold ${codeLang === 'php' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                      >
                        PHP
                      </button>
                      <button 
                        onClick={() => setCodeLang('dart')} 
                        className={`px-2 py-0.5 rounded font-semibold ${codeLang === 'dart' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                      >
                        Flutter
                      </button>
                    </div>
                  </div>

                  <div className="relative bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <pre className="font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap">
                      {getCodeSnippet(codeLang, selectedEndpoint)}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(getCodeSnippet(codeLang, selectedEndpoint), 'snippet')}
                      className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                    >
                      {copiedText === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CLUB SEASON STATISTICS */}
        {/* ========================================================================= */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-400" />
                    Statistik & Performa PERSIB Bandung
                  </h2>
                  <p className="text-xs text-slate-400">Ringkasan hasil pertandingan kandang & tandang season 2024/2025.</p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-amber-400">{stats.summary.points} Poin</div>
                  <div className="text-xs text-slate-400">Total Poin Terkumpul</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Home Record */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Rekor Laga Kandang (Home)
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Menang</div>
                      <div className="text-lg font-bold text-emerald-400">{stats.home_record.won}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Seri</div>
                      <div className="text-lg font-bold text-amber-400">{stats.home_record.drawn}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Kalah</div>
                      <div className="text-lg font-bold text-rose-400">{stats.home_record.lost}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 flex justify-between pt-1">
                    <span>Gol Kandang (GF:GA): <strong>{stats.home_record.goals_for} : {stats.home_record.goals_against}</strong></span>
                    <span>Total Laga: <strong>{stats.home_record.played}</strong></span>
                  </div>
                </div>

                {/* Away Record */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Rekor Laga Tandang (Away)
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Menang</div>
                      <div className="text-lg font-bold text-emerald-400">{stats.away_record.won}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Seri</div>
                      <div className="text-lg font-bold text-amber-400">{stats.away_record.drawn}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400">Kalah</div>
                      <div className="text-lg font-bold text-rose-400">{stats.away_record.lost}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 flex justify-between pt-1">
                    <span>Gol Tandang (GF:GA): <strong>{stats.away_record.goals_for} : {stats.away_record.goals_against}</strong></span>
                    <span>Total Laga: <strong>{stats.away_record.played}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INTEGRATION GUIDE FOR DEVELOPERS */}
        {/* ========================================================================= */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-6 h-6 text-amber-400" />
                  Panduan Penggunaan API untuk Developer Lain
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Bagaimana mengintegrasikan API PERSIB Bandung ke dalam aplikasi Web (React/Vue), Mobile (Flutter/Android/iOS), Discord Bot, maupun WordPress Plugin.
                </p>
              </div>

              {/* Step 1: Base URLs */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Base URL Endpoint
                </h3>
                <p className="text-xs text-slate-300">
                  API ini mendukung 2 opsi base URL tergantung lingkungan eksekusi aplikasi Anda:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400">1. GitHub Pages (Production Static Domain)</div>
                    <div className="font-mono text-slate-300 bg-slate-950 p-1.5 rounded">
                      https://domain-anda.github.io/persib/api/v1/schedule
                    </div>
                    <div className="text-[11px] text-slate-400">Di-generate otomatis oleh script saat build via GitHub Actions.</div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-blue-400">2. Localhost Server (Node.js Express)</div>
                    <div className="font-mono text-slate-300 bg-slate-950 p-1.5 rounded">
                      http://localhost:3000/api/v1/schedule
                    </div>
                    <div className="text-[11px] text-slate-400">Berjalan di server local Node.js saat pengujian dev.</div>
                  </div>
                </div>
              </div>

              {/* Step 2: Google Sheets & Apps Script Architecture */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Arsitektur Alur Data (Google Sheets Backend)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <Database className="w-5 h-5 text-emerald-400 mx-auto" />
                    <div className="font-bold text-white">Google Sheets</div>
                    <div className="text-[10px] text-slate-400">Input Data Pertandingan & Skor</div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <Server className="w-5 h-5 text-amber-400 mx-auto" />
                    <div className="font-bold text-white">Google Apps Script</div>
                    <div className="text-[10px] text-slate-400">Provide JSON via Web App macro</div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <Globe className="w-5 h-5 text-blue-400 mx-auto" />
                    <div className="font-bold text-white">Express / GitHub API</div>
                    <div className="text-[10px] text-slate-400">Serve REST API `/api/v1/`</div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <Code className="w-5 h-5 text-purple-400 mx-auto" />
                    <div className="font-bold text-white">Developer / App Lain</div>
                    <div className="text-[10px] text-slate-400">Konsumsi data di Web/Mobile</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="https://assets.ileague.id/uploads/images/club/lineup_PERSIB_BANDUNG_1786248601.png" alt="PERSIB Logo" className="w-5 h-5 object-contain" />
            <span>&copy; 1933 - 2026 PERSIB Bandung. Match Schedule & REST API Hub.</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('api')} className="hover:text-white transition">Developer API</button>
            <button onClick={() => setActiveTab('guide')} className="hover:text-white transition">Panduan Setup</button>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">
              GitHub Pages Hosted <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
