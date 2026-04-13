/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  School, 
  Clock, 
  MapPin, 
  Calendar, 
  Ruler, 
  Save, 
  Search,
  ChevronRight,
  Home,
  Activity,
  Weight,
  ArrowRight,
  Trophy,
  Info,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  PlusCircle,
  Trash2,
  Edit,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { db, auth } from './firebase';
import { StudentData, TestResults, EvaluationResult, SavedStudent } from './types';
import * as norms from './data/norms';

const STATIONS = [
  { id: 1, name: 'Recepción', icon: <User size={18} /> },
  { id: 2, name: 'Peso y Estatura', icon: <Weight size={18} /> },
  { id: 3, name: 'Calentamiento', icon: <Activity size={18} /> },
  { id: 4, name: 'Flexibilidad', icon: <Ruler size={18} /> },
  { id: 5, name: 'Velocidad', icon: <Clock size={18} /> },
  { id: 6, name: 'Fuerza Superior', icon: <Activity size={18} /> },
  { id: 7, name: 'Fuerza Abdomen', icon: <Activity size={18} /> },
  { id: 8, name: 'Fuerza Inferior', icon: <Activity size={18} /> },
  { id: 9, name: 'Resistencia', icon: <Clock size={18} /> },
  { id: 10, name: 'Evaluación', icon: <Trophy size={18} /> },
];

