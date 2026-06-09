import React, { useState, useEffect } from 'react';
import { Swords, Trophy, ShieldAlert, Lock, Trash2, XCircle, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE КОНФИГУРАЦИЯ ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyCBEEbtGL-rGXE8iF9J4vIkwCu22B2sIj0",
      authDomain: "world-cup-2026-office.firebaseapp.com",
      projectId: "world-cup-2026-office",
      storageBucket: "world-cup-2026-office.firebasestorage.app",
      messagingSenderId: "881867300185",
      appId: "1:881867300185:web:98015141d6438428388048",
      measurementId: "G-K944TBKZP6"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const globalAppId = typeof __app_id !== 'undefined' ? __app_id : 'office-world-cup-2026';
const safeAppId = globalAppId.replace(/\//g, '_');

const ADMIN_PIN = '1414';

const INITIAL_MATCHES = [
  { id: 1, date: '11 Юни 2026', time: '22:00', home: 'Мексико', away: 'Южна Корея', oddsH: 2.10, oddsD: 3.20, oddsA: 3.50, status: 'upcoming', resultHome: null, resultAway: null },
  { id: 2, date: '12 Юни 2026', time: '16:00', home: 'Канада', away: 'Мароко', oddsH: 2.50, oddsD: 3.10, oddsA: 2.80, status: 'upcoming', resultHome: null, resultAway: null },
  { id: 3, date: '12 Юни 2026', time: '19:00', home: 'САЩ', away: 'Гана', oddsH: 1.80, oddsD: 3.40, oddsA: 4.50, status: 'upcoming', resultHome: null, resultAway: null },
  { id: 4, date: '12 Юни 2026', time: '22:00', home: 'Бразилия', away: 'Сърбия', oddsH: 1.40, oddsD: 4.50, oddsA: 8.00, status: 'upcoming', resultHome: null, resultAway: null },
  { id: 5, date: '13 Юни 2026', time: '16:00', home: 'Испания', away: 'Нигерия', oddsH: 1.60, oddsD: 3.80, oddsA: 5.50, status: 'upcoming', resultHome: null, resultAway: null },
  { id: 73, date: '28 Юни 2026', time: '18:00', home: 'Победител Група A', away: 'Трети Група C/E/F/H/I', oddsH: 1.90, oddsD: 3.30, oddsA: 4.00, status: 'upcoming', resultHome: null, resultAway: null },
  { id: 74, date: '28 Юни 2026', time: '22:00', home: 'Втори Група B', away: 'Втори Група C', oddsH: 2.50, oddsD: 3.00, oddsA: 2.80, status: 'upcoming', resultHome: null, resultAway: null }
];

// Помощна функция за генериране на сигурен SHA-256 хеш на паролата в браузъра
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function App() {
  const [isTailwindLoaded, setIsTailwindLoaded] = useState(false);
  const [fbUser, setFbUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // 1. Зареждане на Tailwind CSS
  useEffect(() => {
    if (document.getElementById('tailwind-cdn')) {
      setIsTailwindLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'tailwind-cdn';
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => setIsTailwindLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 2. Инициализация на Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch(e) { console.error("Firebase Auth Error:", e); setIsSyncing(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
        setFbUser(user);
        if(!user) setIsSyncing(false);
    });
    return () => unsubscribe();
  }, []);

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  
  // 3. Синхронизация с базата данни в реално време
  useEffect(() => {
    if (!fbUser) return;
    const docRef = doc(db, 'artifacts', safeAppId, 'public', 'data', 'worldCupState', 'main');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.users) setUsers(data.users);
        if (data.matches) setMatches(data.matches);
      } else {
        setDoc(docRef, { users: [], matches: INITIAL_MATCHES });
      }
      setIsSyncing(false);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [fbUser]);

  const syncData = async (newUsers, newMatches) => {
    if (!fbUser) return;
    try {
      const docRef = doc(db, 'artifacts', safeAppId, 'public', 'data', 'worldCupState', 'main');
      await setDoc(docRef, {
        users: newUsers || users,
        matches: newMatches || matches
      }, { merge: true });
    } catch(e) { console.error("Sync Error:", e); }
  };

  const [activeTab, setActiveTab] = useState('matches');
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('results');
  const [dialog, setDialog] = useState({ isOpen: false, type: 'confirm', message: '', onConfirm: null });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginName.trim() || !loginPass.trim()) return;

    const hashed = await hashPassword(loginPass);
    const existingUser = users.find(u => u.name === loginName.trim());
    
    if (existingUser) {
        // Проверяваме дали въведеният хеш съвпада, ИЛИ за старите играчи - дали чистата им стара парола съвпада
        if (existingUser.password === hashed || existingUser.password === loginPass) {
            // Ако потребителят е влязъл със стара парола на чист текст, автоматично я превръщаме в SHA-256 хеш
            if (existingUser.password === loginPass) {
                const newUsers = users.map(u => u.name === existingUser.name ? {...u, password: hashed} : u);
                setUsers(newUsers);
                await syncData(newUsers, null);
            }
            setCurrentUser(existingUser.name);
            setActiveTab('matches');
        } else if (!existingUser.password) {
            // Защита за акаунти съвсем без парола
            const newUsers = users.map(u => u.name === existingUser.name ? {...u, password: hashed} : u);
            setUsers(newUsers);
            await syncData(newUsers, null);
            setCurrentUser(existingUser.name);
            setActiveTab('matches');
        } else {
            setDialog({ isOpen: true, type: 'alert', message: 'Грешна парола за този потребител!' });
        }
    } else {
        // Регистрация на нов потребител - директно записваме SHA-256 хеша в базата данни
        const newUsers = [...users, { name: loginName.trim(), password: hashed, predictions: {}, points: 0 }];
        setUsers(newUsers);
        await syncData(newUsers, null);
        setCurrentUser(loginName.trim());
        setActiveTab('matches');
    }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setIsAdmin(false);
      setLoginName('');
      setLoginPass('');
      setActiveTab('matches');
  };

  const handlePrediction = (matchId, h, a) => {
    const newUsers = users.map(u => {
      if (u.name === currentUser) {
        const newPreds = { ...u.predictions };
        if (h === '' && a === '') {
            delete newPreds[matchId];
        } else {
            newPreds[matchId] = { h, a };
        }
        return { ...u, predictions: newPreds };
      }
      return u;
    });
    setUsers(newUsers);
    syncData(newUsers, null);
  };

  const calculatePoints = (match, prediction) => {
    if (!prediction) return 0;
    if (prediction.h === '' || prediction.a === '' || isNaN(prediction.h) || isNaN(prediction.a)) return 0;

    let pts = 0;
    const predH = parseInt(prediction.h);
    const predA = parseInt(prediction.a);
    
    if (predH === match.resultHome && predA === match.resultAway) pts = 5;
    else if ((predH - predA) === (match.resultHome - match.resultAway)) pts = 3;
    else if (
        (predH > predA && match.resultHome > match.resultAway) ||
        (predH < predA && match.resultHome < match.resultAway) ||
        (predH === predA && match.resultHome === match.resultAway)
    ) pts = 1;

    let hasUnderdogBonus = false;
    if (pts > 0) {
        if (match.resultHome > match.resultAway && match.oddsH >= 4.00) hasUnderdogBonus = true;
        else if (match.resultAway > match.resultHome && match.oddsA >= 4.00) hasUnderdogBonus = true;
        else if (match.resultHome === match.resultAway && match.oddsD >= 4.00) hasUnderdogBonus = true;
    }

    if(hasUnderdogBonus) pts += 2;

    return pts;
  };

  const publishResult = (matchId, homeGoals, awayGoals) => {
    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, resultHome: homeGoals, resultAway: awayGoals, status: 'finished' } : m);
    
    const newUsers = users.map(user => {
      let totalPoints = 0;
      updatedMatches.filter(m => m.status === 'finished').forEach(m => {
          totalPoints += calculatePoints(m, user.predictions[m.id]);
      });
      return { ...user, points: totalPoints };
    });

    setMatches(updatedMatches);
    setUsers(newUsers);
    syncData(newUsers, updatedMatches);
  };

  // Екран за зареждане
  if (!isTailwindLoaded || isSyncing) {
      return (
          <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontFamily: 'sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Trophy size={24} /> Синхронизиране със сървъра...
              </div>
          </div>
      );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-emerald-400 font-bold text-4xl mb-8 flex items-center gap-3">
          <Trophy size={40} /> World Cup '26
        </div>
        
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md mb-6">
          <h2 className="text-white text-xl font-bold mb-6 text-center">Вход / Регистрация</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-slate-400 text-sm mb-1">Име (Никнейм)</label>
                <input 
                type="text" 
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Напр. Иван88"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
            </div>
            <div>
                <label className="block text-slate-400 text-sm mb-1">Парола</label>
                <input 
                type="password" 
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Въведи парола"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors mt-2"
            >
              Влез в играта
            </button>
            <p className="text-xs text-slate-500 text-center mt-4">Ако името не съществува, ще бъде създаден нов профил с тази парола.</p>
          </form>
        </div>

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
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="ПИН"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-center tracking-widest focus:outline-none focus:border-rose-500"
                />
                <button type="submit" className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-white font-bold transition-colors">
                    Вход
                </button>
            </form>
        </div>

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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      
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
        
        {activeTab === 'matches' && matches
          .filter(m => !m.home.startsWith('Победител') && !m.home.startsWith('Втори') && !m.home.startsWith('Трети') && !m.home.startsWith('Загубил'))
          .map(m => (
          <div key={m.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-3 text-xs text-slate-400">
              <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">Групова фаза</span>
              <span>{m.date} | {m.time}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-right flex-1">
                <div className="font-bold text-lg truncate">{m.home}</div>
                <div className="text-xs text-emerald-500/70">{m.oddsH.toFixed(2)}</div>
              </div>
              
              <div className="px-4 flex flex-col items-center">
                {m.status === 'finished' ? (
                  <div className="text-2xl font-black text-emerald-400 bg-slate-900 px-4 py-1 rounded-lg border border-emerald-900/50">
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
                    <div className="text-sm font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-lg">VS</div>
                )}
                <div className="text-xs text-slate-500 mt-1">X: {m.oddsD.toFixed(2)}</div>
              </div>
              
              <div className="text-left flex-1">
                <div className="font-bold text-lg truncate">{m.away}</div>
                <div className="text-xs text-emerald-500/70">{m.oddsA.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-400 mb-2 flex justify-between">
                <span>Прогнози на колегите:</span>
                {m.status !== 'finished' && <span className="text-rose-400/80 flex items-center gap-1"><Lock size={12}/> Скрити до мача</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {users.filter(u => u.name !== currentUser && u.predictions[m.id]).map(u => {
                  const p = u.predictions[m.id];
                  const hasFullPred = (p.h !== '' && p.a !== '');
                  const isVisible = m.status === 'finished';
                  
                  return (
                  <div key={u.name} className="bg-slate-900/50 text-xs px-2 py-1 rounded border border-slate-700/50 flex gap-1 items-center">
                    <span className="font-semibold text-slate-300">{u.name}:</span>
                    {isVisible ? (
                        <span className="text-emerald-400">{hasFullPred ? `${p.h}-${p.a}` : 'Неп.'}</span>
                    ) : (
                        <span className="text-slate-500">?-?</span>
                    )}
                  </div>
                )})}
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'standings' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center gap-2">
              <Trophy className="text-yellow-500" />
              <h2 className="font-bold text-lg">Класиране</h2>
            </div>
            <div className="p-0">
              {[...users].sort((a,b) => b.points - a.points).map((u, index) => (
                <div key={u.name} className={`flex justify-between items-center p-4 border-b border-slate-700/50 ${index === 0 ? 'bg-yellow-500/10' : index === 1 ? 'bg-slate-300/10' : index === 2 ? 'bg-orange-500/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-6 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-400' : 'text-slate-500'}`}>
                      {index + 1}.
                    </span>
                    <span className="font-semibold">{u.name}</span>
                  </div>
                  <div className="font-mono text-lg text-emerald-400 font-bold">
                    {u.points} <span className="text-xs text-slate-500 font-normal">т.</span>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center text-slate-500">Все още няма регистрирани играчи.</div>}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Swords /> Система за точкуване
              </h2>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shrink-0">5</div>
                  <div><strong className="text-white block">Точен резултат</strong> Познаваш точния брой голове. <br/><span className="text-slate-500">Пример: Прогноза 2:1 &rarr; Резултат 2:1</span></div>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shrink-0">3</div>
                  <div><strong className="text-white block">Голова разлика</strong> Познаваш знака и разликата. <br/><span className="text-slate-500">Пример: Прогноза 3:1 &rarr; Резултат 2:0</span></div>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shrink-0">1</div>
                  <div><strong className="text-white block">Точен знак</strong> Познаваш само крайния изход (1, X, 2). <br/><span className="text-slate-500">Пример: Прогноза 1:0 &rarr; Резултат 3:1</span></div>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-rose-900/20 p-6 rounded-2xl border border-rose-900/50">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-rose-400">
                ⭐ Underdog Бонус
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Ако познаеш знака на изненадващ резултат (отбор или равенство с коефициент над <strong className="text-white">4.00</strong>), получаваш автоматично <strong className="text-rose-400">+2 бонус точки</strong> към стандартните!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-4">
             <div className="flex gap-2 mb-6">
                <button onClick={() => setAdminSubTab('results')} className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${adminSubTab === 'results' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}>Резултати</button>
                <button onClick={() => setAdminSubTab('players')} className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${adminSubTab === 'players' ? 'bg-rose-900/50 text-rose-200' : 'bg-slate-800 text-slate-400'}`}>Играчи</button>
             </div>

             {adminSubTab === 'results' && (
                <>
                    <div className="flex justify-between items-center mb-4 bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <span className="text-sm text-slate-400">Филтър мачове:</span>
                        <button 
                            onClick={() => setShowAllMatches(!showAllMatches)}
                            className="text-xs bg-slate-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                        >
                            {showAllMatches ? 'Покажи само предстоящи' : 'Покажи ВСИЧКИ (104)'}
                        </button>
                    </div>

                    {matches
                        .filter(m => showAllMatches || m.status === 'upcoming')
                        .map(m => (
                    <div key={m.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>#{m.id} | {m.date}</span>
                            {m.home.startsWith('Победител') && <span className="text-amber-500 font-bold">Елиминация</span>}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 font-semibold truncate text-right">{m.home}</div>
                            
                            {m.status === 'finished' ? (
                                <div className="bg-slate-900 px-4 py-2 rounded-lg font-bold text-emerald-400 border border-emerald-900">
                                    {m.resultHome} : {m.resultAway}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const hVal = e.target.elements.homeResult.value;
                                        const aVal = e.target.elements.awayResult.value;
                                        const h = parseInt(hVal);
                                        const a = parseInt(aVal);
                                        
                                        if(!isNaN(h) && !isNaN(a)) {
                                          publishResult(m.id, h, a);
                                        } else {
                                          setDialog({ isOpen: true, type: 'alert', message: 'Моля, въведете валидни числа.' });
                                        }
                                    }} className="flex gap-1 items-center">
                                        <input name="homeResult" type="number" min="0" required className="w-10 h-10 bg-slate-900 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none" />
                                        <span className="text-slate-500">-</span>
                                        <input name="awayResult" type="number" min="0" required className="w-10 h-10 bg-slate-900 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none" />
                                        <button type="submit" className="ml-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded transition-colors">
                                            Запази
                                        </button>
                                    </form>
                                </div>
                            )}
                            
                            <div className="flex-1 font-semibold truncate text-left">{m.away}</div>
                        </div>
                    </div>
                    ))}
                </>
             )}

             {adminSubTab === 'players' && (
                 <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                     <h3 className="font-bold text-rose-400 mb-4 flex items-center gap-2"><Lock size={16}/> Мениджър на играчи</h3>
                     <div className="space-y-3">
                         {users.map(u => (
                             <div key={u.name} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700/50">
                                 <div>
                                     <div className="font-bold">{u.name}</div>
                                     <div className="text-xs text-slate-500">Прогнози: {Object.keys(u.predictions).length} | {u.points} т.</div>
                                 </div>
                                 <div className="flex gap-2">
                                     <button 
                                        onClick={() => {
                                            setDialog({
                                                isOpen: true,
                                                type: 'confirm',
                                                message: `Изчистване на всички прогнози на ${u.name}?`,
                                                onConfirm: () => {
                                                    const newUsers = users.map(user => user.name === u.name ? {...user, predictions: {}, points: 0} : user);
                                                    setUsers(newUsers);
                                                    syncData(newUsers, null);
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
                                                    const newUsers = users.filter(user => user.name !== u.name);
                                                    setUsers(newUsers);
                                                    syncData(newUsers, null);
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
                         {users.length === 0 && <div className="text-center text-slate-500 text-sm">Няма регистрирани играчи.</div>}
                     </div>
                 </div>
             )}
          </div>
        )}

      </main>

      <nav className="fixed bottom-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe pt-2 px-6 flex justify-around items-center z-50">
        <NavButton active={activeTab==='matches'} onClick={() => setActiveTab('matches')} icon={<Swords size={20}/>} label="Мачове" />
        <NavButton active={activeTab==='standings'} onClick={() => setActiveTab('standings')} icon={<Trophy size={20}/>} label="Класиране" />
        <NavButton active={activeTab==='rules'} onClick={() => setActiveTab('rules')} icon={<ShieldAlert size={20}/>} label="Правила" />
        {isAdmin && <NavButton active={activeTab==='admin'} onClick={() => setActiveTab('admin')} icon={<Lock size={20} className="text-rose-400"/>} label="Админ" />}
      </nav>

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
    className={`flex flex-col items-center gap-1 p-2 transition-colors ${active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon}
    <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
  </button>
);
