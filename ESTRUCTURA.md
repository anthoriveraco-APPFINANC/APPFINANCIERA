# 📁 Estructura del Proyecto — App Financiera Personal

```
fin-personal/
│
├── app/                              # Expo Router — rutas y navegación
│   ├── _layout.tsx                   # Root layout: DB init, biometría, SQLiteProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab navigator (Bottom Tabs)
│   │   ├── index.tsx                 # Dashboard principal
│   │   ├── deudas.tsx                # Gestión de deudas y cuentas por cobrar
│   │   ├── flujo.tsx                 # Flujo de caja (ingresos/gastos)
│   │   ├── inversiones.tsx           # Portafolio de inversiones
│   │   └── herramientas.tsx          # Simulador + OCR
│   ├── settings.tsx                  # Configuración (tasa, biometría, backup)
│   └── modals/
│       ├── nuevo-gasto.tsx           # Modal: Registrar gasto
│       ├── nuevo-ingreso.tsx         # Modal: Registrar ingreso
│       ├── nuevo-abono.tsx           # Modal: Registrar abono a deuda
│       ├── nueva-inversion.tsx       # Modal: Nueva inversión/aporte
│       └── nueva-deuda.tsx           # Modal: Nueva deuda/cuenta por cobrar
│
├── src/
│   ├── db/
│   │   ├── database.ts               # ← BLOQUE 1: Schema, init, helpers CRUD
│   │   └── seed.ts                   # ← BLOQUE 1: Datos iniciales (seed)
│   │
│   ├── types/
│   │   └── index.ts                  # ← BLOQUE 1: Tipos TypeScript globales
│   │
│   ├── constants/
│   │   └── index.ts                  # ← BLOQUE 1: Categorías, métodos de pago, colores
│   │
│   ├── utils/
│   │   └── currency.ts               # ← BLOQUE 1: Helpers de conversión y formato
│   │
│   └── hooks/
│       ├── useDatabase.ts            # Hook: acceso a SQLiteContext
│       ├── useDashboard.ts           # Hook: queries del dashboard
│       ├── useDeudas.ts              # Hook: queries de deudas
│       ├── useFlujo.ts               # Hook: queries de flujo de caja
│       └── useInversiones.ts         # Hook: queries de inversiones
│
├── assets/
│   ├── fonts/                        # Fuentes opcionales
│   └── images/                       # Íconos y splash
│
├── app.json                          # Config Expo (nombre: "App Financiera Personal")
├── package.json
├── tsconfig.json
└── babel.config.js
```

## Dependencias requeridas

```bash
npx create-expo-app@latest fin-personal --template blank-typescript
cd fin-personal

npx expo install expo-sqlite
npx expo install expo-local-authentication
npx expo install expo-file-system
npx expo install expo-sharing
npx expo install expo-camera
npx expo install expo-image-picker
npx expo install @expo/vector-icons
npx expo install expo-notifications
npx expo install expo-secure-store

# Navegación (Expo Router ya viene con el template)
npm install react-native-safe-area-context react-native-screens

# OCR
npm install @infinitered/react-native-mlkit-ocr
```

## Notas importantes

- **expo-sqlite SDK 57**: Usa `SQLiteProvider` + `useSQLiteContext()` (nueva API)
- **Expo Router v4**: Rutas basadas en sistema de archivos en `/app`
- **TypeScript strict**: Todos los archivos tipados
- **Sin conexión a internet**: 100% local, SQLite persiste en el dispositivo