export default function App() {
  const [view, setView] = useState<'form' | 'dashboard'>('form');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savedStudents, setSavedStudents] = useState<SavedStudent[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentStation, setCurrentStation] = useState(1);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentData>({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    sexo: '',
    fechaNacimiento: { dia: '', mes: '', año: '' },
    escuela: '',
    turno: '',
    direccion: { colonia: '', numeroExterior: '', numeroInterior: '' }
  });

  const [results, setResults] = useState<TestResults>({
    peso: '',
    estatura: '',
    flexibilidad: '',
    velocidad: '',
    lagartijas: '',
    abdominales: '',
    salto: '',
    resistencia: ''
  });

  const [measurement, setMeasurement] = useState({
    lugar: '',
    fecha: { 
      dia: new Date().getDate().toString(), 
      mes: (new Date().getMonth() + 1).toString(), 
      año: new Date().getFullYear().toString() 
    }
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'score' | 'best_sport'>('date');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedStudents = useMemo(() => {
    let students = [...savedStudents];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      students = students.filter(s => {
        const fullName = `${s.primerNombre} ${s.segundoNombre} ${s.primerApellido} ${s.segundoApellido}`.toLowerCase();
        return fullName.includes(term);
      });
    }

    switch (sortBy) {
      case 'name':
        return students.sort((a, b) => a.primerApellido.localeCompare(b.primerApellido));
      case 'score':
        return students.sort((a, b) => (b.evaluation?.totalPoints || 0) - (a.evaluation?.totalPoints || 0));
      case 'best_sport':
        return students.sort((a, b) => {
          const percentilesA = a.evaluation?.percentiles;
          const percentilesB = b.evaluation?.percentiles;
          
          const maxA = percentilesA ? Math.max(...Object.values(percentilesA) as number[]) : 0;
          const maxB = percentilesB ? Math.max(...Object.values(percentilesB) as number[]) : 0;
          return maxB - maxA;
        });
      default:
        return students;
    }
  }, [savedStudents, sortBy, searchTerm]);

  // Auth & Firestore Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: 'scout',
            createdAt: serverTimestamp()
          });
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedStudents([]);
      return;
    }

    const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedStudent[];
      setSavedStudents(students);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("Error: Este dominio no está autorizado en Firebase. Por favor, añade '" + window.location.hostname + "' a la lista de dominios autorizados en la Consola de Firebase (Authentication > Settings > Authorized domains).");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // No hacer nada si el usuario cerró la ventana
      } else {
        alert("Error al iniciar sesión: " + error.message);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  // Calculate age based on the year of birth vs current year (as per PDF rule)
  const age = useMemo(() => {
    const birthYear = parseInt(student.fechaNacimiento.año);
    if (!isNaN(birthYear)) {
      return new Date().getFullYear() - birthYear;
    }
    return 0;
  }, [student.fechaNacimiento.año]);

  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return Infinity;
    const parts = timeStr.split('.');
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    return mins * 60 + secs;
  };

  const findPercentile = (value: number, table: number[], lowerIsBetter: boolean) => {
    if (lowerIsBetter) {
      // For speed and resistance, lower values are higher percentiles
      // Table is [10, 20, 30, 40, 50, 60, 70, 80, 90]
      // Values in table are usually descending
      for (let i = 8; i >= 0; i--) {
        if (value <= table[i]) return norms.PERCENTILES[i];
      }
      return 0;
    } else {
      // For pushups, situps, jump, higher values are higher percentiles
      // Values in table are usually ascending
      for (let i = 8; i >= 0; i--) {
        if (value >= table[i]) return norms.PERCENTILES[i];
      }
      return 0;
    }
  };

  const evaluation: EvaluationResult | null = useMemo(() => {
    if (!student.sexo || age < 6 || age > 14) return null;

    const isMale = student.sexo === 'M';
    const speedTable = isMale ? norms.SPEED_MALE[age] : norms.SPEED_FEMALE[age];
    const pushupsTable = isMale ? norms.PUSHUPS_MALE[age] : norms.PUSHUPS_FEMALE[age];
    const situpsTable = isMale ? norms.SITUPS_MALE[age] : norms.SITUPS_FEMALE[age];
    const jumpTable = isMale ? norms.JUMP_MALE[age] : norms.JUMP_FEMALE[age];
    const resistanceTable = isMale ? norms.RESISTANCE_MALE[age] : norms.RESISTANCE_FEMALE[age];

    if (!speedTable || !pushupsTable || !situpsTable || !jumpTable || !resistanceTable) return null;

    const pVelocidad = findPercentile(parseFloat(results.velocidad), speedTable, true);
    const pLagartijas = findPercentile(parseInt(results.lagartijas), pushupsTable, false);
    const pAbdominales = findPercentile(parseInt(results.abdominales), situpsTable, false);
    const pSalto = findPercentile(parseInt(results.salto), jumpTable, false);
    
    // Resistance table values are min.sec, convert to seconds
    const resSeconds = timeToSeconds(results.resistencia);
    const resTableSeconds = resistanceTable.map(v => {
      const parts = v.toString().split('.');
      const m = parseInt(parts[0]) || 0;
      const s = parseInt(parts[1]) || 0;
      return m * 60 + s;
    });
    const pResistencia = findPercentile(resSeconds, resTableSeconds, true);

    const totalPoints = pVelocidad + pLagartijas + pAbdominales + pSalto + pResistencia;

    let classification = '';
    if (totalPoints >= 330) classification = 'Muy bueno';
    else if (totalPoints >= 240) classification = 'Bueno';
    else if (totalPoints >= 150) classification = 'Regular';
    else if (totalPoints >= 60) classification = 'Deficiente';
    else classification = 'Mal';

    const heightTalentThreshold = isMale ? norms.HEIGHT_TALENT_MALE[age] : norms.HEIGHT_TALENT_FEMALE[age];
    const isTalentInHeight = parseFloat(results.estatura) >= heightTalentThreshold;

    // Recommend sports based on high percentiles (> 70)
    const recommendedSports: string[] = [];
    if (pVelocidad >= 70) recommendedSports.push('Atletismo (Velocidad)', 'Fútbol', 'Básquetbol');
    if (pSalto >= 70) recommendedSports.push('Voleibol', 'Básquetbol', 'Salto de Longitud');
    if (pResistencia >= 70) recommendedSports.push('Atletismo (Fondo)', 'Ciclismo', 'Natación');
    if (pLagartijas >= 70 || pAbdominales >= 70) recommendedSports.push('Gimnasia', 'Lucha', 'Halterofilia');
    if (isTalentInHeight) recommendedSports.push('Básquetbol (Talento por Estatura)', 'Voleibol (Talento por Estatura)');

    // Remove duplicates and limit to top 4
    const uniqueSports = Array.from(new Set(recommendedSports)).slice(0, 4);

    return {
      percentiles: {
        velocidad: pVelocidad,
        lagartijas: pLagartijas,
        abdominales: pAbdominales,
        salto: pSalto,
        resistencia: pResistencia
      },
      totalPoints,
      classification,
      isTalentInHeight,
      recommendedSports: uniqueSports
    };
  }, [student.sexo, age, results]);

  const handleStudentChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setStudent(prev => ({
        ...prev,
        [parent]: { ...(prev[parent as keyof StudentData] as any), [child]: value }
      }));
    } else {
      setStudent(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleResultChange = (field: keyof TestResults, value: string) => {
    setResults(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const studentData = {
        ...student,
        results: { ...results },
        evaluation: evaluation ? { ...evaluation } : null,
        updatedAt: serverTimestamp()
      };

      if (editingStudentId) {
        const studentRef = doc(db, 'students', editingStudentId);
        await updateDoc(studentRef, studentData);
      } else {
        await addDoc(collection(db, 'students'), {
          ...studentData,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
      }
      
      setErrors([]);
      setEditingStudentId(null);
      
      // Reset form for next student
      setStudent({
        primerNombre: '',
        segundoNombre: '',
        primerApellido: '',
        segundoApellido: '',
        sexo: '',
        fechaNacimiento: { dia: '', mes: '', año: '' },
        escuela: '',
        turno: '',
        direccion: { colonia: '', numeroExterior: '', numeroInterior: '' }
      });
      setResults({
        peso: '',
        estatura: '',
        flexibilidad: '',
        velocidad: '',
        lagartijas: '',
        abdominales: '',
        salto: '',
        resistencia: ''
      });
      setCurrentStation(1);
      setView('dashboard');
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  const handleEdit = (s: SavedStudent) => {
    setEditingStudentId(s.id);
    setStudent({
      primerNombre: s.primerNombre,
      segundoNombre: s.segundoNombre,
      primerApellido: s.primerApellido,
      segundoApellido: s.segundoApellido,
      sexo: s.sexo,
      fechaNacimiento: s.fechaNacimiento,
      escuela: s.escuela,
      turno: s.turno,
      direccion: s.direccion
    });
    setResults(s.results);
    setCurrentStation(1);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };

  const isStationComplete = (stationId: number) => {
    if (stationId === 1) {
      return !!(student.primerNombre && student.primerApellido && student.segundoApellido && student.sexo && 
             student.fechaNacimiento.dia && student.fechaNacimiento.mes && student.fechaNacimiento.año && 
             student.escuela && student.turno && student.direccion.colonia && student.direccion.numeroExterior);
    }
    if (stationId === 2) {
      return !!(results.peso && results.estatura && measurement.lugar);
    }
    if (stationId === 3) return true; // No specific required fields for station 3 (General info)
    if (stationId === 4) return !!results.flexibilidad;
    if (stationId === 5) return !!results.velocidad;
    if (stationId === 6) return !!results.lagartijas;
    if (stationId === 7) return !!results.abdominales;
    if (stationId === 8) return !!results.salto;
    if (stationId === 9) return !!results.resistencia;
    if (stationId === 10) return true;
    return false;
  };

  const isStationUnlocked = (stationId: number) => {
    if (stationId === 1) return true;
    // A station is unlocked if all previous stations are complete
    for (let i = 1; i < stationId; i++) {
      if (!isStationComplete(i)) return false;
    }
    return true;
  };

  const nextStation = () => {
    const newErrors: string[] = [];
    
    if (currentStation === 1) {
      if (!student.primerNombre) newErrors.push('primerNombre');
      if (!student.primerApellido) newErrors.push('primerApellido');
      if (!student.segundoApellido) newErrors.push('segundoApellido');
      if (!student.sexo) newErrors.push('sexo');
      if (!student.fechaNacimiento.dia || !student.fechaNacimiento.mes || !student.fechaNacimiento.año) newErrors.push('fechaNacimiento');
      if (!student.escuela) newErrors.push('escuela');
      if (!student.turno) newErrors.push('turno');
      if (!student.direccion.colonia) newErrors.push('colonia');
      if (!student.direccion.numeroExterior) newErrors.push('numeroExterior');
    } else if (currentStation === 2) {
      if (!results.peso) newErrors.push('peso');
      if (!results.estatura) newErrors.push('estatura');
      if (!measurement.lugar) newErrors.push('lugar');
    } else if (currentStation === 4) {
      if (!results.flexibilidad) newErrors.push('flexibilidad');
    } else if (currentStation === 5) {
      if (!results.velocidad) newErrors.push('velocidad');
    } else if (currentStation === 6) {
      if (!results.lagartijas) newErrors.push('lagartijas');
    } else if (currentStation === 7) {
      if (!results.abdominales) newErrors.push('abdominales');
    } else if (currentStation === 8) {
      if (!results.salto) newErrors.push('salto');
    } else if (currentStation === 9) {
      if (!results.resistencia) newErrors.push('resistencia');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setCurrentStation(prev => Math.min(prev + 1, STATIONS.length));
  };
  const prevStation = () => setCurrentStation(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-oro-light text-guinda font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-guinda p-4 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Search size={20} className="text-oro" />
            Talent Lab
          </h1>
        </div>
        <div className="text-[10px] font-bold bg-oro text-guinda px-3 py-1 rounded-full uppercase tracking-wider">
          {view === 'form' ? `Estación ${currentStation}/10` : 'Registros'}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-oro/10 bg-guinda text-white flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <Search size={24} className="text-oro" />
                    Talent Lab
                  </h1>
                  <p className="text-[10px] text-oro/80 mt-1 uppercase tracking-widest font-bold">Gobierno de México</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/60 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="px-4 py-4 space-y-2">
                <button
                  onClick={() => {
                    setView('form');
                    setErrors([]);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    view === 'form' 
                      ? 'bg-guinda text-white shadow-lg shadow-guinda/20' 
                      : 'text-guinda hover:bg-oro-light'
                  }`}
                >
                  <PlusCircle size={18} />
                  Nuevo Registro
                </button>
                <button
                  onClick={() => {
                    setView('dashboard');
                    setErrors([]);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    view === 'dashboard' 
                      ? 'bg-guinda text-white shadow-lg shadow-guinda/20' 
                      : 'text-guinda hover:bg-oro-light'
                  }`}
                >
                  <LayoutDashboard size={18} />
                  Registros
                </button>
              </div>

              <div className="px-4 py-2">
                <div className="h-px bg-oro/10 w-full" />
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {view === 'form' && STATIONS.map((s) => {
                  const unlocked = isStationUnlocked(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (unlocked) {
                          setCurrentStation(s.id);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      disabled={!unlocked}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        currentStation === s.id 
                          ? 'bg-oro-light text-guinda border border-oro/30 shadow-sm font-bold' 
                          : unlocked 
                            ? 'text-guinda/60 hover:bg-oro-light/50 hover:text-guinda'
                            : 'text-guinda/20 cursor-not-allowed'
                      }`}
                    >
                      <span className={`p-1.5 rounded-lg ${
                        currentStation === s.id 
                          ? 'bg-guinda text-white' 
                          : unlocked ? 'bg-oro/10' : 'bg-oro/5'
                      }`}>
                        {s.icon}
                      </span>
                      <span className={unlocked ? '' : 'opacity-50'}>{s.name}</span>
                      {currentStation > s.id && isStationComplete(s.id) && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
                      {!unlocked && <X size={12} className="ml-auto text-guinda/20" />}
                    </button>
                  );
                })}
              </nav>
              <div className="p-6 border-t border-oro/10 space-y-3">
                {user ? (
                  <>
                    <div className="bg-oro-light rounded-xl p-4 border border-oro/20">
                      <p className="text-[10px] font-bold text-guinda/60 uppercase mb-2">Usuario</p>
                      <p className="text-sm font-bold text-guinda truncate">{user.displayName || user.email}</p>
                      <button 
                        onClick={handleLogout}
                        className="text-[10px] text-rose-600 font-bold uppercase mt-2 hover:underline"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                    <div className="bg-oro-light rounded-xl p-4 border border-oro/20">
                      <p className="text-[10px] font-bold text-guinda/60 uppercase mb-2">Alumno Actual</p>
                      <p className="text-sm font-bold text-guinda truncate">{student.primerNombre || 'Sin nombre'} {student.primerApellido}</p>
                      <p className="text-xs text-guinda/50 mt-1">{age > 0 ? `${age} años` : 'Edad por definir'}</p>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="w-full bg-guinda text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-guinda/20"
                  >
                    Iniciar Sesión
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar / Navigation Rail */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-oro/20 hidden lg:flex flex-col z-10 shadow-xl">
        <div className="p-6 border-b border-oro/10 bg-guinda text-white">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Search size={24} className="text-oro" />
            Talent Lab
          </h1>
          <p className="text-[10px] text-oro/80 mt-1 uppercase tracking-widest font-bold">Gobierno de México</p>
        </div>
        
        <div className="px-4 py-4 space-y-2">
          <button
            onClick={() => {
              setView('form');
              setErrors([]);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              view === 'form' 
                ? 'bg-guinda text-white shadow-lg shadow-guinda/20' 
                : 'text-guinda hover:bg-oro-light'
            }`}
          >
            <PlusCircle size={18} />
            Nuevo Registro
          </button>
          <button
            onClick={() => {
              setView('dashboard');
              setErrors([]);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              view === 'dashboard' 
                ? 'bg-guinda text-white shadow-lg shadow-guinda/20' 
                : 'text-guinda hover:bg-oro-light'
            }`}
          >
            <LayoutDashboard size={18} />
            Registros
          </button>
        </div>

        <div className="px-4 py-2">
          <div className="h-px bg-oro/10 w-full" />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {view === 'form' && STATIONS.map((s) => {
            const unlocked = isStationUnlocked(s.id);
            return (
              <button
                key={s.id}
                onClick={() => unlocked && setCurrentStation(s.id)}
                disabled={!unlocked}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentStation === s.id 
                    ? 'bg-oro-light text-guinda border border-oro/30 shadow-sm font-bold' 
                    : unlocked 
                      ? 'text-guinda/60 hover:bg-oro-light/50 hover:text-guinda'
                      : 'text-guinda/20 cursor-not-allowed'
                }`}
              >
                <span className={`p-1.5 rounded-lg ${
                  currentStation === s.id 
                    ? 'bg-guinda text-white' 
                    : unlocked ? 'bg-oro/10' : 'bg-oro/5'
                }`}>
                  {s.icon}
                </span>
                <span className={unlocked ? '' : 'opacity-50'}>{s.name}</span>
                {currentStation > s.id && isStationComplete(s.id) && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
                {!unlocked && <X size={12} className="ml-auto text-guinda/20" />}
              </button>
            );
          })}
        </nav>
        <div className="p-6 border-t border-oro/10 space-y-3">
          {user ? (
            <>
              <div className="bg-oro-light rounded-xl p-4 border border-oro/20">
                <p className="text-[10px] font-bold text-guinda/60 uppercase mb-2">Usuario</p>
                <p className="text-sm font-bold text-guinda truncate">{user.displayName || user.email}</p>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] text-rose-600 font-bold uppercase mt-2 hover:underline"
                >
                  Cerrar Sesión
                </button>
              </div>
              <div className="bg-oro-light rounded-xl p-4 border border-oro/20">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-guinda/60 uppercase">Alumno Actual</p>
                  {editingStudentId && (
                    <span className="text-[8px] bg-guinda text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">EDITANDO</span>
                  )}
                </div>
                <p className="text-sm font-bold text-guinda truncate">{student.primerNombre || 'Sin nombre'} {student.primerApellido}</p>
                <p className="text-xs text-guinda/50 mt-1">{age > 0 ? `${age} años` : 'Edad por definir'}</p>
              </div>
            </>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full bg-guinda text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-guinda/20"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-8 lg:p-12 pt-20 lg:pt-12">
        <div className="max-w-4xl mx-auto">
          {/* Mobile Header - Hidden because we have the fixed one now */}
          <div className="lg:hidden mb-6"></div>

          {!user && isAuthReady ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-oro/20 shadow-xl">
              <div className="w-20 h-20 bg-oro-light rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="text-guinda" size={40} />
              </div>
              <h2 className="text-2xl font-black text-guinda mb-2">Acceso Restringido</h2>
              <p className="text-guinda/60 mb-8 max-w-md mx-auto">
                Por favor, inicia sesión con tu cuenta institucional para acceder al sistema de Talent Lab y gestionar los registros.
              </p>
              <button 
                onClick={handleLogin}
                className="bg-guinda text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-guinda-light transition-all shadow-xl shadow-guinda/20 flex items-center gap-3 mx-auto"
              >
                <Search size={24} className="text-oro" />
                Iniciar Sesión con Google
              </button>
            </div>
          ) : view === 'dashboard' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-guinda">Registros</h2>
                  <p className="text-guinda/60">Registros guardados en el sistema nacional</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-oro/20 shadow-sm flex items-center gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-guinda/40 uppercase">Total Alumnos</p>
                    <p className="text-2xl font-black text-guinda">{savedStudents.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-oro-light rounded-full flex items-center justify-center">
                    <User className="text-guinda" size={20} />
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-guinda/40" size={20} />
                <input 
                  type="text"
                  placeholder="Buscar alumno por nombre o apellido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-oro/20 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-guinda placeholder:text-guinda/30 focus:outline-none focus:ring-2 focus:ring-guinda/10 shadow-sm transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-oro/10 shadow-sm">
                <span className="text-[10px] font-bold text-guinda/40 uppercase px-2">Filtrar por:</span>
                <button 
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sortBy === 'date' ? 'bg-guinda text-white' : 'text-guinda/60 hover:bg-oro-light'}`}
                >
                  Recientes
                </button>
                <button 
                  onClick={() => setSortBy('name')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sortBy === 'name' ? 'bg-guinda text-white' : 'text-guinda/60 hover:bg-oro-light'}`}
                >
                  Apellido A-Z
                </button>
                <button 
                  onClick={() => setSortBy('score')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sortBy === 'score' ? 'bg-guinda text-white' : 'text-guinda/60 hover:bg-oro-light'}`}
                >
                  Mayor Puntuación
                </button>
                <button 
                  onClick={() => setSortBy('best_sport')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sortBy === 'best_sport' ? 'bg-guinda text-white' : 'text-guinda/60 hover:bg-oro-light'}`}
                >
                  Mejor Deporte
                </button>
              </div>

              <div className="grid gap-4">
                {savedStudents.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-oro/20 border-dashed">
                    <div className="w-16 h-16 bg-oro-light rounded-full flex items-center justify-center mx-auto mb-4">
                      <PlusCircle className="text-guinda" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-guinda">No hay registros aún</h3>
                    <p className="text-guinda/40 mb-6">Comienza capturando los datos de un alumno para iniciar el proceso.</p>
                    <button 
                      onClick={() => setView('form')}
                      className="bg-guinda text-white px-8 py-3 rounded-xl font-bold hover:bg-guinda-light transition-all shadow-lg shadow-guinda/20"
                    >
                      Nuevo Registro
                    </button>
                  </div>
                ) : sortedStudents.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-oro/20 border-dashed">
                    <div className="w-16 h-16 bg-oro-light rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="text-guinda" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-guinda">Sin coincidencias</h3>
                    <p className="text-guinda/40">No encontramos alumnos que coincidan con "{searchTerm}".</p>
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="mt-4 text-guinda font-bold hover:underline"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  sortedStudents.map((s) => (
                    <div key={s.id} className="bg-white rounded-3xl p-6 border border-oro/10 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 ${s.sexo === 'M' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                            {s.sexo}
                          </div>
                          <div>
                            <div className="flex flex-wrap gap-x-2 items-baseline">
                              <h3 className="text-lg font-black text-guinda uppercase tracking-tight">
                                {s.primerNombre} {s.segundoNombre}
                              </h3>
                              <span className="text-oro font-bold uppercase text-sm">
                                {s.primerApellido} {s.segundoApellido}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold bg-oro-light text-guinda px-2 py-1 rounded-lg flex items-center gap-1 border border-oro/20">
                                <School size={12} /> {s.escuela}
                              </span>
                              <span className="text-[10px] font-bold bg-oro-light text-guinda px-2 py-1 rounded-lg flex items-center gap-1 border border-oro/20">
                                <Clock size={12} /> {s.turno}
                              </span>
                            </div>
                            {s.evaluation?.recommendedSports && s.evaluation.recommendedSports.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {s.evaluation.recommendedSports.slice(0, 3).map((sport, idx) => (
                                  <span key={idx} className="text-[9px] font-black text-guinda/60 bg-oro/5 px-2 py-0.5 rounded-md border border-oro/10">
                                    {sport}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-guinda/40 uppercase">Resultado</p>
                            <p className={`text-sm font-black uppercase ${
                              s.evaluation?.classification === 'Muy bueno' ? 'text-emerald-600' :
                              s.evaluation?.classification === 'Bueno' ? 'text-guinda' :
                              'text-guinda/40'
                            }`}>
                              {s.evaluation?.classification || 'S/N'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-guinda/40 uppercase">Puntos</p>
                            <p className="text-xl font-black text-guinda">{s.evaluation?.totalPoints || 0}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEdit(s)}
                              className="p-2 text-oro/40 hover:text-guinda hover:bg-oro-light rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(s.id)}
                              className="p-2 text-oro/40 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            /* Station Content */
            <div className="bg-white rounded-3xl shadow-xl border border-oro/10 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 md:p-8 border-b border-oro/10 bg-oro-light/30 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-guinda">{STATIONS.find(s => s.id === currentStation)?.name}</h2>
                <p className="text-guinda/60 text-xs font-bold uppercase tracking-widest mt-1">Registro de Alumnos</p>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  {STATIONS.map(s => (
                    <div 
                      key={s.id} 
                      className={`h-1.5 rounded-full transition-all duration-500 ${s.id === currentStation ? 'bg-guinda w-10' : s.id < currentStation ? 'bg-oro w-6' : 'bg-oro/20 w-4'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStation}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentStation === 1 && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-guinda/60 uppercase tracking-wider">Nombres</label>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-guinda/40 uppercase ml-1">Primer Nombre *</p>
                              <input 
                                type="text" 
                                value={student.primerNombre}
                                onChange={(e) => handleStudentChange('primerNombre', e.target.value)}
                                className={`w-full px-4 py-3 bg-white border ${errors.includes('primerNombre') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none transition-all`}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-guinda/40 uppercase ml-1">Segundo Nombre</p>
                              <input 
                                type="text" 
                                value={student.segundoNombre}
                                onChange={(e) => handleStudentChange('segundoNombre', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-oro/20 rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-guinda/60 uppercase tracking-wider">Apellidos</label>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-guinda/40 uppercase ml-1">Primer Apellido *</p>
                              <input 
                                type="text" 
                                value={student.primerApellido}
                                onChange={(e) => handleStudentChange('primerApellido', e.target.value)}
                                className={`w-full px-4 py-3 bg-white border ${errors.includes('primerApellido') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none transition-all`}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-guinda/40 uppercase ml-1">Segundo Apellido *</p>
                              <input 
                                type="text" 
                                value={student.segundoApellido}
                                onChange={(e) => handleStudentChange('segundoApellido', e.target.value)}
                                className={`w-full px-4 py-3 bg-white border ${errors.includes('segundoApellido') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none transition-all`}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-guinda uppercase tracking-wider">Sexo *</label>
                          <div className={`flex gap-3 p-1 rounded-2xl ${errors.includes('sexo') ? 'bg-rose-50 ring-1 ring-rose-500' : ''}`}>
                            <button 
                              onClick={() => handleStudentChange('sexo', 'M')}
                              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${student.sexo === 'M' ? 'bg-guinda border-guinda text-white shadow-lg shadow-guinda/20' : 'bg-white border-oro/20 text-guinda/40 hover:border-oro/40'}`}
                            >
                              {student.sexo === 'M' ? 'X' : ''} MASCULINO
                            </button>
                            <button 
                              onClick={() => handleStudentChange('sexo', 'F')}
                              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${student.sexo === 'F' ? 'bg-guinda border-guinda text-white shadow-lg shadow-guinda/20' : 'bg-white border-oro/20 text-guinda/40 hover:border-oro/40'}`}
                            >
                              {student.sexo === 'F' ? 'X' : ''} FEMENINO
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-guinda uppercase tracking-wider">Fecha de Nacimiento *</label>
                          <div className={`grid grid-cols-3 gap-3 p-1 rounded-2xl ${errors.includes('fechaNacimiento') ? 'bg-rose-50 ring-1 ring-rose-500' : ''}`}>
                            <input 
                              type="number" placeholder="Día"
                              value={student.fechaNacimiento.dia}
                              onChange={(e) => handleStudentChange('fechaNacimiento.dia', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-oro/20 rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none"
                            />
                            <input 
                              type="number" placeholder="Mes"
                              value={student.fechaNacimiento.mes}
                              onChange={(e) => handleStudentChange('fechaNacimiento.mes', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-oro/20 rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none"
                            />
                            <input 
                              type="number" placeholder="Año"
                              value={student.fechaNacimiento.año}
                              onChange={(e) => handleStudentChange('fechaNacimiento.año', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-oro/20 rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-guinda uppercase tracking-wider">Escuela *</label>
                          <input 
                            type="text" 
                            placeholder="Nombre de la escuela"
                            value={student.escuela}
                            onChange={(e) => handleStudentChange('escuela', e.target.value)}
                            className={`w-full px-4 py-3 bg-white border ${errors.includes('escuela') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-guinda uppercase tracking-wider">Turno *</label>
                          <div className={`flex gap-3 p-1 rounded-2xl ${errors.includes('turno') ? 'bg-rose-50 ring-1 ring-rose-500' : ''}`}>
                            <button 
                              onClick={() => handleStudentChange('turno', 'Matutino')}
                              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${student.turno === 'Matutino' ? 'bg-guinda border-guinda text-white shadow-lg shadow-guinda/20' : 'bg-white border-oro/20 text-guinda/40 hover:border-oro/40'}`}
                            >
                              MATUTINO
                            </button>
                            <button 
                              onClick={() => handleStudentChange('turno', 'Vespertino')}
                              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${student.turno === 'Vespertino' ? 'bg-guinda border-guinda text-white shadow-lg shadow-guinda/20' : 'bg-white border-oro/20 text-guinda/40 hover:border-oro/40'}`}
                            >
                              VESPERTINO
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-oro/10">
                        <h3 className="text-sm font-bold text-guinda/60 uppercase mb-4 flex items-center gap-2">
                          <MapPin size={14} className="text-oro" /> Dirección del Alumno
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-guinda/60 uppercase">Colonia *</label>
                            <input 
                              type="text" 
                              value={student.direccion.colonia}
                              onChange={(e) => handleStudentChange('direccion.colonia', e.target.value)}
                              className={`w-full px-4 py-3 bg-white border ${errors.includes('colonia') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-guinda/60 uppercase">Núm. Exterior *</label>
                            <input 
                              type="text" 
                              value={student.direccion.numeroExterior}
                              onChange={(e) => handleStudentChange('direccion.numeroExterior', e.target.value)}
                              className={`w-full px-4 py-3 bg-white border ${errors.includes('numeroExterior') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-guinda/60 uppercase">Núm. Interior (Opcional)</label>
                            <input 
                              type="text" 
                              value={student.direccion.numeroInterior}
                              onChange={(e) => handleStudentChange('direccion.numeroInterior', e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-oro/20 rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStation === 2 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Instrucciones:</p>
                          <p>El alumno debe estar descalzo y con ropa ligera. El peso se reporta en kilogramos y gramos. La estatura se reporta en centímetros.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-guinda uppercase tracking-wider">Peso Corporal (kg) *</label>
                          <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                              <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-oro" size={20} />
                              <input 
                                type="number" step="0.1"
                                placeholder="00.0"
                                value={results.peso}
                                onChange={(e) => handleResultChange('peso', e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 bg-white border ${errors.includes('peso') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-2xl text-2xl font-bold focus:ring-2 focus:ring-guinda/20 outline-none text-guinda`}
                              />
                            </div>
                            <span className="text-xl font-bold text-oro">kg</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-guinda uppercase tracking-wider">Estatura (cm) *</label>
                          <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                              <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-oro" size={20} />
                              <input 
                                type="number" step="0.1"
                                placeholder="000.0"
                                value={results.estatura}
                                onChange={(e) => handleResultChange('estatura', e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 bg-white border ${errors.includes('estatura') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-2xl text-2xl font-bold focus:ring-2 focus:ring-guinda/20 outline-none text-guinda`}
                              />
                            </div>
                            <span className="text-xl font-bold text-oro">cm</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-8 border-t border-oro/10">
                        <h3 className="text-sm font-bold text-guinda/60 uppercase mb-4">Lugar y Fecha de Medición</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-guinda/60 uppercase">Lugar *</label>
                            <input 
                              type="text" 
                              value={measurement.lugar}
                              onChange={(e) => setMeasurement(prev => ({ ...prev, lugar: e.target.value }))}
                              className={`w-full px-4 py-3 bg-white border ${errors.includes('lugar') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-oro/20'} rounded-xl focus:ring-2 focus:ring-guinda/20 outline-none`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-guinda/60 uppercase">Fecha (Capturada Automáticamente)</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-oro-light/50 border border-oro/20 rounded-xl text-guinda font-bold">
                              <Calendar size={18} className="text-oro" />
                              {measurement.fecha.dia}/{measurement.fecha.mes}/{measurement.fecha.año}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStation === 3 && (
                    <div className="space-y-8 text-center py-12">
                      <div className="w-24 h-24 bg-oro-light text-guinda rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-oro/20 shadow-lg">
                        <Activity size={48} />
                      </div>
                      <h3 className="text-2xl font-black text-guinda">Fase de Calentamiento</h3>
                      <p className="text-guinda/60 max-w-md mx-auto leading-relaxed">
                        Acondicionamiento de músculos y articulaciones. Duración aproximada: 5 minutos.
                        Concentrarse en extremidades inferiores y superiores.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        {['Cuello', 'Brazos', 'Tronco', 'Piernas'].map(part => (
                          <div key={part} className="p-4 bg-white rounded-2xl border border-oro/10 shadow-sm">
                            <p className="font-black text-guinda uppercase text-xs tracking-wider">{part}</p>
                            <p className="text-[10px] text-oro font-bold mt-1">5 repeticiones</p>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={nextStation}
                        className="mt-8 bg-guinda text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-guinda-light transition-all flex items-center gap-2 mx-auto shadow-xl shadow-guinda/20"
                      >
                        Comenzar Pruebas <ArrowRight size={18} />
                      </button>
                    </div>
                  )}

                  {currentStation === 4 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Prueba Sit and Reach modificada:</p>
                          <p>Medir la flexibilidad en la flexión ventral del tronco. Se registran tres intentos y se toma la mejor marca en centímetros.</p>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto space-y-4">
                        <label className="text-sm font-bold text-guinda uppercase tracking-wider block text-center">Mejor Marca (cm) *</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="number" step="0.1"
                            placeholder="0.0"
                            value={results.flexibilidad}
                            onChange={(e) => handleResultChange('flexibilidad', e.target.value)}
                            className={`w-full px-6 py-6 bg-white border-2 ${errors.includes('flexibilidad') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-oro/20'} rounded-3xl text-4xl font-black text-center focus:ring-4 focus:ring-guinda/10 outline-none text-guinda`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStation === 5 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Carrera de Velocidad:</p>
                          <p>
                            {age <= 11 ? '30 metros para alumnos hasta 11 años.' : '50 metros para alumnos de 12 años en adelante.'}
                            <br />Se registra el tiempo con precisión de una décima. Solo un intento.
                          </p>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto space-y-4">
                        <label className="text-sm font-bold text-guinda uppercase tracking-wider block text-center">Tiempo (segundos) *</label>
                        <input 
                          type="number" step="0.1"
                          placeholder="0.0"
                          value={results.velocidad}
                          onChange={(e) => handleResultChange('velocidad', e.target.value)}
                          className={`w-full px-6 py-6 bg-white border-2 ${errors.includes('velocidad') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-oro/20'} rounded-3xl text-4xl font-black text-center focus:ring-4 focus:ring-guinda/10 outline-none text-guinda`}
                        />
                      </div>
                    </div>
                  )}

                  {currentStation === 6 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Lagartijas o Planchas:</p>
                          <p>Evaluar la fuerza dinámica de extremidades superiores. Se cuentan las repeticiones continuas realizadas correctamente.</p>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto space-y-4">
                        <label className="text-sm font-bold text-guinda uppercase tracking-wider block text-center">Número de Repeticiones *</label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={results.lagartijas}
                          onChange={(e) => handleResultChange('lagartijas', e.target.value)}
                          className={`w-full px-6 py-6 bg-white border-2 ${errors.includes('lagartijas') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-oro/20'} rounded-3xl text-4xl font-black text-center focus:ring-4 focus:ring-guinda/10 outline-none text-guinda`}
                        />
                      </div>
                    </div>
                  )}

                  {currentStation === 7 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Abdominales:</p>
                          <p>Evaluar la fuerza de los músculos abdominales. Se cuenta el número de repeticiones hechas correctamente de forma continua.</p>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto space-y-4">
                        <label className="text-sm font-bold text-guinda uppercase tracking-wider block text-center">Número de Repeticiones *</label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={results.abdominales}
                          onChange={(e) => handleResultChange('abdominales', e.target.value)}
                          className={`w-full px-6 py-6 bg-white border-2 ${errors.includes('abdominales') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-oro/20'} rounded-3xl text-4xl font-black text-center focus:ring-4 focus:ring-guinda/10 outline-none text-guinda`}
                        />
                      </div>
                    </div>
                  )}

                  {currentStation === 8 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Salto de Longitud sin Carrera:</p>
                          <p>Evaluar la fuerza explosiva. Dos intentos, se registra la mejor distancia en centímetros tomando como referencia el talón más retrasado.</p>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto space-y-4">
                        <label className="text-sm font-bold text-guinda uppercase tracking-wider block text-center">Distancia (cm) *</label>
                        <input 
                          type="number"
                          placeholder="000"
                          value={results.salto}
                          onChange={(e) => handleResultChange('salto', e.target.value)}
                          className={`w-full px-6 py-6 bg-white border-2 ${errors.includes('salto') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-oro/20'} rounded-3xl text-4xl font-black text-center focus:ring-4 focus:ring-guinda/10 outline-none text-guinda`}
                        />
                      </div>
                    </div>
                  )}

                  {currentStation === 9 && (
                    <div className="space-y-8">
                      <div className="bg-oro-light rounded-2xl p-6 flex gap-4 items-start border border-oro/20">
                        <Info className="text-guinda shrink-0" size={24} />
                        <div className="text-sm text-guinda leading-relaxed">
                          <p className="font-bold mb-1">Prueba de Resistencia:</p>
                          <p>
                            {age <= 11 ? '600 metros para alumnos hasta 11 años.' : '1000 metros para alumnos de 12 años en adelante.'}
                            <br />Se registra el tiempo en minutos y segundos (ej. 4.20).
                          </p>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto space-y-4">
                        <label className="text-sm font-bold text-guinda uppercase tracking-wider block text-center">Tiempo (Min.Seg) *</label>
                        <input 
                          type="text"
                          placeholder="0.00"
                          value={results.resistencia}
                          onChange={(e) => handleResultChange('resistencia', e.target.value)}
                          className={`w-full px-6 py-6 bg-white border-2 ${errors.includes('resistencia') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-oro/20'} rounded-3xl text-4xl font-black text-center focus:ring-4 focus:ring-guinda/10 outline-none text-guinda`}
                        />
                      </div>
                    </div>
                  )}

                  {currentStation === 10 && (
                    <div className="space-y-8">
                      {!evaluation ? (
                        <div className="text-center py-12 space-y-4">
                          <AlertCircle size={48} className="text-amber-600 mx-auto" />
                          <h3 className="text-xl font-black text-guinda">Datos Incompletos</h3>
                          <p className="text-guinda/60">Asegúrate de haber ingresado el sexo y la fecha de nacimiento del alumno (edad entre 6 y 14 años).</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 space-y-6">
                            <div className="bg-guinda text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border-b-8 border-oro">
                              <div className="relative z-10">
                                <p className="text-oro font-bold uppercase tracking-widest text-[10px] mb-2">Resultado del Scouting Nacional</p>
                                <h3 className="text-5xl font-black mb-4 tracking-tighter">{evaluation.classification.toUpperCase()}</h3>
                                <div className="flex items-center gap-8">
                                  <div>
                                    <p className="text-oro/60 text-[10px] uppercase font-bold">Puntos Totales</p>
                                    <p className="text-4xl font-black">{evaluation.totalPoints}</p>
                                  </div>
                                  <div className="h-12 w-px bg-oro/20" />
                                  <div>
                                    <p className="text-oro/60 text-[10px] uppercase font-bold">Talento Estatura</p>
                                    <p className={`text-2xl font-black ${evaluation.isTalentInHeight ? 'text-emerald-400' : 'text-oro/40'}`}>
                                      {evaluation.isTalentInHeight ? 'SÍ' : 'NO'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Trophy className="absolute right-[-20px] bottom-[-20px] text-white/5" size={240} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {Object.entries(evaluation.percentiles).map(([key, value]) => (
                                <div key={key} className="bg-white rounded-2xl p-5 border border-oro/10 flex items-center justify-between shadow-sm">
                                  <div>
                                    <p className="text-[10px] font-bold text-guinda/40 uppercase tracking-wider">{key}</p>
                                    <p className="text-lg font-black text-guinda capitalize">
                                      {key === 'salto' ? `${results.salto} cm` : 
                                       key === 'velocidad' ? `${results.velocidad} s` :
                                       key === 'resistencia' ? `${results.resistencia} min` :
                                       results[key as keyof TestResults]}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-guinda/40 uppercase">Percentil</p>
                                    <p className={`text-2xl font-black ${value >= 90 ? 'text-guinda' : value >= 70 ? 'text-emerald-600' : 'text-oro/40'}`}>
                                      {value}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="bg-white border border-oro/20 rounded-3xl p-6 shadow-sm">
                              <h4 className="font-black text-guinda mb-4 flex items-center gap-2 uppercase text-sm tracking-wider">
                                <Info size={16} className="text-oro" />
                                Análisis de Talento
                              </h4>
                              <div className="space-y-4">
                                {evaluation.totalPoints >= 330 ? (
                                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-xs text-emerald-900 font-bold leading-relaxed">
                                      Este alumno presenta una excelente condición física (Percentil 90 promedio). Es un candidato ideal para programas de alto rendimiento nacional.
                                    </p>
                                  </div>
                                ) : evaluation.totalPoints >= 240 ? (
                                  <div className="p-4 bg-oro-light rounded-2xl border border-oro/20">
                                    <p className="text-xs text-guinda font-bold leading-relaxed">
                                      Condición física buena. Posee bases sólidas para el desarrollo deportivo en diversas disciplinas olímpicas.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-4 bg-oro-light/50 rounded-2xl border border-oro/10">
                                    <p className="text-xs text-guinda/70 leading-relaxed">
                                      Condición física dentro de rangos normales. Se recomienda seguimiento y fomento de la actividad física escolar.
                                    </p>
                                  </div>
                                )}

                                {evaluation.isTalentInHeight && (
                                  <div className="p-4 bg-guinda text-white rounded-2xl border border-guinda shadow-lg flex gap-3 items-center">
                                    <Trophy className="text-oro shrink-0" size={24} />
                                    <p className="text-xs font-black uppercase tracking-tight">
                                      Talento por Estatura: Cumple con la norma del percentil 97.
                                    </p>
                                  </div>
                                )}

                                {evaluation.recommendedSports.length > 0 && (
                                  <div className="p-4 bg-white rounded-2xl border border-oro/20 shadow-sm">
                                    <h4 className="font-black text-guinda mb-3 flex items-center gap-2 uppercase text-[10px] tracking-wider">
                                      <Trophy size={14} className="text-oro" />
                                      Deportes Recomendados
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {evaluation.recommendedSports.map((sport, idx) => (
                                        <span key={idx} className="bg-oro-light text-guinda px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-oro/20">
                                          {sport}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button 
                              onClick={handleSave}
                              className="w-full bg-guinda text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-guinda-light transition-all flex items-center justify-center gap-2 shadow-xl shadow-guinda/30 border-b-4 border-guinda-light"
                            >
                              <Save size={20} /> {editingStudentId ? 'Actualizar' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            {view === 'form' && (
              <div className="p-6 md:p-8 border-t border-oro/10 flex justify-between items-center bg-oro-light/10">
                <button 
                  onClick={prevStation}
                  disabled={currentStation === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${currentStation === 1 ? 'text-oro/30 cursor-not-allowed' : 'text-guinda hover:bg-oro-light'}`}
                >
                  <ChevronLeft size={20} /> Anterior
                </button>
                <button 
                  onClick={nextStation}
                  disabled={currentStation === STATIONS.length}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all ${currentStation === STATIONS.length ? 'bg-oro/10 text-oro/30 cursor-not-allowed' : 'bg-guinda text-white hover:bg-guinda-light shadow-lg shadow-guinda/20'}`}
                >
                  {currentStation === STATIONS.length - 1 ? 'Ver Resultados' : 'Siguiente'} <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  </div>
  );
}
