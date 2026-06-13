import React, { useState, useEffect } from 'react';
import { Swords, Trophy, ShieldAlert, Lock, Trash2, XCircle, LogOut } from 'lucide-react';

const ADMIN_PIN = '1414';

const INITIAL_MATCHES = [
  { id: 1, date: "11.06.2026", time: "22:00", group: "Група A", home: "Мексико", away: "Южна Африка", oddsH: 1.35, oddsD: 4.80, oddsA: 9.00, status: "pending", resultHome: null, resultAway: null },
  { id: 2, date: "12.06.2026", time: "05:00", group: "Група A", home: "Южна Корея", away: "Чехия", oddsH: 2.45, oddsD: 3.10, oddsA: 3.00, status: "pending", resultHome: null, resultAway: null },
  { id: 3, date: "12.06.2026", time: "22:00", group: "Група B", home: "Канада", away: "Босна и Херцеговина", oddsH: 2.05, oddsD: 3.30, oddsA: 3.70, status: "pending", resultHome: null, resultAway: null },
  { id: 4, date: "13.06.2026", time: "04:00", group: "Група D", home: "САЩ", away: "Парагвай", oddsH: 1.85, oddsD: 3.40, oddsA: 4.40, status: "pending", resultHome: null, resultAway: null },
  { id: 5, date: "13.06.2026", time: "22:00", group: "Група B", home: "Катар", away: "Швейцария", oddsH: 6.50, oddsD: 4.00, oddsA: 1.55, status: "pending", resultHome: null, resultAway: null },
  { id: 6, date: "14.06.2026", time: "01:00", group: "Група C", home: "Бразилия", away: "Мароко", oddsH: 1.30, oddsD: 5.00, oddsA: 10.00, status: "pending", resultHome: null, resultAway: null },
  { id: 7, date: "14.06.2026", time: "04:00", group: "Група C", home: "Хаити", away: "Шотландия", oddsH: 8.00, oddsD: 4.50, oddsA: 1.40, status: "pending", resultHome: null, resultAway: null },
  { id: 73, date: "28.06.2026", time: "00:00", group: "1/16 Финал", home: "Победител Група A", away: "Трети Група C/E/F/H/I", oddsH: 0, oddsD: 0, oddsA: 0, status: "pending", resultHome: null, resultAway: null }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [users, setUsers] = useState([
    { name: 'Иван', pass: '123', points: 0, predictions: {} },
    { name: 'Петър', pass: '123', points: 0, predictions: {} }
  ]);
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [activeTab, setActiveTab] = useState('matches');
  
  const [adminPin, setAdminPin] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('results'); 
  const [playerMatchTab, setPlayerMatchTab] = useState('active'); 
  const [dialog, setDialog] = useState({ isOpen: false, type: 'confirm', message: '', onConfirm: null });

  const handleLogout = () => {
      setCurrentUser(null);
      setIsAdmin(false);
      setLoginName('');
      setLoginPass('');
      setActiveTab('matches');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginName.trim() || !loginPass.trim()) return;

    if (loginName === 'Admin' && loginPass === ADMIN_PIN) {
        setIsAdmin(true);
        setCurrentUser('Admin');
        setActiveTab('admin');
        return;
    }

    let existingUser = users.find(u => u.name === loginName.trim());
    
    if (existingUser) {
        if (existingUser.pass === loginPass.trim() || !existingUser.pass) {
            if(!existingUser.pass) {
                setUsers(users.map(u => u.name === existingUser.name ? {...u, pass: loginPass.trim()} : u));
            }
            setCurrentUser(existingUser.name);
            setActiveTab('matches');
        } else {
            setLoginError('Грешна парола за този потребител!');
        }
    } else {
        const newUser = { name: loginName.trim(), pass: loginPass.trim(), points: 0, predictions: {} };
        setUsers([...users, newUser]);
        setCurrentUser(newUser.name);
        setActiveTab('matches');
    }
  };

  const handlePrediction = (matchId, homeStr, awayStr) => {
    setUsers(users.map(u => {
      if (u.name === currentUser) {
        const currentPredictions = { ...u.predictions };
        
        // Ако и двете полета са празни (или изтрити), премахваме изцяло прогнозата за този мач
        if (homeStr === '' && awayStr === '') {
            delete currentPredictions[matchId];
        } else {
            // В противен случай я запазваме, като преобразуваме в число само ако не е празно.
            // Запазваме като низ, ако е празно, за да може input полето да се изчисти
            currentPredictions[matchId] = { 
                h: homeStr === '' ? '' : parseInt(homeStr), 
                a: awayStr === '' ? '' : parseInt(awayStr) 
            };
        }
        return { ...u, predictions: currentPredictions };
      }
      return u;
    }));
  };

  const calculatePoints = (match, prediction) => {
    if (!prediction) return 0;
    // Проверка дали прогнозата е пълна (има и двете цифри и те са числа)
    if (prediction.h === '' || prediction.a === '' || isNaN(prediction.h) || isNaN(prediction.a)) return 0;

    let pts = 0;
    
    if (prediction.h === match.resultHome && prediction.a === match.resultAway) pts = 5;
    else if ((prediction.h - prediction.a) === (match.resultHome - match.resultAway)) pts = 3;
    else if (
        (prediction.h > prediction.a && match.resultHome > match.resultAway) ||
        (prediction.h < prediction.a && match.resultHome < match.resultAway) ||
        (prediction.h === prediction.a && match.resultHome === match.resultAway)
    ) pts = 1;

    // UNDERDOG BONUS - Поправен алгоритъм
    // Бонус се дава САМО ако участникът е получил точки (т.е. е познал знака)
    let hasUnderdogBonus = false;
    if (pts > 0) {
        if (match.resultHome > match.resultAway && match.oddsH >= 4.00) hasUnderdogBonus = true; // Домакин изненада
        else if (match.resultAway > match.resultHome && match.oddsA >= 4.00) hasUnderdogBonus = true; // Гост изненада
        else if (match.resultHome === match.resultAway && match.oddsD >= 4.00) hasUnderdogBonus = true; // Равен изненада
    }

    if(hasUnderdogBonus) pts += 2;

    return pts;
  };

  const publishResult = (matchId, rH, rA) => {
    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, resultHome: rH, resultAway: rA, status: 'finished' } : m);
    setMatches(updatedMatches);
    
    const finishedMatch = updatedMatches.find(m => m.id === matchId);
    
    setUsers(users.map(u => {
       let newPoints = 0;
       updatedMatches.filter(m => m.status === 'finished').forEach(m => {
           newPoints += calculatePoints(m, u.predictions[m.id]);
       });
       return { ...u, points: newPoints };
    }).sort((a,b) => b.points - a.points));
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md text-center mb-6">
          <Trophy size={48} className="text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">World Cup '26</h1>
          <p className="text-slate-400 mb-8">Фирмено Първенство по Прогнози</p>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
               <label className="block text-slate-400 text-sm mb-1 ml-1">Име (без интервали):</label>
               <input 
                 type="text" 
                 placeholder="Напр. Иван_Иванов" 
                 value={loginName}
                 onChange={(e) => setLoginName(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
               />
            </div>
            <div>
               <label className="block text-slate-400 text-sm mb-1 ml-1">Парола:</label>
               <input 
                 type="password" 
                 placeholder="Твоята тайна парола" 
                 value={loginPass}
                 onChange={(e) => setLoginPass(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
               />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
            <button 
              type="submit"
              className="w-full bg-emerald-500 text-slate-900 font-bold p-3 rounded-xl hover:bg-emerald-400 transition-colors mt-2"
            >
              Влез / Регистрирай се
            </button>
          </form>
        </div>

        {/* Admin Login Box */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md text-center">
            <h2 className="text-slate-300 font-semibold mb-4 flex items-center justify-center gap-2">
                <Lock size={18} /> Админ Достъп
            </h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                if(adminPin === ADMIN_PIN) {
                    setIsAdmin(true);
                    setCurrentUser('Admin');
                    setActiveTab('admin');
                    setAdminPin('');
                } else {
                    setDialog({ isOpen: true, type: 'alert', message: 'Грешен ПИН код!' });
                }
            }} className="flex gap-2">
                <input 
                    type="password" 
                    placeholder="ПИН код" 
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2 text-center text-white focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" className="bg-slate-700 text-white font-bold px-4 rounded-xl hover:bg-slate-600 transition-colors">
                    Вход
                </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10 flex justify-between items-center shadow-md">
        <div>
           <div className="text-emerald-400 font-bold text-lg leading-tight flex items-center gap-2">
               <Trophy size={18} /> World Cup '26
           </div>
           <div className="text-xs text-slate-400">Вписан като: <span className="text-white font-semibold">{currentUser}</span></div>
        </div>
        <div className="flex items-center gap-4">
            {currentUser !== 'Admin' && (
                 <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-sm font-mono">
                     <span className="text-emerald-400">{users.find(u => u.name === currentUser)?.points || 0}</span> т.
                 </div>
            )}
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors" title="Изход">
                <LogOut size={20} />
            </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        
        {}
        {activeTab === 'matches' && (
          <div className="flex gap-2 mb-4">
              <button 
                  onClick={() => setPlayerMatchTab('active')} 
                  className={`flex-1 py-2 rounded-lg font-bold transition-colors ${playerMatchTab === 'active' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
              >
                  Предстоящи
              </button>
              <button 
                  onClick={() => setPlayerMatchTab('history')} 
                  className={`flex-1 py-2 rounded-lg font-bold transition-colors ${playerMatchTab === 'history' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
              >
                  История
              </button>
          </div>
        )}

        {activeTab === 'matches' && matches
          .filter(m => !m.home.startsWith('Победител') && !m.home.startsWith('Втори') && !m.home.startsWith('Трети') && !m.home.startsWith('Загубил'))
          .filter(m => playerMatchTab === 'active' ? m.status !== 'finished' : m.status === 'finished')
          .sort((a, b) => playerMatchTab === 'history' ? b.id - a.id : a.id - b.id)
          .map(m => (
          <div key={m.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4 shadow-sm relative overflow-hidden">
            <div className="text-xs text-slate-400 mb-3 flex justify-between">
              <span>{m.group}</span>
              <span>{m.date} | {m.time} ч.</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="text-right w-1/3">
                 <div className="font-bold text-lg sm:text-xl truncate" title={m.home}>{m.home}</div>
                 <div className="text-xs text-slate-500 mt-1">{m.oddsH.toFixed(2)}</div>
              </div>
              
              <div className="w-1/3 flex justify-center items-center gap-2">
                {m.status === 'finished' ? (
                  <div className="bg-slate-900 px-4 py-2 rounded-lg font-mono text-xl font-bold text-emerald-400 border border-emerald-500/30">
                    {m.resultHome} : {m.resultAway}
                  </div>
                ) : currentUser !== 'Admin' ? (
                  <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                    <input 
                      type="number" min="0" max="99" maxLength="2"
                      value={users.find(u=>u.name === currentUser)?.predictions[m.id]?.h ?? ''}
                      onChange={(e) => {
                         const val = e.target.value;
                         if(val.length <= 2) handlePrediction(m.id, val, users.find(u=>u.name === currentUser)?.predictions[m.id]?.a ?? '');
                      }}
                      className="w-11 h-10 bg-slate-800 rounded-lg text-center font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-slate-500 self-center">-</span>
                    <input 
                      type="number" min="0" max="99" maxLength="2"
                      value={users.find(u=>u.name === currentUser)?.predictions[m.id]?.a ?? ''}
                      onChange={(e) => {
                         const val = e.target.value;
                         if(val.length <= 2) handlePrediction(m.id, users.find(u=>u.name === currentUser)?.predictions[m.id]?.h ?? '', val);
                      }}
                      className="w-11 h-10 bg-slate-800 rounded-lg text-center font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ) : (
                    <div className="text-slate-500 text-sm">Очаква се...</div>
                )}
              </div>

              <div className="text-left w-1/3">
                 <div className="font-bold text-lg sm:text-xl truncate" title={m.away}>{m.away}</div>
                 <div className="text-xs text-slate-500 mt-1">{m.oddsA.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="text-center">
                 <div className="text-xs text-slate-500 mb-2">X: {m.oddsD.toFixed(2)}</div>
            </div>

            {/* Other predictions view */}
            <div className="mt-4 pt-3 border-t border-slate-700/50">
               <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Прогнози на колегите:</div>
               <div className="flex flex-wrap gap-2">
                 {users.filter(u => u.name !== currentUser && u.predictions[m.id]).map(u => (
                   <div key={u.name} className="bg-slate-900/50 rounded-md px-2 py-1 text-xs flex gap-1 border border-slate-800">
                     <span className="text-slate-400">{u.name}:</span>
                     {m.status === 'finished' ? (
                          // Добавяме предпазна проверка тук, за да не гърми, ако някой е въвел само една цифра
                          u.predictions[m.id].h !== '' && u.predictions[m.id].a !== '' ? (
                              <span className={calculatePoints(m, u.predictions[m.id]) > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                  {u.predictions[m.id].h}-{u.predictions[m.id].a} 
                                  {calculatePoints(m, u.predictions[m.id]) > 0 && ` (+${calculatePoints(m, u.predictions[m.id])})`}
                              </span>
                          ) : (
                              <span className="text-slate-500">Непълна</span>
                          )
                     ) : (
                          <span className="text-slate-600 italic">Скрито</span>
                     )}
                   </div>
                 ))}
                 {users.filter(u => u.name !== currentUser && u.predictions[m.id]).length === 0 && (
                     <span className="text-xs text-slate-600 italic">Все още няма прогнози.</span>
                 )}
               </div>
            </div>
          </div>
        ))}
        
        {activeTab === 'matches' && matches.filter(m => !m.home.startsWith('Победител') && !m.home.startsWith('Втори')).filter(m => playerMatchTab === 'active' ? m.status !== 'finished' : m.status === 'finished').length === 0 && (
           <div className="text-center text-slate-500 py-8 bg-slate-800 rounded-xl border border-slate-700 shadow-sm">
               {playerMatchTab === 'active' ? 'Няма предстоящи мачове в този списък.' : 'Все още няма завършили мачове.'}
           </div>
        )}

        {}
        {activeTab === 'standings' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
             <div className="bg-slate-700 p-4 font-bold flex text-slate-300">
                <div className="w-12 text-center">#</div>
                <div className="flex-1">Играч</div>
                <div className="w-20 text-center text-emerald-400">Точки</div>
             </div>
             {users.map((u, i) => (
                <div key={u.name} className={`flex p-4 border-b border-slate-700/50 items-center ${u.name === currentUser ? 'bg-slate-700/30' : ''}`}>
                   <div className="w-12 text-center font-bold text-slate-500">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                   </div>
                   <div className={`flex-1 font-semibold ${u.name === currentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {u.name}
                      <div className="text-xs text-slate-500 font-normal mt-0.5">
                          {Object.keys(u.predictions).length} прогнозирани мача
                      </div>
                   </div>
                   <div className="w-20 text-center font-mono font-bold text-lg text-emerald-400">
                      {u.points}
                   </div>
                </div>
             ))}
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === 'rules' && (
           <div className="space-y-4">
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                  <h3 className="font-bold text-emerald-400 mb-3 flex items-center gap-2"><Trophy size={18}/> Матрица на точките</h3>
                  <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex justify-between border-b border-slate-700 pb-2">
                          <span>Точен резултат <span className="text-slate-500 text-xs ml-1">(напр. 2:1 &rarr; 2:1)</span></span>
                          <span className="font-bold text-emerald-400">+5 т.</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-700 pb-2">
                          <span>Точна разлика <span className="text-slate-500 text-xs ml-1">(напр. 3:1 &rarr; 2:0)</span></span>
                          <span className="font-bold text-emerald-400">+3 т.</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-700 pb-2">
                          <span>Точен знак <span className="text-slate-500 text-xs ml-1">(напр. 2:0 &rarr; 1:0)</span></span>
                          <span className="font-bold text-emerald-400">+1 т.</span>
                      </li>
                      <li className="flex justify-between text-yellow-400 bg-yellow-400/10 p-2 rounded mt-2">
                          <span><strong>Underdog Бонус:</strong> Познат знак за отбор с коеф. ≥ 4.00</span>
                          <span className="font-bold">+2 т.</span>
                      </li>
                  </ul>
              </div>
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                  <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><ShieldAlert size={18}/> Правила за честна игра</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                      <li>Прогнози могат да се въвеждат или променят до първия съдийски сигнал.</li>
                      <li>Прогнозите на другите играчи са скрити, докато мачът не приключи (за да се избегне преписване).</li>
                      <li>Администраторът въвежда финалните резултати. При спор, решението на Админа (God Mode) е финално.</li>
                  </ul>
              </div>
           </div>
        )}

        {}
        {activeTab === 'admin' && isAdmin && (
           <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-xl border border-rose-900/50 shadow-[0_0_15px_rgba(225,29,72,0.1)]">
                 <div className="flex gap-2 mb-4 border-b border-slate-700 pb-4">
                    <button 
                        onClick={() => setAdminSubTab('results')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${adminSubTab === 'results' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                        Резултати
                    </button>
                    <button 
                        onClick={() => setAdminSubTab('players')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${adminSubTab === 'players' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                        Играчи
                    </button>
                 </div>

                 {adminSubTab === 'results' && (
                     <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-rose-400 flex items-center gap-2"><Lock size={18}/> Въвеждане на резултати</h3>
                            <button 
                                onClick={() => setShowAllMatches(!showAllMatches)}
                                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full transition-colors text-white"
                            >
                                {showAllMatches ? "Покажи Предстоящи" : "Покажи Всички"}
                            </button>
                        </div>
                        {matches
                            .filter(m => showAllMatches || m.status === 'finished' || m.id <= 10) 
                            .sort((a,b) => a.id - b.id)
                            .map(m => (
                            <div key={m.id} className={`bg-slate-900 p-3 rounded-lg border mb-2 flex items-center justify-between ${m.status === 'finished' ? 'border-emerald-500/30' : 'border-slate-700'}`}>
                                <div className="text-sm truncate w-1/2">
                                    <div className="text-slate-500 text-xs mb-1">
                                        {m.id >= 73 && <span className="bg-rose-900/50 text-rose-300 px-1 py-0.5 rounded mr-1">Елиминации</span>}
                                        Мач {m.id} | {m.group}
                                    </div>
                                    <div className="font-bold">{m.home}</div>
                                    <div className="font-bold">{m.away}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {m.status === 'finished' ? (
                                        <div className="text-emerald-400 font-mono font-bold px-3 py-1 bg-slate-800 rounded">
                                            {m.resultHome} : {m.resultAway}
                                        </div>
                                    ) : (
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            // Извличане на стойностите директно от елементите на формата по име
                                            const hVal = e.target.elements.homeResult.value;
                                            const aVal = e.target.elements.awayResult.value;
                                            const h = parseInt(hVal);
                                            const a = parseInt(aVal);
                                            
                                            // Проверка дали са въведени валидни числа
                                            if(!isNaN(h) && !isNaN(a)) {
                                              publishResult(m.id, h, a);
                                            } else {
                                              setDialog({ isOpen: true, type: 'alert', message: 'Моля, въведете валидни числа и за двата отбора.' });
                                            }
                                        }} className="flex gap-1 items-center">
                                            <input name="homeResult" type="number" min="0" className="w-10 h-8 bg-slate-800 rounded border border-slate-600 text-center font-bold text-white p-1" required/>
                                            <span className="text-slate-500">-</span>
                                            <input name="awayResult" type="number" min="0" className="w-10 h-8 bg-slate-800 rounded border border-slate-600 text-center font-bold text-white p-1" required/>
                                            <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded font-bold text-xs ml-2 transition-colors">Публикувай</button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ))}
                     </>
                 )}

                 {adminSubTab === 'players' && (
                     <div>
                         <h3 className="font-bold text-rose-400 mb-4 flex items-center gap-2"><Lock size={18}/> Мениджър на играчи</h3>
                         {users.map(u => (
                             <div key={u.name} className="bg-slate-900 p-3 rounded-lg border border-slate-700 mb-2 flex items-center justify-between">
                                 <div>
                                     <div className="font-bold text-white">{u.name}</div>
                                     <div className="text-xs text-slate-400">Прогнози: {Object.keys(u.predictions).length} | Точки: {u.points}</div>
                                 </div>
                                 <div className="flex gap-2">
                                     <button 
                                        onClick={() => {
                                            setDialog({
                                                isOpen: true,
                                                type: 'confirm',
                                                message: `Изчистване на всички прогнози на ${u.name}?`,
                                                onConfirm: () => {
                                                    setUsers(users.map(user => user.name === u.name ? {...user, predictions: {}, points: 0} : user));
                                                    setDialog({ isOpen: false, type: 'confirm', message: '', onConfirm: null });
                                                }
                                            });
                                        }}
                                        className="p-2 bg-yellow-600/20 text-yellow-500 rounded hover:bg-yellow-600/40 transition-colors" title="Занули прогнози"
                                     >
                                         <XCircle size={16} />
                                     </button>
                                     <button 
                                        onClick={() => {
                                            setDialog({
                                                isOpen: true,
                                                type: 'confirm',
                                                message: `Изтриване на играч ${u.name} завинаги?`,
                                                onConfirm: () => {
                                                    setUsers(users.filter(user => user.name !== u.name));
                                                    setDialog({ isOpen: false, type: 'confirm', message: '', onConfirm: null });
                                                }
                                            });
                                        }}
                                        className="p-2 bg-red-600/20 text-red-500 rounded hover:bg-red-600/40 transition-colors" title="Изтрий играч"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
              </div>
           </div>
        )}

      </main>

      {}
      <nav className="fixed bottom-0 w-full bg-slate-800 border-t border-slate-700 flex justify-around p-2 pb-safe max-w-2xl left-1/2 -translate-x-1/2">
        <NavButton active={activeTab==='matches'} onClick={() => setActiveTab('matches')} icon={<Swords size={20}/>} label="Мачове" />
        <NavButton active={activeTab==='standings'} onClick={() => setActiveTab('standings')} icon={<Trophy size={20}/>} label="Класиране" />
        <NavButton active={activeTab==='rules'} onClick={() => setActiveTab('rules')} icon={<ShieldAlert size={20}/>} label="Правила" />
        {isAdmin && <NavButton active={activeTab==='admin'} onClick={() => setActiveTab('admin')} icon={<Lock size={20} className="text-rose-400"/>} label="Админ" />}
      </nav>

      {/* Custom Dialog Modal */}
      {dialog.isOpen && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
              <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 w-full max-w-sm text-center">
                  <ShieldAlert size={48} className={`mx-auto mb-4 ${dialog.type === 'confirm' ? 'text-rose-500' : 'text-yellow-500'}`} />
                  <h3 className="text-lg font-bold text-white mb-6">{dialog.message}</h3>
                  <div className="flex gap-4">
                      {dialog.type === 'confirm' && (
                          <button
                              onClick={() => setDialog({ isOpen: false, type: 'confirm', message: '', onConfirm: null })}
                              className="flex-1 bg-slate-700 text-white font-bold py-2 rounded-xl hover:bg-slate-600 transition-colors"
                          >
                              Отказ
                          </button>
                      )}
                      <button
                          onClick={() => {
                              if (dialog.onConfirm) dialog.onConfirm();
                              else setDialog({ isOpen: false, type: 'confirm', message: '', onConfirm: null });
                          }}
                          className={`flex-1 text-white font-bold py-2 rounded-xl transition-colors ${dialog.type === 'confirm' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                      >
                          {dialog.type === 'confirm' ? 'Потвърди' : 'Разбрах'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center p-2 w-full transition-colors ${active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
  >
    {icon}
    <span className="text-[10px] mt-1 font-semibold">{label}</span>
  </button>
);
